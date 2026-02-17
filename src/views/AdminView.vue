<template>
  <div class="view-container">
    <header class="flex flex-row" style="justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h1 style="font-size: 1.75rem; font-weight: 800;">Panel admina</h1>
      <div class="flex flex-row" style="gap: 0.5rem; align-items: center;">
        <button class="btn-secondary btn" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-secondary btn" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-secondary btn" @click="logout">Wyloguj</button>
      </div>
    </header>

    <DateFilterBar @change="onFilterChange" />

    <!-- Podstawowe metryki -->
    <section class="flex flex-col md:flex-row gap-4" style="margin-bottom: 1rem;">
      <div class="card" style="flex: 1;">
        <h2 style="font-size: 1.25rem; font-weight: 600;">Liczba zamówień</h2>
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalOrders }}
        </p>
        <h2 style="font-size: 1.25rem; font-weight: 600;">Suma zamówień</h2>
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalRevenue.toFixed(2) }} zł
        </p>
      </div>

      <div class="card" style="flex: 2;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
          TOP pozycje
        </h2>
        <ul v-if="topItems.length > 0" class="flex flex-col gap-1">
          <li v-for="(item, index) in topItems" :key="item.name" class="flex flex-row" style="justify-content: space-between; gap: 0.75rem;">
            <span style="flex: 1;">{{ index + 1 }}. {{ item.name }}</span>
            <strong style="min-width: 2.5rem; text-align: right;">x {{ item.quantity }} =</strong>
            <strong style="min-width: 5.5rem; text-align: right;">{{ item.revenue.toFixed(2) }} zł</strong>
          </li>
        </ul>
        <p v-else style="font-size: 0.9rem; color: #6b7280;">
          Brak zamówień w wybranym okresie.
        </p>
      </div>
    </section>

    <!-- Wykres godzinowy -->
    <section class="card">
      <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
        Liczba zamówień wg godziny
      </h2>
      <div v-if="chartData" class="chart-wrapper">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <p v-else style="font-size: 0.9rem; color: #6b7280;">Brak danych do wyświetlenia.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { signOut } from 'firebase/auth'
import { auth, db } from '../firebase'
import { useRouter } from 'vue-router'
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore'
import DateFilterBar from '../components/DateFilterBar.vue'
import { Bar } from 'vue-chartjs'

const router = useRouter()
const orders = ref([])
const filter = ref({ mode: 'day', date: null, month: null, year: null })

const logout = async () => {
  await signOut(auth)
  router.replace('/login')
}

// zmiana filtra → ustawiamy filter i JEDEN raz wywołujemy fetchData
const onFilterChange = (f) => {
  filter.value = f
  fetchData()
}

const getRange = () => {
  const mode = filter.value.mode
  let start, end

  if (mode === 'day' && filter.value.date) {
    start = new Date(filter.value.date + 'T00:00:00')
    end = new Date(filter.value.date + 'T23:59:59')
  } else if (mode === 'month' && filter.value.month) {
    const [y, m] = filter.value.month.split('-').map(Number)
    start = new Date(y, m - 1, 1, 0, 0, 0)
    end = new Date(y, m, 0, 23, 59, 59)
  } else if (mode === 'year' && filter.value.year) {
    const y = filter.value.year
    start = new Date(y, 0, 1, 0, 0, 0)
    end = new Date(y, 11, 31, 23, 59, 59)
  } else {
    const now = new Date()
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  }

  return { start, end }
}

// ⬇️ Pobieramy wszystkie zamówienia (status dowolny)
const fetchData = async () => {
  // pobierz zamówienia posortowane od najnowszych
  const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(500) // zabezpieczenie, żeby nie wczytywać tysięcy rekordów naraz
  )

  const snap = await getDocs(q)
  orders.value = snap.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date()
    }
  })
}


// Metryki
const totalOrders = computed(() => orders.value.length)

const totalRevenue = computed(() => {
  let total = 0
  for (const order of orders.value) {
    for (const item of order.items || []) {
      const price = Number(item.finalPrice ?? item.price ?? 0)
      const qty = Number(item.quantity ?? 1)
      total += price * qty
    }
  }
  return total
})

const topItems = computed(() => {
  const map = {}
  const revenueMap = {}
  for (const order of orders.value) {
    for (const item of order.items || []) {
      const qty = Number(item.quantity ?? 1)
      const price = Number(item.finalPrice ?? item.price ?? 0)
      map[item.name] = (map[item.name] || 0) + qty
      revenueMap[item.name] = (revenueMap[item.name] || 0) + price * qty
    }
  }
  return Object.entries(map)
      .map(([name, quantity]) => ({
        name,
        quantity,
        revenue: revenueMap[name] || 0
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
})

// Wykres: liczba zamówień wg godziny (0–23)
const chartData = computed(() => {
  if (!orders.value.length) return null

  const counts = Array(24).fill(0)
  for (const order of orders.value) {
    const hour = order.createdAt.getHours()
    counts[hour]++
  }

  return {
    labels: counts.map((_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Liczba zamówień',
        data: counts
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      ticks: {
        autoSkip: true,
        maxTicksLimit: 12
      }
    },
    y: {
      beginAtZero: true,
      precision: 0
    }
  }
}

// 🔁 inicjalne pobranie TYLKO raz przy wejściu na stronę
fetchData()
</script>


<style scoped>
/* Stabilny kontener dla wykresu, aby nie rozjeżdżał układu */
.chart-wrapper {
  position: relative;
  height: 320px;
  min-height: 240px;
}
@media (max-width: 768px) {
  .chart-wrapper {
    height: 260px;
  }
}

.md\:flex-row {
  flex-direction: row;
}
@media (max-width: 768px) {
  .md\:flex-row {
    flex-direction: column;
  }
}
</style>
