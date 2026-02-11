-- Ilika Campaign Database Schema
-- Run this in your Supabase SQL Editor

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
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Success', 'Failed')),
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  amount INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_contributions_group_id ON contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON contributions(type);
CREATE INDEX IF NOT EXISTS idx_contributions_payment_status ON contributions(payment_status);

-- Enable Row Level Security (optional, recommended for production)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (for group pages and social proof)
CREATE POLICY "Allow public read on groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert on groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on groups" ON groups FOR UPDATE USING (true);

CREATE POLICY "Allow public read on contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on contributions" ON contributions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on contributions" ON contributions FOR UPDATE USING (true);
