import { useState } from 'react';
import { Users, Plus, Trash2, X, Save, UserCheck, TrendingUp, Star, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmt, fmtDateShort } from '@/lib/format';
import type { SalesRep, RepClient, Invoice } from '@/types';

interface SalesRepsSectionProps {
  salesReps: SalesRep[];
  setSalesReps: React.Dispatch<React.SetStateAction<SalesRep[]>>;
  repClients: RepClient[];
  setRepClients: React.Dispatch<React.SetStateAction<RepClient[]>>;
  invoices: Invoice[];
}

interface RepStats {
  totalInvoices: number;
  totalSalesUsd: number;
  totalSalesSyp: number;
  matchedClients: number;
  totalClients: number;
  activityScore: number;
  rating: string;
}

function computeRepStats(rep: SalesRep, repClients: RepClient[], invoices: Invoice[]): RepStats {
  const clients = repClients.filter(c => c.rep_id === rep.id);
  const clientNames = clients.map(c => c.client_name.toLowerCase());

  const matchedInvoices = invoices.filter(inv =>
    clientNames.includes(inv.customer_name.toLowerCase())
  );

  const totalInvoices = matchedInvoices.length;
  const totalSalesUsd = matchedInvoices.reduce((s, i) => s + Number(i.total_usd || 0), 0);
  const totalSalesSyp = matchedInvoices.reduce((s, i) => s + Number(i.total_syp || 0), 0);
  const matchedClients = new Set(matchedInvoices.map(i => i.customer_name.toLowerCase())).size;

  // Activity score: combination of invoices count and matched client ratio
  const clientRatio = clients.length > 0 ? matchedClients / clients.length : 0;
  const invoiceScore = Math.min(totalInvoices / 10, 1) * 50;
  const clientScore = clientRatio * 50;
  const activityScore = Math.round(invoiceScore + clientScore);

  let rating = 'ضعيف';
  if (activityScore >= 80) rating = 'ممتاز';
  else if (activityScore >= 60) rating = 'جيد جداً';
  else if (activityScore >= 40) rating = 'جيد';
  else if (activityScore >= 20) rating = 'متوسط';

  return { totalInvoices, totalSalesUsd, totalSalesSyp, matchedClients, totalClients: clients.length, activityScore, rating };
}

