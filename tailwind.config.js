/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0e13',
        panel: '#131822',
        muted: '#8b94a7'
      }
    }
  },
  plugins: []
}
