export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const TIP_PRESETS = [0, 5, 10, 15, 20] as const;

export const TIP_PERCENT_PRESETS = [15, 18, 20, 25] as const;

export function tipFromPercent(serviceTotal: number, percent: number): number {
  if (percent <= 0 || serviceTotal <= 0) return 0;
  return Math.round(serviceTotal * (percent / 100) * 100) / 100;
}
