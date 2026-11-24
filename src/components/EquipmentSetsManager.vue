<script setup lang="ts">
import { useEquipmentAction } from '@/composables/useEquipmentAction';
import { useSubTypes } from '@/composables/useSubTypes';
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEquipmentStore } from '@/stores/equipment';
import { useTypeStore } from '@/stores/types';

const equipmentStore = useEquipmentStore();
const typeStore = useTypeStore();
const { t, n } = useI18n();
const { actionError, runAction } = useEquipmentAction();

// --- UI State ---
const showCreateModal = ref(false);
const newSetName = ref('');
const expandedSetId = ref<string | null>(null);

// State for "Add Item to Set"
const selectedEquipmentIdToAdd = ref<string | null>(null);

// State for "Set Defaults" Modal
const configuringDefaultSetId = ref<string | null>(null);
const defaultTypeId = ref<number | null>(null);
const defaultSubTypeId = ref<number | null>(null);

onMounted(() => {
  void runAction('load', () => Promise.all([
    equipmentStore.fetchAllSets(),
    equipmentStore.fetchAllEquipment(),
    typeStore.fetchActivityTypes(),
  ]));
});

// --- Computed Helpers ---
const getEquipmentName = (id: string) => {
  const item = equipmentStore.allEquipment.find((e) => e.id === id);
  return item ? item.name : t('equipment.set.unknownItem');
};

const getAvailableItemsForSet = (currentSetItems: string[]) => {
  const setIds = new Set(currentSetItems);
  return equipmentStore.allEquipment.filter((e) => !setIds.has(e.id));
};

const availableSubTypes = useSubTypes(
  () => typeStore.activityTypes,
  defaultTypeId,
  defaultSubTypeId
);

// --- Actions ---
async function handleCreate() {
  if (!newSetName.value.trim()) return;
  if (!await runAction('createSet', () => equipmentStore.createSet(newSetName.value))) return;
  newSetName.value = '';
  showCreateModal.value = false;
}

async function handleAddItem(setId: string) {
  const itemId = selectedEquipmentIdToAdd.value;
  if (!itemId) return;
  if (!await runAction('addToSet', () => equipmentStore.addEquipmentToSet(setId, itemId))) return;
  selectedEquipmentIdToAdd.value = null;
}

function openDefaultModal(setId: string) {
  configuringDefaultSetId.value = setId;
  defaultTypeId.value = null;
  defaultSubTypeId.value = null;
}

