/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        grotesk: ['Grotesk', 'sans-serif'],
        arabic: ['ArabicFont', 'sans-serif']
      },
      colors: {
        black: '#000',
        white: '#fff'
      }
    }
  },
  plugins: []
}
