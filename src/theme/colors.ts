export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  danger: '#DC2626',
  success: '#059669',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B'
} as const;

export type ColorName = keyof typeof colors;
