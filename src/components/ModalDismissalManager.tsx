import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const OVERLAY_SELECTOR = '.fixed.inset-0';
const PANEL_SELECTOR = '[data-bp-dismissable-panel]';
const LAYER_SELECTOR = `${OVERLAY_SELECTOR}, ${PANEL_SELECTOR}`;
const DISCARD_OVERLAY_SELECTOR = '[data-bp-discard-confirm="true"]';
const BUSY_LABEL = /(?:saving|submitting|recording|uploading|reversing|deleting|updating|verifying|processing|hashing|creating|provisioning|testing)\s*(?:\.{3}|…)?/i;

interface PendingDismissal {
  overlay: HTMLElement;
  closeButton: HTMLButtonElement;
  returnFocus: HTMLElement | null;
}

const fingerprint = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(16)}`;
};

const getLayerForTarget = (target: EventTarget | null): HTMLElement | null => {
  const element = target instanceof Element
    ? target
    : target instanceof Node
      ? target.parentElement
      : null;
  return element?.closest(LAYER_SELECTOR) as HTMLElement | null;
};

const isVisibleLayer = (layer: HTMLElement): boolean => {
  const style = window.getComputedStyle(layer);
  return layer.isConnected && style.display !== 'none' && style.visibility !== 'hidden' && layer.getClientRects().length > 0;
};

const getTopModalOverlay = (): HTMLElement | null => {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)).filter(isVisibleLayer);
  let topOverlay: HTMLElement | null = null;
  let topZIndex = Number.NEGATIVE_INFINITY;

  for (const overlay of overlays) {
    const zIndex = Number.parseInt(window.getComputedStyle(overlay).zIndex, 10);
    const order = Number.isFinite(zIndex) ? zIndex : 0;
    if (order >= topZIndex) {
      topZIndex = order;
      topOverlay = overlay;
    }
  }

  return topOverlay;
};

const getTopLayer = (): HTMLElement | null => {
  const topModal = getTopModalOverlay();
  const panels = Array.from(document.querySelectorAll<HTMLElement>(PANEL_SELECTOR))
    .filter(isVisibleLayer)
    .filter(panel => topModal ? panel.closest(OVERLAY_SELECTOR) === topModal : !panel.closest(OVERLAY_SELECTOR));
  return panels[panels.length - 1] || topModal;
};

const getDialogSnapshot = (overlay: HTMLElement): string => {
  const fields = Array.from(overlay.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([data-bp-ignore-unsaved]), select:not([data-bp-ignore-unsaved]), textarea:not([data-bp-ignore-unsaved])'
  )).map(field => {
    if (field instanceof HTMLInputElement && field.type === 'file') {
      return [field.name, 'file', Array.from(field.files || []).map(file => [file.name, file.size, file.type, file.lastModified])];
    }

    if (field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type)) {
      return [field.name, field.type, field.checked];
    }

    if (field instanceof HTMLSelectElement && field.multiple) {
      return [field.name, 'select-multiple', Array.from(field.selectedOptions).map(option => option.value)];
    }

    return [field.name, field.tagName, fingerprint(field.value)];
  });

  const formButtons = Array.from(overlay.querySelectorAll<HTMLButtonElement>('form button'))
    .filter(button => {
      if (button.closest(DISCARD_OVERLAY_SELECTOR) || button.getAttribute('role') === 'tab' || button.hasAttribute('aria-selected')) return false;
      const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`;
      return !/\b(?:show|hide)\b.*\bpassword\b/i.test(label);
    })
    .map(button => [button.name, button.getAttribute('aria-pressed'), button.getAttribute('aria-checked'), button.className, button.textContent?.trim()]);

  const attachments = Array.from(overlay.querySelectorAll<HTMLAnchorElement>('a[download]'))
    .map(link => [link.getAttribute('download'), link.textContent?.trim()]);

  return JSON.stringify([fields, formButtons, attachments]);
};

