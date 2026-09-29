import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Firestore
} from 'firebase/firestore';

dotenv.config();

const app = express();
const PORT = 3000;

// Paystack Credentials & Configuration (Server-Side Only)
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY =
  process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '9130619144';
const APP_URL =
  process.env.APP_URL ||
  'https://ais-dev-njgqfqvvv3wz5333lg6f67-395972149360.europe-west2.run.app';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase Firestore from applet config
let db: Firestore | null = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const firebaseApp = initializeApp(rawConfig);
    db = getFirestore(firebaseApp, rawConfig.firestoreDatabaseId);
    console.log('[Database] Firestore successfully connected to:', rawConfig.firestoreDatabaseId);
  }
} catch (err) {
  console.warn('[Database] Firestore initialization notice:', err);
}

// Memory fallback store for resilient operation
interface UserAccount {
  userId: string;
  status: 'active' | 'expired' | 'pending';
  purchaseDate: string;
  activationDate: string;
  expiryDate: string;
  isAdmin?: boolean;
  paymentReference?: string;
  paymentAmount?: number;
  currency?: string;
  createdAt: string;
  updatedAt?: string;
}

interface TransactionRecord {
  reference: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paystackId?: string | number;
  type: 'purchase' | 'renewal';
  paidAt?: string;
  createdAt: string;
}

const memoryUsers = new Map<string, UserAccount>();
const memoryTransactions = new Map<string, TransactionRecord>();

// Helper: 12 days duration in milliseconds (1 week + 5 days)
const TWELVE_DAYS_MS = 12 * 24 * 60 * 60 * 1000;

// Helper: Generate a unique authentic numeric User ID (varied realistic formats: 8 to 10 digits)
async function generateUniqueNumericUserId(): Promise<string> {
  // Diverse realistic numeric account formats:
  // 8 digits (e.g. 74920183)
  // 9 digits (e.g. 592810394)
  // 10 digits (e.g. 1094827561, 4827193056)
  const formatRanges = [
    { min: 10000000, max: 99999999 },
    { min: 100000000, max: 999999999 },
    { min: 1000000000, max: 9999999999 }
  ];

  let attempts = 0;
  while (attempts < 50) {
    const range = formatRanges[Math.floor(Math.random() * formatRanges.length)];
    const randomNum = Math.floor(range.min + Math.random() * (range.max - range.min + 1)).toString();

    // Never generate admin ID
    if (randomNum === ADMIN_USER_ID) {
      attempts++;
      continue;
    }

    // Check memory store
    if (memoryUsers.has(randomNum)) {
      attempts++;
      continue;
    }

    // Check Firestore
    if (db) {
      try {
        const userRef = doc(db, 'users', randomNum);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          attempts++;
          continue;
        }
      } catch (e) {
        console.warn('[Firestore] Check user exists fallback:', e);
      }
    }

    return randomNum;
  }

  // Guaranteed fallback: unique timestamp-based 9-digit ID
  return `${Date.now()}`.slice(-9);
}

// Helper: Save User Account to Firestore & Memory
async function saveUserAccount(user: UserAccount): Promise<void> {
  memoryUsers.set(user.userId, user);
  if (db) {
    try {
      const userRef = doc(db, 'users', user.userId);
      await setDoc(userRef, user, { merge: true });
    } catch (e) {
      console.error('[Firestore] Error saving user:', e);
    }
  }
}

// Helper: Get User Account from Firestore or Memory
async function getUserAccount(userId: string): Promise<UserAccount | null> {
  if (db) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserAccount;
        memoryUsers.set(userId, data);
        return data;
      }
    } catch (e) {
      console.warn('[Firestore] Error fetching user, falling back to memory:', e);
    }
  }
  return memoryUsers.get(userId) || null;
}

// Helper: Save Transaction Record
async function saveTransaction(tx: TransactionRecord): Promise<void> {
  memoryTransactions.set(tx.reference, tx);
  if (db) {
    try {
      const txRef = doc(db, 'transactions', tx.reference);
      await setDoc(txRef, tx, { merge: true });
    } catch (e) {
      console.error('[Firestore] Error saving transaction:', e);
    }
  }
}

// Helper: Get Transaction Record
async function getTransaction(reference: string): Promise<TransactionRecord | null> {
  if (db) {
    try {
      const txRef = doc(db, 'transactions', reference);
      const txSnap = await getDoc(txRef);
      if (txSnap.exists()) {
        const data = txSnap.data() as TransactionRecord;
        memoryTransactions.set(reference, data);
        return data;
      }
    } catch (e) {
      console.warn('[Firestore] Error fetching transaction:', e);
    }
  }
  return memoryTransactions.get(reference) || null;
}

// ==========================================
// API ROUTES
// ==========================================

