import { useI18n } from 'vue-i18n';

const coordinateFormat = {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
  useGrouping: false,
};

export function useLocationCoordinates() {
  const { t, n } = useI18n();
  return (latitude: number, longitude: number) =>
    t('locations.coordinates', {
      latitude: n(latitude, coordinateFormat),
      longitude: n(longitude, coordinateFormat),
    });
}
