import React, { useRef } from 'react';
import { Deck, Flashcard } from '../types';
import { Plus, Trash2, RotateCcw, Play, Pencil, FileDown, Merge, FileUp, Zap, Sparkles } from 'lucide-react';

interface DeckListProps {
  decks: Deck[];
  cards: Flashcard[];
  onSelectDeck: (deckId: string, mode: 'standard' | 'cram') => void;
  onCreateDeck: () => void;
  onDeleteDeck: (deckId: string) => void;
  onResetDeck: (deckId: string) => void;
  onEditDeck: (deck: Deck) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportDeck: (deckId: string) => void;
  onMergeClick: () => void;
}

const DeckList: React.FC<DeckListProps> = ({ 
  decks, 
  cards, 
  onSelectDeck, 
  onCreateDeck, 
  onDeleteDeck, 
  onResetDeck, 
  onEditDeck, 
  onExportData, 
  onImportData, 
  onExportDeck, 
  onMergeClick 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getCardCounts = (deckId: string) => {
    const deckCards = cards.filter(c => c.deckId === deckId);
    const due = deckCards.filter(c => c.srs.dueDate <= Date.now()).length;
    return { total: deckCards.length, due };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-center items-center mb-8 gap-4">
        <div className="flex flex-wrap items-center gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={onImportData}
                className="hidden"
                accept=".json,.txt,.csv,.tsv"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl font-medium transition-all border border-zinc-700 hover:scale-105 active:scale-95"
                title="Import Library (JSON) or Deck (TXT/CSV)"
            >
                <FileUp size={18} />
                <span className="hidden sm:inline">Import</span>
            </button>
            <button
                onClick={onExportData}
                disabled={decks.length === 0}
                className="flex items-center gap-2 bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 px-4 py-2.5 rounded-xl font-medium transition-all border border-zinc-700 hover:scale-105 active:scale-95"
                title="Export Library"
            >
                <FileDown size={18} />
                <span className="hidden sm:inline">Export</span>
            </button>
            
            <div className="w-px h-8 bg-zinc-800 mx-2 hidden sm:block"></div>

            <button
                onClick={onMergeClick}
                disabled={decks.length < 2}
                className="flex items-center gap-2 bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 px-4 py-2.5 rounded-xl font-medium transition-all border border-zinc-700 hover:scale-105 active:scale-95"
                title="Merge Decks"
            >
                <Merge size={18} />
                <span className="hidden sm:inline">Merge</span>
            </button>

            <button
                onClick={onCreateDeck}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
            >
                <Plus size={20} />
                <span>New Deck</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => {
          const { total, due } = getCardCounts(deck.id);
          return (
            <div
              key={deck.id}
              className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all flex flex-col h-full"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${deck.color} rounded-l-2xl`}></div>
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors cursor-pointer pr-4 leading-tight break-words" onClick={() => onSelectDeck(deck.id, 'standard')}>
                    {deck.name}
                </h3>

                <div className="flex gap-1 opacity-100 transition-opacity shrink-0">
                     <button
                        title="Edit Deck Name"
                        onClick={(e) => { e.stopPropagation(); onEditDeck(deck); }}
                        className="text-zinc-600 hover:text-emerald-400 transition-all p-2 rounded-lg hover:bg-zinc-800"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        title="Export Deck"
                        onClick={(e) => { e.stopPropagation(); onExportDeck(deck.id); }}
                        className="text-zinc-600 hover:text-emerald-400 transition-all p-2 rounded-lg hover:bg-zinc-800"
                    >
                        <FileDown size={16} />
                    </button>
                    <button
                        title="Reset Progress"
                        onClick={(e) => { e.stopPropagation(); onResetDeck(deck.id); }}
                        className="text-zinc-600 hover:text-amber-400 transition-all p-2 rounded-lg hover:bg-zinc-800"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        title="Delete Deck"
                        onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id); }}
                        className="text-zinc-600 hover:text-red-400 transition-all p-2 rounded-lg hover:bg-zinc-800"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>

              {/* Action Buttons - Cleaner look without border */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
                <button
                    onClick={() => onSelectDeck(deck.id, 'standard')}
                    className="flex items-center justify-center gap-2 bg-zinc-800 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-zinc-700 active:scale-95"
                >
                    <Play size={14} className={due > 0 ? "text-emerald-400" : "text-zinc-500"} />
                    {due > 0 ? `Study (${due})` : 'Review'}
                </button>
                <button
                    onClick={() => onSelectDeck(deck.id, 'cram')}
                    className="flex items-center justify-center gap-2 bg-zinc-800 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-zinc-700 active:scale-95"
                    title="Study all cards immediately"
                >
                    <Zap size={14} className="text-amber-400" />
                    Study All ({total})
                </button>
              </div>
            </div>
          );
        })}

        {decks.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
             <div className="bg-zinc-800 p-4 rounded-full mb-4">
                <Sparkles size={32} className="text-emerald-500" />
             </div>
             <h3 className="text-xl font-semibold text-white mb-2">Create Your First Deck</h3>
             <p className="text-zinc-400 max-w-sm text-center mb-6">
                Start by creating a deck, then use AI to generate cards from your notes or PDFs.
             </p>
             <button
                onClick={onCreateDeck}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
            >
                <Plus size={20} />
                <span>Create New Deck</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckList;