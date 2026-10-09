/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          input: 'var(--bg-input)',
          border: 'var(--border-color)',
          subtle: 'var(--border-subtle)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent-primary)',
          'accent-hover': 'var(--accent-hover)',
          'accent-text': 'var(--accent-text)',
          'accent-soft': 'var(--accent-soft)',
          'diff-add-bg': 'var(--diff-added-bg)',
          'diff-add-border': 'var(--diff-added-border)',
          'diff-add-text': 'var(--diff-added-text)',
          'diff-rem-bg': 'var(--diff-removed-bg)',
          'diff-rem-border': 'var(--diff-removed-border)',
          'diff-rem-text': 'var(--diff-removed-text)',
          'editor-bg': 'var(--editor-bg)',
          'editor-text': 'var(--editor-text)',
        },
      },
    },
  },
  plugins: [],
}
