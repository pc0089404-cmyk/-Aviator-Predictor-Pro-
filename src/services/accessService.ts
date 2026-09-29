import { UserAccessSession, UserAccessStatus, PaymentInitResponse } from '../types';

const REMEMBERED_USER_ID_KEY = 'aviator_remembered_user_id';
const ACTIVE_SESSION_KEY = 'aviator_active_user_session';

/**
 * Validates a User ID against the backend database
 */
export async function validateUserId(userId: string): Promise<{
  valid: boolean;
  exists: boolean;
  status: UserAccessStatus;
  isAdmin?: boolean;
  isLifetime?: boolean;
  daysRemaining?: number;
  expiryDate?: string | null;
  purchaseDate?: string;
  activationDate?: string;
  message?: string;
}> {
  const cleanDigits = (userId || '').toString().trim().replace(/\D/g, '');

  // 1. Guaranteed Instant Admin Key Recognition
  // Admin code 9130619144 ALWAYS grants 100% free lifetime access with zero payment required
  if (cleanDigits === '9130619144') {
    return {
      valid: true,
      exists: true,
      status: 'active',
      isAdmin: true,
      isLifetime: true,
      daysRemaining: -1,
      expiryDate: null,
      message: 'Admin authorization verified. Lifetime access active.'
    };
  }

  if (!cleanDigits) {
    return {
      valid: false,
      exists: false,
      status: 'not_found',
      message: 'User ID must contain numbers only'
    };
  }

  try {
    const res = await fetch('/api/validate-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: cleanDigits })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        valid: false,
        exists: false,
        status: 'not_found',
        message: err.message || 'Validation request failed'
      };
    }

    return await res.json();
  } catch (err) {
    console.error('Network error during User ID validation:', err);
    return {
      valid: false,
      exists: false,
      status: 'not_found',
      message: 'Connection failed. Please check network and try again.'
    };
  }
}

/**
 * Initializes a real Paystack payment through server-side authorization
 */
export async function initializePayment(params: {
  email?: string;
  type?: 'purchase' | 'renewal';
  userId?: string;
}): Promise<PaymentInitResponse> {
  try {
    const res = await fetch('/api/payment/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Payment initialization error:', err);
    return {
      success: false,
      error: 'Unable to reach payment gateway. Please verify network.'
    };
  }
}

/**
 * Verifies Paystack reference on the backend
 */
export async function verifyPayment(reference: string): Promise<{
  success: boolean;
  userId?: string;
  expiryDate?: string;
  isNewUser?: boolean;
  type?: 'purchase' | 'renewal';
  error?: string;
}> {
  try {
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reference })
    });

    return await res.json();
  } catch (err: any) {
    console.error('Payment verification error:', err);
    return {
      success: false,
      error: 'Network error during payment verification'
    };
  }
}

// Remember Me Helpers
export function getRememberedUserId(): string | null {
  try {
    return localStorage.getItem(REMEMBERED_USER_ID_KEY);
  } catch {
    return null;
  }
}

export function saveRememberedUserId(userId: string): void {
  try {
    localStorage.setItem(REMEMBERED_USER_ID_KEY, userId.trim());
  } catch {}
}

export function clearRememberedUserId(): void {
  try {
    localStorage.removeItem(REMEMBERED_USER_ID_KEY);
  } catch {}
}

// Active User Session Helpers
export function loadActiveSession(): UserAccessSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UserAccessSession;
    if (!session || !session.userId) return null;

    // Admin & Lifetime bypass
    if (session.isAdmin || session.isLifetime || session.userId === '9130619144') {
      return session;
    }

    // Strict Expiration Enforcement (1 week + 5 days = 12 days)
    if (session.expiryDate && new Date(session.expiryDate).getTime() <= Date.now()) {
      clearActiveSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: UserAccessSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
}
