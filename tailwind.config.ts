import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0a6ebd', // deep nautical blue
          dark: '#084e85',
          light: '#3aa7ff',
        },
        accent: {
          DEFAULT: '#13b8a6', // sea green
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
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config
