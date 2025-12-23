import React, { useState } from 'react';
import { X, FolderPlus, Pencil } from 'lucide-react';

interface CreateFolderModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
  initialName?: string;
  title?: string;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ onClose, onCreate, initialName = '', title = 'Create New Folder' }) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
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
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            {initialName ? <Pencil size={24} /> : <FolderPlus size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-zinc-400 text-sm">Group your decks together.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Folder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Computer Science, Semester 1"
              autoFocus
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white rounded-xl transition-all text-sm font-medium hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95"
            >
              {initialName ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;