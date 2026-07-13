import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#0a6ebd',
          dark: '#084e85',
          light: '#3aa7ff',
        },
        accent: {
          DEFAULT: '#13b8a6',
          dark: '#0f9486',
          light: '#6de0d3',
        },
        background: '#f5faff',
        muted: '#0b2545',
        ring: '#ffd166',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      boxShadow: {
        card: '0 8px 24px rgba(10, 110, 189, 0.08)',
        'card-hover': '0 16px 40px rgba(10, 110, 189, 0.15)',
      },
      borderRadius: {
        xl: '1rem',
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease both',
        'fade-in': 'fade-in 0.6s ease both',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
