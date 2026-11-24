<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEquipmentAction } from '@/composables/useEquipmentAction';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{ activityId: string }>();
const equipmentStore = useEquipmentStore();
const { t, n } = useI18n();
const { actionError, runAction } = useEquipmentAction();

// UI State
const addMode = ref<'item' | 'set'>('item');
const selectedEquipmentId = ref<string | null>(null);
const selectedSetId = ref<string | null>(null);

// Computeds
const availableEquipment = computed(() => {
  const assignedIds = new Set(equipmentStore.activityEquipment.map((e) => e.id));
  return equipmentStore.allEquipment.filter((e) => !assignedIds.has(e.id));
});

// We can add any set
const availableSets = computed(() => equipmentStore.equipmentSets);

async function handleAdd() {
  const itemId = selectedEquipmentId.value;
  const setId = selectedSetId.value;
  if (addMode.value === 'item' && itemId) {
    if (!await runAction('addToActivity', () => equipmentStore.addEquipmentToActivity(itemId, props.activityId))) return;
    selectedEquipmentId.value = null;
  } else if (addMode.value === 'set' && setId) {
    if (!await runAction('addSetToActivity', () => equipmentStore.addSetToActivity(setId, props.activityId))) return;
    selectedSetId.value = null;
  }
}

async function handleRemoveSet(setId: string) {
  if (confirm(t('equipment.activity.confirmRemoveSet'))) {
    await runAction('removeSetFromActivity', () => equipmentStore.removeSetFromActivity(setId, props.activityId));
  }
}

onMounted(() => {
  void runAction('load', () => Promise.all([
    equipmentStore.fetchEquipmentForActivity(props.activityId),
    equipmentStore.fetchAllEquipment(),
    equipmentStore.fetchAllSets(),
  ]));
});
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <h3 class="text-xl font-bold text-verve-brown mb-4">{{ t('equipment.activity.title') }}</h3>

    <!-- Assigned List -->
    <div v-if="equipmentStore.activityEquipment.length > 0" class="space-y-2 mb-6">
      <div v-for="item in equipmentStore.activityEquipment" :key="item.id"
        class="flex justify-between items-center bg-white p-3 rounded-xl border border-verve-medium/20 hover:bg-verve-light/20 transition-colors">
        <div>
          <p class="font-bold text-sm text-verve-brown">{{ item.name }}</p>
          <p class="text-xs text-verve-brown/60">{{ item.brand }} {{ item.model }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="text-xs font-medium bg-verve-light text-verve-brown/80 px-2.5 py-1 rounded-lg border border-verve-medium/20">
            {{ t(`equipment.types.${item.equipment_type}`) }}
          </span>
          <button
            type="button"
            :aria-label="t('equipment.removeNamed', { name: item.name })"
            @click="runAction('removeFromActivity', () => equipmentStore.removeEquipmentFromActivity(item.id, activityId))"
            class="text-red-500 hover:text-red-700 text-sm font-medium transition-colors cursor-pointer">
            {{ t('equipment.remove') }}
          </button>
        </div>
      </div>
    </div>
    <p v-else
      class="text-sm text-verve-brown/50 mb-6 italic text-center py-4 bg-verve-light/10 rounded-xl border border-dashed border-verve-medium/30">
      {{ t('equipment.activity.empty') }}
    </p>

    <!-- Add Section -->
    <div class="border-t border-verve-medium/30 pt-4">
      <!-- Radio Toggle -->
      <fieldset class="mb-4 text-sm">
        <legend class="text-sm font-bold text-verve-brown mb-3">{{ t('equipment.activity.addGear') }}</legend>
        <div class="flex gap-6">
          <label class="flex items-center cursor-pointer group">
            <input type="radio" v-model="addMode" value="item"
              class="mr-2 text-verve-dark focus:ring-verve-dark border-verve-medium" />
            <span :class="addMode === 'item'
                ? 'text-verve-brown font-bold'
                : 'text-verve-brown/70 group-hover:text-verve-brown'
              ">{{ t('equipment.activity.singleItem') }}</span>
          </label>
          <label class="flex items-center cursor-pointer group">
            <input type="radio" v-model="addMode" value="set"
              class="mr-2 text-verve-dark focus:ring-verve-dark border-verve-medium" />
            <span :class="addMode === 'set'
                ? 'text-verve-brown font-bold'
                : 'text-verve-brown/70 group-hover:text-verve-brown'
              ">{{ t('equipment.activity.entireSet') }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Controls -->
      <div class="flex gap-3">
        <select v-if="addMode === 'item'" v-model="selectedEquipmentId" :aria-label="t('equipment.selectItem')"
          class="grow border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white py-2">
          <option :value="null">{{ t('equipment.selectItem') }}</option>
          <option v-for="item in availableEquipment" :key="item.id" :value="item.id">
            {{ item.name }} ({{ t(`equipment.types.${item.equipment_type}`) }})
          </option>
        </select>

        <select v-else v-model="selectedSetId" :aria-label="t('equipment.activity.selectSet')"
          class="grow border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white py-2">
          <option :value="null">{{ t('equipment.activity.selectSet') }}</option>
          <option v-for="set in availableSets" :key="set.id" :value="set.id">
            {{ t('equipment.activity.setOption', {
              name: set.name,
              formattedCount: n(set.items.length),
            }, set.items.length) }}
          </option>
        </select>

        <button type="button" @click="handleAdd" :disabled="addMode === 'item' ? !selectedEquipmentId : !selectedSetId"
          class="px-5 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl text-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-verve-dark/5">
          {{ t('equipment.add') }}
        </button>
      </div>

      <!-- Quick Remove Set Helper -->
      <div v-if="addMode === 'set' && selectedSetId" class="mt-3 text-right">
        <button type="button" @click="handleRemoveSet(selectedSetId)"
          class="text-xs text-red-500 hover:text-red-700 hover:underline font-medium transition-colors cursor-pointer">
          {{ t('equipment.activity.removeSet') }}
        </button>
      </div>
      <p v-if="actionError" role="alert" class="mt-4 text-sm text-red-700">
        {{ t(`equipment.errors.${actionError.key}`) }} {{ actionError.detail }}
      </p>
    </div>
  </div>
</template>
