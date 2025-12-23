import React, { useState } from 'react';
import { X, MoveRight, Folder, LayoutGrid } from 'lucide-react';
import { Deck, Folder as FolderType } from '../types';

interface MoveDeckModalProps {
  deck: Deck;
  folders: FolderType[];
  onClose: () => void;
  onMove: (folderId: string | undefined) => void;
}

const MoveDeckModal: React.FC<MoveDeckModalProps> = ({ deck, folders, onClose, onMove }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(deck.folderId);

  const handleMove = () => {
    onMove(selectedFolderId);
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
            <MoveRight size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Move Deck</h2>
            <p className="text-zinc-400 text-sm">Where should <span className="text-white font-medium">"{deck.name}"</span> go?</p>
          </div>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin mb-6">
            {/* Root Option */}
            <div 
                onClick={() => setSelectedFolderId(undefined)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedFolderId === undefined
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
            >
                <LayoutGrid size={20} />
                <span className="font-medium">Library (Root)</span>
            </div>

            {/* Folder Options */}
            {folders.map(folder => (
                <div 
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedFolderId === folder.id
                        ? 'bg-blue-500/10 border-blue-500/50 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                >
                    <Folder size={20} />
                    <span className="font-medium">{folder.name}</span>
                </div>
            ))}
        </div>
          
        <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white rounded-xl transition-all text-sm font-medium hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
            >
              Move Here
            </button>
        </div>
      </div>
    </div>
  );
};

export default MoveDeckModal;