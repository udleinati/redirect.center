export interface User {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
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
}

export type SeatType = "simple" | "wildcard";
export type SeatStatus = "active" | "canceled" | "past_due";

export interface Seat {
  id: string;
  user_id: string;
  type: SeatType;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SeatStatus;
  current_period_start: Date | null;
  current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type ValidationStatus = "pending" | "validated" | "failed";

export interface Domain {
  id: string;
  seat_id: string;
  domain: string;
  is_wildcard: boolean;
  validation_status: ValidationStatus;
  created_at: Date;
  updated_at: Date;
}
