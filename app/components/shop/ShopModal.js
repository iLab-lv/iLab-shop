'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import styles from './ShopModal.module.css';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const FOCUSABLE = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, [contenteditable="true"], [tabindex]';
const activeModals = new Set();
let scrollSnapshot;

function visible(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected || element.closest('[inert], [hidden]')) return false;
  const computed = window.getComputedStyle(element);
  return computed.visibility !== 'hidden' && computed.display !== 'none' && element.getClientRects().length > 0;
}

function lockPage(dialog) {
  if (!activeModals.size) {
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    scrollSnapshot = {
      x: window.scrollX, y: window.scrollY,
      body: { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, paddingRight: body.style.paddingRight },
      html: { overflow: documentElement.style.overflow, scrollBehavior: documentElement.style.scrollBehavior },
    };
    const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollSnapshot.y}px`, left: `-${scrollSnapshot.x}px`, width: '100%' });
    if (scrollbar > 0) body.style.paddingRight = `${padding + scrollbar}px`;
    documentElement.style.overflow = 'hidden';
  }
  activeModals.add(dialog);
}

function unlockPage(dialog) {
  activeModals.delete(dialog);
  if (activeModals.size || !scrollSnapshot) return;
  const snapshot = scrollSnapshot;
  scrollSnapshot = undefined;
  Object.assign(document.body.style, snapshot.body);
  document.documentElement.style.overflow = snapshot.html.overflow;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(snapshot.x, snapshot.y);
  document.documentElement.style.scrollBehavior = snapshot.html.scrollBehavior;
}

/** Native modality owns background inertness; feature components own the frame and content. */
export default function ShopModal({ open, onClose, returnFocusRef, initialFocusRef, closeDisabled = false, dialogRef, id, className = '', label, labelledBy, children }) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const localRef = useRef(null);
  const lifecycleRef = useRef(null);
  const pointerRef = useRef(null);

  useEffect(() => {
    if (!mounted) return undefined;
    const dialog = localRef.current;
    if (dialogRef) dialogRef.current = dialog;
    return () => { if (dialogRef) dialogRef.current = null; };
  }, [mounted, dialogRef]);

  useEffect(() => {
    if (!mounted) return undefined;
    const dialog = localRef.current;
    if (!open) {
      if (lifecycleRef.current) {
        clearTimeout(lifecycleRef.current.timer);
        dialog.dataset.state = 'closing';
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
        lifecycleRef.current.timer = window.setTimeout(() => lifecycleRef.current?.finish(), delay);
      }
      return undefined;
    }

    if (lifecycleRef.current) {
      clearTimeout(lifecycleRef.current.timer);
      dialog.dataset.state = 'open';
      return undefined;
    }

    const originalFocus = document.activeElement;
    const returnTarget = returnFocusRef?.current ?? originalFocus;
    lockPage(dialog);
    dialog.dataset.state = 'opening';
    dialog.showModal();
    dialog.querySelector('[data-shop-overlay-body]')?.scrollTo(0, 0);

    const updateViewport = () => {
      const viewport = window.visualViewport;
      dialog.style.setProperty('--shop-modal-height', `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty('--shop-modal-top', `${viewport?.offsetTop ?? 0}px`);
      const focused = document.activeElement;
      if (dialog.contains(focused) && focused instanceof HTMLElement) {
        const rect = focused.getBoundingClientRect();
        const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
        if (rect.bottom > bottom || rect.top < (viewport?.offsetTop ?? 0)) focused.scrollIntoView({ block: 'nearest' });
      }
    };
    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      dialog.dataset.state = 'open';
      const preferred = initialFocusRef?.current;
      if (visible(preferred) && dialog.contains(preferred)) preferred.focus({ preventScroll: true });
      else if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
    }); });

    lifecycleRef.current = {
      timer: undefined,
      finish() {
        clearTimeout(this.timer);
        cancelAnimationFrame(frame);
        window.visualViewport?.removeEventListener('resize', updateViewport);
        window.visualViewport?.removeEventListener('scroll', updateViewport);
        window.removeEventListener('resize', updateViewport);
        dialog.close();
        dialog.dataset.state = 'closed';
        unlockPage(dialog);
        lifecycleRef.current = null;
        if (!activeModals.size) {
          const target = visible(returnTarget) ? returnTarget : originalFocus;
          if (visible(target)) target.focus({ preventScroll: true });
        }
      },
    };
    return undefined;
  }, [mounted, open, returnFocusRef, initialFocusRef]);

  useEffect(() => () => lifecycleRef.current?.finish(), []);

  if (!mounted) return null;

  const requestClose = (event) => {
    const dialog = localRef.current;
    if (event.target.closest('dialog') !== dialog || [...activeModals].at(-1) !== dialog) return;
    if (open && !closeDisabled) onClose();
  };
  const onBackdrop = (event) => event.target === event.currentTarget;

  return createPortal(
    <dialog
      ref={localRef}
      id={id}
      className={`${styles.modal} ${className}`}
      data-shop-modal=""
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-modal="true"
      tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); requestClose(event); }}
      onPointerDown={(event) => { pointerRef.current = event.button === 0 && onBackdrop(event) ? event.pointerId : null; }}
      onPointerCancel={() => { pointerRef.current = null; }}
      onPointerUp={(event) => {
        if (pointerRef.current === event.pointerId && onBackdrop(event)) requestClose(event);
        pointerRef.current = null;
      }}
      onKeyDown={(event) => {
        if (!open || event.defaultPrevented || event.key !== 'Tab' || event.target.closest('dialog') !== event.currentTarget) return;
        const nodes = [...event.currentTarget.querySelectorAll(FOCUSABLE)].filter((node) => node.tabIndex >= 0 && !node.matches(':disabled') && visible(node));
        const first = nodes[0];
        const last = nodes.at(-1);
        const focused = document.activeElement;
        if (!first) { event.preventDefault(); event.currentTarget.focus(); }
        else if (event.shiftKey && (focused === first || focused === event.currentTarget || !nodes.includes(focused))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (focused === last || focused === event.currentTarget || !nodes.includes(focused))) { event.preventDefault(); first.focus(); }
      }}
    >{children}</dialog>,
    document.body,
  );
}
