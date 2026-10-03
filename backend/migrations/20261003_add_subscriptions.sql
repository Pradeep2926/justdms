create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_email text unique not null,
  plan text not null default 'pro',
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  amount_paise integer,
  currency text not null default 'INR',
  status text not null default 'inactive',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_plan_id text,
  razorpay_subscription_id text,
  razorpay_customer_id text,
  current_start timestamptz,
  current_end timestamptz,
  cancel_at_period_end boolean default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_user_email_idx
  on subscriptions(user_email);

create index if not exists subscriptions_order_id_idx
  on subscriptions(razorpay_order_id);

create unique index if not exists subscriptions_razorpay_id_idx
  on subscriptions(razorpay_subscription_id)
  where razorpay_subscription_id is not null;
