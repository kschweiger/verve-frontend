import '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createSSRApp, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { mapCollectionListResponse } from '../../src/services/collections';
import { useEquipmentStore } from '../../src/stores/equipment';

const { default: CollectionListItem } = await import(
  '../../src/components/collections/CollectionListItem.vue'
);
const { default: EquipmentView } = await import('../../src/views/EquipmentView.vue');
const originalStorage = globalThis.localStorage;

afterEach(() => {
  globalThis.localStorage = originalStorage;
});

test('collection rows format totals and dates in German while keeping the collection name and link', async () => {
  const [collection] = mapCollectionListResponse({
    data: [{
      id: 'cycling-trip',
      name: 'Cycling trip',
      activity_ids: ['ride'],
      count: 1000,
      distance: 1250.5,
      duration: 'PT2H30M',
      moving_duration: 'PT2H',
      start: '2026-03-10T12:00:00Z',
      end: '2026-03-12T12:00:00Z',
    }],
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/collections/:id',
      name: 'collection-detail',
      component: { render: () => null },
    }],
  });
  const app = createSSRApp({ render: () => h(CollectionListItem, { collection: collection! }) });
  app.use(router).use(createAppI18n('de'));
  await router.push('/collections/cycling-trip');

  const html = await renderToString(app);
  expect(html).toContain('Cycling trip');
  expect(html).toContain('href="/collections/cycling-trip"');
  expect(html).toContain('Aktivitäten');
  expect(html).toContain('März');
  expect(html).toContain('1.000');
  expect(html).toContain('1.250,50');
  expect(html).toContain(new Intl.NumberFormat('de', {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'narrow',
  }).format(30));
});

test('equipment inventory localizes the enum display and action labels while retaining equipment names', async () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  const pinia = createPinia();
  const equipment = useEquipmentStore(pinia);
  equipment.allEquipment = [{
    id: 'ride',
    name: 'Alpine bike',
    equipment_type: 'bike',
    brand: 'Ride Co.',
    model: null,
    description: null,
    purchase_date: null,
  }];
  const html = await renderToString(createSSRApp(EquipmentView).use(pinia).use(createAppI18n('de')));

  expect(html).toContain('Meine Ausrüstung');
  expect(html).toContain('Fahrrad');
  expect(html).toContain('aria-label="Alpine bike bearbeiten"');
  expect(html).toContain('Ride Co.');
  expect(equipment.allEquipment[0]?.equipment_type).toBe('bike');
});
