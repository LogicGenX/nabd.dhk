/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        black: '#000',
        white: '#fff',
        gray: {
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        }
      },
      keyframes: {
        bump: {
          '0%': { transform: 'scale(1)' },
          '10%': { transform: 'scale(1.1)' },
          '30%': { transform: 'scale(1.15)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' }
        },
        'micro-bounce': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        }
      },
      animation: {
        bump: 'bump 0.3s',
        'micro-bounce': 'micro-bounce 0.3s'
      }
    }
  },
  plugins: []
}
