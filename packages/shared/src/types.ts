export interface User {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface MagicLink {
  id: string;
  email: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  deleted_at: Date | null;
}

export type SlotType = "simple" | "wildcard";
export type SubscriptionStatus = "active" | "canceled" | "past_due";
export type BillingInterval = "monthly" | "yearly";

export interface Subscription {
  id: string;
  user_id: string;
  type: SlotType;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  quantity: number;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: Date | null;
  current_period_end: Date | null;
  grace_period_end: Date | null;
  over_limit: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type ValidationStatus = "pending" | "validated" | "failed";

export interface Domain {
  id: string;
  subscription_id: string;
  domain: string;
  is_wildcard: boolean;
  validation_status: ValidationStatus;
  dns_challenge_token: string | null;
  dns_challenge_created_at: Date | null;
  validation_requested_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type CertificateStatus =
  | "pending"
  | "dns_configured"
  | "issuing"
  | "issued"
  | "renewal_pending"
  | "renewal_failed"
  | "expired"
  | "failed";

export interface Certificate {
  id: string;
  domain_id: string;
  domain: string;
  is_wildcard: boolean;
  certificate_pem: string | null;
  private_key_pem_encrypted: string | null;
  private_key_iv: string | null;
  acme_account_key_encrypted: string | null;
  acme_account_key_iv: string | null;
  acme_order_url: string | null;
  status: CertificateStatus;
  error_message: string | null;
  issued_at: Date | null;
  expires_at: Date | null;
  last_renewal_attempt: Date | null;
  renewal_attempts: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Notification {
  id: string;
  user_id: string;
  domain_id: string | null;
  type: string;
  channel: "email" | "panel";
  sent_at: Date;
  created_at: Date;
}
