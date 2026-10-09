import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';

export type AppTheme = 'parchment' | 'paper-light' | 'midnight' | 'forest';

interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  bgHex: string;
  accentHex: string;
  badge: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'parchment',
    name: 'Warm Parchment',
    tagline: 'Classic typewriter & book page warmth',
    bgHex: '#f7f4ed',
    accentHex: '#b45309',
    badge: 'Classic',
  },
  {
    id: 'paper-light',
    name: 'Minimalist Paper',
    tagline: 'Crisp porcelain white & cobalt blue',
    bgHex: '#ffffff',
    accentHex: '#2563eb',
    badge: 'Light',
  },
  {
    id: 'midnight',
    name: 'Nordic Midnight',
    tagline: 'Deep navy charcoal & electric indigo',
    bgHex: '#0f172a',
    accentHex: '#6366f1',
    badge: 'Dark',
  },
  {
    id: 'forest',
    name: 'Deep Sage',
    tagline: 'Calming dark pine & vibrant emerald',
    bgHex: '#0f2018',
    accentHex: '#10b981',
    badge: 'Nature',
  },
];

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-2 bg-theme-surface hover:bg-theme-elevated text-theme-secondary hover:text-theme-primary border border-theme-border shadow-sm"
        title="Change application visual theme"
      >
        <div className="flex items-center -space-x-1">
          <span
            className="w-3 h-3 rounded-full border border-theme-border shadow-inner"
            style={{ backgroundColor: activeOption.bgHex }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-theme-border"
            style={{ backgroundColor: activeOption.accentHex }}
          />
        </div>
        <span className="hidden sm:inline font-medium">{activeOption.name}</span>
        <Palette className="w-3.5 h-3.5 text-theme-muted" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-theme-elevated border border-theme-border rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-fadeIn">
          <div className="px-2.5 py-1.5 border-b border-theme-border mb-1">
            <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-wider">
              Visual Palette
            </span>
          </div>

          {THEMES.map((theme) => {
            const isSelected = theme.id === currentTheme;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  onThemeChange(theme.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg transition flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-theme-accent-soft text-theme-primary border border-theme-border'
                    : 'hover:bg-theme-surface text-theme-secondary hover:text-theme-primary border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center -space-x-1.5 mt-0.5 shrink-0">
                    <span
                      className="w-4 h-4 rounded-full border border-theme-border shadow-sm"
                      style={{ backgroundColor: theme.bgHex }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-theme-border"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-theme-primary">
                        {theme.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-theme-surface text-theme-muted border border-theme-border">
                        {theme.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-theme-muted leading-tight mt-0.5">
                      {theme.tagline}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
