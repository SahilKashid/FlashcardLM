import React, { useState, useEffect, useRef } from 'react';
import { 
  X, FilePlus, Pencil, Settings, ChevronDown, ChevronUp, 
  Calendar, Activity, Hash, EyeOff, Bold, Italic, Code, 
  Sigma, Type, Underline, Heading 
} from 'lucide-react';
import { Flashcard } from '../types';
import { initialSRS } from '../services/srsService';
import { v4 as uuidv4 } from 'uuid';

interface ManualCardModalProps {
  deckId: string;
  onClose: () => void;
  onSave: (cards: Flashcard[]) => void;
  initialCard?: Flashcard | null;
}

const ManualCardModal: React.FC<ManualCardModalProps> = ({ deckId, onClose, onSave, initialCard }) => {
  const [cardType, setCardType] = useState<'basic' | 'cloze'>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [srs, setSrs] = useState(initialSRS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const frontInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialCard) {
      setCardType(initialCard.type === 'cloze' ? 'cloze' : 'basic');
      setFront(initialCard.front);
      setBack(initialCard.back);
      setSrs(initialCard.srs);
    } else {
      setCardType('basic');
      setFront('');
      setBack('');
      setSrs(initialSRS);
    }
  }, [initialCard]);

  const insertText = (prefix: string, suffix: string) => {
      const textarea = frontInputRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selected = text.substring(start, end);

      const insertion = prefix + selected + suffix;
      const newText = text.substring(0, start) + insertion + text.substring(end);
      
      setFront(newText);
      
      // Restore focus and set selection
      setTimeout(() => {
          textarea.focus();
          if (selected.length > 0) {
              // If text was selected, select the text inside the tags
              textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
          } else {
              // If no text was selected, place cursor between tags
              textarea.setSelectionRange(start + prefix.length, start + prefix.length);
          }
      }, 0);
  };

  const insertCloze = () => {
      // Find max cloze index
      const matches = [...front.matchAll(/{{c(\d+)::/g)];
      let maxIndex = 0;
      matches.forEach(m => {
          const idx = parseInt(m[1]);
          if (idx > maxIndex) maxIndex = idx;
      });
      
      const nextIndex = maxIndex + 1;
      insertText(`{{c${nextIndex}::`, '}}');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim()) return;

    if (cardType === 'basic') {
        const newCard: Flashcard = initialCard ? {
            ...initialCard,
            type: 'basic',
            front: front.trim(),
            back: back.trim(),
            srs: srs,
            clozeDeletionIndex: undefined
        } : {
            id: uuidv4(),
            deckId,
            type: 'basic',
            front: front.trim(),
            back: back.trim(),
            srs: initialSRS,
            createdAt: Date.now()
        };
        
        onSave([newCard]);
    } else {
        // Cloze Logic
        const matches = [...front.matchAll(/{{c(\d+)::/g)];
        const indices = new Set(matches.map(m => parseInt(m[1])));
        
        if (indices.size === 0) {
            alert("Please create at least one cloze deletion using {{c1::text}}.");
            return;
        }

        const cardsToSave: Flashcard[] = [];
        const baseTime = Date.now();
        
        if (initialCard) {
             const updatedCard: Flashcard = {
                ...initialCard,
                type: 'cloze',
                front: front.trim(),
                back: back.trim(),
                srs: srs,
                clozeDeletionIndex: initialCard.clozeDeletionIndex || indices.values().next().value 
            };
            cardsToSave.push(updatedCard);
        } else {
            let i = 0;
            indices.forEach(idx => {
                 cardsToSave.push({
                    id: uuidv4(),
                    deckId,
                    type: 'cloze',
                    front: front.trim(),
                    back: back.trim(),
                    srs: initialSRS,
                    createdAt: baseTime + i,
                    clozeDeletionIndex: idx
                 });
                 i++;
            });
        }
        
        onSave(cardsToSave);
    }
      
    if (initialCard) {
        onClose(); 
    } else {
        setFront('');
        setBack('');
        setSrs(initialSRS);
    }
  };

  const ToolbarButton = ({ icon: Icon, onClick, label, active = false }: any) => (
      <button 
        type="button" 
        onClick={onClick}
        className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        title={label}
      >
          <Icon size={16} />
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-zinc-800">
             <div className="flex items-center gap-3">
                 <h2 className="text-lg font-bold text-white">{initialCard ? 'Edit Flashcard' : 'Add Flashcard'}</h2>
                 <div className="h-4 w-px bg-zinc-700"></div>
                 <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setCardType('basic')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${cardType === 'basic' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Basic
                    </button>
                    <button
                        type="button"
                        onClick={() => setCardType('cloze')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${cardType === 'cloze' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Cloze
                    </button>
                </div>
             </div>
             <button 
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-all hover:bg-zinc-800 p-2 rounded-lg"
            >
                <X size={18} />
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          
          {/* Main Input Area */}
          <div className="p-6 space-y-6 flex-1">
             <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                        {cardType === 'basic' ? 'Front' : 'Text Content'}
                    </label>
                    <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-lg border border-zinc-800">
                        <ToolbarButton icon={Heading} label="Heading" onClick={() => insertText('### ', '')} />
                        <ToolbarButton icon={Bold} label="Bold" onClick={() => insertText('**', '**')} />
                        <ToolbarButton icon={Italic} label="Italic" onClick={() => insertText('*', '*')} />
                        <ToolbarButton icon={Underline} label="Underline" onClick={() => insertText('<u>', '</u>')} />
                        <ToolbarButton icon={Code} label="Code" onClick={() => insertText('`', '`')} />
                        <ToolbarButton icon={Sigma} label="Math" onClick={() => insertText('$$', '$$')} />
                        {cardType === 'cloze' && (
                            <>
                                <div className="w-px bg-zinc-700 mx-1"></div>
                                <ToolbarButton icon={EyeOff} label="Cloze" onClick={insertCloze} active={true} />
                            </>
                        )}
                    </div>
                </div>
                <textarea
                    ref={frontInputRef}
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder={cardType === 'basic' ? "Question or term..." : "Enter text and highlight to create cloze..."}
                    autoFocus={!initialCard}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none font-mono text-sm leading-relaxed min-h-[120px]"
                />
             </div>

             <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">
                    {cardType === 'basic' ? 'Back' : 'Extra Context'}
                </label>
                <textarea
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder={cardType === 'basic' ? "Answer or definition..." : "Extra notes shown after answer..."}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none font-mono text-sm leading-relaxed min-h-[80px]"
                />
             </div>

             {/* SRS Panel */}
             <div>
                <button 
                    type="button" 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-emerald-400 transition-colors select-none"
                >
                    <Settings size={12} />
                    <span>SRS Parameters</span>
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showAdvanced && (
                    <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-950/30 rounded-xl border border-zinc-800 mt-3 animate-in fade-in slide-in-from-top-1">
                        <div>
                            <label className="text-[10px] text-zinc-500 mb-1 block">Interval</label>
                            <input 
                                type="number" 
                                min="0"
                                value={srs.interval}
                                onChange={(e) => setSrs({...srs, interval: parseInt(e.target.value) || 0})}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-500 mb-1 block">Repetition</label>
                            <input 
                                type="number" 
                                min="0"
                                value={srs.repetition}
                                onChange={(e) => setSrs({...srs, repetition: parseInt(e.target.value) || 0})}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-500 mb-1 block">E-Factor</label>
                            <input 
                                type="number" 
                                step="0.1"
                                min="1.3"
                                value={srs.efactor}
                                onChange={(e) => setSrs({...srs, efactor: parseFloat(e.target.value) || 2.5})}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                )}
             </div>
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
            <span className="text-xs text-zinc-600 hidden sm:inline">
                {!initialCard && "Tip: Ctrl+Enter to save"}
            </span>
            <div className="flex gap-3 ml-auto">
                 <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-zinc-400 hover:text-white rounded-xl transition-all text-sm font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!front.trim()}
                    className="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95"
                >
                    {initialCard ? 'Save' : 'Add Card'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualCardModal;