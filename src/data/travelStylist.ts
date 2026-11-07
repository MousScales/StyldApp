export type TravelFeeMode = 'flat' | 'per_mile';

/** optional = travel checkbox on form; primary = every booking is at the client's location */
export type TravelBookingMode = 'optional' | 'primary';

export type TravelStylistSettings = {
  /** When true, clients can request travel-to-them on the booking form. */
  enabled: boolean;
  /** How travel appears on the booking form. */
  bookingMode: TravelBookingMode;
  feeMode: TravelFeeMode;
  /** Used when feeMode is flat */
  flatFeeUsd: number;
  /** Used when feeMode is per_mile */
  perMileRateUsd: number;
  /** Home base address used to calculate travel distance */
  homeBaseAddress: string;
  homeBaseLat: number | null;
  homeBaseLng: number | null;
  /** Extra minutes added to appointment duration for travel bookings */
  extraTravelMinutes: number;
};

export const DEFAULT_TRAVEL_STYLIST: TravelStylistSettings = {
  enabled: false,
  bookingMode: 'optional',
  feeMode: 'flat',
  flatFeeUsd: 25,
  perMileRateUsd: 2,
  homeBaseAddress: '',
  homeBaseLat: null,
  homeBaseLng: null,
  extraTravelMinutes: 30,
};

export function computeTravelFeeUsd(
  settings: TravelStylistSettings,
  distanceMiles: number,
): number {
  if (!settings.enabled) return 0;
  if (settings.feeMode === 'flat') {
    return Math.max(0, Math.round(settings.flatFeeUsd * 100) / 100);
  }
  const miles = Math.max(0, distanceMiles);
  return Math.max(0, Math.round(miles * settings.perMileRateUsd * 100) / 100);
}

export function normalizeTravelStylist(value: unknown): TravelStylistSettings {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const feeMode: TravelFeeMode =
    source.feeMode === 'per_mile' ? 'per_mile' : 'flat';

  const bookingMode: TravelBookingMode =
    source.bookingMode === 'primary' ? 'primary' : 'optional';

  let flatFeeUsd =
    typeof source.flatFeeUsd === 'number' && Number.isFinite(source.flatFeeUsd)
      ? source.flatFeeUsd
      : DEFAULT_TRAVEL_STYLIST.flatFeeUsd;
  flatFeeUsd = Math.max(0, Math.round(flatFeeUsd * 100) / 100);

  let perMileRateUsd =
    typeof source.perMileRateUsd === 'number' && Number.isFinite(source.perMileRateUsd)
      ? source.perMileRateUsd
      : DEFAULT_TRAVEL_STYLIST.perMileRateUsd;
  perMileRateUsd = Math.max(0, Math.round(perMileRateUsd * 100) / 100);

  const homeBaseAddress =
    typeof source.homeBaseAddress === 'string' ? source.homeBaseAddress.trim() : '';

  const homeBaseLat =
    typeof source.homeBaseLat === 'number' && Number.isFinite(source.homeBaseLat)
      ? source.homeBaseLat
      : null;
  const homeBaseLng =
    typeof source.homeBaseLng === 'number' && Number.isFinite(source.homeBaseLng)
      ? source.homeBaseLng
      : null;

  let extraTravelMinutes =
    typeof source.extraTravelMinutes === 'number' && Number.isFinite(source.extraTravelMinutes)
      ? Math.round(source.extraTravelMinutes)
      : DEFAULT_TRAVEL_STYLIST.extraTravelMinutes;
  extraTravelMinutes = Math.min(480, Math.max(0, extraTravelMinutes));

  return {
    enabled: source.enabled === true,
    bookingMode,
    feeMode,
    flatFeeUsd,
    perMileRateUsd,
    homeBaseAddress,
    homeBaseLat,
    homeBaseLng,
    extraTravelMinutes,
  };
}

export function travelStylistReady(settings: TravelStylistSettings): boolean {
  return settings.enabled && settings.homeBaseAddress.trim().length > 0;
}

export function isPrimaryTravelStylist(settings: TravelStylistSettings): boolean {
  return travelStylistReady(settings) && settings.bookingMode === 'primary';
}
