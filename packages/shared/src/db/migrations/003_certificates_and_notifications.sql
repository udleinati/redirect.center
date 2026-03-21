-- 003: Certificates, notifications, and domain validation columns

-- Tabela de certificados
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    is_wildcard BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_pem TEXT,
    private_key_pem_encrypted TEXT,
    private_key_iv TEXT,
    acme_account_key_encrypted TEXT,
    acme_account_key_iv TEXT,
    acme_order_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'dns_configured', 'issuing', 'issued',
        'renewal_pending', 'renewal_failed', 'expired', 'failed'
    )),
    error_message TEXT,
    issued_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    last_renewal_attempt TIMESTAMPTZ,
    renewal_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_certificates_domain_id ON certificates(domain_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_certificates_status ON certificates(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_certificates_expires_at ON certificates(expires_at) WHERE deleted_at IS NULL AND status = 'issued';

-- Tabela de notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'panel')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_domain_type ON notifications(user_id, domain_id, type, channel);

-- Colunas adicionais na tabela domains
ALTER TABLE domains ADD COLUMN dns_challenge_token TEXT;
ALTER TABLE domains ADD COLUMN dns_challenge_created_at TIMESTAMPTZ;
ALTER TABLE domains ADD COLUMN validation_requested_at TIMESTAMPTZ;
