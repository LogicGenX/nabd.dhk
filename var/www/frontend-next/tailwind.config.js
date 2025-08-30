const { colors, radii, shadows } = require('./src/theme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        warm: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        burgundy: {
          50: '#fdf5f6',
          100: '#f8e6e9',
          200: '#f1ccd4',
          300: '#e8aab7',
          400: '#d46a8a',
          500: '#800020',
          600: '#660019',
          700: '#4d0013',
          800: '#33000d',
          900: '#1a0006',
        },
      },
      borderRadius: radii,
      boxShadow: shadows,
      keyframes: {
        bump: {
          '0%': { transform: 'scale(1)' },
          '10%': { transform: 'scale(1.1)' },
          '30%': { transform: 'scale(1.15)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'micro-bounce': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        bump: 'bump 0.3s',
        'micro-bounce': 'micro-bounce 0.3s',
      },
      fontFamily: {
        heading: ['Cinzel', 'Cormorant Garamond', 'serif'],
        body: ['Outfit', 'Space Grotesk', 'Sora', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['24px', { lineHeight: '32px' }],
        '2xl': ['32px', { lineHeight: '40px' }],
        '3xl': ['48px', { lineHeight: '56px' }],
        '4xl': ['64px', { lineHeight: '72px' }],
      },
      letterSpacing: {
        brand: '0.05em',
        body: '0em',
      },
    },
  },
  plugins: [],
}
