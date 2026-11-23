import type { SupportedTrackExtension, TrackPoint } from '@/services/api';

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
