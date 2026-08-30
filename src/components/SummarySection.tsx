import { TrendingUp, TrendingDown, Wallet, FileText, ArrowDownCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Invoice, InvoiceItem, Expense } from '@/types';

interface SummarySectionProps {
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  expenses: Expense[];
  totalIncomeUsd: number;
  totalIncomeSyp: number;
  totalExpensesUsd: number;
  totalExpensesSyp: number;
  profitUsd: number;
  profitSyp: number;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

export default function SummarySection(props: SummarySectionProps) {
  const {
    invoices, invoiceItems, expenses,
    totalIncomeUsd, totalIncomeSyp,
    totalExpensesUsd, totalExpensesSyp,
    profitUsd, profitSyp,
  } = props;

  const isProfit = profitUsd >= 0;
  const partialInvoices = invoices.filter(i => i.payment_status === 'partial');
  const totalRemainingUsd = partialInvoices.reduce((s, i) => s + Number(i.remaining_usd || 0), 0);
  const totalRemainingSyp = partialInvoices.reduce((s, i) => s + Number(i.remaining_syp || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold text-slate-800">ملخص الحسابات</h2>
      </div>

      {/* Final result banner */}
      <div className={`card p-8 relative overflow-hidden ${isProfit ? 'bg-gradient-to-l from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-l from-red-50 to-orange-50 border-red-200'}`}>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-l from-emerald-500 to-teal-500" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-16 h-16 rounded-2xl ${isProfit ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isProfit
                ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                : <AlertCircle className="w-8 h-8 text-red-500" />}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">النتيجة النهائية</p>
              <p className={`text-3xl font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
                {isProfit ? 'ربح' : 'خسارة'}
              </p>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <p className={`text-3xl font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
              {isProfit ? '+' : ''}{fmt(profitUsd)} $
            </p>
            <p className={`text-lg ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
              {isProfit ? '+' : ''}{fmt(profitSyp)} ل.س
            </p>
          </div>
        </div>
      </div>

      {/* Income vs Expenses cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income (Wared) */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">الوارد</h3>
              <p className="text-xs text-slate-400">من الفواتير</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-2 px-3 rounded-lg bg-emerald-50/50">
              <span className="text-slate-600 text-sm">دولار</span>
              <span className="font-bold text-emerald-700">{fmt(totalIncomeUsd)} $</span>
            </div>
            <div className="flex justify-between py-2 px-3 rounded-lg bg-emerald-50/50">
              <span className="text-slate-600 text-sm">ليرة سورية</span>
              <span className="font-bold text-emerald-700">{fmt(totalIncomeSyp)} ل.س</span>
            </div>
          </div>
        </div>

        {/* Expenses (Sader) */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">الصادر</h3>
              <p className="text-xs text-slate-400">من المصروفات</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-2 px-3 rounded-lg bg-red-50/50">
              <span className="text-slate-600 text-sm">دولار</span>
              <span className="font-bold text-red-600">{fmt(totalExpensesUsd)} $</span>
            </div>
            <div className="flex justify-between py-2 px-3 rounded-lg bg-red-50/50">
              <span className="text-slate-600 text-sm">ليرة سورية</span>
              <span className="font-bold text-red-600">{fmt(totalExpensesSyp)} ل.س</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding payments */}
      {partialInvoices.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">مبالغ متبقية على العملاء</h3>
              <p className="text-xs text-slate-400">{partialInvoices.length} فاتورة بدفع جزئي</p>
            </div>
          </div>
          <div className="space-y-2">
            {partialInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50/50">
                <span className="text-slate-700 text-sm font-medium">{inv.customer_name}</span>
                <span className="text-slate-600 text-sm font-bold">
                  باقي: {fmt(Number(inv.remaining_usd))} $ / {fmt(Number(inv.remaining_syp))} ل.س
                </span>
              </div>
            ))}
            <div className="flex justify-between py-2.5 px-3 rounded-lg bg-amber-100/60 border-t border-amber-200">
              <span className="text-slate-700 font-bold text-sm">إجمالي المتبقي</span>
              <span className="text-amber-700 font-bold">
                {fmt(totalRemainingUsd)} $ / {fmt(totalRemainingSyp)} ل.س
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Invoices detail */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800">تفاصيل الفواتير</h3>
          </div>
          {invoices.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">لا توجد فواتير</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {invoices.map(inv => {
                const items = invoiceItems.filter(it => it.invoice_id === inv.id);
                return (
                  <div key={inv.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700 text-sm">{inv.customer_name}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${inv.payment_status === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.payment_status === 'full' ? 'كامل' : 'جزئي'}
                      </span>
                    </div>
                    {items.length > 0 && (
                      <div className="text-xs text-slate-400 mb-1">
                        {items.map(it => `${it.material_name}×${Number(it.quantity)}`).join('، ')}
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{fmt(Number(inv.total_usd))} $</span>
                      <span className="text-slate-500">{fmt(Number(inv.total_syp))} ل.س</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses detail */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800">تفاصيل المصروفات</h3>
          </div>
          {expenses.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">لا توجد مصروفات</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{e.description}</p>
                    <p className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-bold text-slate-700">{fmt(Number(e.amount_usd))} $</p>
                    <p className="text-slate-400">{fmt(Number(e.amount_syp))} ل.س</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
