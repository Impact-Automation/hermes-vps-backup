/**
 * Supabase REST API client for OpenClaw VPS skills.
 * Uses service role key for full access (bypasses RLS).
 */
const dotenv = require("dotenv");
dotenv.config({ path: "/home/moltbot/.openclaw/.env" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

/**
 * GET rows from a table with query params.
 * @param {string} table - Table name
 * @param {Record<string,string>} params - Query params (e.g. { draft_status: "eq.pending_approval" })
 * @returns {Promise<any[]>}
 */
async function query(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase GET ${table} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  return res.json();
}

/**
 * PATCH (update) rows matching a filter.
 * @param {string} table
 * @param {Record<string,any>} data - Columns to update
 * @param {Record<string,string>} match - Filter params (e.g. { id: "eq.uuid" })
 * @returns {Promise<any[]>}
 */
async function update(table, data, match = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(match)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PATCH ${table} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  return res.json();
}

/**
 * POST (insert) a row.
 * @param {string} table
 * @param {Record<string,any>} data
 * @returns {Promise<any[]>}
 */
async function insert(table, data) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase INSERT ${table} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  return res.json();
}

/**
 * Call an RPC function.
 * @param {string} fnName - Function name (e.g. "fn_acquire_send_lock")
 * @param {Record<string,any>} params - Function parameters
 * @returns {Promise<any>}
 */
async function rpc(fnName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase RPC ${fnName} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * Call a Supabase Edge Function.
 * @param {string} fnName - Edge function name
 * @param {Record<string,any>} body - Request body
 * @returns {Promise<any>}
 */
async function edgeFunction(fnName, body = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Edge function ${fnName} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  return res.json();
}

module.exports = { query, update, insert, rpc, edgeFunction, SUPABASE_URL, SUPABASE_KEY };
