import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useSiteContent } from '../context/SiteContentContext';
import { LOCATION_PARTS, LocationPart } from '../data/siteContent';
import {
  patchSocialLinks,
  SOCIAL_PLATFORMS,
  type SocialPlatformConfig,
} from '../data/socialLinks';
import { SiteStackParamList } from '../navigation/SiteNavigator';
import { colors } from '../theme';

type Props = NativeStackScreenProps<SiteStackParamList, 'HeroVisitPart'>;

const PART_HINTS: Record<LocationPart, string> = {
  address: 'Your studio or salon address shown on the Visit section of your site.',
  map: 'Paste a Google Maps embed link, or leave blank to use your saved address.',
  contact: 'Phone and email clients can use to reach you.',
  social: 'Add handles or profile links for the platforms you use. Only filled profiles show on your site.',
};

function partMeta(part: LocationPart) {
  return LOCATION_PARTS.find((row) => row.id === part) ?? LOCATION_PARTS[0];
}

function SocialField({
  platform,
  value,
  onChangeText,
  styles,
}: {
  platform: SocialPlatformConfig;
  value: string;
  onChangeText: (value: string) => void;
  styles: ReturnType<typeof useResponsiveStyles<typeof BASE_STYLES>>;
}) {
  const displayValue =
    platform.inputKind === 'handle' ? value.replace(/^@+/, '') : value;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{platform.label}</Text>
      <View style={styles.socialRow}>
        {platform.prefix ? (
          <View style={styles.socialPrefix}>
            <Ionicons
              name={platform.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.socialPrefixText}>{platform.prefix}</Text>
          </View>
        ) : (
          <View style={styles.socialIconOnly}>
            <Ionicons
              name={platform.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={colors.textMuted}
            />
          </View>
        )}
        <TextInput
          style={styles.socialInput}
          value={displayValue}
          onChangeText={onChangeText}
          placeholder={platform.placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={
            platform.inputKind === 'phone'
              ? 'phone-pad'
              : platform.inputKind === 'url'
                ? 'url'
                : 'default'
          }
        />
      </View>
    </View>
  );
}
function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  styles: ReturnType<typeof useResponsiveStyles<typeof BASE_STYLES>>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
      />
    </View>
  );
}

export default function HeroVisitPartScreen({ navigation, route }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { content, updateContent } = useSiteContent();
  const part = route.params.part;
  const meta = partMeta(part);

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{meta.label}</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.hint}>{PART_HINTS[part]}</Text>

            {part === 'address' ? (
              <>
                <Field
                  label="Address line 1"
                  value={content.addressLine1}
                  onChangeText={(addressLine1) => updateContent({ addressLine1 })}
                  styles={styles}
                />
                <Field
                  label="Address line 2"
                  value={content.addressLine2}
                  onChangeText={(addressLine2) => updateContent({ addressLine2 })}
                  styles={styles}
                />
                <Field
                  label="City"
                  value={content.city}
                  onChangeText={(city) => updateContent({ city })}
                  styles={styles}
                />
                <Field
                  label="State"
                  value={content.state}
                  onChangeText={(state) => updateContent({ state })}
                  styles={styles}
                />
                <Field
                  label="ZIP"
                  value={content.zip}
                  onChangeText={(zip) => updateContent({ zip })}
                  styles={styles}
                />
                <Field
                  label="Timezone"
                  value={content.timezone}
                  onChangeText={(timezone) => updateContent({ timezone })}
                  placeholder="America/New_York"
                  styles={styles}
                />
              </>
            ) : null}

            {part === 'map' ? (
              <Field
                label="Google Maps embed URL"
                value={content.mapEmbedUrl}
                onChangeText={(mapEmbedUrl) => updateContent({ mapEmbedUrl })}
                placeholder="Paste your Google Maps embed link"
                multiline
                styles={styles}
              />
            ) : null}

            {part === 'contact' ? (
              <>
                <Field
                  label="Phone (display)"
                  value={content.phoneDisplay}
                  onChangeText={(phoneDisplay) => updateContent({ phoneDisplay })}
                  placeholder="(555) 123-4567"
                  styles={styles}
                />
                <Field
                  label="Phone (tel link)"
                  value={content.phoneTel}
                  onChangeText={(phoneTel) => updateContent({ phoneTel })}
                  placeholder="+15551234567"
                  styles={styles}
                />
                <Field
                  label="Email"
                  value={content.email}
                  onChangeText={(email) => updateContent({ email })}
                  placeholder="hello@yourstudio.com"
                  styles={styles}
                />
              </>
            ) : null}

            {part === 'social'
              ? SOCIAL_PLATFORMS.map((platform) => (
                  <SocialField
                    key={platform.id}
                    platform={platform}
                    value={content.socialLinks[platform.id]}
                    onChangeText={(value) =>
                      updateContent(patchSocialLinks(content.socialLinks, platform.id, value))
                    }
                    styles={styles}
                  />
                ))
              : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 60,
    gap: 4,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 8,
  },
  socialPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 4,
    minWidth: 42,
  },
  socialPrefixText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  socialIconOnly: {
    width: 42,
    alignItems: 'center',
    paddingRight: 4,
  },
  socialInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 4,
  },
};
