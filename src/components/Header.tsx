import { Calculator, LogOut, Code } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface HeaderProps {
  tab: string;
  onTabChange: (t: string) => void;
  tabs: { id: string; label: string }[];
  onShowDev: () => void;
}

export default function Header({ tab, onTabChange, tabs, onShowDev }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30">
              <Calculator className="w-5 h-5 text-white" strokeWidth={1.8} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">قطان للمحاسبة</h1>
              <p className="text-xs text-slate-400 leading-tight">2026</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center overflow-x-auto">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`tab-btn whitespace-nowrap ${active ? 'tab-active' : 'tab-inactive'}`}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onShowDev}
              className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="مطور البرنامج"
            >
              <Code className="w-5 h-5" />
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm">
                  {(user.display_name || user.username).charAt(0)}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-700">{user.display_name || user.username}</p>
                  <p className="text-xs text-slate-400">{user.role === 'admin' ? 'مدير' : 'مستخدم'}</p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="تسجيل خروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`tab-btn whitespace-nowrap ${active ? 'tab-active' : 'tab-inactive'}`}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
