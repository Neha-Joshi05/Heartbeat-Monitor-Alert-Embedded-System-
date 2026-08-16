/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.6', transform: 'scale(1.15)' },
        },
        'flash-alert': {
          '0%, 100%': { backgroundColor: 'rgba(220, 38, 38, 0.12)' },
          '50%': { backgroundColor: 'rgba(220, 38, 38, 0.30)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1s ease-in-out infinite',
        'flash-alert': 'flash-alert 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
