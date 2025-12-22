import React, { useState, useEffect } from 'react';
import { X, FilePlus, Pencil, Settings, ChevronDown, ChevronUp, Calendar, Activity, Hash } from 'lucide-react';
import { Flashcard } from '../types';
import { initialSRS } from '../services/srsService';
import { v4 as uuidv4 } from 'uuid';

interface ManualCardModalProps {
  deckId: string;
  onClose: () => void;
  onSave: (card: Flashcard) => void;
  initialCard?: Flashcard | null;
}

const ManualCardModal: React.FC<ManualCardModalProps> = ({ deckId, onClose, onSave, initialCard }) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [srs, setSrs] = useState(initialSRS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initialCard) {
      setFront(initialCard.front);
      setBack(initialCard.back);
      setSrs(initialCard.srs);
    } else {
      setFront('');
      setBack('');
      setSrs(initialSRS);
    }
  }, [initialCard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (front.trim() && back.trim()) {
      const newCard: Flashcard = initialCard ? {
        ...initialCard,
        front: front.trim(),
        back: back.trim(),
        srs: srs // Save updated SRS
      } : {
          id: uuidv4(),
          deckId,
          type: 'basic',
          front: front.trim(),
          back: back.trim(),
          srs: initialSRS,
          createdAt: Date.now()
      };
      
      onSave(newCard);
      
      if (initialCard) {
        onClose(); 
      } else {
        setFront('');
        setBack('');
        setSrs(initialSRS);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-all hover:scale-105 active:scale-95"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            {initialCard ? <Pencil size={24} /> : <FilePlus size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{initialCard ? 'Edit Flashcard' : 'Add Flashcard'}</h2>
            <p className="text-zinc-400 text-sm">{initialCard ? 'Update content and parameters.' : 'Manually add a card to your deck.'}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20 text-xs text-emerald-300">
            <strong>Pro Tip:</strong> You can use <code>**Markdown**</code> and LaTeX <code>$x^2$</code> for math!
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-500 tracking-wider mb-2">Front (Question)</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="e.g., What is the integral of $x^2$? (use Markdown/LaTeX)"
              autoFocus={!initialCard}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-500 tracking-wider mb-2">Back (Answer)</label>
             <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="e.g., $\frac{x^3}{3} + C$"
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none font-mono text-sm"
            />
          </div>
          
          <div className="pt-2">
            <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors mb-3 select-none"
            >
                <Settings size={14} />
                <span>Card Parameters & SRS Data</span>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 flex items-center gap-1">
                            <Calendar size={10} /> Interval
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            value={srs.interval}
                            onChange={(e) => setSrs({...srs, interval: parseInt(e.target.value) || 0})}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 flex items-center gap-1">
                             <Hash size={10} /> Repetition
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            value={srs.repetition}
                            onChange={(e) => setSrs({...srs, repetition: parseInt(e.target.value) || 0})}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 flex items-center gap-1">
                            <Activity size={10} /> E-Factor
                        </label>
                        <input 
                            type="number" 
                            step="0.1"
                            min="1.3"
                            value={srs.efactor}
                            onChange={(e) => setSrs({...srs, efactor: parseFloat(e.target.value) || 2.5})}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-zinc-500">{!initialCard && "Press 'Enter' on save to add another."}</span>
            <div className="flex gap-3">
                 <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-white rounded-xl transition-all text-sm font-medium hover:scale-105 active:scale-95"
                >
                Cancel
                </button>
                <button
                type="submit"
                disabled={!front.trim() || !back.trim()}
                className="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
                >
                {initialCard ? 'Save Changes' : 'Save & Add Next'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualCardModal;