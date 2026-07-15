import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        leaf: {
          50: '#f2fbf3',
          100: '#e1f6e4',
          200: '#c3ecca',
          300: '#95dca4',
          400: '#63c479',
          500: '#3ea85c',
          600: '#2c8a49',
          700: '#256e3d',
          800: '#215735',
          900: '#1c482e',
        },
        bloom: {
          50: '#fef3f6',
          100: '#fde3ea',
          200: '#fbc9d8',
          300: '#f7a3bc',
          400: '#f17098',
          500: '#e5477a',
          600: '#cc2f63',
        },
        sand: {
          50: '#fdfbf6',
          100: '#faf5ea',
          200: '#f3ead4',
        },
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(28, 72, 46, 0.08), 0 1px 3px -1px rgba(28, 72, 46, 0.06)',
        floating: '0 12px 28px -8px rgba(28, 72, 46, 0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
