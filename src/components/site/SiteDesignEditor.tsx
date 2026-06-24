import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSiteContent } from '../../context/SiteContentContext';
import { useSiteTheme } from '../../context/SiteThemeContext';
import { FontFamily, FONT_FAMILY_OPTIONS, getHeroStackAspectRatio, HERO_STACK_IMAGE_FORMAT_OPTIONS, HeroLayout, HeroStackImageFormat, SITE_TEXT_COLOR_FIELDS, SITE_TEXT_COLOR_GROUPS } from '../../data/siteTheme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { legacyPositionFromFocus } from '../../lib/heroImageFocus';
import { pickSiteImageFromLibrary } from '../../lib/pickSiteImage';
import { colors } from '../../theme';
import ColorPicker from './ColorPicker';
import HeroImagePicker from './HeroImagePicker';
import SiteImageCropFrame from './SiteImageCropFrame';
import TextColorFieldRow from './TextColorFieldRow';


function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}


export default function SiteDesignEditor({ section }: { section?: 'style' | 'photos' }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { content, updateContent } = useSiteContent();
  const { theme, updateTheme, uploadHeroImage, uploadLogoImage, removeHeroImage, heroImageUrl, logoImageUrl, isSaving, uploadStackImage, removeStackImage, stackImageUrls } =
    useSiteTheme();
  const [pickingStack, setPickingStack] = useState(false);
  const isCoverLayout = (theme.heroLayout || 'split') === 'cover';

  // ── Photos section ──
  if (section === 'photos') {
    return (
      <View>
        <Text style={styles.groupTitle}>Header style</Text>
        <Text style={styles.helper}>Choose how your main image is displayed at the top of your site.</Text>
        <View style={styles.layoutRow}>
          {([
            { id: 'split', label: 'Split', desc: 'Photo + bio' },
            { id: 'stack', label: 'Stack', desc: 'Photo collage' },
            { id: 'cover', label: 'Full screen', desc: 'Splash + /book page' },
          ] as { id: HeroLayout; label: string; desc: string }[]).map(({ id, label, desc }) => {
            const active = (theme.heroLayout || 'split') === id;
            return (
              <Pressable
                key={id}
                style={[styles.layoutCard, active && styles.layoutCardActive]}
                onPress={() => updateTheme({ heroLayout: id })}
              >
                {id === 'split' ? (
                  <View style={styles.layoutThumb}>
                    <View style={styles.layoutThumbSplit}>
                      <View style={styles.layoutThumbPhoto} />
                      <View style={{ flex: 1, gap: 3 }}>
                        {[80, 100, 70].map((w, i) => (
                          <View key={i} style={[styles.layoutThumbBar, { width: `${w}%` as any }]} />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : id === 'cover' ? (
                  <View style={styles.layoutThumb}>
                    <View style={styles.layoutThumbCover}>
                      <View style={styles.layoutThumbCoverImg} />
                      <View style={styles.layoutThumbCoverLine} />
                      <View style={[styles.layoutThumbCoverLine, { width: '40%' as const }]} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.layoutThumb}>
                    <View style={styles.layoutThumbStack}>
                      {[0, 1, 2].map((i) => (
                        <View key={i} style={[styles.layoutThumbStackImg, { opacity: 1 - i * 0.25 }]} />
                      ))}
                    </View>
                  </View>
                )}
                <Text style={[styles.layoutCardLabel, active && styles.layoutCardLabelActive]}>{label}</Text>
                <Text style={styles.layoutCardDesc}>{desc}</Text>
                {active && <View style={styles.layoutCardCheck}><Ionicons name="checkmark-circle" size={16} color={colors.accentPink} /></View>}
              </Pressable>
            );
          })}
        </View>

        {(theme.heroLayout || 'split') === 'stack' ? (
          <>
            <Text style={styles.groupTitle}>Header images</Text>
            <Text style={styles.helper}>Choose a frame shape, then add photos that match.</Text>
            <View style={styles.stackFormatRow}>
              {HERO_STACK_IMAGE_FORMAT_OPTIONS.map(({ id, label, desc, sizeHint }) => {
                const active = (theme.heroStackImageFormat ?? 'wide') === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.stackFormatCard, active && styles.layoutCardActive]}
                    onPress={() => updateTheme({ heroStackImageFormat: id })}
                  >
                    <View style={styles.layoutThumb}>
                      {id === 'wide' ? (
                        <View style={styles.stackFormatThumbWide} />
                      ) : (
                        <View style={styles.stackFormatThumbTall} />
                      )}
                    </View>
                    <Text style={[styles.layoutCardLabel, active && styles.layoutCardLabelActive]}>{label}</Text>
                    <Text style={styles.layoutCardDesc}>{desc}</Text>
                    <Text style={styles.stackFormatSize}>{sizeHint}</Text>
                    {active ? (
                      <View style={styles.layoutCardCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accentPink} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {(() => {
              const stackFormat: HeroStackImageFormat = theme.heroStackImageFormat ?? 'wide';
              const formatMeta = HERO_STACK_IMAGE_FORMAT_OPTIONS.find((o) => o.id === stackFormat)
                ?? HERO_STACK_IMAGE_FORMAT_OPTIONS[0];
              const stackAspect = getHeroStackAspectRatio(stackFormat);
              return (
                <>
            <View style={styles.stackSizeNote}>
              <Ionicons name="information-circle-outline" size={15} color={colors.accentPink} />
              <Text style={styles.stackSizeNoteText}>
                Best with {stackFormat === 'wide' ? 'wide' : 'tall'} images at{' '}
                <Text style={{ fontWeight: '700' }}>{formatMeta.sizeHint}</Text>
                {stackFormat === 'wide' ? ' (3:1 ratio)' : ' (4:9 ratio)'}.
                {stackFormat === 'wide' ? ' Keep subjects centered.' : ' Great for phone portraits and story-style shots.'}
              </Text>
            </View>
            {stackImageUrls.length > 0 ? (
              <View style={styles.stackPreview}>
                <Text style={styles.stackPreviewLabel}>Preview — drag each image to reposition</Text>
                {stackImageUrls.map((url, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stackPreviewItem,
                      stackFormat === 'tall' && styles.stackPreviewItemTall,
                    ]}
                  >
                    <SiteImageCropFrame
                      imageUri={url}
                      aspectRatio={stackAspect}
                      borderRadius={10}
                      focus={theme.heroStackImageFocus[i] ?? { x: 50, y: 50 }}
                      onFocusChange={(focus) => {
                        const nextFocus = [...(theme.heroStackImageFocus ?? [])];
                        nextFocus[i] = focus;
                        updateTheme({ heroStackImageFocus: nextFocus });
                      }}
                      label=""
                    />
                    <Pressable style={styles.stackRemoveBtn} onPress={() => removeStackImage(i)}>
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </Pressable>
                    <View style={styles.stackPreviewNum}>
                      <Text style={styles.stackPreviewNumText}>{i + 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.stackEmpty}>
                <View style={styles.stackEmptyIconRow}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.stackEmptySlot, { opacity: 1 - i * 0.3 }]}>
                      <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                    </View>
                  ))}
                </View>
                <Text style={styles.stackEmptyText}>No images yet — add some below</Text>
              </View>
            )}
                </>
              );
            })()}
            <Pressable
              style={[styles.stackAddBtn, (isSaving || pickingStack) && { opacity: 0.6 }]}
              disabled={isSaving || pickingStack}
              onPress={async () => {
                const picked = await pickSiteImageFromLibrary('Allow photo access to upload header images.');
                if (!picked) return;
                setPickingStack(true);
                try {
                  await uploadStackImage(picked.uri);
                } catch (err) {
                  Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
                } finally {
                  setPickingStack(false);
                }
              }}
            >
              {pickingStack ? (
                <ActivityIndicator size="small" color={colors.accentPink} />
              ) : (
                <Ionicons name="add" size={22} color={colors.accentPink} />
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.groupTitle}>Hero photo</Text>
            <Text style={styles.helper}>Drag to choose exactly what shows in your site header.</Text>
            <HeroImagePicker
              imageUrl={heroImageUrl}
              busy={isSaving}
              onPick={uploadHeroImage}
              onRemove={removeHeroImage}
              large
              repositionable
              aspectRatio={4 / 5}
              focus={{ x: theme.heroImageFocusX, y: theme.heroImageFocusY }}
              onFocusChange={(focus) =>
                updateTheme({
                  heroImageFocusX: focus.x,
                  heroImageFocusY: focus.y,
                  heroImagePosition: legacyPositionFromFocus(focus),
                })
              }
            />
            {(theme.heroLayout || 'split') === 'cover' ? (
              <Pressable
                style={styles.toggleRow}
                onPress={() => updateTheme({ heroCoverBlur: !theme.heroCoverBlur })}
              >
                <View style={styles.toggleRowBody}>
                  <Text style={styles.toggleRowLabel}>Blur splash background</Text>
                  <Text style={styles.toggleRowSub}>Soft blur behind your name on the full-screen splash</Text>
                </View>
                <View style={[styles.toggleBox, theme.heroCoverBlur && styles.toggleBoxOn]}>
                  {theme.heroCoverBlur ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
              </Pressable>
            ) : null}
          </>
        )}

        <Text style={styles.groupTitle}>Logo</Text>
        <Text style={styles.helper}>Shows in the nav bar next to your brand name.</Text>
        <HeroImagePicker imageUrl={logoImageUrl} busy={isSaving} onPick={uploadLogoImage} />
      </View>
    );
  }

  // ── Style section (default / section === 'style') ──
  return (
    <View>
      {/* ── Font ── */}
      <Text style={styles.groupTitle}>Font</Text>
      <Text style={styles.helper}>Applies to all headings and body text across your site.</Text>
      <View style={styles.fontList}>
        {FONT_FAMILY_OPTIONS.map((opt, idx) => {
          const active = theme.fontFamily === opt.id;
          const isLast = idx === FONT_FAMILY_OPTIONS.length - 1;
          return (
            <Pressable
              key={opt.id}
              style={[styles.fontRow, !isLast && styles.fontRowDivider, active && styles.fontRowActive]}
              onPress={() => updateTheme({ fontFamily: opt.id as FontFamily })}
            >
              <View style={styles.fontRowLeft}>
                <Text style={[styles.fontRowSample, opt.style === 'serif' && styles.fontRowSampleSerif]}>
                  Aa
                </Text>
                <View style={styles.fontRowBody}>
                  <Text style={[styles.fontRowLabel, active && styles.fontRowLabelActive]}>{opt.label}</Text>
                  <Text style={styles.fontRowSub}>{opt.sampleText} · {opt.style}</Text>
                </View>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.accentPink} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Brand palette ── */}
      <Text style={styles.groupTitle}>Brand palette</Text>
      <Text style={styles.helper}>
        Your core colors. Link other site colors to these so everything stays in sync when you update your palette.
      </Text>
      <ColorPicker
        label="Brand accent"
        value={theme.primaryColor}
        presets="primary"
        onChange={(primaryColor) => updateTheme({ primaryColor })}
      />
      <ColorPicker
        label="Main text"
        value={theme.secondaryColor}
        presets="secondary"
        onChange={(secondaryColor) => updateTheme({ secondaryColor })}
      />
      <ColorPicker
        label="Page background"
        value={theme.backgroundColor ?? '#fafafa'}
        presets="background"
        onChange={(backgroundColor) => updateTheme({ backgroundColor })}
      />
      <ColorPicker
        label="Top bar background"
        value={theme.navbarColor ?? '#ffffff'}
        presets="background"
        onChange={(navbarColor) => updateTheme({ navbarColor })}
      />

      {SITE_TEXT_COLOR_GROUPS.map((group) => {
        if (group.coverOnly && !isCoverLayout) return null;
        const fields = SITE_TEXT_COLOR_FIELDS.filter((f) => {
          if (f.group !== group.id) return false;
          if (f.coverOnly && !isCoverLayout) return false;
          return true;
        });
        if (fields.length === 0) return null;

        const subGroups = [...new Set(fields.map((f) => f.subGroup).filter(Boolean))] as string[];

        return (
          <View key={group.id}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.helper}>{group.description}</Text>
            {subGroups.length > 0
              ? subGroups.map((subGroup) => (
                  <View key={subGroup} style={styles.textColorGroup}>
                    <Text style={styles.textColorSubGroupTitle}>{subGroup}</Text>
                    {fields
                      .filter((f) => f.subGroup === subGroup)
                      .map((field) => (
                        <TextColorFieldRow key={field.key} field={field} />
                      ))}
                  </View>
                ))
              : fields.map((field) => <TextColorFieldRow key={field.key} field={field} />)}
          </View>
        );
      })}

      <Text style={styles.groupTitle}>Menu cards</Text>
      <Pressable
        style={styles.toggleRow}
        onPress={() => updateTheme({ styleCardLayout: theme.styleCardLayout === 'outlined' ? 'card' : 'outlined' })}
      >
        <View style={styles.toggleRowBody}>
          <Text style={styles.toggleRowLabel}>Outlined cards</Text>
          <Text style={styles.toggleRowSub}>Adds a border around each service card</Text>
        </View>
        <View style={[styles.toggleBox, theme.styleCardLayout === 'outlined' && styles.toggleBoxOn]}>
          {theme.styleCardLayout === 'outlined' && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </Pressable>
      {theme.styleCardLayout === 'outlined' ? (
        <ColorPicker
          label="Outline color"
          value={theme.cardOutlineColor ?? theme.secondaryColor ?? '#0a0a0a'}
          presets="primary"
          onChange={(cardOutlineColor) => updateTheme({ cardOutlineColor })}
        />
      ) : null}

    </View>
  );
}

const BASE_STYLES = {
  layoutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  layoutCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    padding: 10,
  },
  layoutCardActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  layoutThumb: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
    padding: 6,
    height: 60,
    justifyContent: 'center',
  },
  layoutThumbSplit: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'flex-start',
  },
  layoutThumbPhoto: {
    width: 24,
    height: 34,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
    flexShrink: 0,
  },
  layoutThumbCover: {
    flex: 1,
    height: 42,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
    opacity: 0.25,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 4,
    gap: 3,
  },
  layoutThumbCoverImg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
    opacity: 0.35,
  },
  layoutThumbCoverLine: {
    height: 4,
    width: '55%',
    borderRadius: 2,
    backgroundColor: colors.background,
    opacity: 0.85,
    zIndex: 1,
  },
  layoutThumbCoverOverlay: {
    position: 'absolute',
    inset: 0 as any,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  layoutThumbBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
    width: '70%',
  },
  layoutThumbStack: {
    flex: 1,
    gap: 3,
  },
  layoutThumbStackImg: {
    height: 13,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  layoutCardLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  layoutCardLabelActive: {
    color: colors.accentPink,
  },
  layoutCardDesc: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  layoutCardCheck: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  positionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  positionBtnActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  positionBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  positionBtnLabelActive: {
    color: colors.accentPink,
  },
  // Font picker
  fontList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fontRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  fontRowActive: {
    backgroundColor: colors.accentPinkMuted,
  },
  fontRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fontRowSample: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    width: 38,
    textAlign: 'center',
  },
  fontRowSampleSerif: {
    fontStyle: 'italic',
  },
  fontRowBody: {
    flex: 1,
    gap: 2,
  },
  fontRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  fontRowLabelActive: {
    color: colors.accentPink,
  },
  fontRowSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  helper: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  groupTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  navRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowBody: {
    flex: 1,
    gap: 2,
  },
  navRowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  navRowValue: {
    color: colors.textMuted,
    fontSize: 12,
  },
  layoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  layoutOptionActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  layoutOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutOptionIconActive: {
    backgroundColor: colors.accentPinkSoft,
  },
  layoutOptionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  layoutOptionLabelActive: {
    color: colors.text,
  },
  layoutOptionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 10,
  },
  toggleRowBody: {
    flex: 1,
    gap: 2,
  },
  toggleRowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRowSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxOn: {
    backgroundColor: colors.accentPink,
    borderColor: colors.accentPink,
  },
  textColorGroup: {
    marginBottom: 8,
  },
  textColorSubGroupTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  stackSizeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accentPinkMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  stackFormatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stackFormatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    padding: 10,
    position: 'relative' as const,
  },
  stackFormatThumbWide: {
    width: '100%',
    height: 22,
    borderRadius: 4,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
  },
  stackFormatThumbTall: {
    width: 28,
    height: 52,
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
  },
  stackFormatSize: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  stackSizeNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  stackPreview: {
    marginBottom: 12,
  },
  stackPreviewLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stackPreviewItem: {
    position: 'relative' as const,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
    width: '100%',
  },
  stackPreviewItemTall: {
    alignSelf: 'center',
    maxWidth: 220,
    width: '100%',
  },
  stackPreviewImg: {
    width: '100%',
    aspectRatio: 3,
    resizeMode: 'cover' as const,
  },
  stackRemoveBtn: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
  },
  stackPreviewNum: {
    position: 'absolute' as const,
    bottom: 4,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  stackPreviewNumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  stackEmpty: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stackEmptyIconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stackEmptySlot: {
    width: 48,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackEmptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stackAddBtn: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 10,
  },
};
