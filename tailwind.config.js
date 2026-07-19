/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}', 
    './app/app.vue',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}', 
    './app.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(17, 24, 39, 0.05), 0 2px 10px -1px rgba(17, 24, 39, 0.03)',
        'glow': '0 0 15px rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        modernlight: {
          "primary": "#4f46e5",          // Indigo 600
          "primary-focus": "#4338ca",
          "primary-content": "#ffffff",
          "secondary": "#a855f7",        // Purple 500
          "accent": "#06b6d4",           // Cyan 500
          "neutral": "#1e293b",          // Slate 800
          "base-100": "#f8fafc",         // Slate 50
          "base-200": "#f1f5f9",         // Slate 100
          "base-300": "#e2e8f0",         // Slate 200
          "base-content": "#0f172a",     // Slate 900
          "info": "#3b82f6",
          "success": "#10b981",          // Emerald 500
          "warning": "#f59e0b",          // Amber 500
          "error": "#ef4444",            // Red 500
          "--rounded-box": "1rem",       // Border radius lebih membulat
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
      },
    ],
  },
}

