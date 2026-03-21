-- 004: Add acme_account_url to certificates table
ALTER TABLE certificates ADD COLUMN acme_account_url TEXT;
