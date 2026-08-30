import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, X, FileText, Search, DollarSign, Percent, TrendingUp, Calendar, Pencil, CheckCircle2, AlertCircle, CreditCard, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { saveBackup } from '@/lib/backup';
import { fmt, fmtDate } from '@/lib/format';
import type { Material, Invoice, InvoiceItem, AppUser, PaymentStatus } from '@/types';

interface InvoicesSectionProps {
  materials: Material[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setInvoiceItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  exchangeRate: number;
  currentUser: AppUser;
  isAdmin: boolean;
}

interface DraftItem {
  id: string;
  material_name: string;
  quantity: number;
  price_usd: number;
  discount_percent: number;
}

export default function InvoicesSection({ materials, invoices, invoiceItems, setInvoices, setInvoiceItems, setMaterials, exchangeRate, currentUser, isAdmin }: InvoicesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('full');
  const [remainingUsd, setRemainingUsd] = useState(0);
  const [remainingSyp, setRemainingSyp] = useState(0);
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [error, setError] = useState('');

  const subtotalUsd = items.reduce((s, i) => s + i.price_usd * i.quantity, 0);
  const discountAmount = subtotalUsd * (invoiceDiscount / 100);
  const totalUsd = subtotalUsd - discountAmount;
  const totalSyp = totalUsd * exchangeRate;

  function resetForm() {
    setCustomerName(''); setDescription(''); setItems([]); setInvoiceDiscount(0);
    setPaymentStatus('full'); setRemainingUsd(0); setRemainingSyp(0); setError(''); setEditingInvoice(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(inv: Invoice) {
    const invItems = invoiceItems.filter(it => it.invoice_id === inv.id);
    setEditingInvoice(inv);
    setCustomerName(inv.customer_name);
    setDescription(inv.description || '');
    setItems(invItems.map(it => ({
      id: it.id,
      material_name: it.material_name,
      quantity: Number(it.quantity),
      price_usd: Number(it.price_usd),
      discount_percent: Number(it.discount_percent) || 0,
    })));
    setInvoiceDiscount(Number(inv.discount_percent) || 0);
    setPaymentStatus(inv.payment_status as PaymentStatus);
    setRemainingUsd(Number(inv.remaining_usd) || 0);
    setRemainingSyp(Number(inv.remaining_syp) || 0);
    setError('');
    setShowForm(true);
  }

  function addBlankItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), material_name: '', quantity: 1, price_usd: 0, discount_percent: 0 }]);
  }

  function addMaterialFromList(material: Material) {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), material_name: material.name, quantity: 1,
      price_usd: Number(material.price_usd) || 0, discount_percent: 0,
    }]);
  }

  function updateItem(id: string, field: keyof DraftItem, value: string | number) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id));
  }

  async function deductStock(invoiceItems: DraftItem[]) {
    for (const it of invoiceItems) {
      const mat = materials.find(m => m.name.toLowerCase() === it.material_name.toLowerCase());
      if (mat) {
        const newQty = (Number(mat.stock_quantity) || 0) - it.quantity;
        await supabase.from('materials').update({ stock_quantity: newQty }).eq('id', mat.id);
        setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, stock_quantity: newQty } : m));
      }
    }
  }

  async function restoreStock(invItems: InvoiceItem[]) {
    for (const it of invItems) {
      const mat = materials.find(m => m.name.toLowerCase() === it.material_name.toLowerCase());
      if (mat) {
        const newQty = (Number(mat.stock_quantity) || 0) + Number(it.quantity);
        await supabase.from('materials').update({ stock_quantity: newQty }).eq('id', mat.id);
        setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, stock_quantity: newQty } : m));
      }
    }
  }

  async function handleSave() {
    setError('');
    if (!customerName.trim()) { setError('الرجاء إدخال اسم العميل'); return; }
    if (items.length === 0) { setError('الرجاء إضافة مادة واحدة على الأقل'); return; }
    if (items.some(it => !it.material_name.trim())) { setError('كل مادة يجب أن يكون لها اسم'); return; }
    if (paymentStatus === 'partial' && remainingUsd <= 0 && remainingSyp <= 0) { setError('الرجاء إدخال المبلغ المتبقي'); return; }

    setSaving(true);
    try {
      if (editingInvoice) {
        // Restore stock from old items, then deduct new
        const oldItems = invoiceItems.filter(it => it.invoice_id === editingInvoice.id);
        await restoreStock(oldItems);

        const { error: invErr } = await supabase.from('invoices').update({
          customer_name: customerName.trim(), description: description.trim(),
          total_usd: totalUsd, total_syp: totalSyp, payment_status: paymentStatus,
          remaining_usd: paymentStatus === 'partial' ? remainingUsd : 0,
          remaining_syp: paymentStatus === 'partial' ? remainingSyp : 0,
          discount_percent: invoiceDiscount,
        }).eq('id', editingInvoice.id);
        if (invErr) throw invErr;

        await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoice.id);
        const itemsToInsert = items.map(it => ({
          invoice_id: editingInvoice.id, material_name: it.material_name,
          quantity: it.quantity, price_usd: it.price_usd, price_syp: it.price_usd * exchangeRate,
          discount_percent: it.discount_percent,
        }));
        const { data: itemsData, error: itemsErr } = await supabase.from('invoice_items').insert(itemsToInsert).select();
        if (itemsErr) throw itemsErr;

        await deductStock(items);

        setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? {
          ...i, customer_name: customerName.trim(), description: description.trim(),
          total_usd: totalUsd, total_syp: totalSyp, payment_status: paymentStatus,
          remaining_usd: paymentStatus === 'partial' ? remainingUsd : 0,
          remaining_syp: paymentStatus === 'partial' ? remainingSyp : 0,
          discount_percent: invoiceDiscount,
        } : i));
        setInvoiceItems(prev => [
          ...prev.filter(it => it.invoice_id !== editingInvoice.id),
          ...(itemsData as InvoiceItem[] || []),
        ]);
      } else {
        const { data: invData, error: invErr } = await supabase.from('invoices').insert({
          customer_name: customerName.trim(), description: description.trim(),
          total_usd: totalUsd, total_syp: totalSyp, payment_status: paymentStatus,
          remaining_usd: paymentStatus === 'partial' ? remainingUsd : 0,
          remaining_syp: paymentStatus === 'partial' ? remainingSyp : 0,
          discount_percent: invoiceDiscount, created_by: currentUser.username,
        }).select().single();
        if (invErr) throw invErr;
        const newInvoice = invData as Invoice;
        setInvoices(prev => [newInvoice, ...prev]);

        const itemsToInsert = items.map(it => ({
          invoice_id: newInvoice.id, material_name: it.material_name,
          quantity: it.quantity, price_usd: it.price_usd, price_syp: it.price_usd * exchangeRate,
          discount_percent: it.discount_percent,
        }));
        const { data: itemsData, error: itemsErr } = await supabase.from('invoice_items').insert(itemsToInsert).select();
        if (itemsErr) throw itemsErr;
        if (itemsData) setInvoiceItems(prev => [...(itemsData as InvoiceItem[]), ...prev]);

        await deductStock(items);
        await saveBackup('auto_invoice', `نسخة تلقائية بعد حفظ فاتورة - ${customerName} - ${new Date().toLocaleString('ar-EG')}`);
      }

      resetForm();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function deleteInvoice(inv: Invoice) {
    if (!confirm(`حذف فاتورة "${inv.customer_name}"؟ سيتم إرجاع الكميات إلى المستودع.`)) return;
    const invItems = invoiceItems.filter(it => it.invoice_id === inv.id);
    await restoreStock(invItems);
    const { error } = await supabase.from('invoices').delete().eq('id', inv.id);
    if (error) { alert('تعذر الحذف'); return; }
    setInvoices(prev => prev.filter(i => i.id !== inv.id));
    setInvoiceItems(prev => prev.filter(it => it.invoice_id !== inv.id));
  }

  // Advanced search: by name and date
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const nameMatch = !searchName ||
        inv.customer_name.toLowerCase().includes(searchName.toLowerCase()) ||
        inv.description?.toLowerCase().includes(searchName.toLowerCase());
      let dateMatch = true;
      if (searchDate) {
        const invDate = new Date(inv.created_at).toISOString().split('T')[0];
        dateMatch = invDate === searchDate;
      }
      return nameMatch && dateMatch;
    });
  }, [invoices, searchName, searchDate]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Invoice[]> = {};
    filteredInvoices.forEach(inv => {
      const dateKey = new Date(inv.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(inv);
    });
    return groups;
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">المبيعات اليومية — الفواتير</h2>
        </div>
        {isAdmin && (
          <button onClick={openNewForm} className="btn-primary">
            <Plus className="w-5 h-5" /> فاتورة جديدة
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium">
          لديك صلاحية عرض فقط. إضافة وتعديل وحذف الفواتير متاح للمدير فقط.
        </div>
      )}

      {/* Exchange rate info */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">
        <TrendingUp className="w-4 h-4" />
        سعر الصرف الحالي: 1 دولار = {fmt(exchangeRate)} ل.س
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl my-8 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingInvoice ? 'تعديل فاتورة' : 'فاتورة جديدة'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم العميل</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="أدخل اسم العميل" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">البيان</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف الفاتورة" className="input-field" />
                </div>
              </div>

              {materials.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">إضافة سريعة من المواد</label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {materials.map(m => (
                      <button key={m.id} onClick={() => addMaterialFromList(m)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-sm font-medium transition-colors">
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-600">المواد</label>
                  <button onClick={addBlankItem} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> إضافة مادة
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl text-sm">
                    لا توجد مواد. أضف مادة أو اختر من القائمة أعلاه.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it) => {
                      const lineUsd = it.price_usd * it.quantity * (1 - it.discount_percent / 100);
                      const lineSyp = lineUsd * exchangeRate;
                      return (
                        <div key={it.id} className="p-3 rounded-xl bg-slate-50 space-y-2">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <input type="text" value={it.material_name} onChange={e => updateItem(it.id, 'material_name', e.target.value)} placeholder="اسم المادة" className="col-span-12 sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            <input type="number" value={it.quantity} min={0.0001} step="any" onChange={e => updateItem(it.id, 'quantity', Number(e.target.value))} placeholder="الكمية" className="col-span-4 sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            <input type="number" value={it.price_usd || ''} min={0} step="any" onChange={e => updateItem(it.id, 'price_usd', Number(e.target.value))} placeholder="سعر $" className="col-span-3 sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            <div className="col-span-4 sm:col-span-2 flex items-center gap-1">
                              <Percent className="w-3.5 h-3.5 text-slate-400" />
                              <input type="number" value={it.discount_percent || ''} min={0} max={100} step="any" onChange={e => updateItem(it.id, 'discount_percent', Number(e.target.value))} placeholder="خصم %" className="w-full px-2 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            </div>
                            <button onClick={() => removeItem(it.id)} className="col-span-1 flex items-center justify-center p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex justify-end gap-4 text-xs text-slate-500 pr-1">
                            <span>{fmt(lineUsd)} $</span>
                            <span>{fmt(lineSyp)} ل.س</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {items.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-100/70 space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>المجموع قبل الخصم</span><span>{fmt(subtotalUsd)} $</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> خصم الفاتورة</span>
                      <div className="flex items-center gap-2">
                        <input type="number" value={invoiceDiscount || ''} min={0} max={100} step="any" onChange={e => setInvoiceDiscount(Number(e.target.value))} placeholder="0" className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        <span>%</span>
                      </div>
                    </div>
                    {invoiceDiscount > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>قيمة الخصم</span><span>-{fmt(discountAmount)} $</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-800 pt-1.5 border-t border-slate-200">
                      <span>الإجمالي</span>
                      <div className="text-left">
                        <span>{fmt(totalUsd)} $</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span>{fmt(totalSyp)} ل.س</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment details */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">تفاصيل الدفع</label>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setPaymentStatus('full')} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${paymentStatus === 'full' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    تم الدفع
                  </button>
                  <button onClick={() => setPaymentStatus('partial')} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${paymentStatus === 'partial' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    بقي عليه مبلغ
                  </button>
                </div>

                {paymentStatus === 'partial' && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">المبلغ المتبقي ($)</label>
                      <input type="number" value={remainingUsd || ''} min={0} step="any" onChange={e => setRemainingUsd(Number(e.target.value))} placeholder="0" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">المبلغ المتبقي (ل.س)</label>
                      <input type="number" value={remainingSyp || ''} min={0} step="any" onChange={e => setRemainingSyp(Number(e.target.value))} placeholder="0" className="input-field" />
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ</> : <><Save className="w-5 h-5" /> حفظ</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced search bar */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Search className="w-4 h-4" /> بحث متقدم
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="ابحث باسم العميل أو البيان..." className="input-field pr-10" />
          </div>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="input-field pr-10" />
          </div>
        </div>
        {(searchName || searchDate) && (
          <button onClick={() => { setSearchName(''); setSearchDate(''); }} className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors">
            مسح البحث
          </button>
        )}
      </div>

      {/* Invoices grouped by date — card style */}
      {filteredInvoices.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">{invoices.length === 0 ? 'لا توجد فواتير بعد.' : 'لا توجد نتائج مطابقة'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([dateKey, dayInvoices]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-500">{dateKey}</h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-xs font-medium">{dayInvoices.length} فاتورة</span>
              </div>

              {/* Cards for this date */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dayInvoices.map(inv => {
                  const invItms = invoiceItems.filter(it => it.invoice_id === inv.id);
                  const isPartial = inv.payment_status === 'partial';
                  return (
                    <div key={inv.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                      {/* Card header — bank card style */}
                      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-emerald-500 to-teal-500" />
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm">
                              <CreditCard className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">{inv.customer_name}</h3>
                              <p className="text-xs text-slate-400">{fmtDate(inv.created_at)}</p>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditForm(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteInvoice(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Card number style */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {Number(inv.discount_percent) > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-xs font-bold">خصم {fmt(Number(inv.discount_percent))}%</span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-xl font-bold text-white">{fmt(Number(inv.total_usd))} $</p>
                            <p className="text-xs text-slate-400">{fmt(Number(inv.total_syp))} ل.س</p>
                          </div>
                        </div>
                      </div>

                      {/* Card body — items */}
                      <div className="p-4">
                        {invItms.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {invItms.map(it => (
                              <div key={it.id} className="flex justify-between text-sm py-1.5 px-3 rounded-lg bg-slate-50">
                                <span className="text-slate-600">{it.material_name} ×{fmt(Number(it.quantity))}</span>
                                <span className="text-slate-500 font-medium">{fmt(Number(it.price_usd) * Number(it.quantity) * (1 - Number(it.discount_percent) / 100))} $</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Payment status */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isPartial ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isPartial ? <><AlertCircle className="w-3.5 h-3.5" /> باقي: {fmt(Number(inv.remaining_usd))}$ / {fmt(Number(inv.remaining_syp))} ل.س</> : <><CheckCircle2 className="w-3.5 h-3.5" /> تم الدفع</>}
                          </span>
                          {inv.description && <span className="text-xs text-slate-400 truncate max-w-[40%]">{inv.description}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
