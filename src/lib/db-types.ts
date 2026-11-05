/* Row types for the back-office tables (see docs/backend-schema.sql). */

export type LineItem = { label: string; amount: number };

export const STAGES = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "completed",
  "paid",
  "lost",
] as const;
export type Stage = (typeof STAGES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "won",
  "lost",
  "spam",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const JOB_STATUSES = [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type Customer = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  phone_digits: string | null;
  email: string | null;
  tags: string[];
  stage: Stage;
  source: string | null;
  sourced_by: "partner" | "owner" | "unknown";
  notes: string | null;
  do_not_contact: boolean;
  next_service_due: string | null;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  customer_id: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  access_notes: string | null;
  pets: string | null;
};

export type Lead = {
  id: string;
  type: "booking" | "walkthrough" | "quote" | "contact";
  status: LeadStatus;
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  zip: string | null;
  details: Record<string, unknown>;
  source: string | null;
  page: string | null;
  visitor_id: string | null;
  first_response_at: string | null;
  created_at: string;
};

export type Job = {
  id: string;
  number: number;
  customer_id: string;
  lead_id: string | null;
  scheduled_date: string | null;
  arrival_window: string | null;
  status: JobStatus;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  final_total: number | null;
  address: string | null;
  zip: string | null;
  notes: string | null;
  photos: string[];
  sourced_by: "partner" | "owner" | "unknown";
  completed_at: string | null;
  created_at: string;
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null;
};

export type Quote = {
  id: string;
  number: number;
  token: string;
  customer_id: string;
  job_id: string | null;
  title: string | null;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  customers?: Pick<Customer, "id" | "name" | "phone" | "email"> | null;
};

export type Invoice = {
  id: string;
  job_id: string | null;
  customer_id: string;
  amount: number;
  method: "square" | "cash" | "check" | "other";
  status: "draft" | "sent" | "paid" | "canceled";
  square_invoice_id: string | null;
  square_order_id: string | null;
  public_url: string | null;
  paid_at: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  job_id: string | null;
  kind: "call" | "text" | "email" | "note" | "status" | "system";
  body: string | null;
  created_by: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  title: string;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
  customers?: Pick<Customer, "id" | "name"> | null;
};

export type Commission = {
  id: string;
  job_id: string;
  amount: number;
  basis: string | null;
  status: "pending" | "paid";
  paid_at: string | null;
};

export type BlockedSlot = {
  id: string;
  day: string;
  arrival_window: string | null;
  reason: string | null;
};

export type TeamMember = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: "owner" | "partner";
};
export type TeamInvite = { email: string; role: "owner" | "partner"; display_name: string | null };

export type CommissionRule = { type: "percent" | "flat"; value: number; note?: string };
