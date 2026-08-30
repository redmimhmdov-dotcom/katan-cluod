import { supabase } from '@/lib/supabase';

export interface BackupSnapshot {
  materials: unknown[];
  invoices: unknown[];
  invoice_items: unknown[];
  expenses: unknown[];
  app_users: unknown[];
  settings: unknown[];
  sales_reps: unknown[];
  rep_clients: unknown[];
  created_at: string;
}

export async function createBackupSnapshot(): Promise<BackupSnapshot> {
  const [m, i, it, e, u, s, sr, rc] = await Promise.all([
    supabase.from('materials').select('*'),
    supabase.from('invoices').select('*'),
    supabase.from('invoice_items').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('app_users').select('*'),
    supabase.from('settings').select('*'),
    supabase.from('sales_reps').select('*'),
    supabase.from('rep_clients').select('*'),
  ]);

  return {
    materials: m.data || [],
    invoices: i.data || [],
    invoice_items: it.data || [],
    expenses: e.data || [],
    app_users: u.data || [],
    settings: s.data || [],
    sales_reps: sr.data || [],
    rep_clients: rc.data || [],
    created_at: new Date().toISOString(),
  };
}

export async function saveBackup(type: string, description: string): Promise<boolean> {
  try {
    const snapshot = await createBackupSnapshot();
    const { error } = await supabase.from('backups').insert({
      description,
      backup_type: type,
      snapshot: snapshot as unknown as Record<string, unknown>,
    });
    return !error;
  } catch {
    return false;
  }
}
