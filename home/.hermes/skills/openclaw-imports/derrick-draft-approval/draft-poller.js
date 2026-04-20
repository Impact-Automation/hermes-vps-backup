#!/usr/bin/env node
/**
 * Draft Approval Poller
 *
 * Polls derrick_draft_validations for pending drafts (telegram_message_id IS NULL)
 * and sends Telegram cards via @ClawdyDevBot with [Send] [Edit] [Reject] buttons.
 *
 * CALL READY ALERTS (2026-02-26):
 * When a Category A / call_ready draft has a phone number extracted, sends an
 * informational alert card instead of a draft approval card. The draft still
 * exists in the pipeline but the queue is not blocked — Colin/Harry can just call.
 *
 * Usage:
 *   node draft-poller.js           # Normal run
 *   node draft-poller.js --dry-run # Log what would be sent without sending
 */
const dotenv = require("dotenv");
dotenv.config({ path: "/home/moltbot/.openclaw/.env" });

const { query, update, rpc } = require("./supabase-client");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HARRY_CHAT_ID = process.env.HARRY_CHAT_ID || "6884933598";
const DRY_RUN = process.argv.includes("--dry-run");
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const ADMIN_BASE_URL = "https://urecruitglobal.com/admin/candidates";

// Send up to BATCH_SIZE drafts per poll cycle
const BATCH_SIZE = 10;

// Reviewer chat ID map — only active recruiters who review drafts
const REVIEWER_CHAT_IDS = {
  wannakan: "8286957084",
  harry: "6884933598",
  // colin: "<COLIN_CHAT_ID>",      // add when paired
  // paul: "<PAUL_CHAT_ID>",        // add when paired
};

// ── Telegram helpers ─────────────────────────────────────────────────

