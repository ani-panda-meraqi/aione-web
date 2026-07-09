# aione-web

Static legal-entity site for **aionellc.com**, deployed on Cloudflare Pages (git-connected).
Hosts the AiOne homepage and the three policy pages that 10DLC / A2P registration requires.
No build step. One Worker (`worker.js`) serves the static files plus a single API route,
`POST /api/contact`, backed by a D1 database (see Contact form below).

```
index.html      Homepage (links to Meraqi + the policies; contact form)
worker.js       Worker entry: static assets + POST /api/contact -> D1
schema.sql      D1 schema for contact-form messages
terms.html      Terms of Service   (governing-law county filled: King, WA)
privacy.html    Privacy Policy      <- carrier-required SMS clause
cookies.html    Cookie Policy
```

Each legal page carries a context banner under the masthead: "These policies apply to
AiOne LLC and all its products, including Meraqi." The Meraqi site links here for Terms,
Privacy, and Cookie, so this is the single source of truth (no policy drift).

## Before publishing
- `[COUNTY]` is filled as **King** (Seattle is in King County). Confirm this is the venue
  you want.
- Governing law is drafted as **Washington**. Confirm Washington vs **Delaware** (change
  the State and the county/venue if the LLC was formed in Delaware; Delaware uses the
  Court of Chancery in New Castle County).
- Public pages list **email contact only** by design. The EIN-matching street address goes
  only in the private Twilio/TCR brand-registration form, not on the website (PO Box not
  accepted there).
- Have counsel review before go-live. Not legal advice.

Contact emails on the pages: `hello@` (general) and `legal@aionellc.com` (canonical for
privacy & legal; `privacy@` and `postmaster@` exist as aliases). The role-based set per
domain also includes info@, product@, sales@, investment@, press@, security@, fraud@,
complaint@, support@, billing@, comments@, admin@, no-reply@. A security.txt lives at
`.well-known/security.txt` (Contact: security@; expires 2027-07-01, refresh yearly). The
addresses are **Google Groups** in Google Workspace (postmaster@/abuse@ cannot be user
accounts or aliases; groups with those names are Google's documented approach). Role groups
need External posting allowed, spam handling "Post directly", and private archives.

## Contact form

The homepage form POSTs JSON to `/api/contact` (handled in `worker.js`) and stores messages
in the `aione-contact` D1 database. Protections: hidden honeypot field (bot submissions are
accepted silently and discarded), server-side validation and length caps, topic restricted
to a fixed enum. Deliberately stored: name (optional), email, topic, message, source_site,
timestamp. Deliberately NOT stored: IP address, user agent. The messages table is shared
company-wide: meraqi.ai binds the same `aione-contact` database when its contact form ships,
and `source_site` records which site each message came from.

One-time setup:

1. `npx wrangler d1 create aione-contact` — copy the printed `database_id` into
   `wrangler.jsonc` (replacing `PASTE_DATABASE_ID_HERE`).
2. `npx wrangler d1 execute aione-contact --remote --file=./schema.sql`

Read messages:

    npx wrangler d1 execute aione-contact --remote --command "SELECT id, created_at, source_site, topic, name, email, substr(message,1,120) AS preview FROM messages ORDER BY id DESC LIMIT 20"

Note: the API route requires the Workers deploy path (`npx wrangler deploy`, matching
`wrangler.jsonc` with `main` + `assets`). If the project is still deployed via git-connected
Pages (section below), the handler must be ported to Pages Functions form
(`functions/api/contact.js`) instead — the static form itself works either way.

## Deploy (git-connected Cloudflare Pages)

1. Push these files to the root of `ani-panda-meraqi/aione-web` (`main` branch).
2. Cloudflare dashboard: **Workers & Pages -> Create -> Pages -> Connect to Git**, pick
   `aione-web`.
3. Build settings: Framework preset **None**, Build command **(empty)**, Build output
   directory **/**. Save and deploy.
4. Custom domain: project **Settings -> Custom domains -> Set up**, add `aionellc.com`
   (and optionally `www.aionellc.com`). DNS is auto-created because the zone is already on
   Cloudflare; TLS is issued automatically.

Pushes to `main` auto-build and deploy. No `CNAME` file is needed (that is a GitHub Pages
artifact); Cloudflare sets the domain in the dashboard.

## URL form
Links use `.html` (e.g. `/terms.html`). Cloudflare Pages also serves the clean path
`/terms`, so the Meraqi footer links to `aionellc.com/terms.html` resolve without a 404.
