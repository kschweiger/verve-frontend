<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  EquipmentSetsRefreshError,
  useEquipmentStore,
  type Equipment,
  type EquipmentType,
  type EquipmentUpdatePayload,
} from '@/stores/equipment';
import { ApiResponseError } from '@/services/authHeaders';
import EquipmentSetsManager from '@/components/EquipmentSetsManager.vue';

const { t, locale } = useI18n();
const equipmentStore = useEquipmentStore();
const activeTab = ref<'items' | 'sets'>('items');

// --- Item Form State ---
interface NewItemState {
  name: string;
  equipment_type: EquipmentType | '';
  brand: string;
  model: string;
  description: string;
  purchase_date: string;
}

const showCreateForm = ref(false);
const editingEquipmentId = ref<string | null>(null);
const isSaving = ref(false);
const deletingEquipmentId = ref<string | null>(null);
const formError = ref<{
  key: 'nameAndType' | 'unavailable' | 'load' | 'create' | 'update' | 'delete' | 'refreshSetsAfterDelete';
  detail?: string;
} | null>(null);
const newEquipment = ref<NewItemState>({
  name: '',
  equipment_type: '',
  brand: '',
  model: '',
  description: '',
  purchase_date: '',
});

async function handleSaveItem() {
  const equipmentType = newEquipment.value.equipment_type;
  if (!newEquipment.value.name.trim() || !equipmentType) {
    formError.value = { key: 'nameAndType' };
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    if (editingEquipmentId.value) {
      const item = equipmentStore.allEquipment.find(
        (candidate) => candidate.id === editingEquipmentId.value
      );
      if (!item) {
        formError.value = { key: 'unavailable' };
        return;
      }
      const draft = newEquipment.value;
      const payload: EquipmentUpdatePayload = {};
      if (draft.name !== item.name) payload.name = draft.name.trim();
      if (draft.equipment_type && draft.equipment_type !== item.equipment_type) {
        payload.equipment_type = draft.equipment_type;
      }
      if (draft.brand !== (item.brand ?? '')) payload.brand = draft.brand || null;
      if (draft.model !== (item.model ?? '')) payload.model = draft.model || null;
      if (draft.description !== (item.description ?? ''))
        payload.description = draft.description || null;
      if (draft.purchase_date !== (item.purchase_date ?? ''))
        payload.purchase_date = draft.purchase_date || null;
      if (Object.keys(payload).length > 0) await equipmentStore.updateEquipment(item.id, payload);
    } else {
      await equipmentStore.createEquipment({
        ...newEquipment.value,
        equipment_type: equipmentType,
        name: newEquipment.value.name.trim(),
        brand: newEquipment.value.brand || null,
        model: newEquipment.value.model || null,
        description: newEquipment.value.description || null,
        purchase_date: newEquipment.value.purchase_date || null,
      });
    }
    closeForm();
  } catch (error) {
    formError.value = {
      key: editingEquipmentId.value ? 'update' : 'create',
      detail: error instanceof ApiResponseError ? error.detail : undefined,
    };
  } finally {
    isSaving.value = false;
  }
}

function openCreateForm() {
  editingEquipmentId.value = null;
  formError.value = null;
  newEquipment.value = {
    name: '',
    equipment_type: equipmentStore.equipmentTypes[0] || '',
    brand: '',
    model: '',
    description: '',
    purchase_date: '',
  };
  showCreateForm.value = true;
}

function openEditForm(item: Equipment) {
  editingEquipmentId.value = item.id;
  formError.value = null;
  newEquipment.value = {
    name: item.name,
    equipment_type: item.equipment_type,
    brand: item.brand ?? '',
    model: item.model ?? '',
    description: item.description ?? '',
    purchase_date: item.purchase_date ?? '',
  };
  showCreateForm.value = true;
}

function closeForm() {
  showCreateForm.value = false;
  editingEquipmentId.value = null;
  formError.value = null;
}

