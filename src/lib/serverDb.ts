import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'user';
  creditsRemaining: number;
  monthlyAllowance: number;
  tier: 'free' | 'pro' | 'enterprise';
  avatarInitials: string;
  createdAt: string;
}

export interface CreditLedgerRecord {
  id: string;
  userId: string;
  amount: number;
  action: string;
  remainingAfter: number;
  createdAt: string;
}

export interface ResumeIterationRecord {
  id: string;
  userId: string;
  candidateName: string;
  targetTitle: string;
  presetTitle?: string;
  rawResume: string;
  jobDescription: string;
  factBank?: any;
  jdAnalysis?: any;
  evidenceSelection?: any;
  generatedResume?: any;
  auditResult?: any;
  timestamp: string;
  createdAt: string;
}

export interface TelemetryLogRecord {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  module: string;
  message: string;
  stackTrace?: string;
  latencyMs?: number;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export interface CustomerRecord {
  customerId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  subscriptionId: string;
  customerId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'paused' | string;
  priceId: string;
  productId: string;
  scheduledChangeAction?: string | null;
  scheduledChangeAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DataStoreSchema {
  users: UserRecord[];
  creditLedger: CreditLedgerRecord[];
  resumeIterations: ResumeIterationRecord[];
  telemetryLogs: TelemetryLogRecord[];
  customers: CustomerRecord[];
  subscriptions: SubscriptionRecord[];
}

const DB_FILE = path.join(process.cwd(), 'fidelity_store.json');
const TMP_DB_FILE = path.join('/tmp', 'fidelity_store.json');

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'user_admin_001',
    email: 'admin@fidelity.ai',
    name: 'M Sajid Ali (Superuser)',
    role: 'super_admin',
    creditsRemaining: 999999,
    monthlyAllowance: 999999,
    tier: 'enterprise',
    avatarInitials: 'SA',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_std_002',
    email: 'alex.rivera@fidelity.ai',
    name: 'Alex Rivera',
    role: 'user',
    creditsRemaining: 3,
    monthlyAllowance: 3,
    tier: 'free',
    avatarInitials: 'AR',
    createdAt: new Date().toISOString(),
  },
];

