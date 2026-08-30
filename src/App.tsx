import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { saveBackup } from '@/lib/backup';
import type { Material, Invoice, InvoiceItem, Expense, Settings, SalesRep, RepClient, AppUser, Backup, Permissions } from '@/types';
import LoginScreen from '@/components/LoginScreen';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import InvoicesSection from '@/components/InvoicesSection';
import MaterialsSection from '@/components/MaterialsSection';
import ExpensesSection from '@/components/ExpensesSection';
import SummarySection from '@/components/SummarySection';
import WarehouseSection from '@/components/WarehouseSection';
import SalesRepsSection from '@/components/SalesRepsSection';
import UsersSection from '@/components/UsersSection';
import BackupsSection from '@/components/BackupsSection';
import DeveloperModal from '@/components/DeveloperModal';

type Tab = 'dashboard' | 'invoices' | 'materials' | 'expenses' | 'summary' | 'warehouse' | 'reps' | 'users' | 'backups';

export default function App() {
  const { user, loading: authLoading, hasPermission, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showDev, setShowDev] = useState(false);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [repClients, setRepClients] = useState<RepClient[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [mRes, iRes, itRes, eRes, sRes, srRes, rcRes, uRes, bRes] = await Promise.all([
      supabase.from('materials').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('invoice_items').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('sales_reps').select('*').order('created_at', { ascending: false }),
      supabase.from('rep_clients').select('*').order('created_at', { ascending: false }),
      supabase.from('app_users').select('*').order('created_at', { ascending: false }),
      supabase.from('backups').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (mRes.data) setMaterials(mRes.data as Material[]);
    if (iRes.data) setInvoices(iRes.data as Invoice[]);
    if (itRes.data) setInvoiceItems(itRes.data as InvoiceItem[]);
    if (eRes.data) setExpenses(eRes.data as Expense[]);
    if (sRes.data) setSettings(sRes.data as Settings);
    if (srRes.data) setSalesReps(srRes.data as SalesRep[]);
    if (rcRes.data) setRepClients(rcRes.data as RepClient[]);
    if (uRes.data) setUsers(uRes.data as AppUser[]);
    if (bRes.data) setBackups(bRes.data as Backup[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  // Auto-daily backup on first load
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const key = `qattan_daily_backup_${today}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    saveBackup('auto_daily', `نسخة احتياطية يومية تلقائية - ${new Date().toLocaleDateString('ar-EG')}`);
  }, [user]);

  // Backup on tab close / page unload
  useEffect(() => {
    if (!user) return;
    const handler = () => {
      const desc = `نسخة احتياطية عند الإغلاق - ${new Date().toLocaleString('ar-EG')}`;
      saveBackup('auto_close', desc);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const exchangeRate = Number(settings?.exchange_rate_usd_syp) || 15000;

  // Derived totals
  const totalIncomeUsd = invoices.reduce((s, i) => s + Number(i.total_usd || 0), 0);
  const totalIncomeSyp = invoices.reduce((s, i) => s + Number(i.total_syp || 0), 0);
  const totalExpensesUsd = expenses.reduce((s, e) => s + Number(e.amount_usd || 0), 0);
  const totalExpensesSyp = expenses.reduce((s, e) => s + Number(e.amount_syp || 0), 0);
  const profitUsd = totalIncomeUsd - totalExpensesUsd;
  const profitSyp = totalIncomeSyp - totalExpensesSyp;

  // Build available tabs based on permissions
  const tabs: { id: Tab; label: string; perm?: keyof Permissions; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'الرئيسية' },
    { id: 'invoices', label: 'الفواتير', perm: 'add_invoices' },
    { id: 'materials', label: 'المواد والأسعار', perm: 'manage_materials' },
    { id: 'expenses', label: 'المصروفات', perm: 'add_expenses' },
    { id: 'summary', label: 'الملخص', perm: 'view_summary' },
    { id: 'warehouse', label: 'المستودع', perm: 'manage_warehouse' },
    { id: 'reps', label: 'المندوبين' },
    { id: 'users', label: 'المستخدمين', adminOnly: true },
    { id: 'backups', label: 'النسخ الاحتياطي', perm: 'view_backups' },
  ];

  const visibleTabs = tabs.filter(t => {
    if (t.adminOnly) return isAdmin;
    if (t.perm) return hasPermission(t.perm);
    return true;
  });

  // Guard: if current tab not visible, go to dashboard
  if (!visibleTabs.some(t => t.id === tab)) {
    setTab('dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        tab={tab}
        onTabChange={(t) => setTab(t as Tab)}
        tabs={visibleTabs.map(t => ({ id: t.id, label: t.label }))}
        onShowDev={() => setShowDev(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div key={tab} className="animate-fade-in">
            {tab === 'dashboard' && (
              <Dashboard
                totalIncomeUsd={totalIncomeUsd}
                totalIncomeSyp={totalIncomeSyp}
                totalExpensesUsd={totalExpensesUsd}
                totalExpensesSyp={totalExpensesSyp}
                profitUsd={profitUsd}
                profitSyp={profitSyp}
                invoicesCount={invoices.length}
                materialsCount={materials.length}
                expensesCount={expenses.length}
                recentInvoices={invoices.slice(0, 5)}
                exchangeRate={exchangeRate}
                userDisplayName={user.display_name || user.username}
                isAdmin={isAdmin}
                settings={settings}
                onSettingsUpdate={(s) => setSettings(s)}
              />
            )}
            {tab === 'invoices' && (
              <InvoicesSection
                materials={materials}
                invoices={invoices}
                invoiceItems={invoiceItems}
                setInvoices={setInvoices}
                setInvoiceItems={setInvoiceItems}
                setMaterials={setMaterials}
                exchangeRate={exchangeRate}
                currentUser={user}
                isAdmin={isAdmin}
              />
            )}
            {tab === 'materials' && (
              <MaterialsSection
                materials={materials}
                setMaterials={setMaterials}
                canEdit={isAdmin || hasPermission('manage_materials')}
              />
            )}
            {tab === 'expenses' && (
              <ExpensesSection
                expenses={expenses}
                setExpenses={setExpenses}
                currentUser={user}
              />
            )}
            {tab === 'summary' && (
              <SummarySection
                invoices={invoices}
                invoiceItems={invoiceItems}
                expenses={expenses}
                totalIncomeUsd={totalIncomeUsd}
                totalIncomeSyp={totalIncomeSyp}
                totalExpensesUsd={totalExpensesUsd}
                totalExpensesSyp={totalExpensesSyp}
                profitUsd={profitUsd}
                profitSyp={profitSyp}
              />
            )}
            {tab === 'warehouse' && (
              <WarehouseSection
                materials={materials}
                setMaterials={setMaterials}
                invoices={invoices}
                invoiceItems={invoiceItems}
                isAdmin={isAdmin}
              />
            )}
            {tab === 'reps' && (
              <SalesRepsSection
                salesReps={salesReps}
                setSalesReps={setSalesReps}
                repClients={repClients}
                setRepClients={setRepClients}
                invoices={invoices}
              />
            )}
            {tab === 'users' && isAdmin && (
              <UsersSection users={users} setUsers={setUsers} />
            )}
            {tab === 'backups' && (
              <BackupsSection
                backups={backups}
                setBackups={setBackups}
                backupPassword={settings?.backup_password || '1992'}
              />
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-sm text-slate-400">
        قطان للمحاسبة © 2026 — تصميم محمد الحسين
      </footer>

      {showDev && <DeveloperModal onClose={() => setShowDev(false)} />}
    </div>
  );
}
