export const AppColors = {
  brand: {
    primary: '#EF3C33',
    pressed: '#D93028',
  },
  neutral: {
    black: '#101010',
    text: '#1A1A1A',
    description: '#555555',
    muted: '#666666',
    mutedOnDark: '#B0B0B0',
    placeholder: '#8A8A8A',
    white: '#FFFFFF',
  },
  surface: {
    default: '#FFFFFF',
    soft: '#FFF6F5',
    softSelected: '#FDE5E2',
    dark: '#101010',
    darkElevated: '#1A1A1A',
    darkSelected: '#2B2B2B',
  },
  overlay: {
    whiteMuted: 'rgba(255, 255, 255, 0.38)',
  },
  border: {
    default: '#C9C6C2',
  },
  feedback: {
    error: '#B42318',
    success: '#16794B',
    successSoft: '#E9F7EF',
  },
} as const;

export const AppFonts = {
  display: 'BebasNeue_400Regular',
  body: 'Manrope_400Regular',
  label: 'Manrope_600SemiBold',
  button: 'Manrope_700Bold',
  emphasis: 'Manrope_800ExtraBold',
} as const;

export const AppFontSizes = {
  hero: 40,
  title: 32,
  sectionTitle: 28,
  body: 16,
  label: 14,
  button: 16,
  caption: 12,
} as const;

export const AppSpacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
