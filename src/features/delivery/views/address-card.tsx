import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/ui/icon-tile';
import type { AddressCardItem } from '@/features/delivery/viewmodels/use-addresses-view-model';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

export const PIN_ICON: SymbolViewProps['name'] = {
  ios: 'mappin.and.ellipse',
  android: 'location_on',
  web: 'location_on',
};
const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' };

interface AddressCardProps {
  item: AddressCardItem;
  /** Modo selección (checkout): la tarjeta entera es un radio. */
  selected?: boolean;
  onSelect?: (addressId: string) => void;
  /** Modo administración (Mis direcciones): acciones bajo la dirección. */
  busy?: boolean;
  onEdit?: (addressId: string) => void;
  onRemove?: (addressId: string) => void;
  onMakeDefault?: (addressId: string) => void;
}

/** Tarjeta de dirección de las pantallas 30 y 31. */
export function AddressCard({
  item,
  selected = false,
  onSelect,
  busy = false,
  onEdit,
  onRemove,
  onMakeDefault,
}: AddressCardProps) {
  const selectable = Boolean(onSelect);
  const body = (
    <View style={styles.row}>
      <IconTile icon={PIN_ICON} size={40} iconSize={20} />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          {item.isDefault ? (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>PREDETERMINADA</Text>
            </View>
          ) : null}
        </View>
        {item.contact ? <Text style={styles.contact}>{item.contact}</Text> : null}
        {item.neighborhood ? <Text style={styles.line}>{item.neighborhood}</Text> : null}
        <Text style={styles.line}>{item.city}</Text>
      </View>
      {selectable ? (
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <SymbolView name={CHECK_ICON} size={13} tintColor={AppColors.neutral.white} /> : null}
        </View>
      ) : null}
    </View>
  );

  if (selectable) {
    return (
      <Pressable
        accessibilityLabel={`${item.title}. ${item.city}`}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
        onPress={() => onSelect?.(item.id)}>
        {body}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, item.isDefault && styles.cardSelected, busy && styles.busy]}>
      {body}
      <View style={styles.actions}>
        {onEdit ? (
          <CardAction
            icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            label="Editar"
            onPress={() => onEdit(item.id)}
          />
        ) : null}
        {onRemove ? (
          <CardAction
            destructive
            disabled={busy}
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            label="Eliminar"
            onPress={() => onRemove(item.id)}
          />
        ) : null}
        {onMakeDefault && !item.isDefault ? (
          <CardAction
            disabled={busy}
            icon={{ ios: 'star', android: 'star', web: 'star' }}
            label="Hacer predeterminada"
            onPress={() => onMakeDefault(item.id)}
          />
        ) : null}
      </View>
    </View>
  );
}

interface CardActionProps {
  icon: SymbolViewProps['name'];
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function CardAction({ icon, label, destructive = false, disabled = false, onPress }: CardActionProps) {
  const color = destructive ? AppColors.feedback.error : AppColors.neutral.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.action, destructive && styles.actionDestructive, pressed && styles.pressed]}
      onPress={onPress}>
      <SymbolView name={icon} size={14} tintColor={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
  cardSelected: { borderColor: AppColors.brand.primary },
  busy: { opacity: 0.6 },
  pressed: { opacity: 0.82 },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  titleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: {
    flexShrink: 1,
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: 15,
    lineHeight: 20,
  },
  defaultBadge: {
    borderRadius: 6,
    backgroundColor: AppColors.surface.dark,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  contact: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  line: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AppColors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderWidth: 0, backgroundColor: AppColors.brand.primary },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.soft,
    paddingTop: 12,
  },
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionDestructive: { backgroundColor: AppColors.surface.softSelected },
  actionText: { fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
});
