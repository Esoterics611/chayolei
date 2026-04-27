import { adminDb } from '$lib/server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ethers } from 'ethers';
import {
  BASE_SEPOLIA_RPC_URL,
  DEPLOYER_PRIVATE_KEY,
  VITE_TMIM_TOKEN_ADDRESS,
  DONATION_TRACKING_WALLET,
} from '$env/static/private';

const TMIM_ABI = ['function mint(address to, uint256 amount, string calldata reason) external'] as const;
const TMIM_PER_USD = 10;

let _signer: ethers.Wallet | null = null;
function getSigner(): ethers.Wallet {
  if (!_signer) {
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org');
    _signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  }
  return _signer;
}

export interface LogDonationInput {
  donor: string;
  amount: number;             // USD
  currency: 'cash' | 'check' | 'zelle' | 'venmo' | 'usdc' | 'other';
  intent?: string;
  channel?: string;
  contactEmail?: string;
  notes?: string;
  attributionConsent: boolean;
}

export interface SupportDonation {
  id: string;
  displayName: string;
  amount: number;
  currency: string;
  intent: string | null;
  channel: string | null;
  notes: string | null;
  attributionConsent: boolean;
  tmimMinted: number;
  txHash: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export async function logDonation(
  input: LogDonationInput,
): Promise<{ id: string; tmimMinted: number; txHash: string | null }> {
  const tmimMinted = Math.floor(input.amount * TMIM_PER_USD);
  const now = new Date().toISOString();

  let txHash: string | null = null;
  if (DONATION_TRACKING_WALLET?.startsWith('0x')) {
    try {
      const tmim = new ethers.Contract(VITE_TMIM_TOKEN_ADDRESS, TMIM_ABI, getSigner());
      const tx = await tmim.mint(
        DONATION_TRACKING_WALLET,
        BigInt(tmimMinted),
        `support:${input.donor.slice(0, 20)}:$${input.amount}`,
      );
      await tx.wait(1);
      txHash = tx.hash as string;
    } catch (e) {
      console.error('[support-donations] TMIM mint failed (non-fatal):', e);
    }
  }

  const ref = adminDb.collection('support_donations').doc();
  await adminDb.runTransaction(async t => {
    t.set(ref, {
      displayName:        input.donor,
      amount:             input.amount,
      currency:           input.currency,
      intent:             input.intent ?? null,
      channel:            input.channel ?? null,
      contactEmail:       input.contactEmail ?? null,
      notes:              input.notes ?? null,
      attributionConsent: input.attributionConsent,
      tmimMinted,
      txHash,
      acknowledgedAt:     null,
      createdAt:          now,
    });

    t.set(adminDb.collection('treasury').doc('global'), {
      totalDonated:    FieldValue.increment(input.amount),
      totalTmimMinted: FieldValue.increment(tmimMinted),
      tmimCirculating: FieldValue.increment(tmimMinted),
      currentBalance:  FieldValue.increment(input.amount),
    }, { merge: true });
  });

  return { id: ref.id, tmimMinted, txHash };
}

export async function generateAcknowledgment(
  donationId: string,
): Promise<{ text: string; html: string }> {
  const snap = await adminDb.collection('support_donations').doc(donationId).get();
  if (!snap.exists) throw new Error('donation not found');

  const d = snap.data()!;
  const date = new Date(d.createdAt as string).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const name   = d.displayName as string;
  const amount = (d.amount as number).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const text = [
    'חיילי בית דוד — אישור תרומה',
    date,
    '',
    `${name} היקר/ה,`,
    '',
    `תודה על תרומתך בסך ${amount} לפרויקט פרסום ספרי הקדש.`,
    'תרומתך תאפשר לנו להמשיך ולהפיץ תורת חב"ד לרחבי העולם.',
    '',
    'בברכה,',
    'צוות חיילי בית דוד',
    '',
    'הערה: ארגוננו אינו רשום כעמותה פטורה ממס (501(c)(3)). מסמך זה אינו קבלה לצרכי מס.',
  ].join('\n');

  const html = `<div dir="rtl" style="font-family:David,serif;max-width:600px;margin:0 auto;padding:2rem;border:1px solid #ccc;">
  <h2 style="color:#4f46e5;">חיילי בית דוד — אישור תרומה</h2>
  <p style="color:#888;">${date}</p>
  <p>${name} היקר/ה,</p>
  <p>תודה על תרומתך בסך <strong>${amount}</strong> לפרויקט פרסום ספרי הקדש.</p>
  <p>תרומתך תאפשר לנו להמשיך ולהפיץ תורת חב"ד לרחבי העולם.</p>
  <p>בברכה,<br/>צוות חיילי בית דוד</p>
  <hr/>
  <p style="font-size:0.75rem;color:#999;">הערה: ארגוננו אינו רשום כעמותה פטורה ממס (501(c)(3)). מסמך זה אינו קבלה לצרכי מס.</p>
</div>`;

  await adminDb.collection('support_donations').doc(donationId).update({
    acknowledgedAt: new Date().toISOString(),
  });

  return { text, html };
}
