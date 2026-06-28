import AsyncStorage from '@react-native-async-storage/async-storage';

export const TAP_TO_PAY_BUTTON_LABEL = 'Tap to Pay on iPhone';

export const STORAGE_KEYS = {
  educationCompleted: '@styld/tap_to_pay/education_completed',
  splashSeen: '@styld/tap_to_pay/splash_seen',
  announcePushSent: '@styld/tap_to_pay/announce_push_sent',
  onboardingPromptSeen: '@styld/tap_to_pay/onboarding_prompt_seen',
} as const;

export type TapToPaySupportedScheme =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover';

export const SUPPORTED_SCHEMES: TapToPaySupportedScheme[] = [
  'visa',
  'mastercard',
  'amex',
  'discover',
];

export const RECEIPT_METHODS = ['email'] as const;

/** Apple checklist — refund model for Styld */
export const REFUND_MODEL = 'referenced' as const;

export async function readFlag(key: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key)) === 'true';
}

export async function writeFlag(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? 'true' : 'false');
}

/** Requirement 1.4 — surface iOS update guidance for unsupported OS versions. */
export function formatTapToPayError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('osversionnotsupported') ||
    lower.includes('os version not supported') ||
    lower.includes('unsupported os')
  ) {
    return 'Tap to Pay on iPhone requires the latest iOS version. Update your iPhone in Settings → General → Software Update.';
  }
  return message;
}
