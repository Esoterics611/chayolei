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

## 7. The demo

`bash scripts/build-demo.sh` includes the wellsprings: sample questions (marked "לדוגמה"; their answers are the printed booklet's own words), simulated email sign-in ("Demo: open the link"), and "view as the teacher" on the member's page, so one person can walk the whole way. `bash scripts/publish-demo.sh` publishes it at https://esoterics611.github.io/chayolei/ (the wellspring: `#/maayan/padah-beshalom`).
