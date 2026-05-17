/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Command Center custom colors are CSS-variable driven so themes can swap globally.
        "cc-base": {
          deep: "rgb(var(--cc-base-deep) / <alpha-value>)",
          surface: "rgb(var(--cc-base-surface) / <alpha-value>)",
          elevated: "rgb(var(--cc-base-elevated) / <alpha-value>)",
          "elevated-strong": "rgb(var(--cc-base-elevated-strong) / <alpha-value>)",
        },
        "cc-warm": {
          primary: "rgb(var(--cc-warm-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--cc-warm-primary-hover) / <alpha-value>)",
          muted: "rgb(var(--cc-warm-muted) / <alpha-value>)",
          text: "rgb(var(--cc-warm-text) / <alpha-value>)",
        },
        "cc-gold": "rgb(var(--cc-gold) / <alpha-value>)",
        "cc-green": "rgb(var(--cc-green) / <alpha-value>)",
        "cc-blue": "rgb(var(--cc-blue) / <alpha-value>)",
        "cc-text": {
          high: "rgb(var(--cc-text-high) / <alpha-value>)",
          mid: "rgb(var(--cc-text-mid) / <alpha-value>)",
          low: "rgb(var(--cc-text-low) / <alpha-value>)",
        },
        "cc-gridline": "rgb(var(--cc-gridline) / <alpha-value>)",
        "cc-danger": {
          DEFAULT: "rgb(var(--cc-danger) / <alpha-value>)",
          muted: "rgb(var(--cc-danger-muted) / <alpha-value>)",
        },
        "cc-status": {
          amber: "rgb(var(--cc-status-amber) / <alpha-value>)",
          green: "rgb(var(--cc-status-green) / <alpha-value>)",
        },
      },
      fontFamily: {
        mono: ['"Geist Mono"', '"Courier New"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        panel: "0 4px 24px rgba(0, 0, 0, 0.4)",
        drawer: "0 0 40px rgba(0, 0, 0, 0.5)",
        "inset-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        "focus-ring": "0 0 0 2px rgba(184, 92, 61, 0.3)",
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "pulse-slow": "pulse-slow 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
