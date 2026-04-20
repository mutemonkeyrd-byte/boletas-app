/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          bg:      '#0A0A0F',
          card:    '#12121A',
          border:  '#1E1E2E',
          surface: '#16162A',
          purple:  '#7C3AED',
          violet:  '#8B5CF6',
          blue:    '#3B82F6',
          cyan:    '#06B6D4',
          green:   '#10B981',
          orange:  '#F59E0B',
          red:     '#EF4444',
          pink:    '#EC4899',
          text:    '#F1F5F9',
          muted:   '#94A3B8',
          subtle:  '#475569',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
        'gradient-dark':  'linear-gradient(135deg, #0A0A0F 0%, #12121A 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(59,130,246,0.1) 100%)',
        'gradient-green': 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        'gradient-fire':  'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      },
      boxShadow: {
        'brand':    '0 0 40px rgba(124,58,237,0.15)',
        'brand-sm': '0 0 20px rgba(124,58,237,0.1)',
        'glow':     '0 0 30px rgba(124,58,237,0.4)',
        'glow-green':'0 0 30px rgba(16,185,129,0.4)',
      },
      borderRadius: {
        'xl2': '20px',
        'xl3': '24px',
      },
      backdropBlur: {
        'xs': '4px',
      }
    },
  },
  plugins: [],
}