class ServerDB {
  private data: DataStoreSchema;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DataStoreSchema {
    try {
      let targetFile = DB_FILE;
      if (fs.existsSync(TMP_DB_FILE)) {
        targetFile = TMP_DB_FILE;
      } else if (!fs.existsSync(DB_FILE) && process.env.VERCEL) {
        targetFile = TMP_DB_FILE;
      }

      if (fs.existsSync(targetFile)) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users && parsed.users.length > 0 ? parsed.users : INITIAL_USERS,
          creditLedger: parsed.creditLedger || [],
          resumeIterations: parsed.resumeIterations || [],
          telemetryLogs: parsed.telemetryLogs || [],
          customers: parsed.customers || [],
          subscriptions: parsed.subscriptions || [],
        };
      }
    } catch (e) {
      console.error('[ServerDB] Error loading DB file, initializing defaults:', e);
    }
    return {
      users: INITIAL_USERS,
      creditLedger: [],
      resumeIterations: [],
      telemetryLogs: [],
      customers: [],
      subscriptions: [],
    };
  }

  private saveToDisk(): void {
    const payload = JSON.stringify(this.data, null, 2);
    try {
      fs.writeFileSync(DB_FILE, payload, 'utf-8');
    } catch (e) {
      // Fallback for read-only filesystem environments (e.g., Vercel / serverless lambda)
      try {
        fs.writeFileSync(TMP_DB_FILE, payload, 'utf-8');
      } catch (tmpErr) {
        console.error('[ServerDB] Error saving to DB file:', tmpErr);
      }
    }
  }

  // User Operations
  public getUser(emailOrId: string): UserRecord | null {
    const query = emailOrId.toLowerCase();
    return (
      this.data.users.find(
        (u) => u.id.toLowerCase() === query || u.email.toLowerCase() === query
      ) || null
    );
  }

  public getOrCreateUser(email: string, name?: string, role?: 'super_admin' | 'user'): UserRecord {
    const existing = this.getUser(email);
    if (existing) return existing;

    const initials = name
      ? name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
      : email.substring(0, 2).toUpperCase();

    const newUser: UserRecord = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      role: role || 'user',
      creditsRemaining: 3, // Initial 3 free trial credits
      monthlyAllowance: 3,
      tier: 'free',
      avatarInitials: initials,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);

    // Initial Ledger Record
    const initialLedger: CreditLedgerRecord = {
      id: 'led_welcome_' + Date.now(),
      userId: newUser.id,
      amount: 3,
      action: 'GOOGLE_SIGNIN_WELCOME_BONUS',
      remainingAfter: 3,
      createdAt: new Date().toISOString(),
    };
    this.data.creditLedger.unshift(initialLedger);

    this.saveToDisk();
    return newUser;
  }

  public updateUserTier(
    emailOrId: string,
    newTier: 'free' | 'pro' | 'enterprise' | 'PRO',
    customCredits?: number
  ): { user: UserRecord; ledger: CreditLedgerRecord } | null {
    const user = this.data.users.find(
      (u) => u.id === emailOrId || u.email.toLowerCase() === emailOrId.toLowerCase()
    );
    if (!user) return null;

    const normalizedTier = (newTier.toLowerCase() === 'pro' ? 'pro' : newTier.toLowerCase() === 'enterprise' ? 'enterprise' : 'free') as 'free' | 'pro' | 'enterprise';
    user.tier = normalizedTier;

    let creditAllowance = 3;
    if (normalizedTier === 'pro') creditAllowance = customCredits !== undefined ? customCredits : 50;
    if (normalizedTier === 'enterprise') creditAllowance = customCredits !== undefined ? customCredits : 999999;
    if (normalizedTier === 'free') creditAllowance = 3;

    user.monthlyAllowance = creditAllowance;
    user.creditsRemaining = creditAllowance;

    const ledger: CreditLedgerRecord = {
      id: 'led_tier_' + Date.now(),
      userId: user.id,
      amount: creditAllowance,
      action: `TIER_UPGRADE_${newTier.toUpperCase()}`,
      remainingAfter: user.creditsRemaining,
      createdAt: new Date().toISOString(),
    };

    this.data.creditLedger.unshift(ledger);
    this.saveToDisk();

    return { user, ledger };
  }

  public refillUserCredits(
    emailOrId: string,
    additionalCredits: number
  ): { user: UserRecord; ledger: CreditLedgerRecord } | null {
    const user = this.data.users.find(
      (u) => u.id === emailOrId || u.email.toLowerCase() === emailOrId.toLowerCase()
    );
    if (!user) return null;

    user.creditsRemaining += additionalCredits;

    const ledger: CreditLedgerRecord = {
      id: 'led_refill_' + Date.now(),
      userId: user.id,
      amount: additionalCredits,
      action: `BOOSTER_CREDITS_REFILL_+${additionalCredits}`,
      remainingAfter: user.creditsRemaining,
      createdAt: new Date().toISOString(),
    };

    this.data.creditLedger.unshift(ledger);
    this.saveToDisk();

    return { user, ledger };
  }

  public updateUserRole(userId: string, role: 'super_admin' | 'user'): UserRecord | null {
    const user = this.data.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (user) {
      user.role = role;
      this.saveToDisk();
      return user;
    }
    return null;
  }

  public updateCredits(
    userId: string,
    amountDeductedOrAdded: number,
    action: string
  ): { user: UserRecord; ledger: CreditLedgerRecord } | null {
    const user = this.data.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (!user) return null;

    if (user.tier !== 'enterprise') {
      user.creditsRemaining = Math.max(0, user.creditsRemaining + amountDeductedOrAdded);
    }

    const ledger: CreditLedgerRecord = {
      id: 'led_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      amount: amountDeductedOrAdded,
      action,
      remainingAfter: user.creditsRemaining,
      createdAt: new Date().toISOString(),
    };

    this.data.creditLedger.unshift(ledger);
    this.saveToDisk();

    return { user, ledger };
  }

  public refillCreditsAdmin(userId: string, refillAmount: number, actionName?: string): { user: UserRecord; ledger: CreditLedgerRecord } | null {
    const user = this.data.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (!user) return null;

    user.creditsRemaining = Math.max(0, user.creditsRemaining + refillAmount);

    const ledger: CreditLedgerRecord = {
      id: 'led_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      amount: refillAmount,
      action: actionName || (refillAmount >= 0 ? 'ADMIN_REFILL' : 'ADMIN_DEDUCTION'),
      remainingAfter: user.creditsRemaining,
      createdAt: new Date().toISOString(),
    };

    this.data.creditLedger.unshift(ledger);
    this.saveToDisk();

    return { user, ledger };
  }

  public getAllUsers(): UserRecord[] {
    return this.data.users;
  }

  public getCreditLedger(): CreditLedgerRecord[] {
    return this.data.creditLedger;
  }

  // Resume Iterations Operations
  public getResumeHistory(userId?: string): ResumeIterationRecord[] {
    if (userId) {
      return this.data.resumeIterations.filter((r) => r.userId === userId || r.userId === 'global');
    }
    return this.data.resumeIterations;
  }

  public saveResumeIteration(record: Omit<ResumeIterationRecord, 'createdAt'>): ResumeIterationRecord {
    const existingIdx = this.data.resumeIterations.findIndex((r) => r.id === record.id);
    const newRecord: ResumeIterationRecord = {
      ...record,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.data.resumeIterations[existingIdx] = newRecord;
    } else {
      this.data.resumeIterations.unshift(newRecord);
    }

    this.saveToDisk();
    return newRecord;
  }

  public deleteResumeIteration(id: string): boolean {
    const initialLen = this.data.resumeIterations.length;
    this.data.resumeIterations = this.data.resumeIterations.filter((r) => r.id !== id);
    if (this.data.resumeIterations.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public deleteBulkResumeIterations(ids: string[]): number {
    const set = new Set(ids);
    const initialLen = this.data.resumeIterations.length;
    this.data.resumeIterations = this.data.resumeIterations.filter((r) => !set.has(r.id));
    const deletedCount = initialLen - this.data.resumeIterations.length;
    if (deletedCount > 0) {
      this.saveToDisk();
    }
    return deletedCount;
  }

  public clearAllResumeHistory(): void {
    this.data.resumeIterations = [];
    this.saveToDisk();
  }

  // Telemetry Log Operations
  public recordTelemetryLog(log: Omit<TelemetryLogRecord, 'id' | 'timestamp'>): TelemetryLogRecord {
    const newLog: TelemetryLogRecord = {
      ...log,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };

    if (!this.data.telemetryLogs) {
      this.data.telemetryLogs = [];
    }

    this.data.telemetryLogs.unshift(newLog);
    if (this.data.telemetryLogs.length > 100) {
      this.data.telemetryLogs = this.data.telemetryLogs.slice(0, 100);
    }

    this.saveToDisk();
    return newLog;
  }

  public getTelemetryLogs(): TelemetryLogRecord[] {
    return this.data.telemetryLogs || [];
  }

  // Paddle Customers & Subscriptions Operations
  public upsertCustomer(customerId: string, email: string): CustomerRecord {
    if (!this.data.customers) {
      this.data.customers = [];
    }
    const idx = this.data.customers.findIndex((c) => c.customerId === customerId || c.email === email);
    const now = new Date().toISOString();
    const record: CustomerRecord = {
      customerId,
      email,
      createdAt: idx >= 0 ? this.data.customers[idx].createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) {
      this.data.customers[idx] = record;
    } else {
      this.data.customers.unshift(record);
    }
    this.saveToDisk();
    return record;
  }

  public getCustomer(customerIdOrEmail: string): CustomerRecord | null {
    if (!this.data.customers) return null;
    const q = customerIdOrEmail.toLowerCase();
    return (
      this.data.customers.find(
        (c) => c.customerId.toLowerCase() === q || c.email.toLowerCase() === q
      ) || null
    );
  }

  public upsertSubscription(
    sub: Partial<SubscriptionRecord> & { subscriptionId: string; customerId: string }
  ): SubscriptionRecord {
    if (!this.data.subscriptions) {
      this.data.subscriptions = [];
    }
    const idx = this.data.subscriptions.findIndex((s) => s.subscriptionId === sub.subscriptionId);
    const now = new Date().toISOString();
    const existing = idx >= 0 ? this.data.subscriptions[idx] : null;

    const record: SubscriptionRecord = {
      subscriptionId: sub.subscriptionId,
      customerId: sub.customerId,
      status: sub.status || existing?.status || 'active',
      priceId: sub.priceId || existing?.priceId || '',
      productId: sub.productId || existing?.productId || '',
      scheduledChangeAction: sub.scheduledChangeAction !== undefined ? sub.scheduledChangeAction : (existing?.scheduledChangeAction || null),
      scheduledChangeAt: sub.scheduledChangeAt !== undefined ? sub.scheduledChangeAt : (existing?.scheduledChangeAt || null),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    if (idx >= 0) {
      this.data.subscriptions[idx] = record;
    } else {
      this.data.subscriptions.unshift(record);
    }

    this.saveToDisk();
    return record;
  }

  public getSubscription(subscriptionId: string): SubscriptionRecord | null {
    if (!this.data.subscriptions) return null;
    return this.data.subscriptions.find((s) => s.subscriptionId === subscriptionId) || null;
  }

  public getSubscriptionForCustomer(customerIdOrEmail: string): SubscriptionRecord | null {
    if (!this.data.subscriptions) return null;
    const customer = this.getCustomer(customerIdOrEmail);
    const targetId = customer ? customer.customerId : customerIdOrEmail;
    return (
      this.data.subscriptions.find(
        (s) => s.customerId === targetId || s.customerId.toLowerCase() === targetId.toLowerCase()
      ) || null
    );
  }

  public hasPaidAccess(customerIdOrEmail: string): boolean {
    const sub = this.getSubscriptionForCustomer(customerIdOrEmail);
    if (!sub) return false;
    // Granted as long as status is 'active' or 'trialing', regardless of whether scheduledChangeAction exists
    return sub.status === 'active' || sub.status === 'trialing';
  }
}

export const serverDb = new ServerDB();
