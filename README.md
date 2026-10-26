# HealthWell Unity

A plain HTML, CSS, and JavaScript application using Firebase Authentication. Includes a responsive check-in dashboard with a natural, clothed SVG person, front/back views, nine body regions, a three-step selection flow, and account management.

Symptom descriptions and selections stay in page memory only and are cleared on restart, logout, account changes, and leaving the page. They are never sent to Firestore, analytics, logs, or browser storage. Only Firebase account sessions and the theme preference may persist. Diagnosis, triage, care recommendations, medication doses, and clinical decision-making remain disabled pending qualified clinical review. Example symptom options are UI prototypes, not validated medical questions.

## Run locally

Use Node.js 22 or later. The app has no bundled runtime dependencies. Development-only dependencies provide browser and accessibility testing; install them with `npm ci`.

```sh
npm start
```

Open **http://localhost:4173**. Login appears first; choose **Create an account** to sign up. On Windows PowerShell, use `npm.cmd start` if script execution policy blocks `npm`. VS Code Live Server also works. Its `127.0.0.1` address automatically switches to `localhost`, keeping the same port and page, because Firebase authorizes `localhost` for this project. Do not open the HTML through `file://`: the app uses JavaScript modules.

If port 4173 is already in use, use the preview already running there or stop that server first. The local server serves application files only; it does not expose the README, tests, or tooling.

## Firebase configuration

`config/firebase-config.js` contains the public web app configuration provided by the project owner. Never place service-account JSON, Apple private keys, OAuth client secrets, or administrative credentials in frontend files. Only the App and Authentication SDKs are loaded; Analytics is not initialized.

In Firebase Console → Authentication:

1. Enable Email/Password, Google, and Apple under sign-in providers. Google requires a project support email. Apple requires its provider configuration in Firebase Console and Apple Developer, not in this repository.
2. Under Settings → Authorized domains, add the host used for testing (`localhost`, or `127.0.0.1` for that Live Server address). Newer Firebase projects do not automatically authorize localhost. Production domains must also be authorized before deployment.
3. For Apple, confirm the configured return URL matches `https://healthwell-1c869.firebaseapp.com/__/auth/handler` and that the Service ID, Team ID, key ID, and private key are configured in the consoles.
4. If sending Firebase emails to Apple “Hide My Email” addresses, configure Apple's private email relay for the Firebase sender.

