// Worker entry for aionellc.com — serves the static site plus one API route.
// Deploy: npx wrangler deploy   (Workers static assets; config in wrangler.jsonc)
//
// POST /api/contact — store a contact-form message in Cloudflare D1.
// Modeled on meraqi-web's waitlist function:
//   - D1 is reachable only through this server-side code via the DB binding.
//     The browser never touches the database.
//   - The query is parameterized (.bind), so input cannot be injected.
//   - Honeypot: bots fill the hidden "hp" field, humans never see it; those
//     submissions are accepted silently, stored nowhere, and never reported as
//     saved. The field used to be "company", which browser autofill fills, so a
//     real message could be dropped while the page said thank you. "company" is
//     still read for pages cached before the rename.
//   - The inserted row is read back by its id before the response says
//     saved: true, and the page thanks the visitor only on saved: true.
//   - Topic is an enforced enum (TOPICS below), not just a UI dropdown.
//   - Only what is needed to reply is stored: no IP, no user agent,
//     and no console logging of PII.

const TOPICS = new Set([
  "general", "product", "sales", "investment", "press",
  "privacy_legal", "security", "fraud_abuse", "complaint",
  // meraqi.ai will add "deployment" (private cloud / on-prem) when its form ships
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { allow: "POST" });
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Honeypot: real users never fill the hidden field; bots do. Accept silently and store
  // nothing, but do NOT report the message as saved, so the page never thanks anyone for a
  // message that was dropped. The field is named "hp" because browser autofill fills fields
  // called "company"; "company" is still read for pages cached before the rename.
  const trap = body ? (body.hp ?? body.company) : "";
  if (typeof trap === "string" && trap.trim() !== "") {
    return json({ ok: true }, 200);
  }

  const name = String((body && body.name) || "").trim().slice(0, 120);
  const email = String((body && body.email) || "").trim().toLowerCase();
  const topic = String((body && body.topic) || "").trim();
  const message = String((body && body.message) || "").trim();

  if (email.length < 3 || email.length > 254 || !isEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (!TOPICS.has(topic)) {
    return json({ error: "Pick a topic from the list." }, 400);
  }
  if (message.length < 2 || message.length > 5000) {
    return json({ error: "Write a message (up to 5,000 characters)." }, 400);
  }

  try {
    const res = await env.DB.prepare(
      "INSERT INTO messages (name, email, topic, message, source_site, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(name || null, email, topic, message, "aionellc.com", new Date().toISOString()).run();

    // Read the row back by its id before confirming. The page says thank you only when
    // saved is true, so that message always reflects a committed row.
    const id = res && res.meta ? res.meta.last_row_id : null;
    const row = id == null ? null : await env.DB.prepare(
      "SELECT 1 AS present FROM messages WHERE id = ? LIMIT 1"
    ).bind(id).first();
    if (!row) {
      return json({ error: "Could not send right now. Please email hello@aionellc.com." }, 500);
    }
  } catch (e) {
    return json({ error: "Could not send right now. Please email hello@aionellc.com." }, 500);
  }

  return json({ ok: true, saved: true }, 200);
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...(extraHeaders || {}) },
  });
}
