import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { TimelineState } from '@/features/orders/models/order';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

export interface TimelineRow {
  status: string;
  label: string;
  state: TimelineState;
  dateLabel: string | null;
  detail: string | null;
}

/** Línea de tiempo "Seguimiento": completado ✓ rojo, actual con anillo, pendiente gris, error ✕. */
export function OrderTimeline({ steps }: { steps: TimelineRow[] }) {
  return (
    <View accessibilityRole="list">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View
            key={`${step.status}-${index}`}
            accessibilityLabel={`${step.label}${step.dateLabel ? `, ${step.dateLabel}` : ''}`}
            accessible
            style={styles.row}>
            <View style={styles.rail}>
              <Dot state={step.state} />
              {isLast ? null : (
                <View style={[styles.line, step.state === 'done' && styles.lineDone]} />
              )}
            </View>
            <View style={[styles.copy, !isLast && styles.copySpacing]}>
              <Text
                style={[
                  styles.label,
                  step.state === 'current' && styles.labelCurrent,
                  step.state === 'pending' && styles.labelPending,
                  step.state === 'error' && styles.labelError,
                ]}>
                {step.label}
              </Text>
              {step.dateLabel ? (
                <Text
                  style={[
                    styles.date,
                    step.state === 'current' && styles.dateCurrent,
                    step.state === 'error' && styles.dateError,
                  ]}>
                  {step.dateLabel}
                </Text>
              ) : null}
              {step.detail ? (
                <View style={styles.detail}>
                  <Text selectable style={styles.detailText}>
                    {step.detail}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Dot({ state }: { state: TimelineState }) {
  if (state === 'done' || state === 'error') {
    return (
      <View style={[styles.dot, state === 'done' ? styles.dotDone : styles.dotError]}>
        <SymbolView
          name={
            state === 'done'
              ? { ios: 'checkmark', android: 'check', web: 'check' }
              : { ios: 'xmark', android: 'close', web: 'close' }
          }
          size={13}
          tintColor={AppColors.neutral.white}
        />
      </View>
    );
  }
  return (
    <View style={[styles.dot, state === 'current' ? styles.dotCurrent : styles.dotPending]}>
      {state === 'current' ? <View style={styles.dotInner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 26, alignItems: 'center' },
  line: { width: 2, flex: 1, minHeight: 18, backgroundColor: AppColors.border.soft },
  lineDone: { backgroundColor: AppColors.brand.primary },
  copy: { flex: 1, gap: 2, paddingTop: 3 },
  copySpacing: { paddingBottom: 16 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: AppColors.brand.primary },
  dotError: { backgroundColor: AppColors.feedback.error },
  dotCurrent: { borderWidth: 2, borderColor: AppColors.brand.primary, backgroundColor: AppColors.surface.default },
  dotPending: { borderWidth: 2, borderColor: AppColors.border.default, backgroundColor: AppColors.surface.default },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.brand.primary },
  label: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  labelCurrent: { fontFamily: AppFonts.emphasis },
  labelPending: { color: AppColors.neutral.placeholder },
  labelError: { color: AppColors.feedback.error, fontFamily: AppFonts.emphasis },
  date: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  dateCurrent: { color: AppColors.brand.primary },
  dateError: { color: AppColors.feedback.error },
  detail: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailText: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
