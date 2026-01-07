import React, { useRef, useState, useEffect } from 'react';
import { Deck, Flashcard, Folder } from '../types';
import { Plus, Trash2, RotateCcw, Play, Pencil, FileDown, Merge, FileUp, Zap, Sparkles, Folder as FolderIcon, FolderOpen, ChevronRight, FolderPlus, MoveRight, MoreHorizontal } from 'lucide-react';

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setOpenMenuId(prev => prev === id ? null : id);
  };

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
    <div className="p-6 max-w-6xl mx-auto min-h-full">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-2 text-xl font-semibold text-zinc-100 min-w-0">
            <button 
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-emerald-400 transition-colors whitespace-nowrap ${!currentFolderId ? 'text-white font-bold' : 'text-zinc-500'}`}
            >
                Library
            </button>
            {currentFolder && (
                <>
                    <ChevronRight size={20} className="text-zinc-700 shrink-0" />
                    <span className="flex items-center gap-2 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                        <FolderOpen size={20} className="text-blue-500 shrink-0" />
                        <span className="truncate text-white font-bold">{currentFolder.name}</span>
                    </span>
                </>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {!currentFolderId && (
                <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={onImportData}
                        className="hidden"
                        accept=".json,.txt,.csv,.tsv"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                        title="Import"
                    >
                        <FileUp size={18} />
                    </button>
                    <button
                        onClick={onExportData}
                        disabled={decks.length === 0}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 rounded-lg transition-all"
                        title="Export All"
                    >
                        <FileDown size={18} />
                    </button>
                    <button
                        onClick={onMergeClick}
                        disabled={decks.length < 2}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 rounded-lg transition-all"
                        title="Merge Decks"
                    >
                        <Merge size={18} />
                    </button>
                </div>
            )}
            
            <button
                onClick={onCreateFolder}
                className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl font-medium transition-all hover:bg-zinc-700 hover:text-white"
            >
                <FolderPlus size={18} />
                <span className="hidden sm:inline">New Folder</span>
            </button>
            
            <button
                onClick={() => onCreateDeck(currentFolderId || undefined)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 hover:scale-105 active:scale-95"
            >
                <Plus size={20} />
                <span>New Deck</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Folders */}
        {visibleFolders.map((folder) => {
            const { total, due } = getFolderCardCounts(folder.id);
            return (
                <div
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className={`group relative bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 flex flex-col cursor-pointer ${openMenuId === folder.id ? 'z-30' : ''}`}
                >
                    <div className="flex justify-between items-start mb-4 relative z-20">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                            <FolderIcon size={24} className="fill-current" />
                        </div>
                        
                        <div className="relative">
                            <button
                                onClick={(e) => toggleMenu(e, folder.id)}
                                className={`p-2 rounded-lg transition-all ${openMenuId === folder.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <MoreHorizontal size={20} />
                            </button>

                            {/* Folder Menu */}
                            {openMenuId === folder.id && (
                                <div 
                                    className="absolute top-full right-0 mt-2 z-50 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => { onEditFolder(folder); setOpenMenuId(null); }}
                                        className="flex items-center gap-2 w-full p-2 text-sm text-left text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                                    >
                                        <Pencil size={16} /> Rename
                                    </button>
                                    <button
                                        onClick={() => { onExportFolder(folder.id); setOpenMenuId(null); }}
                                        className="flex items-center gap-2 w-full p-2 text-sm text-left text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                                    >
                                        <FileDown size={16} /> Export
                                    </button>
                                    <div className="h-px bg-zinc-800 my-1 mx-1"></div>
                                    <button
                                        onClick={() => { onDeleteFolder(folder.id); setOpenMenuId(null); }}
                                        className="flex items-center gap-2 w-full p-2 text-sm text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-zinc-200 group-hover:text-white mb-1 transition-colors">{folder.name}</h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-3">
                        <span>{total} cards</span>
                        {due > 0 && <span className="text-amber-500 flex items-center gap-1"><Zap size={12} fill="currentColor" /> {due} due</span>}
                    </p>
                </div>
            );
        })}

        {/* Decks */}
        {visibleDecks.map((deck) => {
          const { total, due } = getCardCounts(deck.id);
          return (
            <div
              key={deck.id}
              onClick={() => onSelectDeck(deck.id, 'standard')}
              className={`group relative bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-emerald-500/30 hover:bg-zinc-900 hover:shadow-xl hover:shadow-emerald-900/10 transition-all duration-300 flex flex-col cursor-pointer h-full ${openMenuId === deck.id ? 'z-30' : ''}`}
            >
              <div className="flex justify-between items-start mb-4 relative z-20">
                  {/* Icon / Color Indicator */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${deck.color.replace('bg-', 'bg-').replace('500', '500/20')} ${deck.color.replace('bg-', 'text-')}`}>
                      <Sparkles size={20} className="fill-current opacity-80" />
                  </div>

                  <div className="relative">
                      <button
                            onClick={(e) => toggleMenu(e, deck.id)}
                            className={`p-2 rounded-lg transition-all ${openMenuId === deck.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                        >
                            <MoreHorizontal size={20} />
                      </button>

                      {/* Deck Menu */}
                      {openMenuId === deck.id && (
                            <div 
                                className="absolute top-full right-0 mt-2 z-50 w-52 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => { onMoveDeck(deck); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full p-2 text-sm text-left text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                                >
                                    <MoveRight size={16} /> Move
                                </button>
                                <button
                                    onClick={() => { onEditDeck(deck); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full p-2 text-sm text-left text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                                >
                                    <Pencil size={16} /> Rename
                                </button>
                                <button
                                    onClick={() => { onExportDeck(deck.id); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full p-2 text-sm text-left text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                                >
                                    <FileDown size={16} /> Export
                                </button>
                                <div className="h-px bg-zinc-800 my-1 mx-1"></div>
                                <button
                                    onClick={() => { onResetDeck(deck.id); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full p-2 text-sm text-left text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                >
                                    <RotateCcw size={16} /> Reset Progress
                                </button>
                                <button
                                    onClick={() => { onDeleteDeck(deck.id); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full p-2 text-sm text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        )}
                  </div>
              </div>
              
              <div className="mb-6 relative z-0">
                <h3 className="text-lg font-bold text-zinc-200 group-hover:text-white transition-colors line-clamp-1">{deck.name}</h3>
                <div className="flex items-center gap-3 text-sm mt-1">
                    <span className="text-zinc-500">{total} cards</span>
                    {due > 0 ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">
                            {due} to review
                        </span>
                    ) : (
                        <span className="text-emerald-500/70 text-xs flex items-center gap-1">
                            <Sparkles size={10} /> All done
                        </span>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto relative z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onSelectDeck(deck.id, 'standard'); }}
                    className="flex items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-all border border-zinc-800 hover:border-zinc-700"
                >
                    <Play size={14} className={due > 0 ? "text-emerald-400 fill-current" : "text-zinc-500"} />
                    Study
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onSelectDeck(deck.id, 'cram'); }}
                    className="flex items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-all border border-zinc-800 hover:border-zinc-700"
                >
                    <Zap size={14} className="text-amber-400 fill-current" />
                    Cram
                </button>
              </div>
            </div>
          );
        })}

        {visibleDecks.length === 0 && visibleFolders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-zinc-500 border-2 border-dashed border-zinc-800/50 rounded-3xl bg-zinc-900/20">
             <div className="bg-zinc-800/50 p-6 rounded-full mb-4">
                <Sparkles size={32} className="text-emerald-500 opacity-50" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">
                 {currentFolderId ? "Empty Folder" : "Your Library is Empty"}
             </h3>
             <p className="text-zinc-400 max-w-sm text-center mb-8">
                {currentFolderId 
                    ? "Add a deck here to get started." 
                    : "Create a deck manually or use AI to generate flashcards from your notes."}
             </p>
             <button
                onClick={() => onCreateDeck(currentFolderId || undefined)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95 hover:bg-emerald-500"
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