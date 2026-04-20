#!/usr/bin/env node
/**
 * Draft Approval Callback Handler
 *
 * Handles Telegram inline button callbacks for draft approval flow.
 * Called by OpenClaw when it receives a callback_query with draft_* prefix.
 *
 * REVIEW-ONLY MODE (2026-02-26):
 * No emails are sent. This is purely for reviewing AI drafts and recording
 * feedback (approve/edit/reject) so the pipeline can learn from Harry's corrections.
 * Colin still handles his own replies manually.
 *
 * Edit flow auto-appends "KR" sign-off so Harry only needs to write the body.
 *
 * Usage:
 *   node callback-handler.js <callbackQueryId> <callbackData> <chatId> <messageId> <userId>
 *
 * Callback data patterns:
 *   draft_approve:<uuid>            → Mark draft as approved (no email sent)
 *   draft_edit:<uuid>               → Enter edit mode
 *   draft_reject:<uuid>             → Show rejection reasons
 *   draft_reason:<uuid>:<reason>    → Complete rejection
 *   draft_edit_submit:<uuid>        → (internal) Process edited text from stdin
 */
const dotenv = require("dotenv");
dotenv.config({ path: "/home/moltbot/.openclaw/.env" });

const fs = require("fs");
const path = require("path");
const { query, update, insert } = require("./supabase-client");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const EDIT_SESSIONS_FILE = path.join(__dirname, "../../state/draft-edit-sessions.json");
const EDIT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const COLIN_SIGNOFF = "\n\nKR";

// ── Telegram helpers ─────────────────────────────────────────────────

async function answerCallback(callbackQueryId, text, showAlert = false) {
  if (!callbackQueryId) return;
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

async function editMessage(chatId, messageId, text, replyMarkup) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text,
  };
  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendMessage(chatId, text, replyMarkup) {
  const payload = { chat_id: chatId, text };
  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()).result;
}

// ── Edit session state (file-based) ──────────────────────────────────