export default function SalesRepsSection({ salesReps, setSalesReps, repClients, setRepClients, invoices }: SalesRepsSectionProps) {
  const [showRepForm, setShowRepForm] = useState(false);
  const [repName, setRepName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showClientForm, setShowClientForm] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  // For comparison ranking
  const allStats = salesReps.map(r => ({ rep: r, stats: computeRepStats(r, repClients, invoices) }));
  const ranked = [...allStats].sort((a, b) => b.stats.activityScore - a.stats.activityScore);
  const bestRep = ranked[0];

  async function addRep() {
    setError('');
    if (!repName.trim()) { setError('الرجاء إدخال اسم المندوب'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('sales_reps').insert({ name: repName.trim() }).select().single();
      if (error) throw error;
      setSalesReps(prev => [data as SalesRep, ...prev]);
      setRepName('');
      setShowRepForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRep(rep: SalesRep) {
    if (!confirm(`حذف المندوب "${rep.name}" وكل عملائه؟`)) return;
    const { error } = await supabase.from('sales_reps').delete().eq('id', rep.id);
    if (error) { alert('تعذر الحذف'); return; }
    setSalesReps(prev => prev.filter(r => r.id !== rep.id));
    setRepClients(prev => prev.filter(c => c.rep_id !== rep.id));
  }

  async function addClient(repId: string) {
    if (!clientName.trim()) return;
    const { data, error } = await supabase.from('rep_clients').insert({ rep_id: repId, client_name: clientName.trim() }).select().single();
    if (error) { alert('تعذر الإضافة'); return; }
    setRepClients(prev => [data as RepClient, ...prev]);
    setClientName('');
  }

  async function deleteClient(c: RepClient) {
    const { error } = await supabase.from('rep_clients').delete().eq('id', c.id);
    if (error) { alert('تعذر الحذف'); return; }
    setRepClients(prev => prev.filter(it => it.id !== c.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">المندوبين</h2>
        </div>
        <button onClick={() => { setRepName(''); setShowRepForm(true); }} className="btn-primary">
          <Plus className="w-5 h-5" /> إضافة مندوب
        </button>
      </div>

      {/* Best rep highlight */}
      {bestRep && bestRep.stats.activityScore > 0 && (
        <div className="card p-5 bg-gradient-to-l from-amber-50 to-yellow-50 border-amber-200 flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100">
            <Award className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">أفضل مندوب</p>
            <p className="text-xl font-bold text-slate-800">{bestRep.rep.name}</p>
            <p className="text-sm text-amber-600">نشاط: {bestRep.stats.activityScore}% — {bestRep.stats.rating}</p>
          </div>
        </div>
      )}

      {/* Add rep modal */}
      {showRepForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">مندوب جديد</h3>
              <button onClick={() => setShowRepForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم المندوب</label>
                <input type="text" value={repName} onChange={e => setRepName(e.target.value)} placeholder="أدخل اسم المندوب" className="input-field" autoFocus />
              </div>
              {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
              <button onClick={addRep} disabled={saving} className="btn-primary w-full disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reps list */}
      {salesReps.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">لا يوجد مندوبون بعد. أضف مندوباً للبدء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ranked.map(({ rep, stats }, idx) => {
            const clients = repClients.filter(c => c.rep_id === rep.id);
            return (
              <div key={rep.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 relative">
                      <Users className="w-5 h-5 text-emerald-600" />
                      {idx === 0 && stats.activityScore > 0 && (
                        <span className="absolute -top-1 -left-1 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400">
                          <Star className="w-3 h-3 text-white" fill="white" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{rep.name}</h3>
                      <p className="text-xs text-slate-400">أضيف: {fmtDateShort(rep.created_at)}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteRep(rep)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-center">
                    <p className="text-lg font-bold text-slate-800">{stats.totalInvoices}</p>
                    <p className="text-xs text-slate-400">فاتورة</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 text-center">
                    <p className="text-lg font-bold text-slate-800">{stats.matchedClients}/{stats.totalClients}</p>
                    <p className="text-xs text-slate-400">عملاء نشطون</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-center">
                    <p className="text-lg font-bold text-emerald-600">{stats.activityScore}%</p>
                    <p className="text-xs text-emerald-500">{stats.rating}</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>{fmt(stats.totalSalesUsd)} $</span>
                  </div>
                  <div className="text-slate-400">{fmt(stats.totalSalesSyp)} ل.س</div>
                </div>

                {/* Clients */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-slate-400" /> العملاء ({clients.length})
                    </span>
                    <button onClick={() => { setShowClientForm(showClientForm === rep.id ? null : rep.id); setClientName(''); }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      {showClientForm === rep.id ? 'إلغاء' : '+ إضافة عميل'}
                    </button>
                  </div>

                  {showClientForm === rep.id && (
                    <div className="flex gap-2 mb-2 animate-fade-in">
                      <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="اسم العميل" className="input-field text-sm" onKeyDown={e => { if (e.key === 'Enter') addClient(rep.id); }} />
                      <button onClick={() => addClient(rep.id)} className="btn-primary px-3 py-2 text-sm shrink-0"><Plus className="w-4 h-4" /></button>
                    </div>
                  )}

                  {clients.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">لا يوجد عملاء مسجلون.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {clients.map(c => {
                        const hasInvoices = invoices.some(inv => inv.customer_name.toLowerCase() === c.client_name.toLowerCase());
                        return (
                          <span key={c.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${hasInvoices ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {hasInvoices && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            {c.client_name}
                            <button onClick={() => deleteClient(c)} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
