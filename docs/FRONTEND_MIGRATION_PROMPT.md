# Frontend Migration Prompt — Resolve legacy API → new NestJS API

> **How to use this document:** paste the whole thing to the UI/frontend agent
> (or developer) working in either frontend repo. It is self-contained: it
> names the exact files to change, the exact old and new API contracts, and
> the UX restructure required. Do not skip §2 — the signup flow fundamentally
> changed shape, it is not a URL swap.

---

## 0. Current status: BOTH FRONTENDS ARE BROKEN IN PRODUCTION

`https://resolveapi.rearway.com` now serves a **completely new backend**. The
old endpoints no longer exist — verified live:

| Request | Result now |
|---|---|
| `POST /api/bots/create` (old signup) | **404** — route gone |
| `POST /api/chat/:botId` (old demo chat) | **404** — route gone |
| `GET /api/v1/bots/98a00fd4-d226-4548-9fa6-e857dc846ee2` (the hardcoded demo bot) | **404 BOT_NOT_FOUND** — that bot only existed in the old SQLite database |

So right now, on both live sites, the signup form fails and the live demo
chat fails. This migration is a fix, not an enhancement.

---

## 1. Files that must change

### Repo A — `rearway-tech-canvas` (www.rearway.com)
| File | What it does | Line (approx) |
|---|---|---|
| `src/components/ui/ResolveSalesModal.tsx` | Signup / bot creation (trial branch) | ~88 |
| `src/pages/ResolvePage.tsx` | Live demo chat (`LiveDemo` component) | ~43 |

### Repo B — `resolve` (www.resolve.rearway.com)
| File | What it does | Line (approx) |
|---|---|---|
| `src/pages/SignUp.tsx` | Signup / bot creation (3-step wizard) | ~62 |
| `src/components/ui/LiveDemoWidget.tsx` | Live demo chat | ~66 |

> Note: `rearway-tech-canvas/src/components/ui/ChatBot.tsx` calls `/api/chat`
> — that is the site's **own Vercel serverless function** (`api/chat.js`), a
> different system. **Do not touch it.**

These two repos contain **duplicated implementations of the same two
features**. Both must be migrated, or the duplication must be removed first —
see §7.

---

## 2. The signup flow changed shape (most important change)

**Old flow — 1 anonymous request:**
```
user fills form → POST /api/bots/create (multipart, no auth) → bot created
```

**New flow — 3 requests, with an email round-trip in the middle:**
```
1. user enters email        → POST /api/v1/auth/otp/request  {email}
2. user checks inbox, enters 6-digit code
                            → POST /api/v1/auth/otp/verify   {email, code}
                            → returns verificationToken (valid 30 min)
3. user fills bot details   → POST /api/v1/bots (multipart)
                              Authorization: Bearer <verificationToken>
                            → bot created
```

The user must now **leave the page, open their email, and come back with a
code** before a bot can be created. Plan the UI for this: the existing
2-step wizard becomes roughly 4 steps (basics → verify email → training data
→ result), with resend-code handling and a clear "check your inbox" state.

### Field changes on bot creation
| Field | Old | New |
|---|---|---|
| `companyName` | required | required (unchanged) |
| `email` | **required in form body** | **REMOVED** — taken from the verified token |
| `plan` | sent as `'trial'` | **REMOVED** — always trial server-side |
| `businessType` | optional | optional (unchanged) |
| `websiteUrl` | optional | optional (unchanged) |
| `description` | optional | optional (unchanged) |
| `pdf` | optional file | optional file, **max 10MB** (was 20MB) |
| `fallbackMessage` | — | **NEW** optional — custom "I don't know" message |
| `contactEmail` | — | **NEW** optional — shown in fallback; defaults to signup email |

