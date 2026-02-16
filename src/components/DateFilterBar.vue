<template>
  <div class="card" style="margin-bottom: 1rem;">
    <div class="flex flex-row gap-2" style="flex-wrap: wrap; align-items: center;">
      <div>
        <label class="block mb-1">Tryb zakresu</label>
        <select v-model="localMode" @change="emitChange" style="padding: 0.4rem; border-radius: 0.5rem; border: 1px solid #d1d5db;">
          <option value="day">Dzień</option>
          <option value="month">Miesiąc</option>
          <option value="year">Rok</option>
        </select>
      </div>

      <div v-if="localMode === 'day'">
        <label class="block mb-1">Data</label>
        <input
            v-model="localDate"
            type="date"
            @change="emitChange"
            style="padding: 0.4rem; border-radius: 0.5rem; border: 1px solid #d1d5db;"
        />
      </div>

      <div v-if="localMode === 'month'">
        <label class="block mb-1">Miesiąc</label>
        <input
            v-model="localMonth"
            type="month"
            @change="emitChange"
            style="padding: 0.4rem; border-radius: 0.5rem; border: 1px solid #d1d5db;"
        />
      </div>

      <div v-if="localMode === 'year'">
        <label class="block mb-1">Rok</label>
        <input
            v-model="localYear"
            type="number"
            min="2000"
            max="2100"
            @change="emitChange"
            style="padding: 0.4rem; border-radius: 0.5rem; border: 1px solid #d1d5db; width: 6rem;"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['change'])

const localMode = ref('day')
const today = new Date().toISOString().slice(0, 10)
const localDate = ref(today)
const localMonth = ref(today.slice(0, 7))
const localYear = ref(new Date().getFullYear())

const emitChange = () => {
  emit('change', {
    mode: localMode.value,
    date: localDate.value,
    month: localMonth.value,
    year: Number(localYear.value)
  })
}

watch(localMode, emitChange, { immediate: true })
</script>
