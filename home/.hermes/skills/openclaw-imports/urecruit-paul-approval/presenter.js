/**
 * URecruit Paul Approval - presenter.js
 * Format candidate cards for Telegram and handle approval workflow
 *
 * Features:
 * - Candidate card generation
 * - Major client warnings with protection options
 * - Double-confirmation on send
 * - Rate limiting (10/hour per director)
 * - READ-ONLY candidate data via edge function proxy (no direct DB access)
 */

const path = require('path');

// Environment setup
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Only for send-gmail-message

// URecruit client for read-only candidate data
let urecruitClient;
try {
  urecruitClient = require('../urecruit-client');
} catch (e) {
  console.warn('[Presenter] URecruit client not available, profile lookups disabled');
}

// Rate limiting config
const RATE_LIMITS = {
  hourlyMax: 10,
  burstMax: 3,
  burstWindow: 5 * 60 * 1000, // 5 minutes
  dailyMax: 50
};

// Send history for rate limiting
const sendHistory = {
  paul: [],
  colin: []
};

// Pending confirmations
const pendingConfirmations = new Map();

/**
 * Format candidate card for Telegram
 */
function formatCandidateCard(candidate, scoreResult) {
  const tier = scoreResult.tier;
  const score = scoreResult.score;

  // Tier emoji and prefix
  const tierEmoji = {
    A: '🎯',
    B: '📋',
    C: '⚠️',
    D: '❌'
  };

  // Build checks list
  const checks = [];
  const warnings = [];

  // Experience check
  if (candidate.experience >= 15) {
    checks.push('Senior level experience');
  } else if (candidate.experience >= 10) {
    checks.push('Experienced professional');
  } else if (candidate.experience) {
    warnings.push(`${candidate.experience} years experience`);
  }

  // Sector check
  if (scoreResult.breakdown.sector >= 20) {
    checks.push('Data center background');
  } else if (scoreResult.breakdown.sector >= 15) {
    checks.push('Construction background');
  } else {
    warnings.push('Adjacent sector');
  }

  // Stability check
  if (scoreResult.flags.includes('job_hopper')) {
    warnings.push('Job hopper pattern');
  } else if (scoreResult.breakdown.stability >= 8) {
    checks.push('Stable employment');
  }

  // Location check
  if (scoreResult.breakdown.location >= 4) {
    checks.push('European location');
  }

  // Build card
  let card = `${tierEmoji[tier] || '📋'} NEW CANDIDATE - Tier ${tier}\n\n`;

  // Major client warning
  if (scoreResult.majorClient && scoreResult.majorClient.isMajor) {
    card = `${tierEmoji[tier] || '📋'} NEW CANDIDATE - Tier ${tier}\n`;
    card += `⚠️ MAJOR CLIENT — RELATIONSHIP PROTECTION\n\n`;
  }

  // Basic info
  card += `👤 ${candidate.name || 'Unknown'}\n`;
  card += `💼 ${candidate.currentRole || 'Role unknown'}\n`;
  if (candidate.experience) {
    card += `⭐ ${candidate.experience} years experience\n`;
  }
  card += `🏢 ${candidate.currentCompany || 'Company unknown'}`;

  // Mark major client
  if (scoreResult.majorClient && scoreResult.majorClient.isMajor) {
    card += ` ⬅️ CURRENT EMPLOYER`;
  }
  card += `\n`;

  if (candidate.location) {
    card += `📍 ${candidate.location}\n`;
  }

  // Major client warning section
  if (scoreResult.majorClient && scoreResult.majorClient.isMajor) {
    card += `\n🚨 WARNING: Candidate currently works at ${scoreResult.majorClient.client.charAt(0).toUpperCase() + scoreResult.majorClient.client.slice(1)} — a major URecruit client.\n`;
    card += `\n📋 Protection Protocol:\n`;
    card += `• Reply will be sent from original outreach email\n`;
    card += `• Junior recruiter persona protects you\n`;
    card += `• Candidate won't know senior leadership is involved\n`;
  }

  // Score section
  card += `\n📊 Quality Score: ${score}/100\n`;

  // Checks and warnings
  checks.forEach(c => {
    card += `✅ ${c}\n`;
  });
  warnings.forEach(w => {
    card += `⚠️ ${w}\n`;
  });

  // Flags
  if (scoreResult.flags.length > 0 && !scoreResult.majorClient?.isMajor) {
    const flagLabels = {
      job_hopper: '🚩 Job hopper',
      sector_mismatch: '🚩 Sector mismatch',
      major_client: '🚩 Major client'
    };
    scoreResult.flags.forEach(f => {
      if (flagLabels[f]) {
        card += `${flagLabels[f]}\n`;
      }
    });
  }

  return card;
}

/**
 * Get buttons for candidate card
 */
