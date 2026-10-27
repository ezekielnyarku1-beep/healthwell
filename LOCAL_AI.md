# HealthWell local AI prototype

Implemented October 27, 2026. This is a fictional-data development prototype. No billing, API credits, cloud service, deployment, or live Gemini request was activated. No local language model is installed or claimed.

## Run it

Use Node 22 or later and the existing dependencies (`npm ci` if needed).

- `npm start`: existing website plus a browser-only scripted chat. No chat traffic leaves the page.
- `npm run start:ai`: the same website plus a loopback-only mock backend at `http://localhost:4173/api/chat`. Stop another preview on that port first, or set `PORT`.
- Sign in normally through existing Firebase Authentication. In the chat, confirm fictional information. To exercise server validation/accounting, open **Local backend testing** and explicitly select **Send fictional messages to my local mock backend**.
- Select an area on the body, select multiple chat symptoms, and send a fictional message. A region change starts a fresh chat. The original three-step check-in still works.
- **New conversation**, logout, account change and page exit clear chat text. Consent withdrawal also clears it. Pending responses are discarded after reset. No automatic request retry occurs.

Default chat is simulated even on Firebase Hosting. The static build does not contain a backend or any credentials. Merely adding a Gemini key cannot activate Gemini.

## Architecture and boundaries

`js/chat.js` renders text safely with DOM text nodes, maintains short memory-only history, and optionally calls the local authenticated endpoint. `js/conversation.js` supplies deterministic scripted replies and draft emergency rules. Existing body/selection/auth modules are preserved.

`scripts/local-ai.mjs` reuses the allowlisted dev server. `server/http.mjs` enforces loopback, Host/Origin consistency, JSON, body limits and authentication headers. No wildcard CORS is enabled. `server/auth.mjs` verifies Firebase RS256 signatures with Google's cached public certificates, project audience, issuer, subject and timestamps. It needs no service-account secret. Public-key retrieval contacts Google but sends no health text. This local verifier does not check account revocation/disabled status; use the Admin SDK with appropriate revocation checks before a public deployment. UI authentication is never treated as backend authorization.

`server/chat-service.mjs` validates messages and consent, prioritizes draft emergency rules, reserves usage and enforces single-flight execution. `server/providers.mjs` supplies a mock provider and an injected-fixture Gemini REST adapter. The adapter has **no default network transport** and is not wired into the runnable server. It tests `countTokens` and `generateContent`, including system context, output caps, disabled thinking, schema validation, refusal/truncation handling, timeouts and no retries. Model output selects from fixed follow-up templates; arbitrary generated medical advice is not displayed.

The runtime rejects any `HEALTHWELL_AI_MODE` other than `mock`. Provider activation requires a deliberate reviewed code change. No API key is needed or read in this prototype. If a provider is approved later, use a backend-only secret from an OS/deployment secret store; never reuse the Firebase browser key for Gemini, put credentials under `js/` or `config/`, or commit them. `.env` files and the local usage folder are ignored and not served or built.

## Limits and accounting

| Setting | Default / maximum in this prototype |
| --- | --- |
| `HEALTHWELL_MONTHLY_USD` | $0.30, configurable downward to zero |
| `HEALTHWELL_DAILY_REQUESTS` | 20 across all users, configurable downward |
| `HEALTHWELL_USER_DAILY_REQUESTS` | 10 per user, configurable downward |
| Per-user minute limit | 2 |
| Input limit | 2,048 tokens; conservative UTF-8 byte precheck, fixture adapter also checks provider token count |
| Output limit | 256 tokens; one candidate, thinking disabled |
| History | At most 8 request messages, 1,000 characters per message; total input limit also applies |
| Cost buffer | 25% added to estimates |
| Concurrency | One provider operation per local process |

Configuration resides in `server/config.mjs`; environment settings can lower limits, but cannot enable live traffic or raise the internal ceiling above $0.30. The model is selected through `HEALTHWELL_AI_MODEL`, with a price registry. Unknown models fail closed until their pricing and behavior are reviewed. No silent model/provider fallback is used.

Costs use integer nanodollars (1 USD = 1,000,000,000 units). At listed 2.5 Flash-Lite rates, input is 100 nanodollars/token and output is 400. Reserve `(2048 × 100 + 256 × 400) × 1.25 = 384,000` nanodollars, or **$0.000384 per request**, before provider work. Never refund this reservation after a timeout or ambiguous failure. Successful usage metadata records input plus output/thinking tokens; an overrun pauses the ledger. Browser-only chat does not use the server ledger or incur costs.

Illustrative paid usage, if the model remains accessible and is separately approved:

- 100 requests at 1,000 input + 200 output tokens: $0.018 before the internal buffer.
- 20 requests/day × 31 days = 620 requests: at configured maximum tokens, $0.190464 estimated model charges, or $0.23808 of buffered reservations.
- The $0.30 monthly internal ceiling provides an additional $0.10 gap below the requested target. Other software, leaked credentials, changed pricing, taxes, provider accounting differences and infrastructure costs are outside this estimate.

**These figures are not a guarantee of a $0.40 provider bill. Live traffic remains disabled.** Mock usage is explicitly simulated and is not measured Gemini tokenization. The fixture adapter tests provider metadata; it has not been verified against a live account/model.

The local `.local-ai/usage.json` ledger contains only hashed user/request identifiers, UTC timestamps, reservation amounts and token counts, never transcripts, API keys, or Firebase tokens. Counters persist across restarts and reset by UTC calendar day/month. Prior-month records are pruned on a new reservation. Hashes are pseudonymous metadata, not a claim of anonymity. One exclusive lock prevents concurrent writers; atomic file replacement prevents partial JSON writes. This is a single-machine development implementation, not a distributed quota service.

