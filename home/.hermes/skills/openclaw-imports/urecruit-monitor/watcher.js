/**
 * URecruit Email Monitor - watcher.js
 * Supabase Realtime subscription to emails table
 * Filters inbound candidate emails and triggers scorer
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Environment setup
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials in environment');
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Email filtering patterns
const PROFILE_INDICATORS = [
  /\d+\s*years?\s*(experience|exp)/i,
  /CV|resume|curriculum/i,
  /currently\s*at/i,
  /linkedin\.com/i,
  /€|$|\bp\.d\.|day\s*rate/i,
  /notice\s*period/i,
  /available|availability/i
];

const SYSTEM_DOMAINS = [
  'urecruit',
  'system',
  'noreply',
  'mailer-daemon',
  'postmaster'
];

/**
 * Check if email contains profile/candidate information
 */
function hasProfileInfo(email) {
  const content = (email.body || '') + ' ' + (email.subject || '');
  return PROFILE_INDICATORS.some(pattern => pattern.test(content));
}

/**
 * Check if email is a reply to outreach
 */
function isReplyToOutreach(email) {
  const subject = (email.subject || '').toLowerCase();
  return subject.startsWith('re:') || subject.includes('re: ');
}

/**
 * Check if sender is a system/internal email
 */
function isSystemEmail(email) {
  const from = (email.from_address || email.from || '').toLowerCase();
  return SYSTEM_DOMAINS.some(domain => from.includes(domain));
}

/**
 * Main filter: Is this a candidate email worth processing?
 */
function isCandidateEmail(email) {
  // Must be inbound
  if (email.direction !== 'inbound') return false;
  
  // Skip system emails
  if (isSystemEmail(email)) return false;
  
  // Must have profile info OR be a reply to outreach
  return hasProfileInfo(email) || isReplyToOutreach(email);
}

/**
 * Extract candidate info from email
 */
function extractCandidateInfo(email) {
  const body = email.body || '';
  const subject = email.subject || '';
  
  // Extract experience years
  const expMatch = body.match(/(\d+)\s*years?\s*(experience|exp|in construction|in the industry)/i);
  const experience = expMatch ? parseInt(expMatch[1]) : null;
  
  // Extract rate/day rate
  const rateMatch = body.match(/[€$]\s*(\d+[,.]?\d*)\s*(?:\/|per)?\s*day/i);
  const rate = rateMatch ? rateMatch[1].replace(',', '') : null;
  
  // Check for CV attachment
  const hasCV = (email.attachments || []).some(att => 
    /\.(pdf|doc|docx)$/i.test(att.filename || att.name || '')
  );
  
  // Extract phone number
  const phoneMatch = body.match(/(?:\+\d{1,3}\s?)?(?:\(\d{2,4}\)\s?)?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : null;
  
  return {
    email: email.from_address || email.from,
    experience,
    rate,
    hasCV,
    phone,
    threadId: email.thread_id,
    originalSubject: subject,
    receivedAt: email.created_at
  };
}

/**
 * Watcher class - manages Realtime subscription with fallback polling
 */
class EmailWatcher {
  constructor(options = {}) {
    this.onCandidateEmail = options.onCandidateEmail || console.log;
    this.onError = options.onError || console.error;
    this.channel = null;
    this.isConnected = false;
    this.pollInterval = null;
    this.lastPollTime = new Date();
    this.processedIds = new Set();
  }
  
  /**
   * Start watching for new emails
   */
  async start() {
    console.log('[Monitor] Starting email watcher...');
    
    // Try Realtime first
    try {
      await this.startRealtime();
    } catch (err) {
      console.warn('[Monitor] Realtime failed, falling back to polling:', err.message);
      this.startPolling();
    }
    
    return this;
  }
  
  /**
   * Start Supabase Realtime subscription
   */
  async startRealtime() {
    this.channel = supabase
      .channel('email-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails',
          filter: 'direction=eq.inbound'
        },
        (payload) => this.handleNewEmail(payload.new)
      )
      .subscribe((status) => {
        console.log('[Monitor] Realtime status:', status);
        this.isConnected = status === 'SUBSCRIBED';
        
        if (!this.isConnected && !this.pollInterval) {
          console.log('[Monitor] Connection lost, starting fallback polling');
          this.startPolling();
        }
      });
    
    console.log('[Monitor] Realtime subscription started');
  }
  
  /**
   * Fallback polling if Realtime drops
   */
  startPolling() {
    if (this.pollInterval) return;
    
    const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    this.pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('emails')
          .select('*')
          .eq('direction', 'inbound')
          .gt('created_at', this.lastPollTime.toISOString())
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        for (const email of (data || [])) {
          if (!this.processedIds.has(email.id)) {
            this.handleNewEmail(email);
          }
        }
        
        this.lastPollTime = new Date();
      } catch (err) {
        this.onError(err);
      }
    }, POLL_INTERVAL);
    
    console.log('[Monitor] Polling fallback started (every 5 min)');
  }
  
  /**
   * Handle a new email
   */
  handleNewEmail(email) {
    // Skip if already processed
    if (this.processedIds.has(email.id)) return;
    this.processedIds.add(email.id);
    
    // Limit memory usage - keep last 1000 IDs
    if (this.processedIds.size > 1000) {
      const ids = Array.from(this.processedIds);
      this.processedIds = new Set(ids.slice(-500));
    }
    
    console.log('[Monitor] New email:', email.id, 'from:', email.from_address);
    
    // Filter for candidate emails
    if (isCandidateEmail(email)) {
      console.log('[Monitor] ✓ Candidate email detected');
      
      const candidateInfo = extractCandidateInfo(email);
      
      this.onCandidateEmail({
        email,
        candidate: candidateInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[Monitor] ✗ Not a candidate email, skipping');
    }
  }
  
  /**
   * Stop watching
   */
  async stop() {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    this.isConnected = false;
    console.log('[Monitor] Email watcher stopped');
  }
}

/**
 * Factory function for easy use
 */
function watchEmails(options) {
  const watcher = new EmailWatcher(options);
  watcher.start();
  return watcher;
}

// Export everything
module.exports = {
  EmailWatcher,
  watchEmails,
  isCandidateEmail,
  isReplyToOutreach,
  hasProfileInfo,
  extractCandidateInfo,
  supabase
};
