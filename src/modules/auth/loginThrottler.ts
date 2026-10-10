import { config } from '../../config';

export interface ThrottleKey {
  ip: string;
  email: string;
}

export interface ThrottleResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: 'ACCOUNT_LOCKED' | 'IP_LOCKED';
}

export interface ILoginThrottler {
  checkLimit(key: ThrottleKey): Promise<ThrottleResult>;
  recordFailedAttempt(key: ThrottleKey): Promise<void>;
  resetAttempts(key: ThrottleKey): Promise<void>;
  clearAll?(): void;
}

interface AttemptRecord {
  timestamps: number[];
  lockedUntil: number | null;
}

/**
 * In-memory Login Throttler (SEC-02)
 *
 * Implements dual-dimensional throttling:
 * 1. Account-based limit: Protects individual accounts from targeted brute-forcing.
 * 2. IP-based limit: Protects the system from distributed password spraying across many accounts.
 *
 * Architecture note for production multi-instance clusters:
 * In horizontally-scaled environments with multiple server instances, this interface
 * should be implemented using a shared Redis / Valkey cluster with Redis atomic pipelines.
 */
export class InMemoryLoginThrottler implements ILoginThrottler {
  private accountAttempts: Map<string, AttemptRecord> = new Map();
  private ipAttempts: Map<string, AttemptRecord> = new Map();

  clearAll(): void {
    this.accountAttempts.clear();
    this.ipAttempts.clear();
  }

  private cleanOldAttempts(record: AttemptRecord, windowMs: number): void {
    const now = Date.now();
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.lockedUntil && record.lockedUntil <= now) {
      record.lockedUntil = null;
    }
  }

  async checkLimit(key: ThrottleKey): Promise<ThrottleResult> {
    const now = Date.now();
    const normalizedEmail = key.email.toLowerCase().trim();
    const ip = key.ip.trim();

    // 1. Check Account Lockout
    const accountRecord = this.accountAttempts.get(normalizedEmail);
    if (accountRecord) {
      const windowMs = config.LOGIN_ACCOUNT_LOCKOUT_MINUTES * 60 * 1000;
      this.cleanOldAttempts(accountRecord, windowMs);

      if (accountRecord.lockedUntil && accountRecord.lockedUntil > now) {
        const retryAfterSeconds = Math.ceil((accountRecord.lockedUntil - now) / 1000);
        return {
          allowed: false,
          retryAfterSeconds,
          reason: 'ACCOUNT_LOCKED',
        };
      }
    }

    // 2. Check IP Lockout
    const ipRecord = this.ipAttempts.get(ip);
    if (ipRecord) {
      const windowMs = config.LOGIN_IP_LOCKOUT_MINUTES * 60 * 1000;
      this.cleanOldAttempts(ipRecord, windowMs);

      if (ipRecord.lockedUntil && ipRecord.lockedUntil > now) {
        const retryAfterSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000);
        return {
          allowed: false,
          retryAfterSeconds,
          reason: 'IP_LOCKED',
        };
      }
    }

    return { allowed: true };
  }

  async recordFailedAttempt(key: ThrottleKey): Promise<void> {
    const now = Date.now();
    const normalizedEmail = key.email.toLowerCase().trim();
    const ip = key.ip.trim();

    // Record Account attempt
    let accountRecord = this.accountAttempts.get(normalizedEmail);
    if (!accountRecord) {
      accountRecord = { timestamps: [], lockedUntil: null };
      this.accountAttempts.set(normalizedEmail, accountRecord);
    }
    const accountWindowMs = config.LOGIN_ACCOUNT_LOCKOUT_MINUTES * 60 * 1000;
    this.cleanOldAttempts(accountRecord, accountWindowMs);
    accountRecord.timestamps.push(now);

    if (accountRecord.timestamps.length >= config.LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS) {
      accountRecord.lockedUntil = now + accountWindowMs;
    }

    // Record IP attempt
    let ipRecord = this.ipAttempts.get(ip);
    if (!ipRecord) {
      ipRecord = { timestamps: [], lockedUntil: null };
      this.ipAttempts.set(ip, ipRecord);
    }
    const ipWindowMs = config.LOGIN_IP_LOCKOUT_MINUTES * 60 * 1000;
    this.cleanOldAttempts(ipRecord, ipWindowMs);
    ipRecord.timestamps.push(now);

    if (ipRecord.timestamps.length >= config.LOGIN_IP_MAX_FAILED_ATTEMPTS) {
      ipRecord.lockedUntil = now + ipWindowMs;
    }
  }

  async resetAttempts(key: ThrottleKey): Promise<void> {
    this.accountAttempts.delete(key.email.toLowerCase().trim());
    // Only reset account attempts on successful login; IP attempts remain tracked to prevent distributed attacks
  }
}

let defaultThrottler: ILoginThrottler = new InMemoryLoginThrottler();

export const getLoginThrottler = (): ILoginThrottler => defaultThrottler;

export const setLoginThrottler = (throttler: ILoginThrottler): void => {
  defaultThrottler = throttler;
};
