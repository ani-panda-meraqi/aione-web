# aione-web

Static legal-entity site for **aionellc.com**, deployed on Cloudflare Pages (git-connected).
Hosts the AiOne homepage and the three policy pages that 10DLC / A2P registration requires.
Pure static: no build step, no functions, no bindings.

```
index.html      Homepage (links to Meraqi + the policies)
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

Contact emails default to `hello@`, `privacy@`, and `legal@aionellc.com`. Cloudflare
**Email Routing** (free) forwards those to your inbox without a paid mailbox.

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
