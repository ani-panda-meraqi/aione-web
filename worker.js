// Worker entry for aionellc.com — serves the static site plus one API route.
// Deploy: npx wrangler deploy   (Workers static assets; config in wrangler.jsonc)
//
// POST /api/contact — store a contact-form message in Cloudflare D1.
// Modeled on meraqi-web's waitlist function:
//   - D1 is reachable only through this server-side code via the DB binding.
//     The browser never touches the database.
//   - The query is parameterized (.bind), so input cannot be injected.
//   - Honeypot: bots fill the hidden "company" field, humans never see it;
//     those submissions are accepted silently and stored nowhere.
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
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
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

  if (body && typeof body.company === "string" && body.company.trim() !== "") {
    return json({ ok: true }, 200); // honeypot hit: accept silently, store nothing
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
    await env.DB.prepare(
      "INSERT INTO messages (name, email, topic, message, source_site, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(name || null, email, topic, message, "aionellc.com", new Date().toISOString()).run();
  } catch (e) {
    return json({ error: "Could not send right now. Please email hello@aionellc.com." }, 500);
  }

  return json({ ok: true }, 200);
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
