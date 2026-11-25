# Wellsprings (מעיינות)

> 2026-11-25. Each discourse taught becomes a **wellspring**: its readers gather there, ask, and the teacher answers. The first readers come from the printed booklet of *פדה בשלום נפשי*, whose QR leads to the Sefer Forge home page (esoterics611.github.io/he/), which leads here.

## 1. What a reader meets

| Route | Page |
|---|---|
| `/maayan` | All wellsprings: the open ones to enter, the coming ones to follow |
| `/maayan/[id]` | One wellspring: the discourse, "came from the booklet?", three promises, questions and answers, the ask box, the way on (reader → member → contributor → holder), the other wellsprings |
| `/maayan/[id]/join` | Joining: an email, the link, a name and what to follow. Nothing else; no wallet |
| `/maayan/auth` | Where the emailed link lands (live app); completes sign-in and goes on |
| `/maayan/me` | The member's page: name, follows, email choices, their questions, the wallet they may link one day |
| `/maayan/teacher` | The teacher's desk: first questions to read, published ones to answer, answers to correct |
| `/maayan/privacy` | What is kept, who sees it, how to leave (contact: esoterics611@gmail.com) |

Hebrew unless the reader chose English (`ui.init('he')`); every string in both dictionaries (`src/lib/maayan/strings.ts`, merged into `src/lib/team/i18n.ts`). Built phone first: most readers arrive by scanning a QR.

## 2. Accounts: email first, wallet later

Decided by the owner on 2026-11-25 (`DECISIONS.md`): **one sign-in, by email only.** Firebase Auth's email link: the reader types an address, opens the link, and is in; opening it confirms the address (`email_verified`), and the server accepts nothing from an unconfirmed one. No password and no wallet. The platform stays crypto-only in TMIM: a member links a wallet when they come to hold TMIM (joining a team, being paid for accepted work), from their page. A wallet kept for them by the platform until they ask for it was considered and set aside for now.

Wallet sign-in (`/api/auth/*`, uids `wallet_<address>`) is unchanged for the team app and the classic pages. Linking a wallet to an email account is the next step of the ladder (sefer-forge task "The ladder into Chayolei").

## 3. The rules

`src/lib/maayan/engine.ts`, plain functions run by the demo in the browser and by the server before it writes:

- Only an open wellspring takes questions; a coming one can be followed.
- A member's **first question waits for the teacher**; once one is let through (published or answered), theirs appear at once.
- Only the teacher publishes, declines (the author still sees it) or answers; answering a waiting question publishes it with its answer. Correcting an answer keeps its first time.
- Readers see answered and published questions, answered first; an author also sees their own waiting ones, the teacher all.
- A member's email is never shown; their chosen name is.
- A question may say where in the text it asks about (`ref`, up to 80 characters) and may follow up an answered question (`parentId`).
- The asker may withdraw a question until it is answered; it is deleted.
- Up to 10 questions a day per member (not the teacher).
- Readers can search the questions and answers before asking, copy a link that opens one question (`?q=<id>`), and see a mark on new answers to their questions (kept per browser).

## 4. Data (live)

| Collection | Holds | Read by |
|---|---|---|
| `wellsprings/{id}` | `wellsprings.json` plus `followers` | anyone |
| `maayanQuestions/{id}` | `Question` (`src/lib/maayan/types.ts`) | anyone once published or answered; its author; the teacher |
| `maayanMembers/{uid}` | `MaayanMember`, with the email | the member only |

Browsers never write; the API does (`src/lib/server/maayan.ts`): `GET/POST /api/maayan/me`, `POST /api/maayan/questions`, `POST /api/maayan/questions/[id]` (`approve` / `hide` / `answer`), `GET/POST /api/maayan/unsubscribe`. Rules and their tests: `firestore.rules`, `src/lib/server/maayan-rules.test.ts`; the server's: `src/lib/server/maayan.test.ts`.

## 5. Email

Firebase sends the sign-in links itself (template language: Hebrew, set by `auth.languageCode`). Answers are mailed by the server (`src/lib/server/mail.ts`) through Resend when `RESEND_API_KEY` is set, from `MAIL_FROM`, with a one-click unsubscribe link signed with `MAAYAN_SECRET` (required whenever mail is really sent). Without the key, mail is only logged.

## 6. Setting it up on a new Firebase project

