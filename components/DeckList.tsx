import React, { useRef, useState } from 'react';
import { Deck, Flashcard, Folder } from '../types';
import { Plus, Trash2, RotateCcw, Play, Pencil, FileDown, Merge, FileUp, Zap, Sparkles, Folder as FolderIcon, FolderOpen, ChevronRight, FolderPlus, MoveRight } from 'lucide-react';

interface DeckListProps {
  decks: Deck[];
  folders: Folder[];
  cards: Flashcard[];
  onSelectDeck: (deckId: string, mode: 'standard' | 'cram') => void;
  onCreateDeck: (folderId?: string) => void;
  onCreateFolder: () => void;
  onDeleteDeck: (deckId: string) => void;
  onResetDeck: (deckId: string) => void;
  onEditDeck: (deck: Deck) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportDeck: (deckId: string) => void;
  onExportFolder: (folderId: string) => void;
  onMergeClick: () => void;
  onDeleteFolder: (folderId: string) => void;
  onEditFolder: (folder: Folder) => void;
  onMoveDeck: (deck: Deck) => void;
}

const DeckList: React.FC<DeckListProps> = ({ 
  decks, 
  folders,
  cards, 
  onSelectDeck, 
  onCreateDeck, 
  onCreateFolder,
  onDeleteDeck, 
  onResetDeck, 
  onEditDeck, 
  onExportData, 
  onImportData, 
  onExportDeck, 
  onExportFolder,
  onMergeClick,
  onDeleteFolder,
  onEditFolder,
  onMoveDeck
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const getCardCounts = (deckId: string) => {
    const deckCards = cards.filter(c => c.deckId === deckId);
    const due = deckCards.filter(c => c.srs.dueDate <= Date.now()).length;
    return { total: deckCards.length, due };
  };

  const getFolderCardCounts = (folderId: string) => {
      const folderDeckIds = decks.filter(d => d.folderId === folderId).map(d => d.id);
      const folderCards = cards.filter(c => folderDeckIds.includes(c.deckId));
      const due = folderCards.filter(c => c.srs.dueDate <= Date.now()).length;
      return { total: folderCards.length, due };
  };

  // Filter View
  const visibleFolders = currentFolderId ? [] : folders; // Only show folders at root
  const visibleDecks = decks.filter(d => d.folderId === (currentFolderId || undefined));
  
  const currentFolder = folders.find(f => f.id === currentFolderId);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-2 text-xl font-semibold text-zinc-100 min-w-0">
            <button 
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-emerald-400 transition-colors whitespace-nowrap ${!currentFolderId ? 'text-white' : 'text-zinc-500'}`}
            >
                Library
            </button>
            {currentFolder && (
                <>
                    <ChevronRight size={20} className="text-zinc-600 shrink-0" />
                    <span className="flex items-center gap-2 min-w-0">
                        <FolderOpen size={20} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{currentFolder.name}</span>
                    </span>
                </>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {!currentFolderId && (
                <>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={onImportData}
                        className="hidden"
                        accept=".json,.txt,.csv,.tsv"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
                        title="Import"
                    >
                        <FileUp size={18} />
                    </button>
                    <button
                        onClick={onExportData}
                        disabled={decks.length === 0}
                        className="p-2.5 bg-zinc-800 disabled:opacity-50 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
                        title="Export All"
                    >
                        <FileDown size={18} />
                    </button>
                    <button
                        onClick={onMergeClick}
                        disabled={decks.length < 2}
                        className="p-2.5 bg-zinc-800 disabled:opacity-50 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
                        title="Merge Decks"
                    >
                        <Merge size={18} />
                    </button>
                    <div className="w-px h-8 bg-zinc-800 mx-1 hidden sm:block"></div>
                    <button
                        onClick={onCreateFolder}
                        className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl font-medium transition-all border border-zinc-700 hover:scale-105 active:scale-95"
                    >
                        <FolderPlus size={18} />
                        <span className="hidden sm:inline">New Folder</span>
                    </button>
                </>
            )}
            
            <button
                onClick={() => onCreateDeck(currentFolderId || undefined)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
            >
                <Plus size={20} />
                <span>New Deck</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Folders */}
        {visibleFolders.map((folder) => {
            const { total, due } = getFolderCardCounts(folder.id);
            return (
                <div
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all flex flex-col h-full cursor-pointer"
                >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
                
                <div className="flex flex-col mb-4 gap-3">
                    {/* Line 1: Icon and Name */}
                    <div className="flex items-center gap-3 min-w-0 w-full">
                        <FolderIcon size={24} className="text-blue-500 fill-blue-500/10 shrink-0" />
                        <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors leading-tight break-words line-clamp-2">
                            {folder.name}
                        </h3>
                    </div>

                    {/* Line 2: Actions */}
                    <div className="flex gap-1">
                        <button
                            title="Export Folder"
                            onClick={(e) => { e.stopPropagation(); onExportFolder(folder.id); }}
                            className="text-zinc-500 hover:text-emerald-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                        >
                            <FileDown size={16} />
                        </button>
                        <button
                            title="Rename Folder"
                            onClick={(e) => { e.stopPropagation(); onEditFolder(folder); }}
                            className="text-zinc-500 hover:text-blue-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            title="Delete Folder"
                            onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                            className="text-zinc-500 hover:text-red-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                <div className="mt-auto pt-4 flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Zap size={14} className={due > 0 ? "text-amber-400" : "text-zinc-600"} />
                        {due} Due
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles size={14} className="text-zinc-600" />
                        {total} Cards
                    </span>
                </div>
                </div>
            );
        })}

        {/* Decks */}
        {visibleDecks.map((deck) => {
          const { total, due } = getCardCounts(deck.id);
          return (
            <div
              key={deck.id}
              className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all flex flex-col h-full"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${deck.color} rounded-l-2xl`}></div>
              
              <div className="flex flex-col mb-4 gap-3">
                {/* Line 1: Deck Name */}
                <h3 
                  className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors cursor-pointer leading-tight break-words line-clamp-2 w-full" 
                  onClick={() => onSelectDeck(deck.id, 'standard')}
                >
                    {deck.name}
                </h3>

                {/* Line 2: Deck Actions */}
                <div className="flex flex-wrap gap-1">
                     <button
                        title="Move to Folder"
                        onClick={(e) => { e.stopPropagation(); onMoveDeck(deck); }}
                        className="text-zinc-500 hover:text-blue-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                    >
                        <MoveRight size={16} />
                    </button>
                     <button
                        title="Edit Deck Name"
                        onClick={(e) => { e.stopPropagation(); onEditDeck(deck); }}
                        className="text-zinc-500 hover:text-emerald-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        title="Export Deck"
                        onClick={(e) => { e.stopPropagation(); onExportDeck(deck.id); }}
                        className="text-zinc-500 hover:text-emerald-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                    >
                        <FileDown size={16} />
                    </button>
                    <button
                        title="Reset Progress"
                        onClick={(e) => { e.stopPropagation(); onResetDeck(deck.id); }}
                        className="text-zinc-500 hover:text-amber-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        title="Delete Deck"
                        onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id); }}
                        className="text-zinc-500 hover:text-red-400 transition-all p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>

              {/* Action Buttons (Study/Cram) */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
                <button
                    onClick={() => onSelectDeck(deck.id, 'standard')}
                    className="flex items-center justify-center gap-2 bg-zinc-800 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-zinc-700 active:scale-95"
                >
                    <Play size={14} className={due > 0 ? "text-emerald-400" : "text-zinc-500"} />
                    <span className="truncate">{due > 0 ? `Study (${due})` : 'Review'}</span>
                </button>
                <button
                    onClick={() => onSelectDeck(deck.id, 'cram')}
                    className="flex items-center justify-center gap-2 bg-zinc-800 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-zinc-700 active:scale-95"
                    title="Study all cards immediately"
                >
                    <Zap size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate">Study All ({total})</span>
                </button>
              </div>
            </div>
          );
        })}

        {visibleDecks.length === 0 && visibleFolders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
             <div className="bg-zinc-800 p-4 rounded-full mb-4">
                <Sparkles size={32} className="text-emerald-500" />
             </div>
             <h3 className="text-xl font-semibold text-white mb-2">
                 {currentFolderId ? "This folder is empty" : "Create Your First Deck"}
             </h3>
             <p className="text-zinc-400 max-w-sm text-center mb-6">
                {currentFolderId 
                    ? "Create a deck here or move existing decks into this folder." 
                    : "Start by creating a deck, then use AI to generate cards from your notes or PDFs."}
             </p>
             <button
                onClick={() => onCreateDeck(currentFolderId || undefined)}
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