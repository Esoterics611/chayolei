# חיילי בית דוד — Firebase + Contracts Setup Guide

## Your existing infrastructure
- **Firebase project**: `vanguard-dao`
- **Deployer wallet**: `0x41521c37dB02956185437C4e2461261A321073E1`
- **Base Sepolia** contracts already deployed (Vanguard) — TMIM contracts are new/separate

---

## STEP 1: Create .env (do this right now)

Create `C:\code\vanguard\chayolei\.env`:

```env
# ── Firebase Client (get from Firebase Console → Project Settings → Web App) ──
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=vanguard-dao.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vanguard-dao
VITE_FIREBASE_STORAGE_BUCKET=vanguard-dao.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=27346039636
VITE_FIREBASE_APP_ID=1:27346039636:web:f015398c6c8578293c4ec1

# ── Firebase Admin SDK (get from Firebase Console → Project Settings → Service Accounts → Generate new key) ──
FIREBASE_PROJECT_ID=vanguard-dao
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vanguard-dao.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ── Base Sepolia ──
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...   # your key for 0x41521c37...
BASESCAN_API_KEY=...          # from basescan.org/myapikey

# ── Contract addresses (fill in after Step 3) ──
VITE_TMIM_TOKEN_ADDRESS=
VITE_CHAYOLEI_REGISTRY_ADDRESS=
VITE_MASIMA_REWARDS_ADDRESS=
VITE_TREASURY_ADDRESS=
```

---

## STEP 2: Firebase Console Setup (5 minutes)

1. Go to **console.firebase.google.com** → `vanguard-dao`
2. **Authentication** → Sign-in methods → Enable **Custom (token-based)**
3. **Firestore** → Create database in **production mode**
4. **Project Settings** → **Service accounts** → Generate new private key → save JSON
   - Extract `client_email` and `private_key` into `.env`
5. **Project Settings** → **General** → Your apps → Web app config → copy into `.env`
6. **Firestore** → Deploy rules:
   ```bash
   cd C:\code\vanguard\chayolei
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project vanguard-dao
   ```

---

## STEP 3: Deploy TMIM Contracts to Base Sepolia

```bash
cd C:\code\vanguard\chayolei\contracts
npm install
npx hardhat run scripts/deploy.ts --network baseSepolia
```

Copy the printed addresses into your `.env` (`VITE_TMIM_TOKEN_ADDRESS=...` etc.)

---

## STEP 4: Seed Firestore with initial data

Run this once to populate mekomot + treasury doc:

```bash
# In Firebase Console → Firestore → Start collection
# OR use the seed script (next session will implement this)
```

**Manual seed (paste in Firebase Console → Firestore → Add document):**

Collection: `treasury` → Document ID: `global`
```json
{
  "totalDonated": 0,
  "totalTmimMinted": 0,
  "totalTmimDistributed": 0,
  "totalTmimRedeemed": 0,
  "currentBalance": 0,
  "tmimCirculating": 0
}
```

Collection: `mekomot` → 4 documents (one per location):
```json
{ "shem": "כּוּר הַנְּשָׁמָה", "transliteration": "Kur HaNeshama", "country": "Israel", "timezone": "Asia/Jerusalem", "memberCount": 0, "activeMivtzaot": 0, "coordinatorId": "", "status": "active" }
{ "shem": "מִבְצַר הַכֶּתֶר", "transliteration": "Mivtzar HaKeter", "country": "USA", "timezone": "America/New_York", "memberCount": 0, "activeMivtzaot": 0, "coordinatorId": "", "status": "active" }
{ "shem": "צְרִיף הָאוֹר", "transliteration": "Tzrif HaOr", "country": "Australia", "timezone": "Australia/Melbourne", "memberCount": 0, "activeMivtzaot": 0, "coordinatorId": "", "status": "active" }
{ "shem": "שַׁעַר הַגְּבוּרָה", "transliteration": "Shaar HaGvura", "country": "UK", "timezone": "Europe/London", "memberCount": 0, "activeMivtzaot": 0, "coordinatorId": "", "status": "active" }
```

---

## STEP 5: Test locally

```bash
cd C:\code\vanguard\chayolei
npm run dev
```

- Open `http://localhost:5173/signup`
- Click "חבר ארנק" — MetaMask will pop up
- Sign the nonce → creates Firebase user
- Fill in profile → creates Firestore talmid doc

---

## For next Claude session — paste this prompt:

```
Continue implementing חיילי בית דוד (Chayolei Beis Dovid).
Spec: C:\code\vanguard\chayolei\NEXT_SESSION_SPEC.md
Firebase project: vanguard-dao (already running)
Contracts: see C:\code\vanguard\chayolei\contracts\deployments/baseSepolia.json

Remaining tasks:
1. Seed script: src/routes/api/seed/+server.ts — POST populates Firestore with 
   mock-data.ts content (mekomot + treasury doc). Officer-only or dev-only.
2. Hybrid bridge: after approveMasima/approveTafkid in API routes, also call 
   MasimaRewards.approveMasima() on Base Sepolia via ethers.js Admin SDK.
   Use VITE_MASIMA_REWARDS_ADDRESS from .env.
3. Real wallet: update connectWallet() to show Web3Modal (wagmi/viem) with 
   MetaMask + WalletConnect + Coinbase Wallet. 
4. IPFS: on masima submit with contentUrl, if URL is a local blob, upload to 
   Pinata and store the ipfs:// hash instead.
5. Firebase Cloud Messaging: notify assignee when masima approved, reviewer 
   when review requested.
6. Mobile layout: collapsible sidebar → bottom nav at <768px.
```
