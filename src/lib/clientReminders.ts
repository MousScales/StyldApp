import {
  ClientReminderSettings,
  DEFAULT_CLIENT_REMINDER_SETTINGS,
  normalizeClientReminderSettings,
} from '../data/clientReminders';
import { loadSiteSetting, saveSiteSetting } from './siteRecords';

export const CLIENT_REMINDER_SETTINGS_KEY = 'client_reminder_settings';

export async function loadClientReminderSettings(userId: string): Promise<ClientReminderSettings> {
  return loadSiteSetting(
    userId,
    CLIENT_REMINDER_SETTINGS_KEY,
    normalizeClientReminderSettings,
    DEFAULT_CLIENT_REMINDER_SETTINGS,
  );
}

export async function saveClientReminderSettings(
  userId: string,
  settings: ClientReminderSettings,
): Promise<void> {
  await saveSiteSetting(userId, CLIENT_REMINDER_SETTINGS_KEY, settings);
}

export { DEFAULT_CLIENT_REMINDER_SETTINGS };
