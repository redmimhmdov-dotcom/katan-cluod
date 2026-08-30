import { useState } from 'react';
import { UserCog, Plus, Trash2, X, Save, Shield, User, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppUser, Permissions, DEFAULT_PERMISSIONS as DPType } from '@/types';

interface UsersSectionProps {
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
}

const PERM_LABELS: { key: keyof Permissions; label: string }[] = [
  { key: 'add_invoices', label: 'إدخال فواتير' },
  { key: 'add_expenses', label: 'إدخال مصروفات' },
  { key: 'manage_materials', label: 'إدارة المواد والأسعار' },
  { key: 'manage_warehouse', label: 'إدارة المستودع' },
  { key: 'view_summary', label: 'عرض الملخص' },
  { key: 'view_backups', label: 'عرض النسخ الاحتياطي' },
  { key: 'manage_users', label: 'إدارة المستخدمين' },
];

export default function UsersSection({ users, setUsers }: UsersSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [perms, setPerms] = useState<Permissions>({ ...DEFAULT_PERMISSIONS_OBJ });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function resetForm() {
    setUsername(''); setPassword(''); setDisplayName(''); setPerms({ ...DEFAULT_PERMISSIONS_OBJ }); setEditId(null); setError('');
  }

  function startEdit(u: AppUser) {
    setEditId(u.id);
    setUsername(u.username);
    setPassword(u.password);
    setDisplayName(u.display_name);
    setPerms({ ...DEFAULT_PERMISSIONS_OBJ, ...(u.permissions || {}) });
    setShowForm(true);
  }

  function togglePerm(key: keyof Permissions) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setError('');
    if (!username.trim()) { setError('الرجاء إدخال اسم المستخدم'); return; }
    if (!password.trim()) { setError('الرجاء إدخال كلمة المرور'); return; }
    setSaving(true);
    try {
      if (editId) {
        const { data, error } = await supabase
          .from('app_users').update({
            username: username.trim(), password: password.trim(),
            display_name: displayName.trim(), permissions: perms,
          }).eq('id', editId).select().single();
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === editId ? data as AppUser : u));
      } else {
        const { data, error } = await supabase
          .from('app_users').insert({
            username: username.trim(), password: password.trim(),
            display_name: displayName.trim(), role: 'user', permissions: perms,
          }).select().single();
        if (error) throw error;
        setUsers(prev => [data as AppUser, ...prev]);
      }
      resetForm();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ. قد يكون اسم المستخدم مكرراً');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: AppUser) {
    if (u.role === 'admin') { alert('لا يمكن حذف حساب المدير'); return; }
    if (!confirm(`حذف المستخدم "${u.username}"؟`)) return;
    const { error } = await supabase.from('app_users').delete().eq('id', u.id);
    if (error) { alert('تعذر الحذف'); return; }
    setUsers(prev => prev.filter(it => it.id !== u.id));
  }

  async function toggleActive(u: AppUser) {
    const { data, error } = await supabase
      .from('app_users').update({ is_active: !u.is_active }).eq('id', u.id).select().single();
    if (error) { alert('تعذر التحديث'); return; }
    setUsers(prev => prev.map(it => it.id === u.id ? data as AppUser : it));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">إدارة المستخدمين</h2>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-5 h-5" /> إضافة مستخدم
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card w-full max-w-lg my-8 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editId ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم المستخدم</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="input-field pr-10" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••" className="input-field pr-10" dir="ltr" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">الاسم المعروض</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="الاسم الظاهر في البرنامج" className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">الصلاحيات</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERM_LABELS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => togglePerm(key)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        perms[key] ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded-md ${perms[key] ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        {perms[key] && <Shield className="w-3 h-3 text-white" />}
                      </div>
                      {label}
                    </button>
                  ))}
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

      {/* Users list */}
      {users.length === 0 ? (
        <div className="card p-12 text-center">
          <UserCog className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-medium">لا يوجد مستخدمون.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => {
            const userPerms = Object.keys(u.permissions || {}).filter(k => u.permissions[k]);
            return (
              <div key={u.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${u.role === 'admin' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <span className={`font-bold ${u.role === 'admin' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {(u.display_name || u.username).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{u.display_name || u.username}</h3>
                      {u.role === 'admin' && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">مدير</span>}
                      {!u.is_active && <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-xs font-bold">معطل</span>}
                    </div>
                    <p className="text-xs text-slate-400" dir="ltr">@{u.username}</p>
                    {userPerms.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">{userPerms.length} صلاحية</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.role !== 'admin' && (
                    <button onClick={() => toggleActive(u)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold transition-colors">
                      {u.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                  )}
                  <button onClick={() => startEdit(u)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 text-xs font-semibold transition-colors">
                    تعديل
                  </button>
                  {u.role !== 'admin' && (
                    <button onClick={() => handleDelete(u)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
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

const DEFAULT_PERMISSIONS_OBJ: Permissions = {
  add_invoices: false,
  add_expenses: false,
  manage_materials: false,
  manage_warehouse: false,
  manage_users: false,
  view_summary: false,
  view_backups: false,
};
