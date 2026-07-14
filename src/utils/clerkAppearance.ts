/** WaterBnB theme for all Clerk components (sign-in, sign-up, account modal). */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#0a6ebd',
    colorText: '#0b2545',
    colorTextSecondary: '#64748b',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#0f172a',
    colorDanger: '#ef4444',
    borderRadius: '0.5rem',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    card: 'shadow-card ring-1 ring-black/5 rounded-xl',
    rootBox: 'font-sans',
    headerTitle: 'font-display text-2xl font-medium text-muted',
    headerSubtitle: 'text-slate-500',
    formButtonPrimary:
      'bg-brand hover:bg-brand-dark text-white font-medium rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98] normal-case',
    formFieldInput:
      'border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-colors duration-150',
    formFieldLabel: 'text-slate-700 font-medium',
    footerActionLink: 'text-brand hover:text-brand-dark font-medium',
    socialButtonsBlockButton:
      'border-slate-200 hover:bg-brand/5 rounded-lg transition-colors duration-150',
    dividerLine: 'bg-slate-200',
    dividerText: 'text-slate-400',
    identityPreview: 'border-slate-200 rounded-lg',
    avatarBox: 'ring-2 ring-brand/20',
  },
}
