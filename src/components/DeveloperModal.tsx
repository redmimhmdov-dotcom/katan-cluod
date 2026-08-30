import { X, Code, Phone } from 'lucide-react';

export default function DeveloperModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-8 text-center animate-scale-in">
        <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 mb-5">
          <Code className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-1">تم تصميم من قبل</h3>
        <p className="text-2xl font-bold text-emerald-600 mb-4">محمد الحسين</p>

        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Phone className="w-4 h-4" />
          <a href="tel:0952725590" className="font-semibold tracking-wide hover:text-emerald-600 transition-colors" dir="ltr">
            0952725590
          </a>
        </div>
      </div>
    </div>
  );
}
