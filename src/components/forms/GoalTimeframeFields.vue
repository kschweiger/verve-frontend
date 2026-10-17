<script setup lang="ts">
import type { GoalTimeframe } from '@/utils/goalTimeframe';
const form = defineModel<GoalTimeframe>({ required: true });
defineProps<{ weekError?: string }>();
</script>

<template>
  <fieldset class="border-t border-verve-medium/30 pt-4">
    <legend class="text-xs font-bold text-verve-brown/60 uppercase">Timeframe</legend>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <label class="block text-sm text-verve-brown"
        >Frequency
        <select
          v-model="form.temporal_type"
          class="mt-1 w-full border-verve-medium rounded-xl text-sm py-2 px-3 focus:ring-verve-dark bg-white"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </label>
      <label class="block text-sm text-verve-brown"
        >Year
        <input
          v-model.number="form.year"
          type="number"
          min="2000"
          class="mt-1 w-full border-verve-medium rounded-xl text-sm py-2 px-3 focus:ring-verve-dark bg-white"
        />
      </label>
      <template v-if="form.temporal_type === 'weekly'">
        <label class="block text-sm text-verve-brown sm:col-span-2"
          >Creation Scope
          <select
            v-model="form.weekly_scope"
            class="mt-1 w-full border-verve-medium rounded-xl text-sm py-2 px-3 focus:ring-verve-dark bg-white"
          >
            <option value="specific_week">Single Specific Week</option>
            <option value="all_in_month">All Weeks in a specific Month</option>
            <option value="all_in_year">All Weeks in the Year</option>
          </select>
        </label>
        <label v-if="form.weekly_scope === 'specific_week'" class="block text-sm text-verve-brown"
          >Week Number (1–53)
          <input
            v-model.number="form.week"
            type="number"
            min="1"
            max="53"
            :aria-invalid="!!weekError"
            class="mt-1 w-full border-verve-medium rounded-xl text-sm py-2 px-3 focus:ring-verve-dark bg-white"
          />
          <span v-if="weekError" class="text-red-600 text-xs">{{ weekError }}</span>
        </label>
      </template>
      <label
        v-if="
          form.temporal_type === 'monthly' ||
          (form.temporal_type === 'weekly' && form.weekly_scope === 'all_in_month')
        "
        class="block text-sm text-verve-brown"
        >Month
        <select
          v-model="form.month"
          :disabled="form.temporal_type === 'monthly' && form.is_all_months"
          class="mt-1 w-full border-verve-medium rounded-xl text-sm py-2 px-3 focus:ring-verve-dark bg-white disabled:opacity-50"
        >
          <option v-for="month in 12" :key="month" :value="month">
            {{ new Date(0, month - 1).toLocaleString('default', { month: 'long' }) }}
          </option>
        </select>
      </label>
      <label
        v-if="form.temporal_type === 'monthly'"
        class="flex items-center gap-2 text-sm text-verve-brown"
      >
        <input
          v-model="form.is_all_months"
          type="checkbox"
          class="size-4 rounded border-verve-medium"
        />Every Month
      </label>
    </div>
  </fieldset>
</template>