function getCandidateButtons(candidate, scoreResult) {
  // Major client requires different buttons
  if (scoreResult.majorClient && scoreResult.majorClient.isMajor) {
    return {
      inline_keyboard: [
        [
          { text: '📧 SEND AS JUNIOR', callback_data: `send_junior:${candidate.id || candidate.email}` },
        ],
        [
          { text: '👤 OVERRIDE AS PAUL', callback_data: `override:${candidate.id || candidate.email}` },
          { text: '❌ SKIP', callback_data: `skip:${candidate.id || candidate.email}` }
        ]
      ]
    };
  }

  // Standard buttons
  return {
    inline_keyboard: [
      [
        { text: '👍 APPROVE', callback_data: `approve:${candidate.id || candidate.email}` },
        { text: '✏️ EDIT', callback_data: `edit:${candidate.id || candidate.email}` },
        { text: '❌ SKIP', callback_data: `skip:${candidate.id || candidate.email}` }
      ]
    ]
  };
}

/**
 * Format draft card for approval
 */
function formatDraftCard(draft, candidate) {
  let card = `📧 DRAFT for ${candidate.name}\n\n`;
  card += `Subject: ${draft.subject}\n\n`;
  card += `${draft.bodyContent}\n\n`;

  // Note about signature
  card += `---\n`;
  card += `[Signature will be appended automatically]\n`;

  if (draft.fromEmail && draft.fromEmail !== 'colin@urecruitglobal.com') {
    card += `\n📤 Sending as: ${draft.fromEmail}\n`;
  }

  return card;
}

/**
 * Get buttons for draft card
 */
function getDraftButtons(draftId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ SEND', callback_data: `send:${draftId}` },
        { text: '✏️ EDIT', callback_data: `edit_draft:${draftId}` },
        { text: '🗑️ DISCARD', callback_data: `discard:${draftId}` }
      ]
    ]
  };
}

/**
 * Format confirmation message
 */
function formatConfirmation(draft, candidate) {
  return `⚠️ Confirm: Send to ${candidate.name} at ${candidate.email}?`;
}

/**
 * Get confirmation buttons
 */
function getConfirmationButtons(draftId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ YES, SEND', callback_data: `confirm_send:${draftId}` },
        { text: '❌ CANCEL', callback_data: `cancel:${draftId}` }
      ]
    ]
  };
}

/**
 * Check rate limit
 */
function checkRateLimit(director) {
  const history = sendHistory[director] || [];
  const now = Date.now();

  // Clean old entries
  const oneHourAgo = now - (60 * 60 * 1000);
  const recentHistory = history.filter(t => t > oneHourAgo);
  sendHistory[director] = recentHistory;

  // Hourly limit
  if (recentHistory.length >= RATE_LIMITS.hourlyMax) {
    return {
      allowed: false,
      reason: `Hourly limit exceeded (${RATE_LIMITS.hourlyMax}/hour). Wait before sending more.`
    };
  }

  // Burst limit
  const burstHistory = recentHistory.filter(t => t > now - RATE_LIMITS.burstWindow);
  if (burstHistory.length >= RATE_LIMITS.burstMax) {
    return {
      allowed: false,
      reason: `Burst limit exceeded (${RATE_LIMITS.burstMax} in 5 minutes). Slow down.`
    };
  }

  return { allowed: true };
}

/**
 * Record a send
 */
function recordSend(director) {
  if (!sendHistory[director]) {
    sendHistory[director] = [];
  }
  sendHistory[director].push(Date.now());
}

/**
 * Send email via edge function
 */