async function handleSaveDefault() {
  const setId = configuringDefaultSetId.value;
  const typeId = defaultTypeId.value;
  if (!setId || !typeId) return;
  if (!await runAction('saveDefault', () => equipmentStore.setDefaultSet(setId, typeId, defaultSubTypeId.value))) return;
  configuringDefaultSetId.value = null;
  defaultTypeId.value = null;
  defaultSubTypeId.value = null;
  alert(t('equipment.set.defaultSaved'));
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-verve-brown">{{ t('equipment.sets') }}</h2>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all text-sm"
      >
        + {{ t('equipment.set.new') }}
      </button>
    </div>

    <!-- Create Modal (Inline) -->
    <div
      v-if="showCreateModal"
      class="bg-verve-light/20 p-4 rounded-xl border border-verve-medium/30"
    >
      <label for="equipment-set-name" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('equipment.set.name') }}</label>
      <div class="flex gap-2">
        <input
          id="equipment-set-name"
          v-model="newSetName"
          type="text"
          :placeholder="t('equipment.set.example')"
          class="grow border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
        />
        <button
          @click="handleCreate"
          class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl text-sm shadow-sm hover:brightness-105"
        >
          {{ t('equipment.set.create') }}
        </button>
        <button
          @click="showCreateModal = false"
          class="px-4 py-2 border border-verve-medium/50 bg-white text-verve-brown font-semibold rounded-xl text-sm hover:bg-verve-light"
        >
          {{ t('equipment.cancel') }}
        </button>
      </div>
    </div>

    <p v-if="actionError && !configuringDefaultSetId" role="alert" class="text-sm text-red-700">
      {{ t(`equipment.errors.${actionError.key}`) }} {{ actionError.detail }}
    </p>

    <!-- List of Sets -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="set in equipmentStore.equipmentSets"
        :key="set.id"
        class="bg-white border border-verve-medium/30 rounded-xl shadow-sm overflow-hidden flex flex-col"
      >
        <!-- Card Header -->
        <div
          class="p-4 bg-verve-light/10 border-b border-verve-medium/20 flex justify-between items-center"
        >
          <h3 class="font-bold text-verve-brown truncate" :title="set.name">{{ set.name }}</h3>
          <div class="flex items-center gap-2">
            <button
              @click="openDefaultModal(set.id)"
              class="text-xs text-verve-brown/60 hover:text-verve-brown font-bold uppercase tracking-wide transition-colors"
              :title="t('equipment.set.configureDefaults', { name: set.name })"
              :aria-label="t('equipment.set.configureDefaults', { name: set.name })"
            >
              ★ {{ t('equipment.set.defaults') }}
            </button>
            <div class="h-3 w-px bg-verve-medium/40 mx-1"></div>
            <button
              @click="expandedSetId = expandedSetId === set.id ? null : set.id"
              class="text-xs font-bold text-verve-brown/80 hover:text-verve-orange uppercase tracking-wide transition-colors"
            >
              {{ expandedSetId === set.id ? t('equipment.set.done') : t('equipment.edit') }}
            </button>
            <button
              :aria-label="t('equipment.deleteNamed', { name: set.name })"
              @click="runAction('deleteSet', () => equipmentStore.deleteSet(set.id))"
              class="text-sm text-verve-orange/60 hover:text-verve-orange font-bold ml-2 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        <!-- Items Preview (Collapsed) -->
        <div v-if="expandedSetId !== set.id" class="p-4 text-sm text-verve-brown/70 grow">
          <p v-if="set.items.length === 0" class="italic text-verve-brown/40">{{ t('equipment.set.empty') }}</p>
          <ul v-else class="list-disc list-inside space-y-1">
            <li v-for="itemId in set.items.slice(0, 3)" :key="itemId" class="truncate">
              {{ getEquipmentName(itemId) }}
            </li>
            <li v-if="set.items.length > 3" class="list-none text-xs text-verve-brown/40 mt-1 pl-2">
              {{ t('equipment.set.more', { count: n(set.items.length - 3) }) }}
            </li>
          </ul>
        </div>

        <!-- Expanded View (Edit) -->
        <div v-else class="p-4 bg-white grow flex flex-col">
          <ul class="space-y-2 mb-4 grow">
            <li
              v-for="itemId in set.items"
              :key="itemId"
              class="flex justify-between items-center bg-verve-light/10 p-2 rounded-xl border border-verve-medium/20"
            >
              <span class="text-sm text-verve-brown truncate mr-2">{{
                getEquipmentName(itemId)
              }}</span>
              <button
                :aria-label="t('equipment.removeNamed', { name: getEquipmentName(itemId) })"
                @click="runAction('removeFromSet', () => equipmentStore.removeEquipmentFromSet(set.id, itemId))"
                class="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
              >
                {{ t('equipment.remove') }}
              </button>
            </li>
            <li
              v-if="set.items.length === 0"
              class="text-sm text-verve-brown/40 italic text-center py-2"
            >
              {{ t('equipment.set.empty') }}
            </li>
          </ul>

          <!-- Add Item Control -->
          <div class="mt-auto pt-3 border-t border-verve-medium/20">
            <label for="equipment-set-item" class="block text-xs font-bold text-verve-brown/50 mb-1 uppercase"
              >{{ t('equipment.set.addItem') }}</label
            >
            <div class="flex gap-2">
              <select
                id="equipment-set-item"
                v-model="selectedEquipmentIdToAdd"
                class="grow text-sm border-verve-medium rounded-xl py-1.5 px-2 text-verve-brown focus:ring-verve-dark"
              >
                <option :value="null">{{ t('equipment.selectItem') }}</option>
                <option
                  v-for="item in getAvailableItemsForSet(set.items)"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </option>
              </select>
              <button
                @click="handleAddItem(set.id)"
                :disabled="!selectedEquipmentIdToAdd"
                class="px-3 py-1.5 bg-verve-neon text-verve-brown rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {{ t('equipment.add') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Default Configuration Modal -->
    <div
      v-if="configuringDefaultSetId"
      role="dialog"
      aria-modal="true"
      aria-labelledby="equipment-default-heading"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-verve-medium/30">
        <h3 id="equipment-default-heading" class="text-lg font-bold text-verve-brown mb-2">{{ t('equipment.set.configureDefault') }}</h3>
        <p class="text-sm text-verve-brown/60 mb-4">
          {{ t('equipment.set.defaultExplanation') }}
        </p>

        <div class="space-y-4">
          <div>
            <label for="equipment-default-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
              >{{ t('equipment.set.activityType') }}</label
            >
            <select
              id="equipment-default-type"
              v-model="defaultTypeId"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            >
              <option :value="null">{{ t('equipment.set.selectType') }}</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="equipment-default-subtype" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
              >{{ t('equipment.set.subType') }}</label
            >
            <select
              id="equipment-default-subtype"
              v-model="defaultSubTypeId"
              :disabled="!defaultTypeId"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option :value="null">{{ t('equipment.set.anySubType') }}</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <p v-if="actionError" role="alert" class="mt-4 text-sm text-red-700">
          {{ t(`equipment.errors.${actionError.key}`) }} {{ actionError.detail }}
        </p>

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-verve-medium/30">
          <button
            @click="configuringDefaultSetId = null"
            class="px-4 py-2 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors text-sm"
          >
            {{ t('equipment.cancel') }}
          </button>
          <button
            @click="handleSaveDefault"
            :disabled="!defaultTypeId"
            class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 text-sm"
          >
            {{ t('equipment.set.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
