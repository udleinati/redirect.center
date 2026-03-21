-- 002: Refactor seats to subscriptions model with quantity support and soft delete

-- 1. Add soft delete to users and magic_links
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Drop old tables (order matters due to foreign keys)
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS seats;

-- 3. Create subscriptions table (replaces seats)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('simple', 'wildcard')),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
    billing_interval VARCHAR(10) NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    grace_period_end TIMESTAMPTZ,
    over_limit BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Partial unique: 1 active subscription per type per user
CREATE UNIQUE INDEX idx_subscriptions_user_type_active
    ON subscriptions(user_id, type) WHERE deleted_at IS NULL;

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- 4. Create domains table (now references subscriptions, supports multiple per subscription)
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    is_wildcard BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Partial unique: domain unique among active records
CREATE UNIQUE INDEX idx_domains_domain_active ON domains(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_domains_subscription_id ON domains(subscription_id) WHERE deleted_at IS NULL;

-- 5. Drop old indexes that no longer exist
DROP INDEX IF EXISTS idx_seats_user_id;
DROP INDEX IF EXISTS idx_seats_stripe_subscription_id;
DROP INDEX IF EXISTS idx_domains_domain;
DROP INDEX IF EXISTS idx_domains_seat_id;