Corruption, write errors and an existing lock stop processing. If a crash leaves `usage.lock`, first confirm that no local AI server is running; then remove only that stale lock, preserving `usage.json`. Deleting or restoring an old ledger resets accounting: never do that with any future paid usage. A future deployment needs durable transactional accounting shared by every instance, fail-closed missing-ledger handling, an abuse-control layer, and reconciliation with the provider.

## Official pricing and availability findings

Checked October 27, 2026 against official documentation:

- [Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing): standard Gemini 2.5 Flash-Lite text input **$0.10/million tokens**, output including thinking **$0.40/million**. These estimates exclude audio, grounding, caching, tools and batch services; none is enabled here.
- [Developer API deprecations](https://ai.google.dev/gemini-api/docs/deprecations): 2.5 Flash-Lite has no announced Developer API shutdown date, but 2.5 access is now restricted to users who previously used it. Google directs new projects to newer models. Therefore this project's access is **unverified**, not assumed. Vertex/Agent Platform retirement dates are a separate service and should not be substituted for Developer API availability. The user's requested model remains the preferred mock price configuration only.
- [Billing](https://ai.google.dev/gemini-api/docs/billing): the paid-tier prepay flow requires **at least $5** in credits; some accounts can have other billing arrangements during migration. The actual account UI controls eligibility. This upfront cash outlay exceeds a $0.40 monthly cash-spend target, even if consumption is small. No funds were purchased.

## Can AI Studio enforce $0.40?

Official billing documentation describes editable project caps but does **not document a minimum value or guarantee acceptance of fractional-dollar caps**. I could not verify that $0.40 is accepted without access to the account's cap editor. The cap is experimental and enforcement/billing data can lag around 10 minutes, allowing overages. It is not sufficient for a guaranteed $0.40 maximum, even if the UI accepts that amount.

For an already eligible account, the owner/editor/admin can inspect this manually:

1. Open [AI Studio Spend](https://aistudio.google.com/spend) and select the intended project.
2. Open **Monthly spend cap → Edit spend cap**.
3. Enter `0.40` USD (or a lower buffer such as `0.30`) and check whether the UI accepts and persists it. If the minimum is higher, stop rather than increasing the target.
4. Check the scope is the correct project; do not enable billing or buy credits simply to inspect this. Leave auto-reload off if paid use is ever separately approved.

For accounts without an eligible cap editor, its availability and amount remain unverified. A project cap is distinct from the much larger billing-tier cap and does not cover all Firebase/Cloud services. The local backend requires no Blaze, Functions, Firestore, Cloud Run, or paid server. Any future Firebase/Cloud deployment requires separate pricing review and explicit approval; Gemini spending limits do not constrain those services. [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

## Privacy, terms and clinical review gates

[Gemini's terms](https://ai.google.dev/gemini-api/terms) prohibit clinical-practice/medical-advice use. This application's proposed symptom-specific guidance needs provider/legal review of its intended use; a disclaimer does not resolve that restriction. The terms also restrict age and region eligibility, and public clients in the EEA/UK/Switzerland require paid services. Unpaid-service data can be used for product improvement and human review; sensitive/personal information must not be submitted. Paid-service handling, retention, consent and applicable agreements also need review. No real health data should be used in this prototype.

Safety version `draft-2026-10-27` is **not clinically reviewed**. It covers demonstration patterns for sudden severe headache, chest pain plus breathing difficulty, possible stroke signs, severe breathing difficulty and unconsciousness, plus explicit warning-sign selections. Rules run before provider work. The browser keeps an emergency banner until the conversation resets. Negated, quoted or historical mentions may trigger; other phrasing, languages, presentations or conditions may be missed. Absence of a match never means safety. No model may downgrade a detected warning.

Draft reference material: [NHS headaches](https://www.nhs.uk/symptoms/headaches/), [NHS stroke symptoms](https://www.nhs.uk/conditions/stroke/symptoms/), [NHS shortness of breath](https://www.nhs.uk/symptoms/shortness-of-breath/), and the existing [London Ambulance emergency guidance](https://www.londonambulance.nhs.uk/our-services/emergency-care/calling-999/). Reading these pages is not clinical validation. A qualified reviewer must approve coverage, exclusions, timing/negation handling, emergency copy, geography, age scope, clinical evaluation cases and maintenance ownership before any real-user launch.

## Verification

`npm run check`, `npm test`, `npm run test:browser`, and `npm run build` cover the current implementation. All AI tests use fictional examples and injected provider responses; no real Gemini request or paid service is used.

The browser regression suite exercises body selection, multiple symptoms, consent, follow-ups, bounded context, literal rendering, mobile layout, accessibility, emergency priority, request deduplication, backend errors, account changes, clearing and delayed-response cancellation. Backend tests exercise JWT signatures/claims, request/origin validation, token/cost arithmetic, daily/monthly/rate limits, concurrency, persistence, corruption, provider errors/timeouts and emergency priority.

The existing real-Firebase connectivity check is now explicitly opt-in to separate external-network availability from deterministic regressions. Run it separately in PowerShell:

```powershell
$env:HEALTHWELL_LIVE_AUTH_TEST = '1'
npm.cmd run test:browser -- --grep 'real Firebase SDK'
Remove-Item Env:HEALTHWELL_LIVE_AUTH_TEST
```

The slow-connection test now waits until its mocked auth observer is installed before advancing virtual time. Tests do not establish completed real sign-in, revoked-account enforcement, live Gemini availability, exact provider billing, or clinical safety. Those remain explicit review gates.
