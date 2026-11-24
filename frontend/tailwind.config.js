/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '"Noto Sans Thai"', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#eef3ff',
          100: '#dbe5ff',
          600: '#1e3a8a',
          700: '#172f73',
          800: '#10235a',
          900: '#0b1a45',
          950: '#071233',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,35,90,0.04), 0 4px 16px rgba(16,35,90,0.06)',
        lift: '0 8px 30px rgba(16,35,90,0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .35s ease-out both',
        'scale-in': 'scale-in .2s ease-out both',
        'slide-in': 'slide-in .25s ease-out both',
      },
    },
  },
  plugins: [],
};
