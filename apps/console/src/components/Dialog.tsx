import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from '../i18n';
import { Icon } from './Icon';

/**
 * Modal built on the native <dialog>: focus containment, Escape and the
 * inert background come from the platform. Used only for tasks that need
 * protected focus (create site, publish, rotate, delete).
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** False while showing a one-time secret: Escape and the X are disabled until confirmed. */
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useT();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? ' dialog-wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) onClose();
      }}
    >
      {open && (
        <div className="dialog-frame">
          <header className="dialog-head">
            <h2 id={titleId}>{title}</h2>
            {dismissable && (
              <button type="button" className="icon-btn" onClick={onClose} aria-label={t.common.close}>
                <Icon name="close" />
              </button>
            )}
          </header>
          <div className="dialog-body">{children}</div>
          {footer && <footer className="dialog-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
