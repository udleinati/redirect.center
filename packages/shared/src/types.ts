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
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
