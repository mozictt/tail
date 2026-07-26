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
        moderndark: {
          "primary": "#6366f1",          // Indigo 500
          "primary-focus": "#4f46e5",
          "primary-content": "#ffffff",
          "secondary": "#c084fc",
          "accent": "#22d3ee",
          "neutral": "#1e293b",
          "base-100": "#0f172a",         // Dark background
          "base-200": "#1e293b",
          "base-300": "#334155",
          "base-content": "#f8fafc",
          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
        emeraldlight: {
          "primary": "#10b981",          // Emerald 500
          "primary-focus": "#059669",
          "primary-content": "#ffffff",
          "secondary": "#14b8a6",
          "accent": "#84cc16",
          "neutral": "#1f2937",
          "base-100": "#f4fbf7",
          "base-200": "#e6f7ed",
          "base-300": "#d1f2de",
          "base-content": "#062f1d",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
        emeralddark: {
          "primary": "#34d399",          // Emerald 400
          "primary-focus": "#10b981",
          "primary-content": "#062f1d",
          "secondary": "#2dd4bf",
          "accent": "#a3e635",
          "neutral": "#1f2937",
          "base-100": "#06120e",
          "base-200": "#0a1f18",
          "base-300": "#12362a",
          "base-content": "#ecfdf5",
          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
        sunsetlight: {
          "primary": "#ea580c",          // Orange 600
          "primary-focus": "#c2410c",
          "primary-content": "#ffffff",
          "secondary": "#f59e0b",
          "accent": "#eab308",
          "neutral": "#27272a",
          "base-100": "#fdfaf7",
          "base-200": "#fbeee6",
          "base-300": "#f7ded0",
          "base-content": "#431407",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
        sunsetdark: {
          "primary": "#f97316",          // Orange 500
          "primary-focus": "#ea580c",
          "primary-content": "#ffffff",
          "secondary": "#fbbf24",
          "accent": "#facc15",
          "neutral": "#27272a",
          "base-100": "#140d07",
          "base-200": "#23150b",
          "base-300": "#3b200e",
          "base-content": "#fffaf5",
          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
        roselight: {
          "primary": "#e11d48",          // Rose 600
          "primary-focus": "#be123c",
          "primary-content": "#ffffff",
          "secondary": "#d946ef",
          "accent": "#ec4899",
          "neutral": "#1f2937",
          "base-100": "#fffafb",
          "base-200": "#ffe4e6",
          "base-300": "#fecdd3",
          "base-content": "#4c0519",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        },
        rosedark: {
          "primary": "#f43f5e",          // Rose 500
          "primary-focus": "#e11d48",
          "primary-content": "#ffffff",
          "secondary": "#f472b6",
          "accent": "#fb7185",
          "neutral": "#1f2937",
          "base-100": "#150508",
          "base-200": "#260a10",
          "base-300": "#40101b",
          "base-content": "#fff1f2",
          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        }
      },
    ],
  },
}

