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
        white: '#fff',
        gray: {
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        brand: {
          primary: '#000',
          secondary: '#4b5563'
        }
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      }
    }
  },
  plugins: []
}
