// Enter confirms a text field by moving focus away (same idea as "done typing").
export const confirmNodeLabelFieldOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.currentTarget.blur()
  }
}