1. Create a Firebase project (console.firebase.google.com), on the Blaze plan (Cloud Run needs billing; at this size it costs close to nothing).
2. **Authentication → Sign-in method → Email/Password → enable, and enable "Email link (passwordless sign-in)".** Under Settings → Authorized domains, add the app's domain.
3. **Firestore → Create database** (production mode). Deploy rules and indexes: `firebase deploy --only firestore`.
4. A web app in Project settings gives the `VITE_FIREBASE_*` values for `.env`; set `VITE_TEAM_BACKEND=firestore`. Leave `VITE_GOVERNANCE_ADDRESS` unset to keep the chain listener off.
5. `node scripts/maayan-setup.mjs wellsprings` writes the wellsprings.
6. Deploy (`docs/DEPLOY.md`). With the chain off, `--min-instances 0` is enough.
7. The teacher signs in once on `/maayan`, then `node scripts/maayan-setup.mjs teacher <their email>`.
8. For answer emails: a Resend account with the sending domain verified; `RESEND_API_KEY`, `MAIL_FROM`, `MAAYAN_SECRET`, `PUBLIC_ORIGIN` on Cloud Run (the key and secret through Secret Manager).

## 6a. The free version (Spark plan, no billing) — live first, 2026-11-25

Until the project has billing (a partner is to add it), the wellsprings run with **no server**: `DEPLOY_MODE=spark` in `deploy.env`.

- **What runs:** static pages on Firebase Hosting (`scripts/build-spark.sh` → `spark-build/`, `firebase.spark.json`: `/` opens `/maayan`, every path serves the app); Firebase Auth's email link (free; Firebase sends the sign-in emails); Firestore. The wellsprings are live (`VITE_MAAYAN_BACKEND=direct`): the browser runs the engine and writes to Firestore itself (`src/lib/maayan/live.ts`), and `firestore.rules` holds every write to the same rules: a profile only for one's own confirmed email and never with `teacher` or a head start; a first question waits; only the teacher publishes, declines and answers (and counts the asker's approval, one at a time); only the asker withdraws, before the answer; no one reads another's email. Tests: `src/lib/server/maayan-direct-rules.test.ts`. The team app rides along as its demo.
- **What waits for the server version:** the "the teacher answered" email (members see the new-answer mark when they come back); the daily limit of ten questions is kept by the browser only; the follower count is not kept (the pages hide it while it is 0).
- **Set-up:** `bash chayolei/scripts/gcp-bootstrap.sh <project-id> --spark` in Cloud Shell (free services only), the Web app's config in `deploy.env`, Email link sign-in enabled; a commit with `[deploy]` publishes. The teacher signs in once at `/maayan`, then in the Firebase console (Firestore → `maayanMembers` → their document) adds the field `teacher` = `true` (boolean); or `node scripts/maayan-setup.mjs teacher <email>` where admin credentials are at hand.

## 6b. Near future: the server version (once there's billing)

Kept ready, nothing to rebuild (owner, 2026-11-25: "keep all our plans for the near future"):

1. The project on the Blaze plan (a partner adds the billing account), with a budget alert.
2. `bash chayolei/scripts/gcp-bootstrap.sh <project-id>` again, without `--spark`: it adds Cloud Run, Cloud Build, the registry and their accounts.
3. `DEPLOY_MODE=server` in `deploy.env`, and a `[deploy]` commit: the app runs on Cloud Run behind the same domain (§6), the team app goes live, the wellsprings' writes go through the server (`/api/maayan`), the follower counts and the daily limit are kept there.
4. Answer emails: a Resend account with a sending domain, `resend-api-key` and `maayan-secret` in Secret Manager, `MAIL=1` and `MAIL_FROM` in `deploy.env` (§5).
5. Then the open items of §8 that wait for the live app (the "join the discussion" banner on the Sefer Forge home page) and the ladder into the team app.

## 7. The demo

`bash scripts/build-demo.sh` includes the wellsprings: sample questions (marked "לדוגמה"; their answers are the printed booklet's own words), simulated email sign-in ("Demo: open the link"), and "view as the teacher" on the member's page, so one person can walk the whole way. `bash scripts/publish-demo.sh` publishes it at https://esoterics611.github.io/chayolei/ (the wellspring: `#/maayan/padah-beshalom`).

## 8. Open items (student pass, 2026-11-25)

A walk through the wellspring as a student arriving from the booklet found what was missing; most of it is done (§3). The פדה בשלום booklet and שער היחוד chapter 1 are on the site and linked from their wellsprings (owner's word, 2026-11-25). Still open:

| Item | Waits for |
|---|---|
| The Sefer Forge home page sends booklet readers here ("join the discussion") | The live app: the demo keeps questions in one browser, so a real reader would be asking no one |
| Answers recorded as voice notes, transcribed and posted | sefer-forge's Whisper pipeline (task "Connect wellsprings to the sefer-forge pipeline") |
| A discourse's own editorial team for the ladder's "contributor" step | The ladder task; the demo shows a sample team |
| Terms in answers linked to the glossary (מילון) | The glossary published on the site |
| A dedication, once taken, shown on its wellspring | The store's `dedicated:` entries read by the app (each wellspring already links to its part of the store, `dedicate` in wellsprings.json; the store is on the Sefer Forge site, since Chayolei takes no money) |
