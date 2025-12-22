import React, { useState } from 'react';
import { X, Merge, Check } from 'lucide-react';
import { Deck } from '../types';

interface MergeDeckModalProps {
  decks: Deck[];
  onClose: () => void;
  onMerge: (selectedDeckIds: string[], newName: string) => void;
}

const MergeDeckModal: React.FC<MergeDeckModalProps> = ({ decks, onClose, onMerge }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newName, setNewName] = useState('');

  const toggleDeck = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length >= 2 && newName.trim()) {
      onMerge(selectedIds, newName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-all hover:scale-105 active:scale-95"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Merge size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Merge Decks</h2>
            <p className="text-zinc-400 text-sm">Combine multiple decks into one.</p>
          </div>
        </div>

        <form onSubmit={handleMerge} className="space-y-6">
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
            <label className="text-sm font-medium text-zinc-300">Select Decks to Merge</label>
            {decks.length === 0 && <p className="text-zinc-500 text-sm">No decks available.</p>}
            {decks.map(deck => (
              <div
                key={deck.id}
                onClick={() => toggleDeck(deck.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-100 ${
                  selectedIds.includes(deck.id)
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <span className="truncate">{deck.name}</span>
                {selectedIds.includes(deck.id) && <Check size={16} className="text-emerald-400" />}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">New Merged Deck Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Combined Science Review"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white rounded-xl transition-all text-sm font-medium hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedIds.length < 2 || !newName.trim()}
              className="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
            >
              Merge Decks
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MergeDeckModal;