function loadEditSessions() {
  try {
    if (fs.existsSync(EDIT_SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(EDIT_SESSIONS_FILE, "utf8"));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function saveEditSessions(sessions) {
  const dir = path.dirname(EDIT_SESSIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EDIT_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function cleanupExpiredSessions(sessions) {
  const now = Date.now();
  let changed = false;
  for (const [key, session] of Object.entries(sessions)) {
    if (now - session.startedAt > EDIT_TIMEOUT_MS) {
      delete sessions[key];
      changed = true;
    }
  }
  return changed;
}

// ── Audit log helper ─────────────────────────────────────────────────

async function auditLog(eventType, details) {
  try {
    await insert("moltbot_audit_log", {
      event_type: eventType,
      details,
    });
  } catch (e) {
    console.warn(`[CallbackHandler] Audit log failed: ${e.message}`);
  }
}

// ── Get recruiter from telegram user ID ──────────────────────────────

async function getRecruiter(telegramUserId) {
  try {
    const rows = await query("staff_members", {
      telegram_chat_id: `eq.${telegramUserId}`,
      select: "id,name,email",
      limit: "1",
    });
    return rows[0] || null;
  } catch (e) {
    return null;
  }
}

// ── Handler: draft_approve ───────────────────────────────────────────
// REVIEW-ONLY: Records approval feedback. No email is sent.

async function handleApprove(validationId, callbackQueryId, chatId, messageId, userId) {
  await answerCallback(callbackQueryId, "Approved");

  // Fetch validation
  const rows = await query("derrick_draft_validations", {
    id: `eq.${validationId}`,
    select: "id,candidate_email,subject,original_draft,draft_status",
  });
  const validation = rows[0];
  if (!validation) {
    await editMessage(chatId, messageId, "Error: Draft not found");
    return;
  }
  if (validation.draft_status !== "pending_approval") {
    await editMessage(chatId, messageId, "Already processed.");
    return;
  }

  const recruiter = await getRecruiter(userId);
  const now = new Date().toISOString();
  const approver = recruiter?.name || `User ${userId}`;
  const ts = new Date().toLocaleString("en-GB", { timeZone: "UTC" });

  await update("derrick_draft_validations", {
    draft_status: "approved",
    validation_status: "approved",
    final_version: validation.original_draft,
    validator_id: recruiter?.id || null,
    validated_at: now,
    reviewed_at: now,
    reviewer_telegram_id: userId,
    updated_at: now,
  }, { id: `eq.${validationId}` });

  await editMessage(chatId, messageId,
    `APPROVED\n\n` +
    `To: ${validation.candidate_email}\n` +
    `Subject: ${validation.subject}\n\n` +
    `Approved by ${approver} at ${ts}\n` +
    `No email sent. Draft recorded for learning.`
  );

  await auditLog("draft_approved", {
    validation_id: validationId,
    candidate_email: validation.candidate_email,
    approved_by: approver,
  });

  console.log(`[CallbackHandler] Approved ${validationId} by ${approver}`);
}

// ── Handler: draft_edit ──────────────────────────────────────────────

async function handleEdit(validationId, callbackQueryId, chatId, messageId, userId) {
  await answerCallback(callbackQueryId, "Edit mode");

  // Verify still pending
  const rows = await query("derrick_draft_validations", {
    id: `eq.${validationId}`,
    draft_status: "eq.pending_approval",
    select: "id,original_draft,candidate_email,subject,scenario_type,triage_category",
  });

  if (rows.length === 0) {
    await sendMessage(chatId, "This draft has already been processed.");
    return;
  }

  const validation = rows[0];

  // Save edit session
  const sessions = loadEditSessions();
  cleanupExpiredSessions(sessions);
  const sessionKey = `${chatId}:${userId}`;
  sessions[sessionKey] = {
    validationId,
    chatId,
    userId,
    startedAt: Date.now(),
    originalDraft: validation.original_draft,
    originalMessageId: messageId,
  };
  saveEditSessions(sessions);

  await sendMessage(chatId,
    `Edit Draft\n\n` +
    `Candidate: ${validation.candidate_email}\n` +
    `Subject: ${validation.subject}\n` +
    `Category: ${validation.triage_category || "?"}\n\n` +
    `---\n\n` +
    `Current Draft:\n\n${validation.original_draft}\n\n` +
    `---\n\n` +
    `What would you like to change? Send your edited version.\n` +
    `("KR" sign-off is added automatically — just write the body)`
  );
}

// ── Handler: draft_edit_submit (called when user types replacement text) ──
// REVIEW-ONLY: Records the edit for learning. No email is sent.

async function handleEditSubmit(chatId, userId, editedText) {
  const sessions = loadEditSessions();
  cleanupExpiredSessions(sessions);
  const sessionKey = `${chatId}:${userId}`;
  const session = sessions[sessionKey];

  if (!session) {
    console.log("[CallbackHandler] No active edit session");
    return false; // Not an edit session reply
  }

  // Clean up session
  delete sessions[sessionKey];
  saveEditSessions(sessions);

  const { validationId, originalDraft, originalMessageId } = session;

  // Fetch validation to verify it's still pending
  const rows = await query("derrick_draft_validations", {
    id: `eq.${validationId}`,
    select: "id,candidate_email,subject,draft_status",
  });
  const validation = rows[0];
  if (!validation) {
    await sendMessage(chatId, "Error: Draft not found");
    return true;
  }
  if (validation.draft_status !== "pending_approval") {
    await sendMessage(chatId, "Already processed.");
    return true;
  }

  // Auto-append Colin's sign-off if not already present
  let finalText = editedText.trim();
  const lowerText = finalText.toLowerCase();
  if (!lowerText.endsWith("kr") && !lowerText.endsWith("kind regards") && !lowerText.endsWith("best regards")) {
    finalText += COLIN_SIGNOFF;
  }

  // Compute diff for learning
  const origLines = originalDraft.split("\n");
  const editLines = finalText.split("\n");
  const diffLines = [];
  const maxLen = Math.max(origLines.length, editLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i] || "";
    const edit = editLines[i] || "";
    if (orig !== edit) {
      if (orig) diffLines.push(`- ${orig}`);
      if (edit) diffLines.push(`+ ${edit}`);
    }
  }
  const diff = diffLines.join("\n") || "(no structural changes)";

  // Compute edit distance (character count difference + changed lines)
  const editDistance = Math.abs(originalDraft.length - finalText.length) +
    diffLines.filter(l => l.startsWith("-") || l.startsWith("+")).length;

  const recruiter = await getRecruiter(userId);
  const now = new Date().toISOString();
  const modifier = recruiter?.name || `User ${userId}`;
  const ts = new Date().toLocaleString("en-GB", { timeZone: "UTC" });

  await update("derrick_draft_validations", {
    draft_status: "edited",
    validation_status: "modified",
    final_version: finalText,
    modifications_diff: diff,
    validator_notes: `edit_distance:${editDistance}`,
    validator_id: recruiter?.id || null,
    validated_at: now,
    reviewed_at: now,
    reviewer_telegram_id: userId,
    updated_at: now,
  }, { id: `eq.${validationId}` });

  // Edit original draft message to show it's been processed
  if (originalMessageId) {
    try {
      await editMessage(chatId, originalMessageId,
        `EDITED\n\n` +
        `To: ${validation.candidate_email}\n` +
        `Subject: ${validation.subject}\n\n` +
        `Edited by ${modifier} at ${ts}\n` +
        `No email sent. Edit recorded for learning.`
      );
    } catch (e) { /* original message might be too old to edit */ }
  }

  await sendMessage(chatId,
    `Draft Updated & Recorded\n\n` +
    `Candidate: ${validation.candidate_email}\n\n` +
    `Your version:\n${finalText}\n\n` +
    `No email sent. Your edit has been saved for the pipeline to learn from.`
  );

  await auditLog("draft_edited", {
    validation_id: validationId,
    candidate_email: validation.candidate_email,
    modified_by: modifier,
    edit_distance: editDistance,
  });

  console.log(`[CallbackHandler] Edit recorded for ${validationId} by ${modifier} (distance=${editDistance})`);
  return true;
}

// ── Handler: draft_reject ────────────────────────────────────────────

async function handleReject(validationId, callbackQueryId, chatId, messageId) {
  await answerCallback(callbackQueryId, "Select reason");

  // Verify still pending
  const rows = await query("derrick_draft_validations", {
    id: `eq.${validationId}`,
    draft_status: "eq.pending_approval",
    select: "id",
  });

  if (rows.length === 0) {
    await editMessage(chatId, messageId, "This draft has already been processed.");
    return;
  }

  await sendMessage(chatId, "Why are you rejecting this draft?", {
    inline_keyboard: [
      [
        { text: "Wrong tone", callback_data: `draft_reason:${validationId}:wrong_tone` },
        { text: "Wrong info", callback_data: `draft_reason:${validationId}:wrong_info` },
      ],
      [
        { text: "Not needed", callback_data: `draft_reason:${validationId}:not_needed` },
        { text: "Other", callback_data: `draft_reason:${validationId}:other` },
      ],
    ],
  });
}

// ── Handler: draft_reason ────────────────────────────────────────────

async function handleReason(validationId, reason, callbackQueryId, chatId, messageId, userId) {
  await answerCallback(callbackQueryId, "Rejected");

  const recruiter = await getRecruiter(userId);
  const now = new Date().toISOString();
  const rejector = recruiter?.name || `User ${userId}`;
  const ts = new Date().toLocaleString("en-GB", { timeZone: "UTC" });

  // Fetch validation for the original telegram_message_id
  const rows = await query("derrick_draft_validations", {
    id: `eq.${validationId}`,
    select: "candidate_email,subject,telegram_message_id",
  });
  const validation = rows[0];

  await update("derrick_draft_validations", {
    validation_status: "rejected",
    draft_status: "rejected",
    rejection_reason: reason,
    validator_id: recruiter?.id || null,
    validated_at: now,
    reviewed_at: now,
    reviewer_telegram_id: userId,
    updated_at: now,
  }, { id: `eq.${validationId}` });

  // Edit original draft message
  if (validation?.telegram_message_id) {
    try {
      await editMessage(chatId, validation.telegram_message_id,
        `REJECTED (${reason})\n\n` +
        `To: ${validation.candidate_email}\n\n` +
        `Rejected by ${rejector} at ${ts}\n` +
        `No email sent. Feedback recorded for learning.`
      );
    } catch (e) { /* original might be too old */ }
  }

  // Edit the reason picker message
  await editMessage(chatId, messageId,
    `Draft rejected: ${reason}\n\nNo email sent. This feedback helps the pipeline improve.`
  );

  await auditLog("draft_rejected", {
    validation_id: validationId,
    reason,
    rejected_by: rejector,
  });

  console.log(`[CallbackHandler] Rejected ${validationId} by ${rejector} (${reason})`);
}

// ── Main dispatcher ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Special case: edit submit (text from stdin)
  if (args[0] === "--edit-submit") {
    const chatId = args[1];
    const userId = args[2];
    let editedText = "";
    for await (const chunk of process.stdin) {
      editedText += chunk;
    }
    editedText = editedText.trim();
    if (!editedText) {
      console.log("[CallbackHandler] Empty edit text");
      process.exit(1);
    }
    const handled = await handleEditSubmit(Number(chatId), Number(userId), editedText);
    console.log(handled ? "[CallbackHandler] Edit processed" : "[CallbackHandler] No edit session");
    return;
  }

  // Normal callback: <callbackQueryId> <callbackData> <chatId> <messageId> <userId>
  const [callbackQueryId, callbackData, chatId, messageId, userId] = args;

  if (!callbackData) {
    console.error("Usage: node callback-handler.js <callbackQueryId> <callbackData> <chatId> <messageId> <userId>");
    process.exit(1);
  }

  console.log(`[CallbackHandler] ${callbackData} from ${userId} in ${chatId}`);

  const parts = callbackData.split(":");
  const action = parts[0];
  const validationId = parts[1];

  switch (action) {
    case "draft_approve":
      await handleApprove(validationId, callbackQueryId, Number(chatId), Number(messageId), Number(userId));
      break;
    case "draft_edit":
      await handleEdit(validationId, callbackQueryId, Number(chatId), Number(messageId), Number(userId));
      break;
    case "draft_reject":
      await handleReject(validationId, callbackQueryId, Number(chatId), Number(messageId));
      break;
    case "draft_reason":
      const reason = parts.slice(2).join(":");
      await handleReason(validationId, reason, callbackQueryId, Number(chatId), Number(messageId), Number(userId));
      break;
    default:
      console.error(`[CallbackHandler] Unknown action: ${action}`);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`[CallbackHandler] Fatal: ${e.message}`);
  process.exit(1);
});

module.exports = { handleEditSubmit };
