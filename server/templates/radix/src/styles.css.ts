import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { vars } from './tokens.css.js';

// ── Reset global ─────────────────────────────────────────
globalStyle('*, *::before, *::after', { boxSizing: 'border-box', margin: 0, padding: 0 });
globalStyle('body', {
  background: vars.color.bg,
  color: vars.color.text,
  fontFamily: vars.font.sans,
  fontSize: vars.font.size.base,
  lineHeight: '1.5',
  WebkitFontSmoothing: 'antialiased',
});
globalStyle('button', { fontFamily: 'inherit' });
globalStyle('input', { fontFamily: 'inherit' });

// ── Mise en page ─────────────────────────────────────────
export const wrap = style({
  maxWidth: 900,
  margin: '0 auto',
  padding: `${vars.space['10']} ${vars.space['6']}`,
});
export const row = style({ display: 'flex', alignItems: 'center', gap: vars.space['2'] });
export const between = style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
export const grid2 = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: vars.space['4'],
});

// ── Typographie ──────────────────────────────────────────
export const pageTitle = style({ fontSize: vars.font.size['2xl'], fontWeight: vars.font.weight.bold, lineHeight: '1.2' });
export const pageSub = style({ fontSize: vars.font.size.sm, color: vars.color.muted, marginTop: vars.space['1'] });
export const sectionTitle = style({ fontSize: vars.font.size.lg, fontWeight: vars.font.weight.semi });
export const label = style({
  display: 'block',
  fontSize: vars.font.size.xs, fontWeight: vars.font.weight.medium,
  color: vars.color.muted, textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: vars.space['2'],
});
export const mutedText = style({ fontSize: vars.font.size.sm, color: vars.color.muted });
export const codeToken = style({
  fontFamily: vars.font.mono, fontSize: vars.font.size.xs,
  background: vars.color.surface, border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm, padding: `1px 6px`, color: vars.color.brand,
});

// ── Bouton ────────────────────────────────────────────────
const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: vars.space['1'],
  padding: `${vars.space['2']} ${vars.space['4']}`,
  borderRadius: vars.radius.md, border: 'none',
  fontSize: vars.font.size.sm, fontWeight: vars.font.weight.medium,
  cursor: 'pointer', transition: `all ${vars.transition.fast}`,
  lineHeight: '1',
} as const;

export const btn = styleVariants({
  primary: {
    ...btnBase,
    background: vars.color.brand, color: '#fff',
    ':hover': { background: vars.color.brandHover },
  },
  ghost: {
    ...btnBase,
    background: 'transparent', color: vars.color.text,
    border: `1px solid ${vars.color.border}`,
    ':hover': { background: vars.color.surfaceHov },
  },
  danger: {
    ...btnBase,
    background: `${vars.color.danger}20`, color: vars.color.danger,
    border: `1px solid ${vars.color.danger}40`,
    ':hover': { background: `${vars.color.danger}35` },
  },
  icon: {
    ...btnBase,
    padding: vars.space['2'], background: 'transparent',
    color: vars.color.muted,
    ':hover': { background: vars.color.surfaceHov, color: vars.color.text },
  },
});

// ── Input ─────────────────────────────────────────────────
export const input = style({
  width: '100%',
  padding: `${vars.space['2']} ${vars.space['3']}`,
  background: vars.color.bg,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.text,
  fontSize: vars.font.size.sm,
  outline: 'none',
  transition: `border-color ${vars.transition.fast}`,
  ':focus': { borderColor: vars.color.brand },
  '::placeholder': { color: vars.color.dim },
});

// ── Card ──────────────────────────────────────────────────
export const card = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space['4'],
  boxShadow: vars.shadow.sm,
});

// ── Badge ─────────────────────────────────────────────────
export const badge = styleVariants({
  brand: {
    display: 'inline-flex', padding: `2px ${vars.space['2']}`,
    background: vars.color.brandSubtle, color: vars.color.brand,
    borderRadius: vars.radius.full, fontSize: vars.font.size.xs,
    fontWeight: vars.font.weight.medium,
  },
  success: {
    display: 'inline-flex', padding: `2px ${vars.space['2']}`,
    background: `${vars.color.success}18`, color: vars.color.success,
    borderRadius: vars.radius.full, fontSize: vars.font.size.xs,
    fontWeight: vars.font.weight.medium,
  },
  muted: {
    display: 'inline-flex', padding: `2px ${vars.space['2']}`,
    background: `${vars.color.muted}18`, color: vars.color.muted,
    borderRadius: vars.radius.full, fontSize: vars.font.size.xs,
    fontWeight: vars.font.weight.medium,
  },
});

// ── Avatar ────────────────────────────────────────────────
export const avatar = style({
  width: 38, height: 38, borderRadius: vars.radius.full,
  background: vars.color.brand, color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: vars.font.size.sm, fontWeight: vars.font.weight.semi,
  flexShrink: 0, userSelect: 'none',
});

// ── Tabs Radix ────────────────────────────────────────────
export const tabsList = style({
  display: 'flex', gap: vars.space['1'],
  borderBottom: `1px solid ${vars.color.border}`,
  marginBottom: vars.space['6'],
});
export const tabTrigger = style({
  padding: `${vars.space['2']} ${vars.space['4']}`,
  background: 'transparent', border: 'none',
  borderBottom: '2px solid transparent',
  color: vars.color.muted,
  fontSize: vars.font.size.sm, fontWeight: vars.font.weight.medium,
  cursor: 'pointer', transition: `color ${vars.transition.fast}`,
  selectors: {
    '&[data-state="active"]': { color: vars.color.text, borderBottomColor: vars.color.brand },
    '&:hover:not([data-state="active"])': { color: vars.color.text },
  },
});

// ── Dialog Radix ─────────────────────────────────────────
export const overlay = style({
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,.75)',
  backdropFilter: 'blur(6px)',
  zIndex: 50,
});
export const dialogBox = style({
  position: 'fixed', top: '50%', left: '50%',
  transform: 'translate(-50%,-50%)',
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.xl,
  padding: vars.space['6'],
  width: '90%', maxWidth: 480,
  boxShadow: vars.shadow.lg,
  zIndex: 51,
});
export const dialogTitle = style({
  fontSize: vars.font.size.lg, fontWeight: vars.font.weight.semi,
  marginBottom: vars.space['4'],
});

// ── Séparateur Radix ─────────────────────────────────────
export const sep = style({
  height: 1, background: vars.color.border,
  margin: `${vars.space['5']} 0`,
});

// ── Token swatch (page Tokens) ────────────────────────────
export const swatchGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: vars.space['3'],
});
export const swatch = style({
  display: 'flex', flexDirection: 'column', gap: vars.space['2'],
});
export const swatchDot = style({
  width: '100%', height: 40,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
});
