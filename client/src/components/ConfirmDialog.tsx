interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 shadow-xl">
        <p className="text-[var(--c-text)] text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[var(--c-border)] rounded-lg text-sm font-medium text-[var(--c-text)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
