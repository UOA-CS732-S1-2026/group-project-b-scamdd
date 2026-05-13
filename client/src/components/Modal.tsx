import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible label for the close button. */
  closeLabel?: string;
  /** Disable closing via Esc or backdrop. */
  dismissable?: boolean;
  /** Max-width class applied to the dialog panel. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Headless accessible modal:
 * - Traps focus inside the dialog while open (Tab and Shift+Tab cycle through
 *   focusable children only).
 * - Restores focus to the element that opened the modal on close.
 * - Esc closes, unless `dismissable` is false.
 * - Click on backdrop closes, unless `dismissable` is false.
 * - Locks body scroll while open.
 */
export default function Modal({
  open,
  onClose,
  title,
  closeLabel = 'Close',
  dismissable = true,
  size = 'md',
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );

    const first = focusables()[0];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`w-full ${SIZE_CLASS[size]} rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] shadow-xl flex flex-col max-h-[90vh] overflow-hidden`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
            <h2 id="modal-title" className="text-lg font-semibold text-[var(--c-text)]">
              {title}
            </h2>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="text-[var(--c-text-2)] hover:text-[var(--c-text)] text-xl leading-none px-2 rounded"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  );
}
