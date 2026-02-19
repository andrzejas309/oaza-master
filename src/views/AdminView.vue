<template>
  <div class="view-container">
    <header class="flex flex-row" style="justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h1 style="font-size: 1.75rem; font-weight: 800;">Panel admina</h1>
      <div class="flex flex-row" style="gap: 0.5rem; align-items: center;">
        <button class="btn-outline btn-sm" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-outline btn-sm" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-outline btn-sm" @click="logout">Wyloguj</button>
      </div>
    </header>

    <DateFilterBar @change="onFilterChange" />

    <!-- Podstawowe metryki -->
    <section class="flex flex-col md:flex-row gap-4" style="margin-bottom: 1rem;">
      <div class="card" style="flex: 1;">
        <h2 style="font-size: 1.25rem; font-weight: 600;">Liczba zamówień</h2>
        <div style="display: flex; gap: 1.5rem; margin-top: 0.5rem; font-size: 0.9rem;">
          <div>
            <span style="color: #6b7280;">Na miejscu:</span>
            <strong style="margin-left: 0.25rem;">{{ ordersOnSite }}</strong>
          </div>
          <div>
            <span style="color: #6b7280;">Na wynos:</span>
            <strong style="margin-left: 0.25rem;">{{ ordersToGo }}</strong>
          </div>
        </div>
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalOrders }}
        </p>
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-top: 1rem;">Suma zamówień</h2>
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalRevenue.toFixed(2) }} zł
        </p>
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-top: 1rem;">Wydane pojemniki</h2>
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalContainers }}
        </p>
      </div>

      <div class="card" style="flex: 2;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
          TOP pozycje
        </h2>
        <ul v-if="topItems.length > 0" class="flex flex-col gap-1">
          <li v-for="(item, index) in topItems" :key="item.name" class="flex flex-row" style="justify-content: space-between; gap: 0.75rem;">
            <span style="flex: 1;">{{ index + 1 }}. {{ item.name }}</span>
            <strong style="min-width: 2.5rem; text-align: right;">{{ item.quantity }}</strong>
            <strong style="min-width: 5.5rem; text-align: right; color: #e67700;">{{ item.revenue.toFixed(2) }} zł</strong>
          </li>
        </ul>
        <p v-else style="font-size: 0.9rem; color: #6b7280;">
          Brak zamówień w wybranym okresie.
        </p>
        <button
          v-if="topItems.length > 0"
          class="btn-outline btn-sm"
          @click="showAllItemsDialog = true"
          style="margin-top: 0.75rem; width: 25%;"
        >
          Więcej
        </button>
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

    <!-- Popup z wszystkimi pozycjami -->
    <div v-if="showAllItemsDialog" class="dialog-backdrop" @click.self="showAllItemsDialog = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Wszystkie pozycje</h2>
          <button class="dialog-close" @click="showAllItemsDialog = false">✖</button>
        </div>

        <div class="dialog-body">
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left; padding: 0.75rem;">Pozycja</th>
                <th style="text-align: right; padding: 0.75rem;">Ilość</th>
                <th style="text-align: right; padding: 0.75rem;">Suma</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in allItems" :key="item.name">
                <td style="padding: 0.75rem;">{{ index + 1 }}. {{ item.name }}</td>
                <td style="text-align: right; padding: 0.75rem; font-weight: 600;">{{ item.quantity }}</td>
                <td style="text-align: right; padding: 0.75rem; font-weight: 700; color: #e67700;">{{ item.revenue.toFixed(2) }} zł</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { useRouter } from 'vue-router'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import DateFilterBar from '../components/DateFilterBar.vue'
import { Bar } from 'vue-chartjs'

const router = useRouter()
const orders = ref([])
const filter = ref({ mode: 'day', date: null, month: null, year: null })
const showAllItemsDialog = ref(false)

// ==================== Lifecycle ====================
onMounted(() => {
  fetchData()
})

// ==================== Auth ====================
const logout = async () => {
  await signOut(auth)
  router.replace('/login')
}

// ==================== Data Fetching ====================
const onFilterChange = (f) => {
  filter.value = f
  // Filtrowanie odbywa się automatycznie przez computed property filteredOrders
}

const fetchData = async () => {
  const q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(500)
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

// ==================== Computed - Filtering ====================
const getDateRange = () => {
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
    // Domyślnie: dzisiejszy dzień
    const now = new Date()
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  }

  return { start, end }
}

const filteredOrders = computed(() => {
  const { start, end } = getDateRange()

  return orders.value.filter(order => {
    const orderDate = order.createdAt
    return orderDate >= start && orderDate <= end
  })
})

// ==================== Computed Metrics ====================
const totalOrders = computed(() => filteredOrders.value.length)

const ordersOnSite = computed(() =>
  filteredOrders.value.filter(order => order.type === 'na_miejscu').length
)

const ordersToGo = computed(() =>
  filteredOrders.value.filter(order => order.type === 'na_wynos').length
)

const totalRevenue = computed(() => {
  return filteredOrders.value.reduce((total, order) => {
    const orderTotal = (order.items || []).reduce((sum, item) => {
      const price = Number(item.finalPrice ?? item.price ?? 0)
      const qty = Number(item.quantity ?? 1)
      return sum + (price * qty)
    }, 0)
    return total + orderTotal
  }, 0)
})

const totalContainers = computed(() => {
  return filteredOrders.value.reduce((total, order) => {
    return total + Number(order.containers ?? 0)
  }, 0)
})

// Helper function - oblicza statystyki wszystkich pozycji
const calculateItemStats = () => {
  return filteredOrders.value.reduce((acc, order) => {
    (order.items || []).forEach(item => {
      const qty = Number(item.quantity ?? 1)
      const price = Number(item.finalPrice ?? item.price ?? 0)
      const revenue = price * qty

      if (!acc[item.name]) {
        acc[item.name] = { quantity: 0, revenue: 0 }
      }
      acc[item.name].quantity += qty
      acc[item.name].revenue += revenue
    })
    return acc
  }, {})
}

const topItems = computed(() => {
  const itemStats = calculateItemStats()

  return Object.entries(itemStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
})

const allItems = computed(() => {
  const itemStats = calculateItemStats()

  return Object.entries(itemStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
})

// ==================== Chart Configuration ====================
const chartData = computed(() => {
  if (!filteredOrders.value.length) return null

  const counts = Array(24).fill(0)
  filteredOrders.value.forEach(order => {
    const hour = order.createdAt.getHours()
    counts[hour]++
  })

  return {
    labels: counts.map((_, i) => `${i}:00`),
    datasets: [{
      label: 'Liczba zamówień',
      data: counts
    }]
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

/* Styl przycisków jak w panelu obsługi */
.btn-outline {
  background: white;
  border: 2px solid #ff8a3c;
  color: #e67700;
  padding: 0.6rem 1.2rem;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-outline:hover {
  background: #ff8a3c;
  color: black;
}
.btn-sm {
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
}

/* Dialog / Popup */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.dialog-content {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  transition: color 0.2s ease;
}

.dialog-close:hover {
  color: #e67700;
}

.dialog-body {
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table thead {
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 2px solid #e5e7eb;
}

.items-table th {
  font-weight: 700;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.items-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.15s ease;
}

.items-table tbody tr:hover {
  background-color: #ffe8d5;
}

.items-table tbody tr:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .dialog-content {
    max-width: 95vw;
    max-height: 85vh;
  }

  .items-table th,
  .items-table td {
    padding: 0.5rem !important;
    font-size: 0.875rem;
  }
}
</style>
