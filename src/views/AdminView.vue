<template>
  <div class="view-container">
    <header class="flex flex-row" style="justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h1 style="font-size: 1.75rem; font-weight: 800;">Panel admina</h1>
      <div class="flex flex-row" style="gap: 0.5rem; align-items: center;">
        <button class="btn-outline btn-sm" @click="router.push('/menu-management')">Zarządzaj Menu</button>
        <button class="btn-outline btn-sm" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-outline btn-sm" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-outline btn-sm" @click="logout">Wyloguj</button>
      </div>
    </header>

    <DateFilterBar @change="onFilterChange" />

    <!-- Przycisk Historia zamówień -->
    <section style="margin-bottom: 1rem;">
      <button class="btn-history" @click="showHistoryDialog = true">
        📋 Historia zamówień
      </button>
    </section>

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
            <strong style="min-width: 2.5rem; text-align: right;">{{ formatItemQuantity(item.quantity) }}</strong>
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
                <td style="text-align: right; padding: 0.75rem; font-weight: 600;">{{ item.displayQuantity }}</td>
                <td style="text-align: right; padding: 0.75rem; font-weight: 700; color: #e67700;">{{ item.revenue.toFixed(2) }} zł</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Popup Historia zamówień -->
    <div v-if="showHistoryDialog" class="dialog-backdrop" @click.self="showHistoryDialog = false">
      <div class="dialog-content history-dialog">
        <div class="dialog-header">
          <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Historia zamówień</h2>
          <button class="dialog-close" @click="showHistoryDialog = false">✖</button>
        </div>

        <div class="dialog-body">
          <div v-if="groupedOrders.length === 0" style="padding: 2rem; text-align: center; color: #6b7280;">
            Brak zamówień w wybranym okresie
          </div>
          <div v-else>
            <div v-for="group in groupedOrders" :key="group.period" class="history-group">
              <div class="history-group-header">
                <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0;">{{ group.period }}</h3>
                <div style="display: flex; gap: 1.5rem; font-size: 0.9rem;">
                  <span>Zamówienia: <strong>{{ group.count }}</strong></span>
                  <span style="color: #e67700;">Suma: <strong>{{ group.total.toFixed(2) }} zł</strong></span>
                </div>
              </div>
              <div class="history-orders">
                <div v-for="order in group.orders" :key="order.id" class="history-order-item">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                      <strong style="font-size: 1rem;">#{{ order.number }}</strong>
                      <span style="margin-left: 0.5rem; color: #6b7280; font-size: 0.875rem;">
                        {{ formatOrderTime(order.createdAt) }}
                      </span>
                      <span
                        style="margin-left: 0.5rem; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;"
                        :style="{
                          background: order.type === 'na_miejscu' ? '#dbeafe' : '#fef3c7',
                          color: order.type === 'na_miejscu' ? '#1e40af' : '#92400e'
                        }"
                      >
                        {{ order.type === 'na_miejscu' ? 'Na miejscu' : 'Na wynos' }}
                      </span>
                    </div>
                    <strong style="color: #e67700; font-size: 1.1rem;">{{ calculateOrderTotal(order).toFixed(2) }} zł</strong>
                  </div>
                  <div style="font-size: 0.875rem; color: #6b7280;">
                    <div v-for="item in order.items" :key="item.name" style="margin-bottom: 0.25rem;">
                      • {{ item.name }}
                      <span v-if="item.count && item.count > 1" style="font-weight: 600; color: #374151;">
                        {{ item.count }}×
                      </span>
                      <span v-if="item.quantity && item.quantity !== 1">({{ formatQuantity(item.quantity) }})</span>
                      <span v-if="item.extras && item.extras.length"> + {{ item.extras.join(', ') }}</span>
                    </div>
                    <div v-if="order.containers > 0" style="margin-top: 0.25rem; font-style: italic;">
                      Pojemniki: {{ order.containers }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
const showHistoryDialog = ref(false)


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

// Helper function - oblicza sumę pojedynczego zamówienia
const calculateOrderTotal = (order) => {
  const total = (order.items || []).reduce((sum, item) => {
    // finalPrice już zawiera unitPrice × quantity × count, więc używamy go bezpośrednio
    // Jeśli brak finalPrice, obliczamy ręcznie (backward compatibility)
    if (item.finalPrice != null) {
      return sum + Number(item.finalPrice)
    }
    const price = Number(item.price ?? 0)
    const qty = Number(item.quantity ?? 1)
    const count = Number(item.count ?? 1)
    return sum + (price * qty * count)
  }, 0)
  return roundTo2Decimals(total)
}

const totalRevenue = computed(() => {
  return filteredOrders.value.reduce((total, order) => {
    return total + calculateOrderTotal(order)
  }, 0)
})

const totalContainers = computed(() => {
  return filteredOrders.value.reduce((total, order) => {
    return total + Number(order.containers ?? 0)
  }, 0)
})

// ==================== Utility Functions ====================
const roundTo2Decimals = (value) => Math.round(value * 100) / 100

const formatItemQuantity = (qty) => {
  const rounded = roundTo2Decimals(qty)

  // Sprawdź czy to liczba całkowita
  if (Number.isInteger(rounded)) {
    return rounded.toString()
  }

  // Dla ułamków dziesiętnych - wyświetl z maksymalnie 2 miejscami po przecinku
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

// Helper function - oblicza statystyki wszystkich pozycji
const calculateItemStats = () => {
  const stats = filteredOrders.value.reduce((acc, order) => {
    (order.items || []).forEach(item => {
      const count = Number(item.count ?? 1)
      const qty = Number(item.quantity ?? 1)
      const totalQty = count * qty

      // finalPrice już zawiera unitPrice × quantity × count
      // Jeśli brak finalPrice, obliczamy ręcznie (backward compatibility)
      let revenue
      if (item.finalPrice != null) {
        revenue = Number(item.finalPrice)
      } else {
        const price = Number(item.price ?? 0)
        revenue = price * qty * count
      }

      if (!acc[item.name]) {
        acc[item.name] = { quantity: 0, revenue: 0 }
      }
      acc[item.name].quantity += totalQty
      acc[item.name].revenue += revenue
    })
    return acc
  }, {})

  // Zaokrąglij wszystkie wartości na końcu (eliminuje błędy zmiennoprzecinkowe)
  Object.keys(stats).forEach(key => {
    stats[key].quantity = roundTo2Decimals(stats[key].quantity)
    stats[key].revenue = roundTo2Decimals(stats[key].revenue)
  })

  return stats
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
    .map(([name, stats]) => ({
      name,
      ...stats,
      displayQuantity: formatItemQuantity(stats.quantity)
    }))
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

// ==================== Historia zamówień ====================
const groupedOrders = computed(() => {
  if (!filteredOrders.value.length) return []

  const grouped = {}

  // Synchronizuj historyGroupBy z aktualnym filtrem
  const groupMode = filter.value.mode === 'month' || filter.value.mode === 'year' ? 'month' : 'day'

  filteredOrders.value.forEach(order => {
    let key
    const date = order.createdAt

    if (groupMode === 'day') {
      // Format: DD.MM.YYYY
      key = date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } else {
      // Format: Miesiąc YYYY
      key = date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long'
      })
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        orders: [],
        count: 0,
        total: 0
      }
    }

    grouped[key].orders.push(order)
    grouped[key].count++
    grouped[key].total += calculateOrderTotal(order)
  })

  // Sortowanie malejąco (najnowsze najpierw)
  return Object.values(grouped).sort((a, b) => {
    const dateA = a.orders[0].createdAt
    const dateB = b.orders[0].createdAt
    return dateB - dateA
  })
})


