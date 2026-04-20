/**
 * Kill Switch — checks approval rate thresholds and auto-triggers if needed.
 * Ported from telegram-webhook/index.ts checkAndTriggerKillSwitch().
 */
const dotenv = require("dotenv");
dotenv.config({ path: "/home/moltbot/.openclaw/.env" });

const { query, update, insert, rpc } = require("./supabase-client");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const KILL_SWITCH_MIN_DECISIONS = 20;
const KILL_SWITCH_MIN_APPROVAL_RATE = 20; // below 20% triggers kill switch
const KILL_SWITCH_WINDOW_HOURS = 48;

/**
 * Check if kill switch should be triggered based on approval stats.
 * If triggered, disables draft sending and notifies Harry.
 * @param {number|string} chatId - Chat to notify if triggered
 */
async function checkKillSwitch(chatId) {
  try {
    const stats = await rpc("fn_draft_approval_stats", {
      p_hours: KILL_SWITCH_WINDOW_HOURS,
    });

    if (!stats || !Array.isArray(stats) || stats.length === 0) return;

    const row = stats[0];
    const totalDecisions = row.total_decisions || 0;
    const approvalRate = Number(row.approval_rate) || 0;

    // Not enough data to trigger
    if (totalDecisions < KILL_SWITCH_MIN_DECISIONS) return;

    // Approval rate is fine
    if (approvalRate >= KILL_SWITCH_MIN_APPROVAL_RATE) return;

    // Check if already active
    const existing = await query("openclaw_config", {
      key: "eq.draft_kill_switch_active",
      select: "value",
    });
    if (existing[0]?.value === "true" || existing[0]?.value === true) {
      return; // Already triggered
    }

    // TRIGGER kill switch
    console.log(
      `[KillSwitch] TRIGGERED: ${approvalRate}% approval rate with ${totalDecisions} decisions (threshold: ${KILL_SWITCH_MIN_APPROVAL_RATE}%)`
    );

    // Update config
    await update("openclaw_config", { value: "true" }, { key: "eq.draft_kill_switch_active" });
    await update("openclaw_config", { value: "false" }, { key: "eq.draft_send_enabled" });

    // Audit log
    await insert("moltbot_audit_log", {
      event_type: "kill_switch_triggered",
      details: {
        approval_rate: approvalRate,
        total_decisions: totalDecisions,
        window_hours: KILL_SWITCH_WINDOW_HOURS,
        threshold: KILL_SWITCH_MIN_APPROVAL_RATE,
      },
    });

    // Notify Harry
    if (chatId && TELEGRAM_BOT_TOKEN) {
      const message =
        `KILL SWITCH TRIGGERED\n\n` +
        `Approval rate: ${approvalRate.toFixed(1)}% (threshold: ${KILL_SWITCH_MIN_APPROVAL_RATE}%)\n` +
        `Decisions in last ${KILL_SWITCH_WINDOW_HOURS}h: ${totalDecisions}\n\n` +
        `Draft sending has been suspended.\n` +
        `Use /resume --confirm to re-enable.`;

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
    }
  } catch (e) {
    console.warn(`[KillSwitch] Check failed: ${e.message}`);
  }
}

module.exports = { checkKillSwitch };