async function sendEmail(draft, candidate) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials');
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-gmail-message`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: candidate.email,
        subject: draft.subject,
        bodyHtml: draft.fullBody,
        from_account: draft.fromEmail || 'colin@urecruitglobal.com',
        thread_id: candidate.threadId
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Email send failed');
  }

  return result;
}

/**
 * Handle button callback
 */
async function handleCallback(callbackData, context = {}) {
  const [action, id] = callbackData.split(':');
  const { candidate, draft, director = 'paul', notifyHarry } = context;

  switch (action) {
    case 'approve':
      // Check if candidate has phone
      if (candidate && candidate.phone) {
        return {
          type: 'phone_available',
          message: `📞 ${candidate.name} - Direct Call Available\n\nPhone: ${candidate.phone}\n\nClick to call: tel:${candidate.phone}`,
          next: 'generate_draft' // Optional: still offer to draft
        };
      }
      return {
        type: 'generate_draft',
        candidateId: id
      };

    case 'send_junior':
      // Major client - send as junior recruiter
      if (notifyHarry) {
        await notifyHarry(`Paul chose JUNIOR persona for ${candidate?.name} at ${candidate?.currentCompany}`);
      }
      return {
        type: 'generate_draft',
        candidateId: id,
        fromEmail: context.originalSenderEmail || 'harry@urecruitglobal.com',
        note: 'Sending as junior recruiter to protect relationship'
      };

    case 'override':
      // Major client - override and send as Paul
      if (notifyHarry) {
        await notifyHarry(`⚠️ Paul OVERRIDE for ${candidate?.name} at ${candidate?.currentCompany} — sending as himself`);
      }
      return {
        type: 'generate_draft',
        candidateId: id,
        fromEmail: 'paul@urecruitglobal.com',
        note: 'OVERRIDE: Paul accepting risk of direct contact'
      };

    case 'skip':
      return {
        type: 'skipped',
        candidateId: id,
        message: `❌ Skipped ${candidate?.name || id}`
      };

    case 'edit':
      return {
        type: 'edit_mode',
        candidateId: id,
        message: `✏️ EDIT MODE - ${candidate?.name}\n\nReply with:\n• Voice note with changes\n• Text: "Change [X] to [Y]"\n• "Make it [shorter/longer]"\n\nOr tap 🔄 REGENERATE to start fresh.`
      };

    case 'send':
      // First tap - show confirmation
      pendingConfirmations.set(id, { draft, candidate, timestamp: Date.now() });
      return {
        type: 'confirm',
        message: formatConfirmation(draft, candidate),
        buttons: getConfirmationButtons(id)
      };

    case 'confirm_send':
      // Second tap - actually send
      const pending = pendingConfirmations.get(id);
      if (!pending) {
        return {
          type: 'error',
          message: '❌ Confirmation expired. Please try again.'
        };
      }

      // Check rate limit
      const rateCheck = checkRateLimit(director);
      if (!rateCheck.allowed) {
        return {
          type: 'rate_limited',
          message: `🚫 ${rateCheck.reason}`
        };
      }

      try {
        const result = await sendEmail(pending.draft, pending.candidate);
        recordSend(director);
        pendingConfirmations.delete(id);

        return {
          type: 'sent',
          message: `✅ Email sent to ${pending.candidate.name} (${pending.candidate.email})`,
          result
        };
      } catch (error) {
        return {
          type: 'error',
          message: `❌ Send failed: ${error.message}\nHarry has been notified.`
        };
      }

    case 'cancel':
      pendingConfirmations.delete(id);
      return {
        type: 'cancelled',
        message: '❌ Send cancelled.'
      };

    case 'discard':
      return {
        type: 'discarded',
        message: '🗑️ Draft discarded.'
      };

    default:
      return {
        type: 'unknown',
        message: `Unknown action: ${action}`
      };
  }
}

/**
 * Format phone notification
 */
function formatPhoneNotification(candidate) {
  return `📞 ${candidate.name} - Direct Call Available\n\nPhone: ${candidate.phone}\n\nClick to call: tel:${candidate.phone.replace(/\s/g, '')}`;
}

/**
 * Format send success message
 */
function formatSendSuccess(candidate, draft) {
  return `✅ Email sent!\n\nTo: ${candidate.name}\nSubject: ${draft.subject}`;
}

/**
 * Format send failure message
 */
function formatSendFailure(error, candidate) {
  return `❌ Send failed!\n\nTo: ${candidate.name}\nError: ${error.message}\n\nHarry has been notified.`;
}

/**
 * Log decision for learning
 */
function logDecision(candidate, scoreResult, decision, editMade = false, editType = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    candidate: candidate.name,
    tier: scoreResult.tier,
    score: scoreResult.score,
    decision,
    editMade,
    editType,
    majorClient: scoreResult.majorClient?.isMajor || false
  };

  // In production, this would write to a file or database
  console.log('[Approval] Decision logged:', JSON.stringify(logEntry));

  return logEntry;
}

/**
 * Fetch real candidate profile from URecruit dashboard
 * Returns enriched candidate data with real profile URL
 */
async function fetchCandidateProfile(candidateIdOrEmail) {
  if (!urecruitClient) {
    return {
      error: 'URecruit client not available',
      profileUrl: null
    };
  }

  try {
    const isEmail = candidateIdOrEmail.includes('@');
    const options = isEmail
      ? { email: candidateIdOrEmail }
      : { candidateId: candidateIdOrEmail };

    const profile = await urecruitClient.fetchCandidateProfile(options);
    return profile;
  } catch (error) {
    console.error('[Presenter] Profile fetch error:', error.message);
    return {
      error: error.message,
      profileUrl: null
    };
  }
}

/**
 * Format enriched candidate card with real dashboard link
 */
function formatEnrichedCandidateCard(candidate, scoreResult, profile) {
  // Start with basic card
  let card = formatCandidateCard(candidate, scoreResult);

  // Add real profile link if available
  if (profile && profile.profileUrl) {
    card = `🔗 **Dashboard:** ${profile.profileUrl}\n\n` + card;

    // Add extra info from profile
    if (profile.latestNote) {
      const notePreview = profile.latestNote.length > 80
        ? profile.latestNote.substring(0, 80) + '...'
        : profile.latestNote;
      card += `\n📝 **Note:** ${notePreview}`;
    }

    if (profile.conversationState && profile.conversationState !== 'unknown') {
      card += `\n💬 **Status:** ${profile.conversationState}`;
    }
  }

  return card;
}

// Export
module.exports = {
  formatCandidateCard,
  getCandidateButtons,
  formatDraftCard,
  getDraftButtons,
  formatConfirmation,
  getConfirmationButtons,
  formatPhoneNotification,
  formatSendSuccess,
  formatSendFailure,
  checkRateLimit,
  recordSend,
  sendEmail,
  handleCallback,
  logDecision,
  fetchCandidateProfile,
  formatEnrichedCandidateCard,
  RATE_LIMITS
};
