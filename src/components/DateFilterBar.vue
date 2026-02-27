<template>
  <div class="date-filter-bar card">
    <div class="date-filter-inner">

      <!-- Tryb: segmented buttons -->
      <div class="filter-group">
        <label class="filter-label">Zakres</label>
        <div class="segment-control">
          <button
            class="segment-btn"
            :class="{ active: localMode === 'day' }"
            @click="localMode = 'day'; emitChange()"
          >Dzień</button>
          <button
            class="segment-btn"
            :class="{ active: localMode === 'month' }"
            @click="localMode = 'month'; emitChange()"
          >Miesiąc</button>
          <button
            class="segment-btn"
            :class="{ active: localMode === 'year' }"
            @click="localMode = 'year'; emitChange()"
          >Rok</button>
        </div>
      </div>

      <!-- Input zależny od trybu -->
      <div class="filter-group" v-if="localMode === 'day'">
        <label class="filter-label">Data</label>
        <input class="filter-input" v-model="localDate" type="date" @change="emitChange" />
      </div>

      <div class="filter-group" v-if="localMode === 'month'">
        <label class="filter-label">Miesiąc</label>
        <input class="filter-input" v-model="localMonth" type="month" @change="emitChange" />
      </div>

      <div class="filter-group" v-if="localMode === 'year'">
        <label class="filter-label">Rok</label>
        <input class="filter-input filter-input--year" v-model="localYear" type="number" min="2000" max="2100" @change="emitChange" />
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

<style scoped>
.date-filter-bar {
  margin-bottom: 1rem;
}

.date-filter-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1.25rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
}

/* Segmented control */
.segment-control {
  display: flex;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.6rem;
  padding: 3px;
  gap: 2px;
}

.segment-btn {
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 500;
  border: none;
  border-radius: 0.45rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.segment-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.segment-btn.active {
  background: #f97316;
  color: #fff;
  font-weight: 600;
}

/* Date / month / year inputs */
.filter-input {
  padding: 0.45rem 0.75rem;
  font-size: 0.9rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.6rem;
  color: #111827;
  outline: none;
  transition: border-color 0.15s;
  color-scheme: light;
}

.filter-input:focus {
  border-color: #f97316;
}

.filter-input--year {
  width: 6.5rem;
}
</style>