// 1. GET /api/config: Public frontend config
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    paystackConfigured: Boolean(PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.startsWith('sk_')),
    publicKey: PAYSTACK_PUBLIC_KEY || null,
    priceNgn: 3000,
    accessDays: 12
  });
});

// 2. POST /api/validate-user: Validates a User ID securely
app.post('/api/validate-user', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      valid: false,
      status: 'invalid_format',
      message: 'User ID must be provided'
    });
  }

  const cleanId = userId.trim();

  // Enforce numbers only
  if (!/^\d+$/.test(cleanId)) {
    return res.status(400).json({
      valid: false,
      status: 'invalid_format',
      message: 'User ID must contain numbers only'
    });
  }

  // 1. Check for Admin Account
  if (cleanId === ADMIN_USER_ID) {
    return res.json({
      valid: true,
      exists: true,
      status: 'active',
      isAdmin: true,
      isLifetime: true,
      daysRemaining: -1,
      expiryDate: null,
      message: 'Admin authorization verified. Lifetime access active.'
    });
  }

  // 2. Fetch User Account from Firestore
  const account = await getUserAccount(cleanId);

  if (!account) {
    return res.json({
      valid: false,
      exists: false,
      status: 'not_found',
      message: 'User ID does not exist'
    });
  }

  // Check if pending (created but payment unconfirmed)
  if (account.status === 'pending') {
    return res.json({
      valid: false,
      exists: true,
      status: 'pending',
      message: 'New User ID awaiting first payment activation'
    });
  }

  // Check expiry against current time
  const now = Date.now();
  const expiryTime = new Date(account.expiryDate).getTime();

  if (expiryTime <= now) {
    // Expired
    if (account.status !== 'expired') {
      account.status = 'expired';
      account.updatedAt = new Date().toISOString();
      await saveUserAccount(account);
    }
    return res.json({
      valid: false,
      exists: true,
      status: 'expired',
      expiryDate: account.expiryDate,
      daysRemaining: 0,
      message: 'Subscription expired. Kindly renew your subscription to continue.'
    });
  }

  // Active subscription
  const msRemaining = expiryTime - now;
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  return res.json({
    valid: true,
    exists: true,
    status: 'active',
    isAdmin: false,
    isLifetime: false,
    daysRemaining,
    purchaseDate: account.purchaseDate,
    activationDate: account.activationDate,
    expiryDate: account.expiryDate,
    message: 'Active subscription verified'
  });
});

// 3. POST /api/payment/initialize: Initialize Paystack transaction
app.post('/api/payment/initialize', async (req: Request, res: Response) => {
  const { email, type = 'purchase', userId } = req.body;

  if (!PAYSTACK_SECRET_KEY) {
    return res.status(503).json({
      success: false,
      error: 'PAYSTACK_SECRET_KEY is not configured on the server. Please configure your Paystack Secret Key in the environment.'
    });
  }

  const customerEmail =
    email && typeof email === 'string' && email.includes('@')
      ? email.trim()
      : `user_${Date.now()}@aviatorpredator.com`;

  const amountKobo = 300000; // ₦3,000 in Kobo
  const callbackUrl = `${APP_URL}/api/payment/callback`;

  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: customerEmail,
        amount: amountKobo,
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata: {
          type,
          userId: userId || null,
          custom_fields: [
            {
              display_name: 'Product',
              variable_name: 'product',
              value: 'Aviator Predictor Pro 12-Day Access'
            },
            {
              display_name: 'Transaction Type',
              variable_name: 'tx_type',
              value: type
            }
          ]
        }
      })
    });

    const data = await paystackRes.json();

    if (!data.status) {
      console.error('[Paystack] Initialization failed:', data);
      return res.status(400).json({
        success: false,
        error: data.message || 'Paystack initialization failed'
      });
    }

    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      publicKey: PAYSTACK_PUBLIC_KEY
    });
  } catch (err: any) {
    console.error('[Paystack] Error during initialization:', err);
    return res.status(500).json({
      success: false,
      error: 'Network error communicating with Paystack API'
    });
  }
});

