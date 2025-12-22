import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  confirmLabel, 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative scale-100 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-all hover:scale-105 active:scale-95"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-4 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <AlertTriangle size={32} />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-zinc-300 hover:text-white rounded-xl transition-all text-sm font-medium border border-zinc-800 hover:scale-105 active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => { onConfirm(); onCancel(); }}
              className={`flex-1 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:scale-105 active:scale-95 ${
                isDestructive 
                  ? 'bg-red-600 shadow-red-900/20' 
                  : 'bg-emerald-600 shadow-emerald-900/20'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;