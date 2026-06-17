import { createGlobalTheme } from '@vanilla-extract/css';

// Design tokens — source de vérité de tout le système
// Modifie ces valeurs pour changer l'identité visuelle globalement.
export const vars = createGlobalTheme(':root', {
  color: {
    brand:      '#6366f1',
    brandHover: '#4f46e5',
    brandSubtle:'#6366f115',
    bg:         '#09090b',
    surface:    '#18181b',
    surfaceHov: '#27272a',
    border:     '#3f3f46',
    text:       '#fafafa',
    muted:      '#a1a1aa',
    dim:        '#52525b',
    success:    '#22c55e',
    danger:     '#ef4444',
    warning:    '#f59e0b',
  },
  space: {
    '1': '4px',  '2': '8px',  '3': '12px',
    '4': '16px', '5': '20px', '6': '24px',
    '8': '32px', '10': '40px','12': '48px',
  },
  radius: {
    sm: '4px', md: '8px', lg: '12px',
    xl: '16px', full: '9999px',
  },
  font: {
    sans: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
    size: {
      xs: '11px', sm: '13px', base: '15px',
      lg: '18px', xl: '22px', '2xl': '30px',
    },
    weight: {
      normal: '400', medium: '500',
      semi: '600',   bold: '700',
    },
  },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,.5)',
    md: '0 4px 16px rgba(0,0,0,.6)',
    lg: '0 12px 40px rgba(0,0,0,.7)',
  },
  transition: {
    fast: '100ms ease',
    base: '150ms ease',
  },
});
