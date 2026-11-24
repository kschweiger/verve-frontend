import { shallowRef, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Map } from 'leaflet';

export function useMapLabels() {
  const { t } = useI18n();
  const map = shallowRef<Map>();
  watchEffect((onCleanup) => {
    const instance = map.value;
    if (!instance) return;
    const controls = instance.zoomControl?.getContainer();

    for (const [direction, label] of [
      ['in', t('manualEntry.map.zoomIn')],
      ['out', t('manualEntry.map.zoomOut')],
    ]) {
      const button = controls?.querySelector(`.leaflet-control-zoom-${direction}`);
      button?.setAttribute('title', label);
      button?.setAttribute('aria-label', label);
    }

    const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ${t('manualEntry.map.contributors')}`;
    instance.attributionControl?.addAttribution(attribution);
    onCleanup(() => instance.attributionControl?.removeAttribution(attribution));
  });

  return (value: Map) => {
    map.value = value;
  };
}