References: [Google setup](https://firebase.google.com/docs/auth/web/google-signin), [Apple setup and email relay](https://firebase.google.com/docs/auth/web/apple), [authorized local domains](https://firebase.google.com/docs/auth/web/email-link-auth), [email/password setup](https://firebase.google.com/docs/auth/web/password-auth).

### Current provider check

The live setup check on October 26, 2026 confirmed that Firebase returns a Google authorization URL. This checks the start of the flow, not a completed Google login.

Apple returned `OPERATION_NOT_ALLOWED : Code flow is not enabled for Apple.` To unblock Apple web sign-in, finish **Authentication → Sign-in method → Apple → OAuth code flow configuration** in Firebase Console using the Apple Developer Service ID, Team ID, key ID, and private key. Enter the private key only in Firebase Console. The Apple return URL must be `https://healthwell-1c869.firebaseapp.com/__/auth/handler`. Enabling the provider alone does not complete its web configuration. Until that setup is finished, use Google or email/password.

The project's authorized local host is `localhost`; the app now normalizes Live Server's `127.0.0.1` address before loading authentication.

## How account access works

- `index.html` is the signed-in dashboard. Visitors without a session go to `login.html` first; registration is at `signup.html`. Successful login opens the dashboard. Both authentication screens offer **Continue with Google** and **Continue with Apple**. Firebase's provider sign-in handles both new and returning users.
- Provider buttons open a popup immediately from the click, once the SDK and session preference are ready. They do not validate or submit the email/password fields. If blocked, allow popups for this site and try again. There is no automatic redirect fallback.
- “Keep me signed in” applies to all three methods. Unchecked uses Firebase session persistence; checked uses Firebase local persistence. The app does not store passwords or provider access tokens itself.
- Password reset uses Firebase's hosted reset-email flow. The account page offers that link only for accounts with the password provider. Google/Apple passwords are managed by their respective providers.
- The app does not automatically link conflicting providers. If Firebase reports a conflict, use the original sign-in method. Explicit account linking is a future feature.
- `account.html` waits for Firebase session state before displaying the profile. These UI checks are not database security rules; future Firestore access needs separately tested rules.
- The only preference stored directly in localStorage is the light/dark theme.

## Project files

```text
index.html                  Authenticated check-in dashboard and inline SVG body
login.html                  Default entry for signed-out visitors
signup.html                 Create an account
reset-password.html         Password reset
account.html                Profile, verification, logout
style.css, dashboard.css    Shared themes and responsive dashboard layout
script.js                   Page entry point
assets/logo.svg             Teal-and-amber overlapping circles
wellness-garden.svg          Local decorative illustration
config/firebase-config.js   Public Firebase web configuration
js/firebase.js              Lazy SDK loading and initialization
js/auth-service.js          Firebase account operations
js/auth-page.js             Authentication screen behavior
js/account-page.js          Profile screen behavior
js/dashboard.js             Dashboard, session handling, accessible interactions
js/symptom-flow.js           Memory-only selection state; no clinical logic
js/auth-errors.js           Friendly error messages
js/validation.js            Shared form validation
js/ui.js, js/theme.js        Shared controls and appearance
scripts/                    Local server and checks
tests/                      Node tests with mocked Firebase operations
browser-tests/              Isolated Playwright interaction and accessibility tests
firebase.json, .firebaserc   Firebase Hosting target and security headers
scripts/build.mjs           Allowlisted production assets copied to dist/
```

## Checks and testing

```sh
npm run check
npm test
npm run test:browser
npm run build
```

Use `npm.cmd` on Windows if needed. Checks cover JavaScript syntax, local links, labels, form validation, authentication, body-region state, restricted local serving, and the deployment allowlist. Browser tests use the installed Chrome in headless mode and an isolated mocked authentication service. They check keyboard selection, navigation, error recovery, notes clearing, storage/network privacy, light/dark accessibility, and layouts at 320, 390, 768, 1024, and 1440 pixels. Screenshots are written to `test-results/screenshots/`. Tests never sign in to a real account. Passing them does **not** verify completed live Google/Apple login, email delivery, physical mobile devices, or assistive-technology behavior.

Manual acceptance checklist with accounts you control:

1. On both login and sign-up, use Google and Apple with the email/password fields empty. Finish provider authentication yourself. Confirm the account page displays the correct profile; for Apple, also try Hide My Email.
2. Log out, then use the same provider again. Check session behavior after reload and with “Keep me signed in” checked/unchecked.
3. Close a provider window or block popups. Confirm helpful feedback, restored buttons, and that a retry works. Rapid repeated clicks must open only one sign-in flow.
4. Check unavailable providers and unauthorized hosts show an error without a false success message. Reconnect after a network failure and retry.
5. Check email registration/login, mismatched passwords, reset delivery, verification, name editing, and logout separately. Do not assume provider success verifies the email/password flow.
6. Inspect at narrow mobile and desktop widths in light/dark mode. Tab through every control and check visible focus and readable errors.

## Firebase Hosting deployment

The target is the existing Firebase project and Hosting site `healthwell-1c869`. Authenticate locally with `npx firebase-tools login`, then run `npm run deploy`. The predeploy hook runs code checks, unit tests, and the production build. Run browser tests before deploying changes. The hosting configuration serves only generated `dist/` files, carries the local security policy into production, and disables caching. Tests, local preview fixtures, tooling, credentials, and dependency folders are excluded from the build.

Expected Firebase Hosting address after a successful deployment: `https://healthwell-1c869.web.app`. A configured address alone does not prove a deployment succeeded; check the CLI's final result.

Firestore, medically reviewed content, and PWA support remain separate future stages. Emergency information links to the [London Ambulance Service's official guidance](https://www.londonambulance.nhs.uk/our-services/emergency-care/calling-999/); the application tells users to contact their own local emergency service and does not infer urgency from their answers.
