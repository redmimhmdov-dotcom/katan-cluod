import { useState } from 'react';
import { Database, Save, Lock, Trash2, Download, X, Calendar, FileJson, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { saveBackup } from '@/lib/backup';
import { fmtDate } from '@/lib/format';
import type { Backup } from '@/types';

interface BackupsSectionProps {
  backups: Backup[];
  setBackups: React.Dispatch<React.SetStateAction<Backup[]>>;
  backupPassword: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  auto_daily: { label: 'يومي تلقائي', color: 'bg-blue-100 text-blue-600' },
  auto_close: { label: 'عند الإغلاق', color: 'bg-amber-100 text-amber-600' },
  auto_invoice: { label: 'بعد فاتورة', color: 'bg-emerald-100 text-emerald-600' },
  manual: { label: 'يدوي', color: 'bg-slate-100 text-slate-600' },
};

export default function BackupsSection({ backups, setBackups, backupPassword }: BackupsSectionProps) {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Backup | null>(null);

  function handleAuth() {
    if (password === backupPassword) {
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('كلمة المرور غير صحيحة');
    }
  }

  async function handleCreate() {
    setCreating(true);
    const ok = await saveBackup('manual', `نسخة احتياطية يدوية - ${new Date().toLocaleString('ar-EG')}`);
    if (ok) {
      const { data } = await supabase.from('backups').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) setBackups(data as Backup[]);
    } else {
      alert('تعذر إنشاء النسخة الاحتياطية');
    }
    setCreating(false);
  }

  async function handleDelete(b: Backup) {
    if (!confirm('حذف هذه النسخة الاحتياطية؟')) return;
    const { error } = await supabase.from('backups').delete().eq('id', b.id);
    if (error) { alert('تعذر الحذف'); return; }
    setBackups(prev => prev.filter(it => it.id !== b.id));
  }

  function downloadBackup(b: Backup) {
    const blob = new Blob([JSON.stringify(b.snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date(b.created_at).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Password gate
  if (!authed) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">النسخ الاحتياطي</h2>
        </div>

        <div className="card p-8 max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mb-5">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">محمي بكلمة مرور</h3>
          <p className="text-sm text-slate-400 mb-5">النسخ الاحتياطية محمية. أدخل كلمة المرور للوصول.</p>

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAuth(); }}
            placeholder="كلمة المرور"
            className="input-field text-center mb-3"
            autoFocus
          />
          {authError && <p className="text-sm text-red-500 mb-3">{authError}</p>}
          <button onClick={handleAuth} className="btn-primary w-full">
            <ShieldCheck className="w-5 h-5" /> دخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">النسخ الاحتياطي</h2>
        </div>
        <button onClick={handleCreate} disabled={creating} className="btn-primary disabled:opacity-50">
          {creating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الإنشاء</> : <><Save className="w-5 h-5" /> نسخة احتياطية الآن</>}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
        <ShieldCheck className="w-4 h-4" />
        يتم إنشاء نسخة احتياطية تلقائياً: يومياً، عند حفظ فاتورة، وعند إغلاق البرنامج
      </div>

      {/* Backups list */}
      {backups.length === 0 ? (
        <div className="card p-12 text-center">
          <Database className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">لا توجد نسخ احتياطية بعد.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.map(b => {
            const typeInfo = TYPE_LABELS[b.backup_type] || TYPE_LABELS.manual;
            const snapshot = b.snapshot as Record<string, unknown[]>;
            const counts: string[] = [];
            if (snapshot?.invoices) counts.push(`${snapshot.invoices.length} فاتورة`);
            if (snapshot?.materials) counts.push(`${snapshot.materials.length} مادة`);
            if (snapshot?.expenses) counts.push(`${snapshot.expenses.length} مصروف`);

            return (
              <div key={b.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100">
                    <FileJson className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" /> {fmtDate(b.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{b.description}</p>
                    {counts.length > 0 && <p className="text-xs text-slate-400 mt-0.5">{counts.join(' · ')}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewing(b)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold transition-colors">
                    عرض
                  </button>
                  <button onClick={() => downloadBackup(b)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(b)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl my-8 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">تفاصيل النسخة الاحتياطية</h3>
              <button onClick={() => setViewing(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm text-slate-500">{viewing.description}</div>
              <div className="text-xs text-slate-400">{fmtDate(viewing.created_at)}</div>
              <pre className="max-h-96 overflow-auto p-4 rounded-xl bg-slate-50 text-xs text-slate-600 font-mono" dir="ltr">
                {JSON.stringify(viewing.snapshot, null, 2).slice(0, 5000)}
                {JSON.stringify(viewing.snapshot).length > 5000 ? '\n... (تم الاقتطاع)' : ''}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
