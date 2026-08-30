/*
# Expand accounting system: users, auth, settings, sales reps, backups, warehouse

1. New Tables
- `app_users`: custom user accounts with username/password and granular permissions
  - id (uuid, pk)
  - username (text, unique, not null)
  - password (text, not null) — plain text for this local accounting app
  - display_name (text) — friendly name shown in UI
  - role (text) — 'admin' or 'user'
  - permissions (jsonb) — granular permission flags:
    { add_invoices, add_expenses, manage_materials, manage_warehouse, manage_users, view_summary, view_backups }
  - is_active (boolean, default true)
  - created_at (timestamptz)
- `settings`: single-row global settings table
  - id (int, pk, always 1)
  - exchange_rate_usd_syp (numeric) — global USD to SYP rate
  - backup_password (text, default '1992')
  - updated_at (timestamptz)
- `sales_reps`: sales representatives
  - id (uuid, pk)
  - name (text, not null)
  - created_at (timestamptz)
- `rep_clients`: clients assigned to a sales rep
  - id (uuid, pk)
  - rep_id (uuid, FK to sales_reps, cascade delete)
  - client_name (text, not null)
  - created_at (timestamptz)
- `backups`: backup snapshots metadata + data
  - id (uuid, pk)
  - description (text)
  - backup_type (text) — 'auto_daily', 'auto_close', 'auto_invoice', 'manual'
  - snapshot (jsonb) — full data snapshot
  - created_at (timestamptz)

2. Modified Tables
- `materials`: add `stock_quantity` (numeric, default 0) for warehouse inventory
- `invoices`: add `discount_percent` (numeric, default 0), `created_by` (text)
- `expenses`: add `created_by` (text)
- `invoice_items`: add `discount_percent` (numeric, default 0) — per-item discount

3. Security
- Enable RLS on all new tables.
- Allow anon + authenticated CRUD on all tables (single-tenant, custom auth handled in app).
- Seed default admin user (admin / 1992) and default settings (exchange rate 15000).
*/

-- Add columns to existing tables
ALTER TABLE materials ADD COLUMN IF NOT EXISTS stock_quantity numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by text DEFAULT '';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by text DEFAULT '';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0;

-- app_users
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  display_name text DEFAULT '',
  role text DEFAULT 'user',
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_app_users" ON app_users;
CREATE POLICY "anon_crud_app_users" ON app_users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_app_users" ON app_users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_app_users" ON app_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_app_users" ON app_users FOR DELETE TO anon, authenticated USING (true);

-- settings
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  exchange_rate_usd_syp numeric DEFAULT 15000,
  backup_password text DEFAULT '1992',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_settings" ON settings;
CREATE POLICY "anon_crud_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE TO anon, authenticated USING (true);

-- sales_reps
CREATE TABLE IF NOT EXISTS sales_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_sales_reps" ON sales_reps;
CREATE POLICY "anon_crud_sales_reps" ON sales_reps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_sales_reps" ON sales_reps FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_sales_reps" ON sales_reps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_sales_reps" ON sales_reps FOR DELETE TO anon, authenticated USING (true);

-- rep_clients
CREATE TABLE IF NOT EXISTS rep_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL REFERENCES sales_reps(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rep_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_rep_clients" ON rep_clients;
CREATE POLICY "anon_crud_rep_clients" ON rep_clients FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_rep_clients" ON rep_clients FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_rep_clients" ON rep_clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_rep_clients" ON rep_clients FOR DELETE TO anon, authenticated USING (true);

-- backups
CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text DEFAULT '',
  backup_type text DEFAULT 'manual',
  snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_backups" ON backups;
CREATE POLICY "anon_crud_backups" ON backups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_backups" ON backups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_backups" ON backups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_backups" ON backups FOR DELETE TO anon, authenticated USING (true);

-- Seed default admin user
INSERT INTO app_users (username, password, display_name, role, permissions)
VALUES ('admin', '1992', 'المدير', 'admin', '{"add_invoices":true,"add_expenses":true,"manage_materials":true,"manage_warehouse":true,"manage_users":true,"view_summary":true,"view_backups":true}')
ON CONFLICT (username) DO NOTHING;

-- Seed default settings row
INSERT INTO settings (id, exchange_rate_usd_syp, backup_password)
VALUES (1, 15000, '1992')
ON CONFLICT (id) DO NOTHING;
