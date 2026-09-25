'use client';

import { useCallback, useEffect, useState } from 'react';
import { CLOSED_EDITOR_STATE, transitionEditorAccordion } from '../../../lib/adminEditingState.mjs';

export default function useAdminEditorAccordion({ confirmDiscard } = {}) {
  const [editor, setEditor] = useState(CLOSED_EDITOR_STATE);

  const applyAction = useCallback(async (action) => {
    const initial = transitionEditorAccordion(editor, action);
    if (!initial.needsConfirmation) {
      setEditor(initial.state);
      return true;
    }

    const confirmed = await confirmDiscard?.();
    if (!confirmed) return false;
    setEditor(transitionEditorAccordion(editor, action, true).state);
    return true;
  }, [confirmDiscard, editor]);

  const toggleEditor = useCallback((id) => applyAction({ type: 'toggle', id }), [applyAction]);
  const openEditor = useCallback((id) => applyAction({ type: 'open', id }), [applyAction]);
  const closeEditor = useCallback(() => applyAction({ type: 'close' }), [applyAction]);
  const setDirty = useCallback((value) => {
    setEditor((current) => transitionEditorAccordion(current, { type: 'dirty', value }).state);
  }, []);
  const markSaved = useCallback(() => {
    setEditor((current) => transitionEditorAccordion(current, { type: 'saved' }).state);
  }, []);

  useEffect(() => {
    if (!editor.dirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [editor.dirty]);

  return {
    openId: editor.openId,
    isDirty: editor.dirty,
    toggleEditor,
    openEditor,
    closeEditor,
    setDirty,
    markSaved,
  };
}