const formatOrderTime = (date) => {
  if (!date) return ''
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatQuantity = (qty) => {
  if (qty === 0.5) return '½ porcji'
  if (qty === 1) return '1 porcja'
  if (qty === 1.5) return '1½ porcji'
  if (qty === 2) return '2 porcje'
  if (qty % 1 === 0) return `${qty} porcji`

  // Dla golonki (gramatury)
  const grams = Math.round(qty * 100)
  if (grams >= 100) return `${grams}g`

  return qty.toString()
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

/* Przycisk Historia zamówień */
.btn-history {
  width: 100%;
  background: linear-gradient(135deg, #ff8a3c 0%, #e67700 100%);
  color: white;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 1rem;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(230, 119, 0, 0.3);
}

.btn-history:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(230, 119, 0, 0.4);
}

.btn-history:active {
  transform: translateY(0);
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

.history-dialog {
  max-width: 1000px;
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

/* Historia zamówień */
.history-group {
  border-bottom: 2px solid #e5e7eb;
}

.history-group:last-child {
  border-bottom: none;
}

.history-group-header {
  background: #f9fafb;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 1;
}

.history-orders {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-order-item {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.history-order-item:hover {
  background: #ffe8d5;
  border-color: #ff8a3c;
}

/* Tabela pozycji */
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

  .history-group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .btn-history {
    font-size: 1rem;
    padding: 0.875rem 1.25rem;
  }
}
</style>
