import { useState } from 'react';
import { Plus, Trash2, Save, X, ArrowDownCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmt } from '@/lib/format';
import type { Expense, AppUser } from '@/types';

interface ExpensesSectionProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  currentUser: AppUser;
}

export default function ExpensesSection({ expenses, setExpenses, currentUser }: ExpensesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amountUsd, setAmountUsd] = useState(0);
  const [amountSyp, setAmountSyp] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function resetForm() {
    setDescription(''); setAmountUsd(0); setAmountSyp(0); setError('');
  }

  async function handleSave() {
    setError('');
    if (!description.trim()) { setError('الرجاء إدخال وصف المصروف'); return; }
    if (amountUsd <= 0 && amountSyp <= 0) { setError('الرجاء إدخال مبلغ'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('expenses').insert({
          description: description.trim(),
          amount_usd: amountUsd,
          amount_syp: amountSyp,
          created_by: currentUser.username,
        }).select().single();
      if (error) throw error;
      setExpenses(prev => [data as Expense, ...prev]);
      resetForm();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: Expense) {
    if (!confirm(`حذف مصروف "${e.description}"؟`)) return;
    const { error } = await supabase.from('expenses').delete().eq('id', e.id);
    if (error) { alert('تعذر الحذف'); return; }
    setExpenses(prev => prev.filter(it => it.id !== e.id));
  }

  const totalUsd = expenses.reduce((s, e) => s + Number(e.amount_usd || 0), 0);
  const totalSyp = expenses.reduce((s, e) => s + Number(e.amount_syp || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-slate-800">المصروفات (الصادر)</h2>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-5 h-5" />
          إضافة مصروف
        </button>
      </div>

      {/* Total banner */}
      <div className="card p-5 flex items-center justify-between bg-gradient-to-l from-red-50 to-orange-50 border-red-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-100">
            <ArrowDownCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">إجمالي المصروفات</p>
            <p className="text-xs text-slate-400">يتم ترحيلها إلى قسم الصادر</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-xl font-bold text-slate-800">{fmt(totalUsd)} $</p>
          <p className="text-sm text-slate-500">{fmt(totalSyp)} ل.س</p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card w-full max-w-md my-8 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">مصروف جديد</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">وصف المصروف</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="مثال: شراء بضاعة، إيجار، كهرباء..." className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">المبلغ ($)</label>
                  <input type="number" value={amountUsd || ''} min={0} step="any" onChange={e => setAmountUsd(Number(e.target.value))} placeholder="0" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">المبلغ (ل.س)</label>
                  <input type="number" value={amountSyp || ''} min={0} step="any" onChange={e => setAmountSyp(Number(e.target.value))} placeholder="0" className="input-field" />
                </div>
              </div>
              {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="card p-12 text-center">
          <ArrowDownCircle className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">لا توجد مصروفات بعد. أضف مصروفاً للبدء.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {expenses.map(e => (
            <div key={e.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50">
                  <ArrowDownCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{e.description}</p>
                  <p className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">{fmt(Number(e.amount_usd))} $</p>
                  <p className="text-xs text-slate-400">{fmt(Number(e.amount_syp))} ل.س</p>
                </div>
                <button onClick={() => handleDelete(e)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