async function handleDeleteItem(item: Equipment) {
  if (!window.confirm(t('equipment.deleteItem', { name: item.name }))) return;
  deletingEquipmentId.value = item.id;
  formError.value = null;
  try {
    await equipmentStore.deleteEquipment(item.id);
    if (editingEquipmentId.value === item.id) closeForm();
  } catch (error) {
    formError.value = {
      key: error instanceof EquipmentSetsRefreshError ? 'refreshSetsAfterDelete' : 'delete',
      detail: error instanceof ApiResponseError ? error.detail : undefined,
    };
  } finally {
    deletingEquipmentId.value = null;
  }
}

onMounted(async () => {
  try {
    await Promise.all([equipmentStore.fetchAllEquipment(), equipmentStore.fetchEquipmentTypes()]);
    const firstType = equipmentStore.equipmentTypes[0];
    if (firstType) {
      newEquipment.value.equipment_type = firstType;
    }
  } catch (error) {
    formError.value = {
      key: 'load',
      detail: error instanceof ApiResponseError ? error.detail : undefined,
    };
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 class="text-3xl font-bold text-verve-brown mb-4 sm:mb-0">{{ t('navigation.myGear') }}</h1>

        <!-- Tab Navigation -->
        <div class="bg-verve-light p-1 rounded-xl flex gap-1 shadow-inner">
          <button
            type="button"
            :aria-pressed="activeTab === 'items'"
            @click="activeTab = 'items'"
            :class="[
              'px-5 py-2 text-sm font-bold rounded-lg transition-all',
              activeTab === 'items'
                ? 'bg-white shadow-sm text-verve-brown'
                : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50',
            ]"
          >
            {{ t('equipment.items') }}
          </button>
          <button
            type="button"
            :aria-pressed="activeTab === 'sets'"
            @click="activeTab = 'sets'"
            :class="[
              'px-5 py-2 text-sm font-bold rounded-lg transition-all',
              activeTab === 'sets'
                ? 'bg-white shadow-sm text-verve-brown'
                : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50',
            ]"
          >
            {{ t('equipment.sets') }}
          </button>
        </div>
      </div>

      <!-- TAB 1: Individual Items -->
      <div v-if="activeTab === 'items'">
        <div class="flex justify-end mb-4">
          <button
            @click="showCreateForm ? closeForm() : openCreateForm()"
            :disabled="isSaving || deletingEquipmentId !== null"
            class="px-5 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all text-sm"
          >
            {{ showCreateForm ? t('equipment.cancel') : `+ ${t('equipment.addItem')}` }}
          </button>
        </div>

        <!-- Create Form -->
        <div
          v-if="showCreateForm"
          class="bg-white p-6 rounded-xl shadow-sm mb-6 space-y-4 border border-verve-medium/30"
        >
          <h2 class="text-lg font-bold text-verve-brown border-b border-verve-medium/30 pb-3">
            {{ editingEquipmentId ? t('equipment.editGear') : t('equipment.newGear') }}
          </h2>

          <div>
            <label
              for="equipment-name"
              class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
              >{{ t('equipment.name') }}</label
            >
            <input
              id="equipment-name"
              v-model="newEquipment.name"
              type="text"
              required
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            />
          </div>

          <div>
            <label
              for="equipment-type"
              class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
              >{{ t('equipment.type') }}</label
            >
            <select
              id="equipment-type"
              v-model="newEquipment.equipment_type"
              required
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            >
              <option disabled value="">{{ t('equipment.selectType') }}</option>
              <option v-for="type in equipmentStore.equipmentTypes" :key="type" :value="type">
                {{ t(`equipment.types.${type}`) }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                for="equipment-brand"
                class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
                >{{ t('equipment.brand') }}</label
              >
              <input
                id="equipment-brand"
                v-model="newEquipment.brand"
                type="text"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
              />
            </div>
            <div>
              <label
                for="equipment-model"
                class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
                >{{ t('equipment.model') }}</label
              >
              <input
                id="equipment-model"
                v-model="newEquipment.model"
                type="text"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
              />
            </div>
          </div>

          <div>
            <label
              for="equipment-date"
              class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
              >{{ t('equipment.purchaseDate') }}</label
            >
            <input
              id="equipment-date"
              v-model="newEquipment.purchase_date"
              type="date"
              :lang="locale"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            />
          </div>

          <div>
            <label
              for="equipment-description"
              class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
              >{{ t('equipment.description') }}</label
            >
            <textarea
              id="equipment-description"
              v-model="newEquipment.description"
              rows="3"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            ></textarea>
          </div>

          <p v-if="formError" role="alert" class="text-sm text-red-700">
            {{ t(`equipment.errors.${formError.key}`) }} {{ formError.detail }}
          </p>

          <div class="flex justify-end pt-2">
            <button
              @click="handleSaveItem"
              :disabled="isSaving || deletingEquipmentId !== null"
              class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all"
            >
              {{ isSaving ? t('equipment.saving') : editingEquipmentId ? t('equipment.saveChanges') : t('equipment.saveItem') }}
            </button>
          </div>
        </div>

        <!-- List -->
        <div v-if="equipmentStore.isLoading" class="text-center text-verve-brown/60 py-16">
          <div
            class="animate-spin rounded-full size-8 border-b-2 border-verve-brown mx-auto mb-3"
          ></div>
          {{ t('equipment.loading') }}
        </div>

        <div
          v-else
          class="bg-white rounded-xl shadow-sm overflow-hidden border border-verve-medium/30"
        >
          <ul v-if="equipmentStore.allEquipment.length > 0">
            <li
              v-for="item in equipmentStore.allEquipment"
              :key="item.id"
              class="p-4 border-b border-verve-medium/10 last:border-b-0 flex justify-between items-center hover:bg-verve-light/20 transition-colors"
            >
              <div class="grow min-w-0">
                <p class="font-bold text-verve-brown">{{ item.name }}</p>
                <p class="text-xs text-verve-brown/60">
                  {{ [item.brand, item.model].filter(Boolean).join(' ') }}
                </p>
              </div>
              <div class="flex items-center gap-2 ml-3">
                <span
                  class="text-xs font-bold bg-verve-light text-verve-brown/80 px-2.5 py-1 rounded-lg border border-verve-medium/20"
                >
                  {{ t(`equipment.types.${item.equipment_type}`) }}
                </span>
                <button
                  type="button"
                  :aria-label="t('equipment.editNamed', { name: item.name })"
                  @click="openEditForm(item)"
                  :disabled="isSaving || deletingEquipmentId !== null"
                  class="px-2 py-1 text-sm text-verve-brown rounded focus-visible:outline-2 focus-visible:outline-verve-dark"
                >
                  {{ t('equipment.edit') }}
                </button>
                <button
                  type="button"
                  :aria-label="t('equipment.deleteNamed', { name: item.name })"
                  @click="handleDeleteItem(item)"
                  :disabled="deletingEquipmentId === item.id || isSaving"
                  class="px-2 py-1 text-sm text-red-700 rounded focus-visible:outline-2 focus-visible:outline-red-700"
                >
                  {{ deletingEquipmentId === item.id ? t('equipment.deleting') : t('equipment.delete') }}
                </button>
              </div>
            </li>
          </ul>
          <div v-else class="text-center p-12 text-verve-brown/40 italic">
            {{ t('equipment.empty') }}
          </div>
        </div>
        <p v-if="formError && !showCreateForm" role="alert" class="mt-3 text-sm text-red-700">
          {{ t(`equipment.errors.${formError.key}`) }} {{ formError.detail }}
        </p>
      </div>

      <!-- TAB 2: Sets Manager -->
      <div v-else-if="activeTab === 'sets'">
        <EquipmentSetsManager />
      </div>
    </div>
  </div>
</template>
