<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
import EquipmentSetsManager from '@/components/EquipmentSetsManager.vue';

const equipmentStore = useEquipmentStore();
const activeTab = ref<'items' | 'sets'>('items');

// --- Item Form State ---
interface NewItemState {
  name: string;
  equipment_type: string;
  brand: string;
  model: string;
  description: string;
  purchase_date: string;
}

const showCreateForm = ref(false);
const newEquipment = ref<NewItemState>({
  name: '',
  equipment_type: '',
  brand: '',
  model: '',
  description: '',
  // Fix: Ensure strictly string
  purchase_date: new Date().toISOString().split('T')[0] ?? '',
});

async function handleSaveItem() {
  if (!newEquipment.value.name || !newEquipment.value.equipment_type) {
    alert('Name and Equipment Type are required.');
    return;
  }
  await equipmentStore.createEquipment(newEquipment.value);
  showCreateForm.value = false;

  // Reset form
  newEquipment.value = {
    name: '',
    equipment_type: equipmentStore.equipmentTypes[0] || '',
    brand: '',
    model: '',
    description: '',
    // Fix: Ensure strictly string
    purchase_date: new Date().toISOString().split('T')[0] ?? '',
  };
}

onMounted(async () => {
  await Promise.all([
    equipmentStore.fetchAllEquipment(),
    equipmentStore.fetchEquipmentTypes(),
  ]);

  const firstType = equipmentStore.equipmentTypes[0];
  if (firstType) {
    newEquipment.value.equipment_type = firstType;
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 class="text-3xl font-bold text-verve-brown mb-4 sm:mb-0">My Gear</h1>

        <!-- Tab Navigation -->
        <div class="bg-verve-light p-1 rounded-xl flex gap-1 shadow-inner">
          <button @click="activeTab = 'items'" :class="[
            'px-5 py-2 text-sm font-bold rounded-lg transition-all',
            activeTab === 'items'
              ? 'bg-white shadow-sm text-verve-brown'
              : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50',
          ]">
            Individual Items
          </button>
          <button @click="activeTab = 'sets'" :class="[
            'px-5 py-2 text-sm font-bold rounded-lg transition-all',
            activeTab === 'sets'
              ? 'bg-white shadow-sm text-verve-brown'
              : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50',
          ]">
            Equipment Sets
          </button>
        </div>
      </div>

      <!-- TAB 1: Individual Items -->
      <div v-if="activeTab === 'items'">
        <div class="flex justify-end mb-4">
          <button @click="showCreateForm = !showCreateForm"
            class="px-5 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all text-sm">
            {{ showCreateForm ? 'Cancel' : '+ Add New Item' }}
          </button>
        </div>

        <!-- Create Form -->
        <div v-if="showCreateForm"
          class="bg-white p-6 rounded-xl shadow-sm mb-6 space-y-4 border border-verve-medium/30">
          <h2 class="text-lg font-bold text-verve-brown border-b border-verve-medium/30 pb-3">
            Add New Gear
          </h2>

          <div>
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Name</label>
            <input v-model="newEquipment.name" type="text" required
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
          </div>

          <div>
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Type</label>
            <select v-model="newEquipment.equipment_type" required
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
              <option disabled value="">Select a type</option>
              <option v-for="type in equipmentStore.equipmentTypes" :key="type" :value="type">
                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Brand</label>
              <input v-model="newEquipment.brand" type="text"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
            </div>
            <div>
              <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Model</label>
              <input v-model="newEquipment.model" type="text"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Date</label>
            <input v-model="newEquipment.purchase_date" type="date"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
          </div>

          <div class="flex justify-end pt-2">
            <button @click="handleSaveItem"
              class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
              Save Item
            </button>
          </div>
        </div>

        <!-- List -->
        <div v-if="equipmentStore.isLoading" class="text-center text-verve-brown/60 py-16">
          <div class="animate-spin rounded-full size-8 border-b-2 border-verve-brown mx-auto mb-3"></div>
          Loading gear...
        </div>

        <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden border border-verve-medium/30">
          <ul v-if="equipmentStore.allEquipment.length > 0">
            <li v-for="item in equipmentStore.allEquipment" :key="item.id"
              class="p-4 border-b border-verve-medium/10 last:border-b-0 flex justify-between items-center hover:bg-verve-light/20 transition-colors">
              <div>
                <p class="font-bold text-verve-brown">{{ item.name }}</p>
                <p class="text-xs text-verve-brown/60">{{ item.brand }} {{ item.model }}</p>
              </div>
              <span
                class="text-xs font-bold bg-verve-light text-verve-brown/80 px-2.5 py-1 rounded-lg border border-verve-medium/20">
                {{ item.equipment_type }}
              </span>
            </li>
          </ul>
          <div v-else class="text-center p-12 text-verve-brown/40 italic">
            You haven't added any gear yet.
          </div>
        </div>
      </div>

      <!-- TAB 2: Sets Manager -->
      <div v-else-if="activeTab === 'sets'">
        <EquipmentSetsManager />
      </div>
    </div>
  </div>
</template>
