import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileText, Package, ArrowDownCircle, Receipt, Wallet, User, Save, Pencil, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmt, fmtDate } from '@/lib/format';
import type { Invoice, Settings } from '@/types';

interface DashboardProps {
  totalIncomeUsd: number;
  totalIncomeSyp: number;
  totalExpensesUsd: number;
  totalExpensesSyp: number;
  profitUsd: number;
  profitSyp: number;
  invoicesCount: number;
  materialsCount: number;
  expensesCount: number;
  recentInvoices: Invoice[];
  exchangeRate: number;
  userDisplayName: string;
  isAdmin: boolean;
  settings: Settings | null;
  onSettingsUpdate: (s: Settings) => void;
}

export default function Dashboard(props: DashboardProps) {
  const {
    totalIncomeUsd, totalIncomeSyp,
    totalExpensesUsd, totalExpensesSyp,
    profitUsd, profitSyp,
    invoicesCount, materialsCount, expensesCount,
    recentInvoices, exchangeRate, userDisplayName,
    isAdmin, settings, onSettingsUpdate,
  } = props;

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(exchangeRate);
  const [savingRate, setSavingRate] = useState(false);

  const isProfit = profitUsd >= 0;

  async function saveRate() {
    if (rateInput <= 0) return;
    setSavingRate(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .update({ exchange_rate_usd_syp: rateInput, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select()
        .single();
      if (error) throw error;
      onSettingsUpdate(data as Settings);
      setEditingRate(false);
    } catch {
      alert('تعذر حفظ سعر الصرف');
    } finally {
      setSavingRate(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100">
          <User className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">مرحباً، {userDisplayName}</h2>
          <p className="text-sm text-slate-400">إليك ملخص حساباتك اليوم</p>
        </div>
      </div>

      {/* Hero summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-emerald-500 to-teal-500" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-400">الوارد (الدخل)</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-800">{fmt(totalIncomeUsd)} $</p>
            <p className="text-sm text-slate-500">{fmt(totalIncomeSyp)} ل.س</p>
          </div>
        </div>

        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-red-500 to-orange-500" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-slate-400">الصادر (المصروف)</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-800">{fmt(totalExpensesUsd)} $</p>
            <p className="text-sm text-slate-500">{fmt(totalExpensesSyp)} ل.س</p>
          </div>
        </div>

        <div className={`card p-6 relative overflow-hidden ${isProfit ? 'ring-1 ring-emerald-200' : 'ring-1 ring-red-200'}`}>
          <div className={`absolute top-0 left-0 w-full h-1 ${isProfit ? 'bg-gradient-to-l from-emerald-500 to-teal-500' : 'bg-gradient-to-l from-red-500 to-orange-500'}`} />
          <div className="flex items-start justify-between mb-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${isProfit ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {isProfit ? <Wallet className="w-6 h-6 text-emerald-600" /> : <Wallet className="w-6 h-6 text-red-500" />}
            </div>
            <span className="text-sm font-semibold text-slate-400">{isProfit ? 'ربح' : 'خسارة'}</span>
          </div>
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
              {isProfit ? '+' : ''}{fmt(profitUsd)} $
            </p>
            <p className={`text-sm ${isProfit ? 'text-emerald-500' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{fmt(profitSyp)} ل.س
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50"><FileText className="w-5 h-5 text-blue-500" /></div>
          <div><p className="text-2xl font-bold text-slate-800">{invoicesCount}</p><p className="text-sm text-slate-400">فاتورة</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-50"><Package className="w-5 h-5 text-amber-500" /></div>
          <div><p className="text-2xl font-bold text-slate-800">{materialsCount}</p><p className="text-sm text-slate-400">مادة</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-50"><ArrowDownCircle className="w-5 h-5 text-purple-500" /></div>
          <div><p className="text-2xl font-bold text-slate-800">{expensesCount}</p><p className="text-sm text-slate-400">مصروف</p></div>
        </div>
      </div>

      {/* Exchange rate — admin can edit manually */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <DollarSign className="w-4 h-4" />
            سعر الصرف المعتمد
          </div>
          {editingRate ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rateInput || ''}
                min={0}
                step="any"
                onChange={e => setRateInput(Number(e.target.value))}
                className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <span className="text-sm text-slate-400">ل.س</span>
              <button onClick={saveRate} disabled={savingRate} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                {savingRate ? <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button onClick={() => { setEditingRate(false); setRateInput(exchangeRate); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <span className="text-xs">إلغاء</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">1 $ = {fmt(exchangeRate)} ل.س</span>
              {isAdmin && (
                <button onClick={() => { setRateInput(exchangeRate); setEditingRate(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="تعديل سعر الصرف">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        {settings?.updated_at && (
          <p className="text-xs text-slate-400 mt-2">آخر تحديث: {fmtDate(settings.updated_at)}</p>
        )}
      </div>

      {/* Recent invoices */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">أحدث الفواتير</h2>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد فواتير بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{inv.customer_name}</p>
                    <p className="text-xs text-slate-400">{inv.payment_status === 'full' ? 'دفع كامل' : 'دفع جزئي'}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">{fmt(Number(inv.total_usd))} $</p>
                  <p className="text-xs text-slate-400">{fmt(Number(inv.total_syp))} ل.س</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
