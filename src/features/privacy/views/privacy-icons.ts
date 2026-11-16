import type { SymbolViewProps } from 'expo-symbols';

/** Íconos de las secciones de "Mis datos y privacidad". */
export const PRIVACY_ICONS = {
  access: { ios: 'person.text.rectangle', android: 'badge', web: 'badge' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  notice: { ios: 'doc.text', android: 'description', web: 'description' },
  optOut: { ios: 'hand.raised', android: 'do_not_disturb_on', web: 'do_not_disturb_on' },
  cancel: { ios: 'person.crop.circle.badge.xmark', android: 'person_remove', web: 'person_remove' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} satisfies Record<string, SymbolViewProps['name']>;
