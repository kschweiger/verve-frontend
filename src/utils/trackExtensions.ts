import type { SupportedTrackExtension, TrackPoint } from '@/services/api';

export const trackExtensionLabels: Record<SupportedTrackExtension, string> = {
  heartrate: 'Heart Rate',
  power: 'Power',
  cadence: 'Cadence',
};

const trackExtensionFields: Record<SupportedTrackExtension, keyof TrackPoint> = {
  heartrate: 'hr',
  power: 'power',
  cadence: 'cad',
};

export function getAvailableTrackExtensions(trackData: TrackPoint[]): SupportedTrackExtension[] {
  return (Object.keys(trackExtensionFields) as SupportedTrackExtension[]).filter((extension) => {
    const field = trackExtensionFields[extension];
    return trackData.some((point) => point[field] !== null && point[field] !== undefined);
  });
}
