import { useState, useMemo } from 'react';
import { Warehouse, Boxes, TrendingDown, TrendingUp, Save, X, AlertTriangle, Package, Search, Pencil, Plus, Minus, DollarSign, BarChart3, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmt, fmtDate } from '@/lib/format';
import type { Material, Invoice, InvoiceItem } from '@/types';

interface WarehouseSectionProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  isAdmin: boolean;
}

interface StockMovement {
  material_name: string;
  quantity: number;
  type: 'sold' | 'adjustment';
  date: string;
  invoice_customer?: string;
}

export default function WarehouseSection({ materials, setMaterials, invoices, invoiceItems, isAdmin }: WarehouseSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editPriceUsd, setEditPriceUsd] = useState(0);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [newPrice, setNewPrice] = useState(0);

  function startEdit(m: Material) {
    setEditingId(m.id);
    setEditQty(Number(m.stock_quantity) || 0);
    setEditPriceUsd(Number(m.price_usd) || 0);
  }

  async function saveQty(m: Material) {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('materials').update({ stock_quantity: editQty, price_usd: editPriceUsd }).eq('id', m.id).select().single();
      if (error) throw error;
      setMaterials(prev => prev.map(it => it.id === m.id ? data as Material : it));
      setEditingId(null);
    } catch {
      alert('تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function addMaterial() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('materials').insert({ name: newName.trim(), stock_quantity: newQty, price_usd: newPrice, price_syp: newPrice * 15000 }).select().single();
      if (error) throw error;
      setMaterials(prev => [data as Material, ...prev]);
      setNewName(''); setNewQty(0); setNewPrice(0);
      setShowAddForm(false);
    } catch {
      alert('تعذر الإضافة');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMaterial(m: Material) {
    if (!confirm(`حذف "${m.name}" من المستودع نهائياً؟`)) return;
    const { error } = await supabase.from('materials').delete().eq('id', m.id);
    if (error) { alert('تعذر الحذف'); return; }
    setMaterials(prev => prev.filter(it => it.id !== m.id));
  }

  async function quickAdjust(m: Material, delta: number) {
    const newQty = Math.max(0, (Number(m.stock_quantity) || 0) + delta);
    const { error } = await supabase.from('materials').update({ stock_quantity: newQty }).eq('id', m.id);
    if (error) { alert('تعذر التحديث'); return; }
    setMaterials(prev => prev.map(it => it.id === m.id ? { ...it, stock_quantity: newQty } : it));
  }

  // Sold quantities per material
  const soldMap: Record<string, number> = {};
  invoiceItems.forEach(it => {
    soldMap[it.material_name] = (soldMap[it.material_name] || 0) + Number(it.quantity || 0);
  });

  // Stock movements from invoices
  const movements: StockMovement[] = useMemo(() => {
    const movs: StockMovement[] = [];
    const invMap: Record<string, string> = {};
    invoices.forEach(inv => { invMap[inv.id] = inv.customer_name; });
    invoiceItems.forEach(it => {
      movs.push({
        material_name: it.material_name,
        quantity: Number(it.quantity),
        type: 'sold',
        date: it.created_at,
        invoice_customer: invMap[it.invoice_id],
      });
    });
    return movs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  }, [invoices, invoiceItems]);

  const filtered = materials.filter(m => {
    const nameMatch = m.name.toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;
    if (stockFilter === 'low') return (Number(m.stock_quantity) || 0) > 0 && (Number(m.stock_quantity) || 0) <= 5;
    if (stockFilter === 'out') return (Number(m.stock_quantity) || 0) <= 0;
    return true;
  });

  const totalItems = materials.length;
  const lowStockItems = materials.filter(m => (Number(m.stock_quantity) || 0) > 0 && (Number(m.stock_quantity) || 0) <= 5).length;
  const outOfStockItems = materials.filter(m => (Number(m.stock_quantity) || 0) <= 0).length;
  const totalStockValue = materials.reduce((s, m) => s + Number(m.price_usd || 0) * Number(m.stock_quantity || 0), 0);
  const totalSoldValue = materials.reduce((s, m) => s + Number(m.price_usd || 0) * (soldMap[m.name] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">المستودع — جرد وإحصاء شامل</h2>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            <Plus className="w-5 h-5" /> إضافة مادة
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium">
          لديك صلاحية عرض فقط. تعديل وإضافة وحذف الكميات متاح للمدير فقط.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50"><Package className="w-4 h-4 text-blue-500" /></div>
            <span className="text-xs text-slate-400">إجمالي المواد</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{totalItems}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50"><AlertTriangle className="w-4 h-4 text-amber-500" /></div>
            <span className="text-xs text-slate-400">منخفض</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{lowStockItems}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50"><TrendingDown className="w-4 h-4 text-red-500" /></div>
            <span className="text-xs text-slate-400">نفد</span>
          </div>
          <p className="text-xl font-bold text-red-500">{outOfStockItems}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50"><Boxes className="w-4 h-4 text-emerald-600" /></div>
            <span className="text-xs text-slate-400">قيمة المخزون</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{fmt(totalStockValue)} $</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50"><BarChart3 className="w-4 h-4 text-purple-500" /></div>
            <span className="text-xs text-slate-400">قيمة المباع</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{fmt(totalSoldValue)} $</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مادة..." className="input-field pr-10" />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'low', 'out'] as const).map(f => (
            <button key={f} onClick={() => setStockFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${stockFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {f === 'all' ? 'الكل' : f === 'low' ? 'منخفض المخزون' : 'نفد المخزون'}
            </button>
          ))}
        </div>
      </div>

      {/* Add material modal */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">إضافة مادة للمستودع</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم المادة</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم المادة" className="input-field" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">الكمية</label>
                  <input type="number" value={newQty || ''} min={0} step="any" onChange={e => setNewQty(Number(e.target.value))} placeholder="0" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">السعر ($)</label>
                  <input type="number" value={newPrice || ''} min={0} step="any" onChange={e => setNewPrice(Number(e.target.value))} placeholder="0" className="input-field" />
                </div>
              </div>
              <button onClick={addMaterial} disabled={saving} className="btn-primary w-full disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Warehouse className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">لا توجد مواد مطابقة.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold">
                  <th className="text-right py-3 px-4">المادة</th>
                  <th className="text-center py-3 px-4">المخزون</th>
                  <th className="text-center py-3 px-4">المباع</th>
                  <th className="text-center py-3 px-4">السعر ($)</th>
                  <th className="text-center py-3 px-4">قيمة المخزون</th>
                  <th className="text-center py-3 px-4">تعديل سريع</th>
                  {isAdmin && <th className="text-center py-3 px-4">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(m => {
                  const stock = Number(m.stock_quantity) || 0;
                  const sold = soldMap[m.name] || 0;
                  const value = stock * Number(m.price_usd || 0);
                  const lowStock = stock <= 5;
                  const outStock = stock <= 0;
                  const isEditing = editingId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-700">{m.name}</td>
                      <td className="text-center py-3 px-4">
                        {isEditing ? (
                          <input type="number" value={editQty || ''} min={0} step="any" onChange={e => setEditQty(Number(e.target.value))} className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        ) : (
                          <span className={`font-bold ${outStock ? 'text-red-500' : lowStock ? 'text-amber-500' : 'text-slate-700'}`}>
                            {fmt(stock)} {outStock && '⚠'}
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 text-slate-500">{fmt(sold)}</td>
                      <td className="text-center py-3 px-4">
                        {isEditing ? (
                          <input type="number" value={editPriceUsd || ''} min={0} step="any" onChange={e => setEditPriceUsd(Number(e.target.value))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        ) : (
                          <span className="text-slate-600">{fmt(Number(m.price_usd))} $</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 text-slate-600 font-medium">{fmt(value)} $</td>
                      <td className="text-center py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => saveQty(m)} disabled={saving} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                              {saving ? <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : isAdmin ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => quickAdjust(m, 1)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="+1">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => quickAdjust(m, -1)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="-1">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="text-center py-3 px-4">
                          {!isEditing && (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEdit(m)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 text-xs font-semibold transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteMaterial(m)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent stock movements */}
      {movements.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800">آخر حركات المخزون</h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {movements.map((mov, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${mov.type === 'sold' ? 'bg-red-50' : 'bg-blue-50'}`}>
                    {mov.type === 'sold' ? <TrendingDown className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{mov.material_name}</p>
                    <p className="text-xs text-slate-400">{mov.invoice_customer ? `لـ ${mov.invoice_customer}` : 'تعديل'} · {fmtDate(mov.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${mov.type === 'sold' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {mov.type === 'sold' ? '-' : '+'}{fmt(mov.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
