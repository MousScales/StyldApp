import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

type TimePickerSheetProps = {
  visible: boolean;
  value: Date;
  title?: string;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

export default function TimePickerSheet({
  visible,
  value,
  title = 'Select time',
  onClose,
  onConfirm,
}: TimePickerSheetProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="default"
        is24Hour={false}
        onChange={(event: DateTimePickerEvent, date) => {
          onClose();
          if (event.type === 'dismissed' || !date) return;
          onConfirm(date);
        }}
      />
    );
  }

  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) setDraft(date);
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close time picker" />
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            <Pressable style={styles.toolbarBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.toolbarBtnTextMuted}>Cancel</Text>
            </Pressable>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              style={styles.toolbarBtn}
              onPress={() => onConfirm(draft)}
              hitSlop={8}
            >
              <Text style={styles.toolbarBtnTextDone}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              themeVariant="dark"
              accentColor={colors.accentPink}
              onChange={handleChange}
              style={styles.picker}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BASE_STYLES = {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.cardBorder,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  toolbarTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  toolbarBtn: {
    minWidth: 64,
  },
  toolbarBtnTextMuted: {
    color: colors.textMuted,
    fontSize: 16,
  },
  toolbarBtnTextDone: {
    color: colors.accentPink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  pickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingTop: 4,
    paddingBottom: 8,
  },
  picker: {
    width: '100%',
    height: 216,
  },
};
