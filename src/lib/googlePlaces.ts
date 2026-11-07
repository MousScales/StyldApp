const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

export function googlePlacesConfigured(): boolean {
  return API_KEY.length > 0;
}

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

export type ResolvedPlace = {
  formattedAddress: string;
  lat: number;
  lng: number;
};

type AutocompleteResponse = {
  status: string;
  predictions?: { place_id: string; description: string }[];
  error_message?: string;
};

type DetailsResponse = {
  status: string;
  result?: {
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  };
  error_message?: string;
};

export async function fetchAddressSuggestions(query: string): Promise<PlaceSuggestion[]> {
  const input = query.trim();
  if (!API_KEY || input.length < 3) return [];

  const params = new URLSearchParams({
    input,
    key: API_KEY,
    types: 'address',
    components: 'country:us',
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
  );
  const data = (await res.json()) as AutocompleteResponse;

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places autocomplete failed (${data.status})`);
  }

  return (data.predictions ?? []).map((row) => ({
    placeId: row.place_id,
    description: row.description,
  }));
}

export async function resolvePlaceDetails(placeId: string): Promise<ResolvedPlace> {
  if (!API_KEY) throw new Error('Google Maps API key is not configured.');

  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    fields: 'formatted_address,geometry',
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
  );
  const data = (await res.json()) as DetailsResponse;

  if (data.status !== 'OK' || !data.result) {
    throw new Error(data.error_message || `Place details failed (${data.status})`);
  }

  const formattedAddress = String(data.result.formatted_address ?? '').trim();
  const lat = data.result.geometry?.location?.lat;
  const lng = data.result.geometry?.location?.lng;

  if (!formattedAddress || typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Could not resolve a full address for this place.');
  }

  return { formattedAddress, lat, lng };
}
