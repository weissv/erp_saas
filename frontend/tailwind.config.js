/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
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
        /* ── HSL Semantic Tokens (White-label / Shadcn) ── */
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",

        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:          "hsl(var(--sidebar-background))",
          foreground:       "hsl(var(--sidebar-foreground))",
          primary:          "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:           "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:           "hsl(var(--sidebar-border))",
          ring:             "hsl(var(--sidebar-ring))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        /* ── Legacy macOS tokens (backward compat) ── */
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

        'bg-canvas': 'var(--bg-canvas)',
        'bg-grouped': 'var(--bg-grouped)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-inset': 'var(--bg-inset)',

        'surface-primary': 'var(--surface-primary)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-overlay': 'var(--surface-overlay)',

        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-quaternary': 'var(--text-quaternary)',
        'text-on-accent': 'var(--text-on-accent)',

        'fill-primary': 'var(--fill-primary)',
        'fill-secondary': 'var(--fill-secondary)',
        'fill-tertiary': 'var(--fill-tertiary)',
        'fill-quaternary': 'var(--fill-quaternary)',

        'tint-blue': 'var(--tint-blue)',
        'tint-green': 'var(--tint-green)',
        'tint-red': 'var(--tint-red)',
        'tint-orange': 'var(--tint-orange)',
        'tint-purple': 'var(--tint-purple)',

        'separator': 'var(--separator)',
        'separator-opaque': 'var(--separator-opaque)',
        'border-card': 'var(--border-card)',
        'border-field': 'var(--border-field)',
      },
      borderRadius: {
        lg:  "var(--radius)",
        md:  "calc(var(--radius) - 2px)",
        sm:  "calc(var(--radius) - 4px)",
        /* Legacy */
        macos:      "var(--radius-lg)",
        panel:      "var(--radius-xl)",
        pill:       "var(--radius-pill)",
        "macos-lg": "var(--radius-xl)",
        "macos-xl": "var(--radius-2xl)",
        window:     "var(--radius-3xl)",
      },
      boxShadow: {
        'subtle': 'var(--shadow-subtle)',
        'card': 'var(--shadow-card)',
        'floating': 'var(--shadow-floating)',
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
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
