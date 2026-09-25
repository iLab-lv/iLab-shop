export const CLOSED_EDITOR_STATE = Object.freeze({ openId: null, dirty: false });

export function transitionEditorAccordion(state, action, discardConfirmed = false) {
  if (action.type === 'dirty') {
    return { state: { ...state, dirty: action.value === true }, needsConfirmation: false };
  }
  if (action.type === 'saved') {
    return { state: { ...state, dirty: false }, needsConfirmation: false };
  }

  const nextId = action.type === 'close'
    ? null
    : action.type === 'toggle' && state.openId === action.id ? null : action.id;

  if (nextId === state.openId) return { state, needsConfirmation: false };
  if (state.dirty && !discardConfirmed) return { state, needsConfirmation: true };
  return { state: { openId: nextId, dirty: false }, needsConfirmation: false };
}

export function isAccordionActivationKey(key) {
  return key === 'Enter' || key === ' ';
}

export function createSubmissionGuard() {
  let locked = false;
  return async function run(task) {
    if (locked) return false;
    locked = true;
    try {
      await task();
      return true;
    } finally {
      locked = false;
    }
  };
}
