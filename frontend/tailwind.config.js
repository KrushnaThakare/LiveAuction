/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:    'var(--color-primary)',
        secondary:  'var(--color-secondary)',
        accent:     'var(--color-accent)',
        background: 'var(--color-background)',
        surface:    'var(--color-surface)',
        'surface-2':'var(--color-surface-2)',
        border:     'var(--color-border)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        success:    'var(--color-success)',
        danger:     'var(--color-danger)',
        warning:    'var(--color-warning)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm':  'var(--radius-sm, 8px)',
        'md':  'var(--radius-md, 14px)',
        'lg':  'var(--radius-lg, 20px)',
        'xl':  'var(--radius-xl, 28px)',
      },
      animation: {
        'pulse-slow':     'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-slow':    'bounce 2s infinite',
        'glow':           'glow 2s ease-in-out infinite alternate',
        'float-glow':     'floatGlow 6s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
