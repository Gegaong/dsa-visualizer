type StepExplanationProps = {
  text: string
}

export const StepExplanation = ({ text }: StepExplanationProps) => {
  if (text.trim() === '') return null
  return (
    <div className="step-explanation" role="status" aria-live="polite">
      <svg
        className="step-explanation-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p className="step-explanation-text">{text}</p>
    </div>
  )
}
