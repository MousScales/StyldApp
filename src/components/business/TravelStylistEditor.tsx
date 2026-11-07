import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AddressAutocompleteField from '../AddressAutocompleteField';
import {
  TravelBookingMode,
  TravelFeeMode,
  TravelStylistSettings,
  travelStylistReady,
} from '../../data/travelStylist';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = {
  settings: TravelStylistSettings;
  onChange: (next: TravelStylistSettings) => void;
  onHomeBaseFocus?: () => void;
};

const FEE_MODES: { id: TravelFeeMode; label: string; subtitle: string }[] = [
  { id: 'flat', label: 'Flat fee', subtitle: 'Same travel fee for every trip (can be $0)' },
  { id: 'per_mile', label: 'Per mile', subtitle: 'Fee based on driving distance (rate can be $0)' },
];

const BOOKING_MODES: { id: TravelBookingMode; label: string; subtitle: string }[] = [
  {
    id: 'optional',
    label: 'Travel add-on',
    subtitle: 'Clients book at your chair or opt in to travel with a checkbox',
  },
  {
    id: 'primary',
    label: 'Travel-only artist',
    subtitle: 'Every booking is at the client\'s address — no travel checkbox on your site',
  },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function TravelStylistEditor({ settings, onChange, onHomeBaseFocus }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const update = (patch: Partial<TravelStylistSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <View style={styles.root}>
      <View style={styles.toggleCard}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>I&apos;m a travel stylist</Text>
          <Text style={styles.toggleBody}>
            Offer appointments at the client&apos;s location. Travel bookings always require your
            approval before they&apos;re confirmed.
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => update({ enabled })}
          trackColor={{ false: colors.progressTrack, true: colors.accentPinkMuted }}
          thumbColor={settings.enabled ? colors.accentPink : colors.textMuted}
        />
      </View>

      {settings.enabled ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking experience</Text>
          {BOOKING_MODES.map((mode) => {
            const selected = settings.bookingMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                style={[styles.modeRow, selected && styles.modeRowSelected]}
                onPress={() => update({ bookingMode: mode.id })}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.modeCopy}>
                  <Text style={styles.modeTitle}>{mode.label}</Text>
                  <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.sectionTitle}>Travel fee</Text>
          {FEE_MODES.map((mode) => {
            const selected = settings.feeMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                style={[styles.modeRow, selected && styles.modeRowSelected]}
                onPress={() => update({ feeMode: mode.id })}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.modeCopy}>
                  <Text style={styles.modeTitle}>{mode.label}</Text>
                  <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}

          {settings.feeMode === 'flat' ? (
            <Field
              label="Flat travel fee"
              value={String(settings.flatFeeUsd)}
              onChangeText={(text) => {
                if (!text.trim()) {
                  update({ flatFeeUsd: 0 });
                  return;
                }
                const parsed = parseFloat(text.replace(/[^0-9.]/g, ''));
                update({
                  flatFeeUsd: Number.isFinite(parsed) ? parsed : 0,
                });
              }}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          ) : (
            <Field
              label="Rate per mile"
              value={String(settings.perMileRateUsd)}
              onChangeText={(text) => {
                if (!text.trim()) {
                  update({ perMileRateUsd: 0 });
                  return;
                }
                const parsed = parseFloat(text.replace(/[^0-9.]/g, ''));
                update({
                  perMileRateUsd: Number.isFinite(parsed) ? parsed : 0,
                });
              }}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          )}
          <Text style={styles.hint}>Set to $0 if you don&apos;t charge a separate travel fee.</Text>

          <AddressAutocompleteField
            label="Home base address"
            value={settings.homeBaseAddress}
            placeholder="Start typing your address…"
            hint="Used to calculate travel distance and fees on your booking form."
            onManualChange={(homeBaseAddress) =>
              update({ homeBaseAddress, homeBaseLat: null, homeBaseLng: null })
            }
            onResolved={({ formattedAddress, lat, lng }) =>
              update({
                homeBaseAddress: formattedAddress,
                homeBaseLat: lat,
                homeBaseLng: lng,
              })
            }
            onFocus={onHomeBaseFocus}
          />
          {!travelStylistReady(settings) ? (
            <Text style={styles.warnText}>Add your home base address before travel bookings go live.</Text>
          ) : null}

          <Field
            label="Extra time for travel appointments (minutes)"
            value={String(settings.extraTravelMinutes)}
            onChangeText={(text) => {
              const parsed = parseInt(text.replace(/\D/g, ''), 10);
              update({
                extraTravelMinutes: Number.isFinite(parsed) ? parsed : 0,
              });
            }}
            placeholder="30"
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>
            Added to the booked slot length so you have drive/setup time before and after.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const BASE_STYLES = {
  root: { gap: 16 },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  toggleCopy: { flex: 1, gap: 4 },
  toggleTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  toggleBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  section: { gap: 12 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  modeRowSelected: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accentPink },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentPink,
  },
  modeCopy: { flex: 1, gap: 2 },
  modeTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modeSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  field: { gap: 6 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
  },
  inputMultiline: { minHeight: 88, paddingTop: 12 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  warnText: { color: '#f59e0b', fontSize: 13, lineHeight: 18 },
};
