-- Ilika Campaign Database Schema
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS throughout)

-- ===== CORE TABLES =====

-- Groups table: tracks group sponsorship campaigns
CREATE TABLE IF NOT EXISTS groups (
  group_id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  initiator_name TEXT NOT NULL,
  initiator_email TEXT NOT NULL,
  initiator_phone TEXT,
  total_slots INT DEFAULT 4,
  filled_slots INT DEFAULT 1,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Complete')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contributions table: tracks all individual + group donations
CREATE TABLE IF NOT EXISTS contributions (
  id SERIAL PRIMARY KEY,
  group_id INT REFERENCES groups(group_id) ON DELETE SET NULL,
  donor_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  type TEXT NOT NULL CHECK (type IN ('individual', 'group')),
  payment_preference TEXT CHECK (payment_preference IN ('monthly', 'annual')),
  payment_status TEXT DEFAULT 'Pending',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_subscription_id TEXT,
  razorpay_refund_id TEXT,
  amount INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ADD COLUMNS TO EXISTING TABLES (safe to re-run) =====

-- Razorpay IDs
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT;

-- Subscription tracking
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending';
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS total_payments_made INT DEFAULT 0;

-- Refund tracking
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS refund_amount INT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Dispute tracking
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS dispute_status TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS dispute_id TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Retry tracking
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Referral tracking
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- PAN / Corporate / GST
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS donor_type TEXT DEFAULT 'individual' CHECK (donor_type IN ('individual', 'corporate'));
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- ===== UPDATE CHECK CONSTRAINTS (drop old, add new) =====

-- payment_status: expand to include Authorized, Refunded, Disputed
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_payment_status_check;
ALTER TABLE contributions ADD CONSTRAINT contributions_payment_status_check
  CHECK (payment_status IN ('Pending', 'Authorized', 'Success', 'Failed', 'Refunded', 'Disputed'));

-- subscription_status: expand to include all Razorpay states
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_subscription_status_check;
ALTER TABLE contributions ADD CONSTRAINT contributions_subscription_status_check
  CHECK (subscription_status IN ('pending', 'authenticated', 'active', 'halted', 'paused', 'cancelled', 'completed'));

-- ===== AUDIT TABLES =====

-- Webhook events audit log
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  razorpay_event_id TEXT,
  payload JSONB NOT NULL,
  contribution_id INT REFERENCES contributions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  recipient TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  contribution_id INT REFERENCES contributions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site content (key-value store for admin-editable content)
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES (all created AFTER columns exist) =====

CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_contributions_group_id ON contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON contributions(type);
CREATE INDEX IF NOT EXISTS idx_contributions_payment_status ON contributions(payment_status);
CREATE INDEX IF NOT EXISTS idx_contributions_subscription_status ON contributions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_contributions_email ON contributions(email);
CREATE INDEX IF NOT EXISTS idx_contributions_razorpay_payment_id ON contributions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_contributions_razorpay_subscription_id ON contributions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_contributions_dispute_status ON contributions(dispute_status);
CREATE INDEX IF NOT EXISTS idx_contributions_retry ON contributions(payment_status, retry_count);
CREATE INDEX IF NOT EXISTS idx_contributions_referral_code ON contributions(referral_code);
CREATE INDEX IF NOT EXISTS idx_contributions_referred_by ON contributions(referred_by);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);

-- ===== ROW LEVEL SECURITY =====

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policies (DROP IF EXISTS + CREATE to be idempotent)
DROP POLICY IF EXISTS "Allow public read on groups" ON groups;
CREATE POLICY "Allow public read on groups" ON groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on groups" ON groups;
CREATE POLICY "Allow public insert on groups" ON groups FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on groups" ON groups;
CREATE POLICY "Allow public update on groups" ON groups FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read on contributions" ON contributions;
CREATE POLICY "Allow public read on contributions" ON contributions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on contributions" ON contributions;
CREATE POLICY "Allow public insert on contributions" ON contributions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on contributions" ON contributions;
CREATE POLICY "Allow public update on contributions" ON contributions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public all on webhook_events" ON webhook_events;
CREATE POLICY "Allow public all on webhook_events" ON webhook_events FOR ALL USING (true);
DROP POLICY IF EXISTS "Allow public all on email_logs" ON email_logs;
CREATE POLICY "Allow public all on email_logs" ON email_logs FOR ALL USING (true);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on site_content" ON site_content;
CREATE POLICY "Allow public all on site_content" ON site_content FOR ALL USING (true);