const getDismissButton = (overlay: HTMLElement): HTMLButtonElement | null => {
  const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button'))
    .filter(button => button.closest(LAYER_SELECTOR) === overlay && button.isConnected && !button.disabled);
  const isSafeCancel = (button: HTMLButtonElement) => !(button.type === 'submit' && button.closest('form'));
  const explicit = buttons.find(button => button.hasAttribute('data-bp-dismiss') && isSafeCancel(button));
  if (explicit) return explicit;

  const named = buttons.find(button => {
    if (!isSafeCancel(button)) return false;
    const text = button.textContent?.trim() || '';
    const label = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`.trim();
    return /^(?:cancel(?: entry)?|close(?: dialog| modal)?|done|dismiss|back)$/i.test(text)
      || /\b(?:cancel|close|dismiss)\b/i.test(label);
  });
  if (named) return named;

  return buttons.find(button => isSafeCancel(button) && Boolean(button.querySelector('svg.lucide-x'))) || null;
};

const isDismissControl = (button: HTMLButtonElement): boolean => {
  if (button.hasAttribute('data-bp-dismiss')) return true;
  const text = button.textContent?.trim() || '';
  const label = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`.trim();
  return /^(?:cancel(?: entry)?|close(?: dialog| modal)?|done|dismiss|back)$/i.test(text)
    || /\b(?:cancel|close|dismiss)\b/i.test(label)
    || Boolean(button.querySelector('svg.lucide-x'));
};

const isOperationPending = (overlay: HTMLElement): boolean => {
  if (overlay.getAttribute('aria-busy') === 'true' || overlay.querySelector('[aria-busy="true"]')) return true;
  return Array.from(overlay.querySelectorAll<HTMLButtonElement>('button:disabled'))
    .some(button => BUSY_LABEL.test(button.textContent || ''));
};

const isNativePopupTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  try {
    return target.matches(':open');
  } catch {
    return false;
  }
};

export const ModalDismissalManager: React.FC = () => {
  const [pendingDismissal, setPendingDismissal] = useState<PendingDismissal | null>(null);
  const pendingDismissalRef = useRef<PendingDismissal | null>(null);
  const snapshotsRef = useRef(new WeakMap<HTMLElement, string>());
  const unknownChangesRef = useRef(new WeakSet<HTMLElement>());
  const suppressedClickTargetRef = useRef<EventTarget | null>(null);

  const updatePendingDismissal = (next: PendingDismissal | null) => {
    pendingDismissalRef.current = next;
    setPendingDismissal(next);
  };

  useEffect(() => {
    const captureInitialFormState = (overlay: HTMLElement) => {
      if (!snapshotsRef.current.has(overlay)) {
        snapshotsRef.current.set(overlay, getDialogSnapshot(overlay));
      }
    };

    const restoreFocus = (pending: PendingDismissal | null) => {
      if (pending?.returnFocus?.isConnected) {
        window.requestAnimationFrame(() => pending.returnFocus?.focus());
      }
    };

    const keepEditing = () => {
      const pending = pendingDismissalRef.current;
      updatePendingDismissal(null);
      restoreFocus(pending);
    };

    const requestDismiss = (overlay: HTMLElement): 'closed' | 'confirm' | 'ignored' => {
      if (getTopLayer() !== overlay || isOperationPending(overlay) || overlay.hasAttribute('data-bp-explicit-dismiss-only')) return 'ignored';
      const closeButton = getDismissButton(overlay);
      if (!closeButton) return 'ignored';

      const baseline = snapshotsRef.current.get(overlay);
      const hasChangedWithoutBaseline = unknownChangesRef.current.has(overlay);
      const hasUnsavedChanges = hasChangedWithoutBaseline || (baseline !== undefined && baseline !== getDialogSnapshot(overlay));

      if (hasUnsavedChanges) {
        if (pendingDismissalRef.current?.overlay !== overlay) {
          const activeElement = document.activeElement;
          updatePendingDismissal({
            overlay,
            closeButton,
            returnFocus: activeElement instanceof HTMLElement ? activeElement : null
          });
        }
        return 'confirm';
      }

      snapshotsRef.current.delete(overlay);
      unknownChangesRef.current.delete(overlay);
      closeButton.click();
      return 'closed';
    };

    const suppressNextClick = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return;
      suppressedClickTargetRef.current = target;
    };

    let clearSuppressedClickTimer: number | undefined;
    const handleClick = (event: MouseEvent) => {
      const targetElement = event.target instanceof Element ? event.target : null;
      const layer = getLayerForTarget(event.target);
      const button = targetElement?.closest('button') as HTMLButtonElement | null;
      if (layer && button && button.closest(LAYER_SELECTOR) === layer && isOperationPending(layer) && isDismissControl(button)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      const suppressedTarget = suppressedClickTargetRef.current;
      if (!suppressedTarget || !event.composedPath().includes(suppressedTarget)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressedClickTargetRef.current = null;
    };

    const handlePointerUp = () => {
      if (clearSuppressedClickTimer !== undefined) window.clearTimeout(clearSuppressedClickTimer);
      clearSuppressedClickTimer = window.setTimeout(() => {
        suppressedClickTargetRef.current = null;
        clearSuppressedClickTimer = undefined;
      }, 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      const targetElement = target instanceof Element ? target : null;
      const discardOverlay = targetElement?.closest(DISCARD_OVERLAY_SELECTOR) as HTMLElement | null;

      if (discardOverlay && target === discardOverlay) {
        keepEditing();
        return;
      }

      const topLayer = getTopLayer();
      const topModal = getTopModalOverlay();
      if (!topLayer) return;

      if (topLayer.matches(PANEL_SELECTOR)) {
        const ownerModal = topLayer.closest(OVERLAY_SELECTOR) as HTMLElement | null;
        if (topModal && ownerModal !== topModal) {
          if (target === topModal) requestDismiss(topModal);
          else if (topModal.contains(target as Node)) return;
          return;
        }

        if (target instanceof Node && topLayer.contains(target)) {
          captureInitialFormState(topLayer);
          return;
        }

        if (!ownerModal || ownerModal.contains(target as Node)) {
          const result = requestDismiss(topLayer);
          const trigger = target instanceof Element
            ? target.closest<HTMLElement>('[data-bp-panel-trigger]')
            : null;
          const isSamePanelTrigger = Boolean(
            trigger && trigger.dataset.bpPanelTrigger === topLayer.dataset.bpDismissablePanel
          );
          if (result !== 'closed' || isSamePanelTrigger) {
            event.preventDefault();
            suppressNextClick(target);
          }
        }
        return;
      }

      const overlay = getLayerForTarget(target);
      if (overlay !== topLayer) return;

      if (target === topLayer) {
        event.preventDefault();
        requestDismiss(topLayer);
        return;
      }

      if (target instanceof Node && topLayer.contains(target)) captureInitialFormState(topLayer);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const layer = getLayerForTarget(event.target);
      if (layer && getTopLayer() === layer) captureInitialFormState(layer);
    };

    const handleFormChange = (event: Event) => {
      const layer = getLayerForTarget(event.target);
      if (!layer || layer.hasAttribute('data-bp-discard-confirm')) return;
      if (!snapshotsRef.current.has(layer)) unknownChangesRef.current.add(layer);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isNativePopupTarget(event.target)) return;

      const topLayer = getTopLayer();
      if (!topLayer) return;
      event.preventDefault();
      event.stopPropagation();

      if (topLayer.hasAttribute('data-bp-discard-confirm')) {
        keepEditing();
        return;
      }

      requestDismiss(topLayer);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleFormChange, true);
    document.addEventListener('change', handleFormChange, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleFormChange, true);
      document.removeEventListener('change', handleFormChange, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      if (clearSuppressedClickTimer !== undefined) window.clearTimeout(clearSuppressedClickTimer);
    };
  }, []);

  useEffect(() => {
    if (!pendingDismissal) return;
    const observer = new MutationObserver(() => {
      if (!pendingDismissal.overlay.isConnected) updatePendingDismissal(null);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pendingDismissal]);

  useEffect(() => {
    if (!pendingDismissal) return;
    const keepButton = document.querySelector<HTMLButtonElement>('[data-bp-discard-confirm="true"] button[data-bp-keep-editing]');
    keepButton?.focus();
  }, [pendingDismissal]);

  if (!pendingDismissal || typeof document === 'undefined') return null;

  const finishDiscard = () => {
    const pending = pendingDismissalRef.current;
    updatePendingDismissal(null);
    if (pending?.overlay.isConnected && pending.closeButton.isConnected && !isOperationPending(pending.overlay)) {
      snapshotsRef.current.delete(pending.overlay);
      unknownChangesRef.current.delete(pending.overlay);
      pending.closeButton.click();
    }
  };

  return createPortal(
    <div
      data-bp-discard-confirm="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-bp-navy-deep/55 p-4 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bp-discard-changes-title"
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <section className="w-full max-w-sm rounded-2xl border border-bp-border bg-white p-5 shadow-2xl">
        <h2 id="bp-discard-changes-title" className="text-base font-semibold text-bp-text">Discard unsaved changes?</h2>
        <p className="mt-1.5 text-sm text-bp-muted">Your entered information will be cleared if you discard it.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-bp-keep-editing
            onClick={() => {
              const pending = pendingDismissalRef.current;
              updatePendingDismissal(null);
              if (pending?.returnFocus?.isConnected) window.requestAnimationFrame(() => pending.returnFocus?.focus());
            }}
            className="min-h-11 rounded-xl border border-bp-border px-4 text-sm font-semibold text-bp-text hover:bg-bp-background"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={finishDiscard}
            className="min-h-11 rounded-xl bg-bp-navy px-4 text-sm font-semibold text-white hover:bg-bp-blue"
          >
            Discard Changes
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};