### Response envelope changed
```jsonc
// OLD — flat, with a `success` boolean
{ "success": true, "botId": "...", "widgetSnippet": "...", "previewUrl": "...", "chunkCount": 42 }

// NEW — nested under `data`, NO `success` field
{
  "message": "Bot created successfully",
  "data": {
    "botId": "...",
    "embedToken": "...",        // NEW — see §4, returned ONCE and never again
    "widgetSnippet": "...",     // now includes a data-embed-token attribute
    "previewUrl": "...",
    "chunkCount": 42,
    "pagesScraped": 3           // optional
  }
}
```

**Both repos currently branch on `if (data.success)`** — that field no longer
exists, so this check will always be falsy. It must become an HTTP status
check (`res.ok`) plus reading from `data.data.*`.

---

## 3. The chat flow changed shape

**Old — 1 request:**
```js
POST /api/chat/{botId}
body: { message, sessionId }        // client-generated sessionId
→ { answer, sessionId }
```

**New — 2 requests, session first:**
```js
// once, on widget load:
POST /api/v1/bots/{botId}/session
headers: { 'X-Embed-Token': <embedToken> }
→ { message, data: { sessionId, sessionToken, expiresIn } }

// per message:
POST /api/v1/bots/{botId}/chat
headers: {
  'Content-Type': 'application/json',
  'X-Embed-Token': <embedToken>,
  'Authorization': 'Bearer ' + <sessionToken>
}
body: { message }                   // NO sessionId — it lives in the token
→ see response shapes below
```

The client no longer invents its own session id. Both repos currently do
`sessionId.current = \`demo-${Date.now()}\`` — delete that; the server issues it.

### Chat response is now a discriminated union
```jsonc
// The bot could answer from its content:
{ "type": "answer", "answer": "We're open 9am–6pm.", "sessionId": "..." }

// The bot could NOT answer — show a distinct "contact us" style bubble:
{ "type": "fallback",
  "fallback": { "message": "I don't have that specific information — contact us at hi@acme.com…",
                "contactEmail": "hi@acme.com" },
  "sessionId": "..." }
```
Both repos currently read `data.answer` with a hardcoded fallback string.
That must become a `switch` on `data.type`. Render `fallback` visually
differently from `answer` (the shipped `widget.js` uses an amber/bordered
bubble with a `mailto:` link) — this is a product feature, not an error.

---

## 4. `embedToken` — new required credential

Every chat/session call needs the bot's `embedToken`. It is returned **exactly
once**, in the `POST /api/v1/bots` response, and never again by any endpoint
(`GET /api/v1/bots/:botId` deliberately strips it).

- **On the signup success screen:** the `widgetSnippet` already contains it —
  just render/copy the snippet as before. But if you store bot info for the
  user, capture `embedToken` at creation time; it cannot be re-fetched.
- **For the marketing-site demo widget:** the demo bot's `embedToken` must be
  hardcoded (or put in an env var) in the frontend. That is acceptable for a
  public demo bot — it is the same trust model as the `<script data-embed-token>`
  snippet customers paste into their own sites. Do **not** reuse a real
  customer's embed token this way.

---

## 5. New error responses to handle

Error body shape is now `{ "error": "<CODE>", "message": "...", ...extra }`.

| Status | `error` code | When | Suggested UI |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | No content source given | Inline form error |
| 401 | `INVALID_OTP` / `OTP_EXPIRED` | Wrong/expired code | "Incorrect code" + resend option |
| 401 | `VERIFICATION_TOKEN_EXPIRED` | >30 min since verifying | Send back to email-verify step |
| 401 | `EMBED_TOKEN_INVALID` / `SESSION_TOKEN_INVALID` | Bad/revoked token | Re-run session-start once, then fail |
| 402 | `trial_expired` / `token_limit_reached` | Trial over / allowance used | Show message + upgrade CTA (body has `upgradeUrl`) |
| 403 | `ORIGIN_NOT_ALLOWED` | Origin ≠ bot's registered website | See §6 — usually a config problem, not a user problem |
| 413 | — | PDF over 10MB | "File too large (max 10MB)" |
| 422 | `INGESTION_FAILED` | Website scrape found nothing | "We couldn't read that site — add a description" |
| 429 | `OTP_RESEND_TOO_SOON` | Resend within 60s | Disable resend button w/ countdown (`retryAfterSeconds` in body) |
| 429 | `rate_limit_exceeded` | 15 msgs/day/IP on a trial bot | Disable input, show the message |

