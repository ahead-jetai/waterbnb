type Props = {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { number: 1 as const, label: 'Review' },
  { number: 2 as const, label: 'Guest Details' },
  { number: 3 as const, label: 'Payment' },
]

export default function BookingProgress({ currentStep }: Props) {
  return (
    <div className="flex items-start justify-center mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.number} className="flex items-start">
          <div className="flex flex-col items-center">
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                ${currentStep > step.number
                  ? 'bg-brand text-white'
                  : currentStep === step.number
                    ? 'bg-brand text-white ring-4 ring-brand/20'
                    : 'bg-slate-100 text-slate-400'}
              `}
            >
              {currentStep > step.number ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                currentStep === step.number ? 'text-brand' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mt-4 mx-2 transition-all duration-500 ${
                currentStep > step.number ? 'bg-brand' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
