import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070E16',
          900: '#0D1B2A',
          800: '#122236',
          700: '#1A2E45',
          600: '#1E3754',
          500: '#234262',
        },
        teal: {
          50:  '#E6FAFA',
          100: '#C0F0EE',
          200: '#81E1DC',
          300: '#42D2CA',
          400: '#1CC3BA',
          500: '#0EA5A0',
          600: '#0B8A86',
          700: '#09706C',
          800: '#065553',
          900: '#033B39',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'brand-hero':
          'linear-gradient(135deg, #0D1B2A 0%, #122236 50%, #0B8A86 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
