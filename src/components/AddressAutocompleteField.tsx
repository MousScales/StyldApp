import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  fetchAddressSuggestions,
  googlePlacesConfigured,
  resolvePlaceDetails,
  type PlaceSuggestion,
} from '../lib/googlePlaces';
import { colors } from '../theme';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onResolved: (result: { formattedAddress: string; lat: number; lng: number }) => void;
  onManualChange?: (text: string) => void;
  onFocus?: () => void;
  hint?: string;
};

export default function AddressAutocompleteField({
  label,
  value,
  placeholder,
  onResolved,
  onManualChange,
  onFocus,
  hint,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const configured = googlePlacesConfigured();
  const fieldRef = useRef<View>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = (text: string) => {
    if (!configured) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (text.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAddressSuggestions(text);
        setSuggestions(rows);
        setOpen(rows.length > 0);
      } catch (err) {
        setSuggestions([]);
        setOpen(false);
        setError(err instanceof Error ? err.message : 'Address lookup failed.');
      } finally {
        setLoading(false);
      }
    }, 320);
  };

  const handleChange = (text: string) => {
    setQuery(text);
    onManualChange?.(text);
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    runSearch(text);
  };

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    skipNextFetchRef.current = true;
    setOpen(false);
    setSuggestions([]);
    setLoading(true);
    setError(null);
    try {
      const resolved = await resolvePlaceDetails(suggestion.placeId);
      setQuery(resolved.formattedAddress);
      onResolved(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load address details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = () => {
    onFocus?.();
    if (suggestions.length > 0) setOpen(true);
  };

  return (
    <View style={styles.field} ref={fieldRef} collapsable={false}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          returnKeyType="done"
          blurOnSubmit
        />
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator size="small" color={colors.accentPink} />
          </View>
        ) : null}
      </View>

      {open && suggestions.length > 0 ? (
        <ScrollView
          style={styles.dropdown}
          contentContainerStyle={styles.dropdownContent}
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
        >
          {suggestions.map((row) => (
            <Pressable
              key={row.placeId}
              style={styles.suggestionRow}
              onPress={() => void handleSelect(row)}
            >
              <Text style={styles.suggestionText}>{row.description}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {!configured ? (
        <Text style={styles.warnText}>
          Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable address suggestions. You can still type an
          address manually.
        </Text>
      ) : null}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const BASE_STYLES = {
  field: { gap: 6 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputWrap: { position: 'relative' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    paddingRight: 40,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    backgroundColor: colors.card,
    minHeight: 48,
  },
  spinner: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  dropdown: {
    maxHeight: 168,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  dropdownContent: {
    flexGrow: 0,
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  suggestionText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  warnText: { color: '#f59e0b', fontSize: 13, lineHeight: 18 },
  errorText: { color: '#dc2626', fontSize: 13, lineHeight: 18 },
};
