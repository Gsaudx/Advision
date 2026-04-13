/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary
        'adv-primary':    '#000f22',
        'adv-primary-ct': '#0a2540',
        'adv-on-primary': '#ffffff',

        // Surfaces (background hierarchy)
        'adv-bg':  '#f7f9fb',
        'adv-s0':  '#ffffff',
        'adv-s1':  '#f2f4f6',
        'adv-s2':  '#eceef0',
        'adv-s3':  '#e6e8ea',
        'adv-s4':  '#e0e3e5',

        // Text
        'adv-text':   '#191c1e',
        'adv-text-2': '#43474d',

        // Accent (positive / emerald)
        'adv-accent':     '#009e6d',
        'adv-accent-dim': '#4edea3',

        // Borders (use sparingly — prefer bg shift)
        'adv-outline':   '#74777e',
        'adv-outline-2': '#c4c6ce',

        // Errors
        'adv-error':    '#ba1a1a',
        'adv-error-ct': '#ffdad6',
      },
      fontFamily: {
        sans:     ['Inter', 'sans-serif'],
        headline: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        'ambient':    '0 2px 8px rgba(0,15,34,0.06), 0 1px 3px rgba(0,15,34,0.04)',
        'ambient-lg': '0 8px 24px rgba(0,15,34,0.10), 0 2px 8px rgba(0,15,34,0.06)',
        'modal':      '0 24px 64px rgba(0,15,34,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        shake: 'shake 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '50%': { transform: 'translateX(5px)' },
          '75%': { transform: 'translateX(-5px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
