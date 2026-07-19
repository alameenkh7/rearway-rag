# Working agreement

## Ask first — don't explore

**Ask before searching or reading around the codebase.** The maintainer will
supply the context you need. Do not fan out across files, grep broadly, or
launch exploration agents to build your own picture of the repo. If you need to
know how something works, name the specific thing you want to know and ask.

**Ask before running anything.** State the exact command and what it will do,
then wait. This applies to commands that look harmless — a script that failed
five times for an unrelated reason is not proven safe, it is only unproven.

**Never run these without an explicit go-ahead:** seeders, migrations, anything
touching a database, anything that writes to a remote host.

This agreement exists because it was broken: `scripts/seed-demo-bots.js` was run
as a "wiring smoke test" on the assumption it would fail at the API key, as it
had every previous time. The key had just been fixed, so it ran to completion
and created three bots and an admin user in a live database. Intent to test is
not a safeguard — check before running, not after.

## Reporting

State what actually happened, including the parts that went wrong. If a command
was run that shouldn't have been, say so plainly and first, before any results.
Do not soften it or bury it under what was accomplished.

Distinguish verified facts from inferences. `/proc/<pid>/environ` was once read
to conclude "production has no API key" — that file is an exec-time snapshot and
cannot see anything `ConfigModule` loads from `.env` at runtime, and the
processes inspected were local rather than production. Two wrong inferences from
one unsound method. If a check cannot support a conclusion, don't draw it.

---

# Environment notes

Hard-won details that are easy to get wrong and expensive to rediscover.

## Run scripts from `server/`, never the repo root

`ConfigModule.forRoot()` resolves `.env` relative to the **current working
directory**. Running a script from the repo root silently loads the wrong file
and reports missing environment variables that are in fact present.

Consequence: read `process.env` only *after* the Nest context is created.
Reading it at module scope returns undefined for anything defined in `.env`,
because `ConfigModule` has not run yet.

## The LLM key variable is `OPENROUTER_API_KEY`

`open-router.service.ts` reads `process.env.OPENROUTER_API_KEY` and points at
`baseURL: https://openrouter.ai/api/v1`. Naming the variable `OPENAI_API_KEY`
leaves the key undefined, the SDK sends `Bearer undefined`, and OpenRouter
replies `401 User not found.` — which reads like an invalid key rather than a
missing one. An OpenAI key will not work here either; the service expects an
OpenRouter key (`sk-or-v1-...`).

## `dist/` layout differs between environments

Local builds emit `dist/app.module.js`. The EC2 deploy at
`/home/ec2-user/backup/rearway-rag/server` emits `dist/src/app.module.js` —
compiling `scripts/` alongside `src/` makes tsc add the common parent prefix.

Scripts that require compiled code must probe both shapes rather than assume
one. `scripts/seed-demo-bots.js` does this via its `DIST` resolver.

Prod runs production-only `node_modules`: no `ts-node`, no `tsconfig-paths`.
Anything meant to run there must be plain JS requiring from `dist/`, which is
why `seed-demo-bots.js` exists alongside the `.ts` twin.

## Domain errors thrown from guards

`BaseError` extends `Error`, not `HttpException`, and `@HandleRagErrors` only
wraps controller handler bodies. Guards run earlier in the pipeline, so
guard-thrown errors bypassed it and surfaced as generic 500s — including the
401s the widget's retry path depends on. `shared/filters/domain-error.filter.ts`
(registered in `main.ts`) now catches these globally. Its response body must
stay byte-identical to the decorator's `{ error, message, ...details }`.

## Demo bots

`CreateBot` hardcodes trial semantics — `plan: 'trial'`, a 30-day `expiresAt`,
and a 50k `tokenLimit` — all enforced at request time. Demo bots are patched out
of these after creation, or they die mid-demo. Clearing `plan` also lifts
`RateLimitGuard`'s daily per-IP cap, which applies only to trial bots.

Demo bots are created with **no `websiteUrl`**: `OriginCheckGuard` is a
documented no-op when it is null, so the widget works from `rearway.com`,
`www.rearway.com`, and `resolve.rearway.com` without a 403.

There is no add-content-to-an-existing-bot endpoint. Training happens only at
creation, from the PDF / crawl / description inputs.

## Chat response shape

`POST /bots/:id/chat` returns a tagged union — `{ type: 'answer', answer,
sessionId }` or `{ type: 'fallback', fallback: { message, contactEmail },
sessionId }`. Branch on `type`, not on `answer` being truthy. Session auth is
`Authorization: Bearer <sessionToken>`; the embed token is `X-Embed-Token`.
