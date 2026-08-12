-- Migration 001: Initial DB Schema for Users, Credit Ledger, and Resume Iterations

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user', -- 'super_admin' or 'user'
  credits_remaining INTEGER DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Credits Ledger (Audit Log)
CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  amount INTEGER, -- Negative for deductions, positive for refills
  action TEXT,    -- e.g., 'PIPELINE_RUN', 'ADMIN_REFILL'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resume History (To replace localStorage)
CREATE TABLE IF NOT EXISTS resume_iterations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  candidate_name TEXT,
  target_job_title TEXT,
  raw_resume TEXT,
  tailored_output TEXT, -- JSON or Markdown
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
