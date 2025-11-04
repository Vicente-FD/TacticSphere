/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',
        ink: '#0f0f0f',
        muted: '#6b7280',
        border: '#e5e7eb',
        accent: '#111111',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        md: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)',
        focus: '0 0 0 3px rgba(17,17,17,0.18)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        subtleUp: {
          '0%': { transform: 'translateY(4px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        pulseSoft: {
          '0%,100%': { opacity: 0.9 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        fadeIn: 'fadeIn .24s ease-out both',
        subtleUp: 'subtleUp .28s ease-out both',
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
      },
      strokeWidth: {
        lucide: '1.75',
      },
    },
  },
  plugins: [],
};