async function sendTelegram(chatId, text, replyMarkup, parseMode) {
  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed (${res.status}): ${errText.substring(0, 200)}`);
  }

  const result = await res.json();
  return result.result;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Call Ready alert ─────────────────────────────────────────────────

async function sendCallReadyAlert(draft, ghostRun, chatId) {
  const assessment = ghostRun.assessment_output || {};
  const phone = assessment.extractedPhone;
  const candidateEmail = draft.candidate_email || "unknown";
  const subject = draft.subject || "(no subject)";

  // Extract candidate message snippet from the ghost_run
  const candidateBody = ghostRun.candidate_email_body || "";
  const snippet = candidateBody.length > 200
    ? candidateBody.substring(0, 200) + "..."
    : candidateBody;

  // Look up candidate profile for admin link
  let profileLink = "";
  try {
    const candidates = await query("candidates", {
      email: "eq." + candidateEmail,
      select: "id,full_name",
      limit: "1",
    });
    if (candidates.length > 0) {
      profileLink = "\n<a href=\"" + ADMIN_BASE_URL + "/" + candidates[0].id + "\">View Profile</a>";
    }
  } catch (e) {
    console.warn("[DraftPoller] Candidate lookup failed for " + candidateEmail + ": " + e.message);
  }

  const message =
    "\u{1F4DE} <b>CALL READY</b>\n" +
    escapeHtml(candidateEmail) + "\n" +
    "<b>" + escapeHtml(phone) + "</b>\n\n" +
    "Re: " + escapeHtml(subject) + "\n" +
    "\"" + escapeHtml(snippet.trim()) + "\"\n\n" +
    "Category: A | call_ready\n" +
    "Confidence: " + (draft.draft_confidence != null ? draft.draft_confidence + "%" : "n/a") +
    profileLink;

  if (DRY_RUN) {
    console.log("[DRY RUN] Would send CALL READY alert for " + candidateEmail + " (" + phone + ")");
    return true;
  }

  const result = await sendTelegram(chatId, message, null, "HTML");
  const telegramMsgId = result.message_id;

  // Mark the draft validation so the queue moves on.
  // Set draft_status to "call_ready_alert" — not blocking the one-at-a-time lock
  // because only "pending_approval" with telegram_message_id blocks.
  await update(
    "derrick_draft_validations",
    {
      telegram_message_id: telegramMsgId,
      telegram_chat_id: Number(chatId),
      draft_status: "call_ready_alert",
    },
    { id: "eq." + draft.id }
  );

  console.log("[DraftPoller] Sent CALL READY alert for " + candidateEmail + " (" + phone + ") tg_msg=" + telegramMsgId);
  return true;
}

// ── Main polling logic ───────────────────────────────────────────────

async function pollPendingDrafts() {
  // 1. Check kill switch
  const killSwitchRows = await query("openclaw_config", {
    key: "in.(draft_kill_switch_active,draft_send_enabled)",
    select: "key,value",
  });

  const configMap = Object.fromEntries(killSwitchRows.map((r) => [r.key, r.value]));
  const killActive = configMap.draft_kill_switch_active === "true" || configMap.draft_kill_switch_active === true;
  const sendEnabled = configMap.draft_send_enabled !== "false" && configMap.draft_send_enabled !== false;

  if (killActive) {
    console.log("[DraftPoller] Kill switch active — skipping");
    return { sent: 0, skipped: 0, reason: "kill_switch" };
  }
  if (!sendEnabled) {
    console.log("[DraftPoller] Draft send disabled — skipping");
    return { sent: 0, skipped: 0, reason: "send_disabled" };
  }

  // 2. Query pending drafts with no telegram_message_id (batch mode)
  // ALL categories sent — pipeline needs feedback on every category to learn
  const pending = await query("derrick_draft_validations", {
    draft_status: "eq.pending_approval",
    telegram_message_id: "is.null",
    order: "created_at.asc",
    limit: String(BATCH_SIZE),
    select: "id,candidate_email,from_email,subject,original_draft,scenario_type,draft_confidence,model_used,thread_id,telegram_chat_id,triage_category,ghost_run_id,reviewer_target",
  });

  if (pending.length === 0) {
    console.log("[DraftPoller] No pending drafts");
    return { sent: 0, skipped: 0 };
  }

  console.log("[DraftPoller] Found " + pending.length + " pending draft(s)");

  let sent = 0;
  let skipped = 0;

  for (const draft of pending) {
    const chatId = draft.telegram_chat_id || REVIEWER_CHAT_IDS[draft.reviewer_target];
    if (!chatId) {
      // No reviewer mapped — skip (don't send to Harry, he's not a reviewer)
      skipped++;
      continue;
    }

    // ── FETCH GHOST RUN (candidate email body + call ready check) ──
    let candidateBody = "";
    if (draft.ghost_run_id) {
      try {
        const ghostRuns = await query("ghost_runs", {
          id: "eq." + draft.ghost_run_id,
          select: "id,assessment_output,candidate_email_body",
          limit: "1",
        });

        if (ghostRuns.length > 0) {
          const run = ghostRuns[0];
          candidateBody = run.candidate_email_body || "";

          // Call ready check — informational alert instead of draft card
          const assessment = run.assessment_output || {};
          if (
            assessment.triageSubType === "call_ready" &&
            assessment.extractedPhone
          ) {
            try {
              await sendCallReadyAlert(draft, run, chatId);
              sent++;
              continue; // Move on — no queue blocking
            } catch (e) {
              console.error("[DraftPoller] Call ready alert failed for " + draft.id + ": " + e.message);
              // Fall through to normal draft card
            }
          }
        }
      } catch (e) {
        console.warn("[DraftPoller] Ghost run lookup failed for " + draft.id + ": " + e.message);
        // Fall through to normal draft card
      }
    }

    // 3. Rate limit check
    try {
      const rateLimitOk = await rpc("fn_check_telegram_rate_limit", {
        p_chat_id: Number(chatId),
        p_thread_id: draft.thread_id || null,
      });

      if (rateLimitOk === false) {
        console.log("[DraftPoller] Rate limit hit for " + draft.id + " \u2014 skipping");
        skipped++;
        continue;
      }
    } catch (e) {
      console.warn("[DraftPoller] Rate limit check failed for " + draft.id + ": " + e.message + " \u2014 sending anyway");
    }

    // 4. Build message card
    const fromName = (draft.from_email || "colin@urecruitglobal.com").split("@")[0];
    const candidateEmail = draft.candidate_email || "unknown";
    const subject = draft.subject || "(no subject)";
    const truncatedDraft = draft.original_draft.length > 800
      ? draft.original_draft.substring(0, 800) + "..."
      : draft.original_draft;
    const confidence = draft.draft_confidence != null ? draft.draft_confidence + "%" : "n/a";

    // Quick cheat sheet tips based on category (corrected)
    const categoryTips = {
      "A": "CTA: CV request first \u2022 Location interest \u2022 KR",
      "B": "CTA: Phone/availability after CV \u2022 KR",
      "C": "CTA: Answer first, then soft CTA \u2022 No jump to phone",
      "D": "CTA: Next steps/availability \u2022 Brief \u2022 KR",
      "E": "CTA: Keep in touch \u2022 Very short",
    };
    const tip = categoryTips[draft.triage_category] || "Reply /cheat for full guide";

    // Truncate candidate email to avoid Telegram message too long error
    const truncatedCandidate = candidateBody.trim().length > 500
      ? candidateBody.trim().substring(0, 500) + "... [truncated]"
      : candidateBody.trim();

    // Build candidate email section (truncated to 500 chars)
    const candidateSection = truncatedCandidate
      ? "\u{1F4E9} CANDIDATE SAID:\n" + truncatedCandidate + "\n\n"
      : "";

    const message =
      "[" + fromName + " -> " + candidateEmail + "]\n" +
      "Re: " + subject + "\n\n" +
      candidateSection +
      "\u{270F}\u{FE0F} AI DRAFT:\n" +
      truncatedDraft + "\n\n" +
      "---\n" +
      "Category: " + (draft.triage_category || "A") + " | " + tip + "\n" +
      "Confidence: " + confidence + " | Model: " + (draft.model_used || "unknown") + "\n" +
      "Reply /cheat for full Colin style guide";

    const keyboard = {
      inline_keyboard: [[
        { text: "Send", callback_data: "draft_approve:" + draft.id },
        { text: "Edit", callback_data: "draft_edit:" + draft.id },
        { text: "Reject", callback_data: "draft_reject:" + draft.id },
      ]],
    };

    if (DRY_RUN) {
      console.log("[DRY RUN] Would send to " + chatId + " (reviewer=" + (draft.reviewer_target || "harry") + "):");
      console.log(message.substring(0, 200) + "...");
      console.log("Buttons: Send | Edit | Reject (id=" + draft.id + ")");
      sent++;
      continue;
    }

    // 5. Send via Telegram
    try {
      const result = await sendTelegram(chatId, message, keyboard);
      const telegramMsgId = result.message_id;

      // 6. Update row with telegram_message_id
      await update(
        "derrick_draft_validations",
        {
          telegram_message_id: telegramMsgId,
          telegram_chat_id: Number(chatId),
        },
        { id: "eq." + draft.id }
      );

      // 7. Record rate limit event
      try {
        await rpc("fn_record_telegram_send", {
          p_chat_id: Number(chatId),
          p_thread_id: draft.thread_id || null,
          p_message_type: "draft_notification",
        });
      } catch (e) {
        console.warn("[DraftPoller] Rate limit record failed: " + e.message);
      }

      console.log("[DraftPoller] Sent draft " + draft.id + " to " + (draft.reviewer_target || "harry") + " (tg_msg=" + telegramMsgId + ")");
      sent++;
    } catch (e) {
      console.error("[DraftPoller] Failed to send draft " + draft.id + ": " + e.message);
      skipped++;
    }
  }

  return { sent, skipped };
}

// ── Learning summary relay ───────────────────────────────────────────

async function relayLearningSummaries() {
  try {
    const summaries = await query("moltbot_audit_log", {
      event_type: "eq.learning_summary",
      "details->>telegram_sent": "is.null",
      order: "created_at.desc",
      limit: "3",
      select: "id,details,created_at",
    });

    if (summaries.length === 0) return 0;

    let sent = 0;
    for (const s of summaries) {
      const text = s.details?.summary_text || JSON.stringify(s.details);

      if (DRY_RUN) {
        console.log("[DRY RUN] Would send learning summary " + s.id);
        sent++;
        continue;
      }

      try {
        await sendTelegram(HARRY_CHAT_ID, text);
        await update(
          "moltbot_audit_log",
          { details: { ...s.details, telegram_sent: true } },
          { id: "eq." + s.id }
        );
        console.log("[DraftPoller] Relayed learning summary " + s.id);
        sent++;
      } catch (e) {
        console.warn("[DraftPoller] Failed to relay summary " + s.id + ": " + e.message);
      }
    }
    return sent;
  } catch (e) {
    console.log("[DraftPoller] No learning summaries to relay");
    return 0;
  }
}

// ── Entry point ──────────────────────────────────────────────────────

async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[DraftPoller] TELEGRAM_BOT_TOKEN not set");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("[DraftPoller] DRY RUN \u2014 no messages will be sent");
    const me = await fetch(`${TELEGRAM_API}/getMe`).then((r) => r.json());
    console.log("[DraftPoller] Bot: @" + me.result?.username + " (" + me.result?.first_name + ")");
  }

  try {
    const draftResult = await pollPendingDrafts();
    const summaryCount = await relayLearningSummaries();
    console.log("[DraftPoller] Done: " + draftResult.sent + " drafts sent, " + draftResult.skipped + " skipped, " + summaryCount + " summaries relayed");
  } catch (e) {
    console.error("[DraftPoller] Fatal: " + e.message);
    process.exit(1);
  }
}

main();
