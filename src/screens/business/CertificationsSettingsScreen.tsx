import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../../components/ScreenGradient';
import SiteCertificationsEditor from '../../components/site/SiteCertificationsEditor';
import { useSiteContent } from '../../context/SiteContentContext';
import { useSiteTheme } from '../../context/SiteThemeContext';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'CertificationsSettings'>;

export default function CertificationsSettingsScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { content, updateContent } = useSiteContent();
  const {
    certificationMediaUrls,
    uploadCertificationMedia,
    removeCertificationItem,
    updateCertificationCaption,
    isSaving: isSavingTheme,
  } = useSiteTheme();

  const isVisible = !content.hiddenSections.includes('certifications');

  const toggleVisible = () => {
    updateContent({
      hiddenSections: isVisible
        ? [...content.hiddenSections, 'certifications']
        : content.hiddenSections.filter((section) => section !== 'certifications'),
    });
  };

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Certifications</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>Show on your site</Text>
                <Text style={styles.rowBody}>
                  Adds a Certifications tab in your site header so clients can view your licenses
                  and credentials.
                </Text>
              </View>
              <Switch
                value={isVisible}
                onValueChange={toggleVisible}
                trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Page title</Text>
          <TextInput
            style={styles.input}
            value={content.certificationsTitle}
            onChangeText={(certificationsTitle) => updateContent({ certificationsTitle })}
            placeholder="Certifications"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Page blurb</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={content.certificationsBlurb}
            onChangeText={(certificationsBlurb) => updateContent({ certificationsBlurb })}
            placeholder="Licenses, credentials, and professional certifications."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Text style={styles.sectionLabel}>Your certifications</Text>
          <Text style={styles.sectionHint}>
            Upload license or credential images. The full image shows on your site with an optional
            subtitle under each one.
          </Text>

          <SiteCertificationsEditor
            items={certificationMediaUrls}
            busy={isSavingTheme}
            onAddMedia={uploadCertificationMedia}
            onRemoveMedia={removeCertificationItem}
            onUpdateCaption={updateCertificationCaption}
          />
        </ScrollView>
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
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  copy: { flex: 1, gap: 6 },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: -4,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
};
