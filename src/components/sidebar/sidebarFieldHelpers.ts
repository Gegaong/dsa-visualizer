import type { KeyboardEvent } from 'react'

// Enter confirms a text field by moving focus away (same idea as "done typing").
export const confirmNodeLabelFieldOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.currentTarget.blur()
  }
}

/** Shared attrs for start/goal node label inputs (letters only — not numeric). */
export const NODE_LABEL_FIELD_ATTRS = {
  type: 'text' as const,
  inputMode: 'text' as const,
  autoCapitalize: 'characters' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
}

/** Shared attrs for goal-value / numeric target inputs. */
export const NODE_VALUE_FIELD_ATTRS = {
  type: 'text' as const,
  inputMode: 'numeric' as const,
}