// Helper: Process verified transaction idempotently
async function processVerifiedPayment(reference: string): Promise<{
  success: boolean;
  userId?: string;
  expiryDate?: string;
  isNewUser?: boolean;
  type?: 'purchase' | 'renewal';
  error?: string;
}> {
  if (!PAYSTACK_SECRET_KEY) {
    return { success: false, error: 'PAYSTACK_SECRET_KEY is missing' };
  }

  // Check idempotency: If this reference was already processed, return existing record
  const existingTx = await getTransaction(reference);
  if (existingTx && existingTx.status === 'success') {
    const existingUser = await getUserAccount(existingTx.userId);
    return {
      success: true,
      userId: existingTx.userId,
      expiryDate: existingUser?.expiryDate,
      isNewUser: existingTx.type === 'purchase',
      type: existingTx.type
    };
  }

  // Call Paystack verify API
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
    }
  });

  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data.status !== 'success') {
    return {
      success: false,
      error: verifyData.message || 'Payment was not successful or could not be verified'
    };
  }

  const txData = verifyData.data;
  const metadata = txData.metadata || {};
  const txType: 'purchase' | 'renewal' = metadata.type === 'renewal' ? 'renewal' : 'purchase';
  const targetUserId = metadata.userId;

  let assignedUserId: string;
  let newExpiryIso: string;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  if (txType === 'renewal' && targetUserId) {
    // RENEWAL: Extend existing user's subscription by 12 days
    assignedUserId = targetUserId;
    const existingAccount = await getUserAccount(targetUserId);

    if (existingAccount) {
      const currentExpiryMs = new Date(existingAccount.expiryDate).getTime();
      const baseMs = currentExpiryMs > now ? currentExpiryMs : now;
      const extendedMs = baseMs + TWELVE_DAYS_MS;
      newExpiryIso = new Date(extendedMs).toISOString();

      existingAccount.status = 'active';
      existingAccount.expiryDate = newExpiryIso;
      existingAccount.paymentReference = reference;
      existingAccount.paymentAmount = txData.amount / 100;
      existingAccount.updatedAt = nowIso;

      await saveUserAccount(existingAccount);
    } else {
      // User not found in database, create new with 12 days
      newExpiryIso = new Date(now + TWELVE_DAYS_MS).toISOString();
      const newAccount: UserAccount = {
        userId: assignedUserId,
        status: 'active',
        purchaseDate: nowIso,
        activationDate: nowIso,
        expiryDate: newExpiryIso,
        paymentReference: reference,
        paymentAmount: txData.amount / 100,
        currency: txData.currency || 'NGN',
        createdAt: nowIso
      };
      await saveUserAccount(newAccount);
    }
  } else {
    // NEW PURCHASE: Generate unique numeric User ID and grant 12 days access
    assignedUserId = await generateUniqueNumericUserId();
    newExpiryIso = new Date(now + TWELVE_DAYS_MS).toISOString();

    const newAccount: UserAccount = {
      userId: assignedUserId,
      status: 'active',
      purchaseDate: nowIso,
      activationDate: nowIso,
      expiryDate: newExpiryIso,
      paymentReference: reference,
      paymentAmount: txData.amount / 100,
      currency: txData.currency || 'NGN',
      createdAt: nowIso
    };

    await saveUserAccount(newAccount);
  }

  // Save transaction record to prevent duplicate processing
  const txRecord: TransactionRecord = {
    reference,
    userId: assignedUserId,
    amount: txData.amount / 100,
    currency: txData.currency || 'NGN',
    status: 'success',
    paystackId: txData.id,
    type: txType,
    paidAt: txData.paid_at || nowIso,
    createdAt: nowIso
  };

  await saveTransaction(txRecord);

  return {
    success: true,
    userId: assignedUserId,
    expiryDate: newExpiryIso,
    isNewUser: txType === 'purchase',
    type: txType
  };
}

// 4. POST /api/payment/verify: Verify transaction via client request
app.post('/api/payment/verify', async (req: Request, res: Response) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ success: false, error: 'Reference is required' });
  }

  try {
    const result = await processVerifiedPayment(reference);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    console.error('[Payment Verify Error]:', err);
    return res.status(500).json({ success: false, error: 'Internal verification error' });
  }
});

// 5. GET /api/payment/callback: Paystack Browser Redirect Callback
app.get('/api/payment/callback', async (req: Request, res: Response) => {
  const reference = (req.query.reference || req.query.trxref) as string;

  if (!reference) {
    return res.redirect('/?payment_error=missing_reference');
  }

  try {
    const result = await processVerifiedPayment(reference);
    if (result.success && result.userId) {
      return res.redirect(
        `/?payment_success=true&userId=${encodeURIComponent(result.userId)}&ref=${encodeURIComponent(reference)}&type=${encodeURIComponent(result.type || 'purchase')}`
      );
    } else {
      return res.redirect(`/?payment_error=${encodeURIComponent(result.error || 'verification_failed')}`);
    }
  } catch (err) {
    console.error('[Payment Callback Error]:', err);
    return res.redirect('/?payment_error=server_error');
  }
});

// 6. POST /api/payment/webhook: Paystack Webhook Handler
app.post('/api/payment/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'];

  if (!signature || !PAYSTACK_SECRET_KEY) {
    return res.status(400).send('Invalid signature or secret key');
  }

  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      return res.status(400).send('Signature mismatch');
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      await processVerifiedPayment(reference);
    }

    return res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('[Paystack Webhook Error]:', err);
    return res.status(500).send('Server error');
  }
});

// ==========================================
// Vite Integration (Dev) or Static Serve (Prod)
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aviator Predictor Pro] Full-stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
