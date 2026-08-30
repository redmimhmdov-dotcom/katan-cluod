import { useState } from 'react';
import { Plus, Trash2, Pencil, Save, X, Package, Boxes } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmt } from '@/lib/format';
import type { Material } from '@/types';

interface MaterialsSectionProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  canEdit: boolean;
}

export default function MaterialsSection({ materials, setMaterials, canEdit }: MaterialsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [priceUsd, setPriceUsd] = useState(0);
  const [stockQty, setStockQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function resetForm() {
    setName(''); setPriceUsd(0); setStockQty(0); setEditId(null); setError('');
  }

  function startEdit(m: Material) {
    setEditId(m.id);
    setName(m.name);
    setPriceUsd(Number(m.price_usd) || 0);
    setStockQty(Number(m.stock_quantity) || 0);
    setShowForm(true);
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('الرجاء إدخال اسم المادة'); return; }
    setSaving(true);
    try {
      if (editId) {
        const { data, error } = await supabase
          .from('materials').update({
            name: name.trim(), price_usd: priceUsd, stock_quantity: stockQty,
          }).eq('id', editId).select().single();
        if (error) throw error;
        setMaterials(prev => prev.map(m => m.id === editId ? data as Material : m));
      } else {
        const { data, error } = await supabase
          .from('materials').insert({
            name: name.trim(), price_usd: priceUsd, stock_quantity: stockQty,
          }).select().single();
        if (error) throw error;
        setMaterials(prev => [data as Material, ...prev]);
      }
      resetForm();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Material) {
    if (!confirm(`حذف مادة "${m.name}"؟`)) return;
    const { error } = await supabase.from('materials').delete().eq('id', m.id);
    if (error) { alert('تعذر الحذف'); return; }
    setMaterials(prev => prev.filter(it => it.id !== m.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">المواد والأسعار</h2>
        </div>
        {canEdit && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            <Plus className="w-5 h-5" /> إضافة مادة
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium">
          لديك صلاحية عرض فقط. تعديل وإضافة وحذف المواد متاح للمدير أو من يملك الصلاحية.
        </div>
      )}

      {showForm && canEdit && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card w-full max-w-md my-8 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editId ? 'تعديل مادة' : 'مادة جديدة'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم المادة</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسم المادة" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">السعر ($)</label>
                  <input type="number" value={priceUsd || ''} min={0} step="any" onChange={e => setPriceUsd(Number(e.target.value))} placeholder="0" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">الكمية بالمستودع</label>
                  <input type="number" value={stockQty || ''} min={0} step="any" onChange={e => setStockQty(Number(e.target.value))} placeholder="0" className="input-field" />
                </div>
              </div>
              {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {materials.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">لا توجد مواد بعد. أضف مادة جديدة للبدء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map(m => {
            const stock = Number(m.stock_quantity) || 0;
            const lowStock = stock <= 5;
            return (
              <div key={m.id} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50">
                      <Package className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{m.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Boxes className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-xs font-medium ${lowStock ? 'text-red-500' : 'text-slate-400'}`}>
                          المخزون: {fmt(stock)} {lowStock && '⚠ منخفض'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(m)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(m)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">دولار</p>
                    <p className="font-bold text-slate-800">{fmt(Number(m.price_usd))} $</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">ليرة سورية</p>
                    <p className="font-bold text-slate-800">{fmt(Number(m.price_syp))} ل.س</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
