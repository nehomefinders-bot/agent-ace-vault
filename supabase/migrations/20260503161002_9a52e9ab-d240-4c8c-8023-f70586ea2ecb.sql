-- Deals / commission tracker
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  side text NOT NULL DEFAULT 'buy', -- 'buy' | 'sell' | 'both'
  sale_price numeric NOT NULL DEFAULT 0,
  gross_commission numeric NOT NULL DEFAULT 0,
  agent_split_pct numeric NOT NULL DEFAULT 80,
  brokerage_split_pct numeric NOT NULL DEFAULT 20,
  referral_pct numeric NOT NULL DEFAULT 0,
  referral_to text,
  status text NOT NULL DEFAULT 'pending', -- pending | under_contract | closed | dead
  close_date date,
  client_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals select own" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deals insert own" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deals update own" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "deals delete own" ON public.deals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed default chart of accounts for new users
CREATE OR REPLACE FUNCTION public.seed_default_accounts(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (user_id, code, name, kind, tax_line, description) VALUES
    (_user_id, '4000', 'Commission Income', 'Income', 'Schedule C — Line 1', NULL),
    (_user_id, '4010', 'Referral Income', 'Income', 'Schedule C — Line 1', NULL),
    (_user_id, '4020', 'Property Mgmt Fees', 'Income', 'Schedule C — Line 1', NULL),
    (_user_id, '4030', 'Other Income', 'Income', 'Schedule C — Line 6', NULL),
    (_user_id, '6010', 'Advertising & Marketing', 'Expense', 'Schedule C — Line 8', NULL),
    (_user_id, '6020', 'Auto — Gas & Maintenance', 'Expense', 'Schedule C — Line 9', NULL),
    (_user_id, '6021', 'Auto — Mileage Deduction', 'Expense', 'Schedule C — Line 9', 'Standard IRS mileage'),
    (_user_id, '6030', 'Commissions Paid', 'Expense', 'Schedule C — Line 10', NULL),
    (_user_id, '6040', 'Continuing Education', 'Expense', 'Schedule C — Line 27a', NULL),
    (_user_id, '6050', 'Dues & Subscriptions (MLS)', 'Expense', 'Schedule C — Line 27a', NULL),
    (_user_id, '6060', 'Insurance (E&O, Liability)', 'Expense', 'Schedule C — Line 15', NULL),
    (_user_id, '6070', 'Legal & Professional Fees', 'Expense', 'Schedule C — Line 17', NULL),
    (_user_id, '6080', 'Meals (50% deductible)', 'Expense', 'Schedule C — Line 24b', NULL),
    (_user_id, '6090', 'Office Supplies', 'Expense', 'Schedule C — Line 22', NULL),
    (_user_id, '6100', 'Office Rent', 'Expense', 'Schedule C — Line 20b', NULL),
    (_user_id, '6110', 'Software & Subscriptions', 'Expense', 'Schedule C — Line 22', NULL),
    (_user_id, '6120', 'Staging & Photography', 'Expense', 'Schedule C — Line 8', NULL),
    (_user_id, '6130', 'Travel', 'Expense', 'Schedule C — Line 24a', NULL),
    (_user_id, '6140', 'Telephone & Internet', 'Expense', 'Schedule C — Line 25', NULL),
    (_user_id, '6150', 'Bank & Merchant Fees', 'Expense', 'Schedule C — Line 17', NULL),
    (_user_id, '6160', 'Gifts (capped $25/client)', 'Expense', 'Schedule C — Line 27a', NULL),
    (_user_id, '6999', 'Other Business Expenses', 'Expense', 'Schedule C — Line 27a', NULL),
    (_user_id, '1010', 'Business Checking', 'Asset', NULL, 'Primary operating account'),
    (_user_id, '1011', 'Secondary Checking', 'Asset', NULL, NULL),
    (_user_id, '1015', 'Business Savings', 'Asset', NULL, 'Tax & reserves'),
    (_user_id, '1020', 'Stripe Clearing', 'Asset', NULL, 'Funds in transit from Stripe'),
    (_user_id, '1100', 'Accounts Receivable', 'Asset', NULL, NULL),
    (_user_id, '2010', 'Business Credit Card', 'Liability', NULL, NULL),
    (_user_id, '2100', 'Loan from Officer', 'Liability', NULL, 'Money you advanced to the business'),
    (_user_id, '3010', 'Owner Contributions', 'Equity', NULL, NULL),
    (_user_id, '3020', 'Owner Draws', 'Equity', NULL, NULL),
    (_user_id, '3900', 'Retained Earnings', 'Equity', NULL, NULL)
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  PERFORM public.seed_default_accounts(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: seed accounts for any existing users without any
DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = u.id) THEN
      PERFORM public.seed_default_accounts(u.id);
    END IF;
  END LOOP;
END $$;