<template>
  <div class="admin-root">

    <!-- HEADER -->
    <header class="app-header">
      <div class="header-brand">
        <span class="header-icon">🛡️</span>
        <h1 class="header-title">Panel admina</h1>
      </div>
      <nav class="header-nav">
        <button class="btn-nav" @click="router.push('/menu-management')">Zarządzaj Menu</button>
        <button class="btn-nav" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-nav" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-nav btn-nav--logout" @click="logout">Wyloguj</button>
      </nav>
    </header>

    <div class="admin-layout">

      <DateFilterBar @change="onFilterChange" />

      <!-- Przycisk Historia zamówień -->
      <section style="margin-top: 1rem;">
        <button class="btn-history" @click="showHistoryDialog = true">
          📋 Historia zamówień
        </button>
      </section>

      <!-- Metryki + TOP pozycje -->
      <div class="admin-top-grid">

        <!-- Metryki -->
        <div class="card">
          <div class="metrics-grid">
            <div class="metric-block">
              <span class="metric-label">Zamówienia</span>
              <span class="metric-value">{{ totalOrders }}</span>
              <div class="metric-sub">
                <span>Na miejscu: <strong>{{ ordersOnSite }}</strong></span>
                <span>Na wynos: <strong>{{ ordersToGo }}</strong></span>
              </div>
            </div>
            <div class="metric-block">
              <span class="metric-label">Przychód</span>
              <span class="metric-value orange">{{ totalRevenue.toFixed(2) }} zł</span>
            </div>
            <div class="metric-block">
              <span class="metric-label">Pojemniki</span>
              <span class="metric-value">{{ totalContainers }}</span>
            </div>
          </div>
        </div>

        <!-- TOP pozycje -->
        <div class="card">
          <div class="top-items-header">
            <h2 class="card-section-title">🏆 TOP pozycje</h2>
            <button
              v-if="topItems.length > 0"
              class="btn-nav"
              style="font-size: 0.85rem; padding: 0.3rem 0.8rem;"
              @click="showAllItemsDialog = true"
            >
              Wszystkie →
            </button>
          </div>
          <ul v-if="topItems.length > 0" class="top-items-list">
            <li v-for="(item, index) in topItems" :key="item.name" class="top-item-row">
              <span class="top-item-rank">{{ index + 1 }}</span>
              <span class="top-item-name">{{ item.name }}</span>
              <strong class="top-item-qty">{{ formatItemQuantity(item.quantity) }}</strong>
              <strong class="top-item-rev">{{ item.revenue.toFixed(2) }} zł</strong>
            </li>
          </ul>
          <p v-else class="empty-hint muted">Brak zamówień w wybranym okresie.</p>
        </div>
      </div>

      <!-- Wykres godzinowy -->
      <section class="card" style="margin-top: 1rem;">
        <h2 class="card-section-title" style="margin-bottom: 0.75rem;">📊 Zamówienia wg godziny</h2>
        <div v-if="chartData" class="chart-wrapper">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <p v-else class="empty-hint muted">Brak danych do wyświetlenia.</p>
      </section>

    </div>

    <!-- ===== DIALOG: Wszystkie pozycje ===== -->
    <div v-if="showAllItemsDialog" class="dialog-backdrop" @click.self="showAllItemsDialog = false">
      <div class="dialog-panel">
        <div class="dialog-panel-header">
          <h2 class="dialog-panel-title">Wszystkie pozycje</h2>
          <button class="dialog-close-btn" @click="showAllItemsDialog = false">✖</button>
        </div>
        <div class="dialog-panel-body">
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">#</th>
                <th style="text-align: left;">Pozycja</th>
                <th style="text-align: right;">Ilość</th>
                <th style="text-align: right;">Suma</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in allItems" :key="item.name">
                <td style="color: var(--muted); width: 2rem;">{{ index + 1 }}</td>
                <td>{{ item.name }}</td>
                <td style="text-align: right; font-weight: 600;">{{ item.displayQuantity }}</td>
                <td style="text-align: right;" class="col-revenue">{{ item.revenue.toFixed(2) }} zł</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== DIALOG: Historia zamówień ===== -->
    <div v-if="showHistoryDialog" class="dialog-backdrop" @click.self="showHistoryDialog = false">
      <div class="dialog-panel dialog-panel--wide">
        <div class="dialog-panel-header">
          <h2 class="dialog-panel-title">Historia zamówień</h2>
          <button class="dialog-close-btn" @click="showHistoryDialog = false">✖</button>
        </div>
        <div class="dialog-panel-body">

          <div v-if="groupedOrders.length === 0" class="empty-hint muted" style="padding: 2rem;">
            Brak zamówień w wybranym okresie
          </div>

          <div v-else>
            <div v-for="group in groupedOrders" :key="group.period" class="history-group">
              <div class="history-group-header">
                <h3 class="history-group-title">{{ group.period }}</h3>
                <div class="history-group-meta">
                  <span>Zamówienia: <strong>{{ group.count }}</strong></span>
                  <span class="revenue">Suma: <strong>{{ group.total.toFixed(2) }} zł</strong></span>
                </div>
              </div>
              <div class="history-orders">
                <div v-for="order in group.orders" :key="order.id" class="history-order-item">
                  <div class="history-order-top">
                    <div class="history-order-meta">
                      <span class="history-order-num">#{{ order.number }}</span>
                      <span class="history-order-time">{{ formatOrderTime(order.createdAt) }}</span>
                      <span
                        class="order-type-badge"
                        :class="order.type === 'na_miejscu' ? 'order-type-badge--site' : 'order-type-badge--go'"
                      >
                        {{ order.type === 'na_miejscu' ? 'Na miejscu' : 'Na wynos' }}
                      </span>
                    </div>
                    <span class="history-order-total">{{ calculateOrderTotal(order).toFixed(2) }} zł</span>
                  </div>
                  <div class="history-order-items">
                    <div v-for="item in order.items" :key="item.name">
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

/**
 * AI: Vue component should contain only presentation logic.
 * Move business logic to composables.
 */

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
/* ===================== LAYOUT ===================== */
.admin-root {
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--text);
}

.admin-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2rem;
}

/* ===================== TOP GRID (metryki + TOP) ===================== */
.admin-top-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 900px) {
  .admin-top-grid {
    grid-template-columns: 1fr;
  }
}

/* ===================== KARTY ===================== */
.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 1.25rem;
  border: 1px solid var(--border-subtle);
}

.card-section-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--text);
}

/* ===================== METRYKI ===================== */
.orange {
  color: var(--orange-dark);
}

/* ===================== TOP POZYCJE ===================== */
.top-items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.top-items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.top-item-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.65rem;
  border-radius: 0.6rem;
  background: #f9fafb;
  border: 1px solid var(--border-subtle);
  font-size: 0.95rem;
  transition: background 0.12s;
}

.top-item-row:hover {
  background: var(--orange-soft);
  border-color: #ffd6aa;
}

.top-item-rank {
  font-weight: 800;
  color: var(--muted);
  min-width: 1.2rem;
  font-size: 0.85rem;
}

.top-item-name {
  flex: 1;
}

.top-item-qty {
  min-width: 2.5rem;
  text-align: right;
}

.top-item-rev {
  min-width: 5.5rem;
  text-align: right;
  color: var(--orange-dark);
}

/* ===================== WYKRES ===================== */
.chart-wrapper {
  position: relative;
  height: 300px;
  min-height: 220px;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 240px;
  }
}

/* ===================== HELPERS ===================== */
.empty-hint {
  text-align: center;
  padding: 1rem 0;
}

.muted {
  color: var(--muted);
}
</style>
