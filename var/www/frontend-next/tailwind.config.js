/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        grotesk: ['var(--font-grotesk)', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'sans-serif']
      },
      colors: {
        black: '#000',
        white: '#fff',
        gray: {
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        }
      }
    }
  },
  plugins: []
}
