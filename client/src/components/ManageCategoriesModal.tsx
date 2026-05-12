import { useState } from 'react';
import type { UserCategory } from '../types/category';
import { CATEGORY_COLOR_PALETTE } from '../types/category';
import { createCategory, updateCategory, deleteCategory } from '../api/categories';

interface Props {
  userCategories: UserCategory[];
  onBack: () => void;
  onChanged: () => void;
}

const inputClass =
  'px-4 py-2.5 border border-[rgba(109,109,109,0.5)] rounded-2xl bg-[var(--c-card)] text-[var(--c-text)] text-sm placeholder:text-[var(--c-text-2)] focus:outline-none focus:border-[var(--c-text)] transition-colors w-full';

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
            value === c ? 'border-[var(--c-text)] scale-110' : 'border-transparent hover:scale-105'
          }`}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

export default function ManageCategoriesModal({ userCategories, onBack, onChanged }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLOR_PALETTE[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await createCategory(newName.trim(), newColor);
      setNewName('');
      setNewColor(CATEGORY_COLOR_PALETTE[0]);
      onChanged();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: UserCategory) {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditError('');
  }

  async function handleSave(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setEditError('');
    try {
      await updateCategory(id, editName.trim(), editColor);
      setEditingId(null);
      onChanged();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteCategory(id);
      onChanged();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer transition-colors leading-none"
        >
          ←
        </button>
        <h2 className="text-xl font-bold text-[var(--c-text)]">Custom categories</h2>
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-5 sm:px-7 pb-6 sm:pb-7 flex flex-col gap-5">
        {userCategories.length > 0 && (
          <div className="flex flex-col gap-2">
            {userCategories.map((cat) => (
              <div key={cat._id} className="rounded-2xl border border-[rgba(109,109,109,0.5)] bg-[var(--c-surface,var(--c-card))] p-3">
                {editingId === cat._id ? (
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    {editError && <p className="text-xs text-[var(--c-expense)]">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(cat._id)}
                        disabled={saving || !editName.trim()}
                        className="flex-1 py-2 rounded-2xl text-sm font-medium bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2 rounded-2xl text-sm font-medium border border-[rgba(109,109,109,0.5)] text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="flex-1 text-sm font-medium text-[var(--c-text)] capitalize">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="text-xs text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer transition-colors px-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat._id)}
                      disabled={deletingId === cat._id}
                      className="text-xs text-[var(--c-expense)] hover:opacity-70 cursor-pointer disabled:opacity-40 transition-opacity px-1"
                    >
                      {deletingId === cat._id ? '…' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col gap-3 pt-2 border-t border-[rgba(109,109,109,0.3)]">
          <p className="text-sm font-semibold text-[var(--c-text)]">New category</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className={inputClass}
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          {createError && <p className="text-xs text-[var(--c-expense)]">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="py-2.5 rounded-2xl text-sm font-semibold bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
          >
            {creating ? 'Creating…' : 'Create category'}
          </button>
        </form>
      </div>
    </>
  );
}
