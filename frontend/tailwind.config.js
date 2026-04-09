/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', '"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // macOS System Colors
        'macos-blue': 'var(--color-blue)',
        'macos-blue-hover': 'var(--color-blue-hover)',
        'macos-blue-active': 'var(--color-blue-active)',
        'macos-green': 'var(--color-green)',
        'macos-red': 'var(--color-red)',
        'macos-red-hover': 'var(--color-red-hover)',
        'macos-red-active': 'var(--color-red-active)',
        'macos-orange': 'var(--color-orange)',
        'macos-yellow': 'var(--color-yellow)',
        'macos-purple': 'var(--color-purple)',
        'macos-pink': 'var(--color-pink)',
        'macos-teal': 'var(--color-teal)',
        'macos-indigo': 'var(--color-indigo)',

        // Semantic Surfaces
        'bg-canvas': 'var(--bg-canvas)',
        'bg-grouped': 'var(--bg-grouped)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-inset': 'var(--bg-inset)',
        
        'surface-primary': 'var(--surface-primary)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-overlay': 'var(--surface-overlay)',

        // Text Colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-quaternary': 'var(--text-quaternary)',
        'text-on-accent': 'var(--text-on-accent)',

        // Fill Colors
        'fill-primary': 'var(--fill-primary)',
        'fill-secondary': 'var(--fill-secondary)',
        'fill-tertiary': 'var(--fill-tertiary)',
        'fill-quaternary': 'var(--fill-quaternary)',

        // Tints
        'tint-blue': 'var(--tint-blue)',
        'tint-green': 'var(--tint-green)',
        'tint-red': 'var(--tint-red)',
        'tint-orange': 'var(--tint-orange)',
        'tint-purple': 'var(--tint-purple)',

        // Borders and Separators
        'separator': 'var(--separator)',
        'separator-opaque': 'var(--separator-opaque)',
        'border-card': 'var(--border-card)',
        'border-field': 'var(--border-field)',
      },
      boxShadow: {
        'subtle': 'var(--shadow-subtle)',
        'card': 'var(--shadow-card)',
        'floating': 'var(--shadow-floating)',
        // legacy mappings
        mezon:          "var(--shadow-card)",
        glass:          "var(--shadow-subtle)",
        "glass-lg":     "var(--shadow-card)",
        "glass-xl":     "var(--shadow-floating)",
        "macos-btn":    "var(--shadow-subtle)",
        "macos-input":  "var(--shadow-subtle)",
        "macos-card":   "var(--shadow-card)",
        "macos-floating": "var(--shadow-floating)",
        "macos-window": "var(--shadow-floating)",
      },
      borderRadius: {
        macos:      "var(--radius-lg)",
        panel:      "var(--radius-xl)",
        pill:       "var(--radius-pill)",
        "macos-lg": "var(--radius-xl)",
        "macos-xl": "var(--radius-2xl)",
        window:     "var(--radius-3xl)",
      },
      spacing: {
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        14: '56px',
        16: '64px',
      }
    },
  },
  plugins: [],
}
