export interface Material {
  id: string;
  name: string;
  price_usd: number;
  price_syp: number;
  stock_quantity: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  customer_name: string;
  description: string;
  total_usd: number;
  total_syp: number;
  payment_status: string;
  remaining_usd: number;
  remaining_syp: number;
  discount_percent: number;
  created_by: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  material_name: string;
  quantity: number;
  price_usd: number;
  price_syp: number;
  discount_percent: number;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount_usd: number;
  amount_syp: number;
  created_by: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  display_name: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  exchange_rate_usd_syp: number;
  backup_password: string;
  updated_at: string;
}

export interface SalesRep {
  id: string;
  name: string;
  created_at: string;
}

export interface RepClient {
  id: string;
  rep_id: string;
  client_name: string;
  created_at: string;
}

export interface Backup {
  id: string;
  description: string;
  backup_type: string;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export type PaymentStatus = 'full' | 'partial';

export interface Permissions {
  add_invoices: boolean;
  add_expenses: boolean;
  manage_materials: boolean;
  manage_warehouse: boolean;
  manage_users: boolean;
  view_summary: boolean;
  view_backups: boolean;
}

export const DEFAULT_PERMISSIONS: Permissions = {
  add_invoices: false,
  add_expenses: false,
  manage_materials: false,
  manage_warehouse: false,
  manage_users: false,
  view_summary: false,
  view_backups: false,
};

export const ADMIN_PERMISSIONS: Permissions = {
  add_invoices: true,
  add_expenses: true,
  manage_materials: true,
  manage_warehouse: true,
  manage_users: true,
  view_summary: true,
  view_backups: true,
};
