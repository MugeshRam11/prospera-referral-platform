import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#14243A',
          primary: '#14243A',
          secondary: '#0F172A',
          tertiary: '#1E293B',
          dark: '#0B1524',
          border: '#23354E',
        },
        brand: {
          blue: '#2563EB',
          'blue-hover': '#1D4ED8',
          'blue-subtle': '#EFF6FF',
          'blue-border': '#BFDBFE',
        },
      },
    },
  },
  plugins: [],
};

export default config;
