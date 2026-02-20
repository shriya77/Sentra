/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentra: {
          /* Cosmic theme: deep space blues and purples with star-like accents */
          primary: '#60a5fa', // Bright blue (stars)
          'primary-light': '#93c5fd',
          'primary-deep': '#3b82f6',
          accent: '#a78bfa', // Purple (nebula)
          'accent-soft': '#c4b5fd',
          'accent-pale': '#ddd6fe',
          'cosmic-accent': '#818cf8', // Indigo
          'cosmic-purple': '#a78bfa',
          'cosmic-blue': '#60a5fa',
          muted: '#94a3b8', // Light gray for text
          'muted-soft': '#cbd5e1',
          stable: '#60a5fa', // Blue for stable status
          watch: '#d97706', // Darker amber for watch (more visible)
          high: '#f87171', // Red for high risk
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      fontSize: {
        'body': ['1rem', { lineHeight: '1.65' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.6' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glass': '0 4px 24px -4px rgba(15, 118, 110, 0.08), 0 2px 12px -2px rgba(15, 118, 110, 0.04)',
        'glass-hover': '0 12px 40px -8px rgba(15, 118, 110, 0.1), 0 4px 16px -4px rgba(15, 118, 110, 0.04)',
        'glass-dark': '0 8px 32px -4px rgba(0, 0, 0, 0.5), 0 4px 16px -2px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glass-hover-dark': '0 12px 48px -8px rgba(0, 0, 0, 0.6), 0 6px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.5)',
        'cosmic-glow': '0 0 20px rgba(96, 165, 250, 0.3), 0 0 40px rgba(167, 139, 250, 0.2)',
      },
      backdropBlur: {
        xl: '20px',
        '2xl': '24px',
      },
      animation: {
        'count-up': 'countUp 0.6s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}