---

## 6. ⚠️ Before the demo widget can work: recreate the demo bot

The hardcoded `DEMO_BOT_ID = '98a00fd4-d226-4548-9fa6-e857dc846ee2'` is dead
(404). A new demo bot must be created against the new API, and **two
non-obvious constraints apply**:

1. **Create it with NO `websiteUrl`.** The backend's origin check compares the
   request's `Origin` hostname against the bot's registered `websiteUrl`
   hostname. `rearway.com` and `resolve.rearway.com` are *different* hostnames,
   so a demo bot registered to one domain would return **403 on the other**.
   A bot created without a `websiteUrl` skips the origin check entirely and
   works from both sites. Use `description` (and/or a PDF) as the content
   source instead.

2. **Trial bots expire in 30 days and cap at 50,000 tokens.** A demo bot
   created through the normal endpoint is a trial bot, so the marketing demo
   will start returning **402 after ~30 days**. Before launch, decide with the
   backend owner how the demo bot stays alive (e.g. manually clearing
   `expires_at` / raising `token_limit` in Postgres, or adding backend support
   for a non-expiring demo plan). **Flag this — do not silently ship a demo
   that dies in a month.**

Also note the demo bot inherits the **15 messages/day/IP** trial rate limit.

---

## 7. Recommended: remove the duplication before migrating

Both repos implement the same signup form and the same demo chat widget
against the same API. Migrating both means doing this work twice now, and
again on every future API change. Strongly consider, **before** migrating:

- **Make signup exist in exactly one place** — keep it in the `resolve` app
  (`resolve.rearway.com/signup`) and change the `rearway.com/resolve` page's
  CTA from opening `ResolveSalesModal`'s trial branch to simply linking to the
  signup page. Keep the sales-enquiry (non-trial) branch of that modal as-is —
  it's a genuinely different flow that emails the sales team and does not
  touch this API. This deletes one full copy of the integration.
- **For the demo widget**, either extract it into a package both apps import,
  or embed the product's own already-built `widget.js` script
  (`https://resolveapi.rearway.com/widget/widget.js`) — it *already* implements
  the entire new session+chat+fallback flow correctly, so it needs zero
  migration and updates itself in future.

If the duplication is kept, apply every change in this document to both repos
identically.

---

## 8. Acceptance criteria

- [ ] Signup: request OTP → email arrives → verify code → create bot → success screen shows `widgetSnippet` + `previewUrl` (all reading from `data.data.*`)
- [ ] Expired/invalid OTP, and resend-cooldown (429), are handled with clear UI
- [ ] Verification token expiring mid-flow (>30 min) returns the user to the verify step rather than a dead error
- [ ] PDF over 10MB is rejected client-side with a friendly message before upload
- [ ] Demo widget: calls `/session` once on load, then `/chat` per message with both headers
- [ ] Demo widget renders `type: "fallback"` responses visually distinctly from `type: "answer"`
- [ ] Demo widget handles 402 and 429 by disabling input and showing the server's message
- [ ] No `data.success` checks remain anywhere
- [ ] No client-generated `sessionId` remains anywhere
- [ ] A new demo bot exists (created with **no** `websiteUrl`), its id + embed token are configured, and the 30-day-expiry question in §6 has an owner

---

## 9. Reference

- Live interactive API docs: **https://resolveapi.rearway.com/api/docs**
- Full backend architecture: `rearway-custom-rag/docs/ARCHITECTURE_AND_IMPLEMENTATION.md`
- A working reference implementation of the **entire new chat flow** (session
  start, both headers, fallback rendering, 401 retry, 402/429 handling) already
  exists in vanilla JS at `rearway-custom-rag/public/widget.js` — read it before
  writing the React version.
