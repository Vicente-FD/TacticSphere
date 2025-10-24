/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        bg: '#FFFFFF',
        accent: '#3A8FFF',
        'accent-soft': '#4CC3FF',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        neutral: {
          700: '#1F1F1F',
          400: '#8C8C8C',
          200: '#EAEAEA',
          100: '#F7F7F7',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        md: '8px',
        xl: '12px',
        '2xl': '20px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        hover: '0 6px 20px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        80: '80ms',
        120: '120ms',
        160: '160ms',
      },
      strokeWidth: {
        lucide: '1.75',
      },
    },
  },
  plugins: [],
};
