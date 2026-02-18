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
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalOrders }}
        </p>
        <h2 style="font-size: 1.25rem; font-weight: 600;">Suma zamówień</h2>
        <p style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">
          {{ totalRevenue.toFixed(2) }} zł
        </p>
        <h2 style="font-size: 1.25rem; font-weight: 600;">Wydane pojemniki</h2>
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
  fetchData()
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

// ==================== Computed Metrics ====================
const totalOrders = computed(() => orders.value.length)

const totalRevenue = computed(() => {
  return orders.value.reduce((total, order) => {
    const orderTotal = (order.items || []).reduce((sum, item) => {
      const price = Number(item.finalPrice ?? item.price ?? 0)
      const qty = Number(item.quantity ?? 1)
      return sum + (price * qty)
    }, 0)
    return total + orderTotal
  }, 0)
})

const totalContainers = computed(() => {
  return orders.value.reduce((total, order) => {
    return total + Number(order.containers ?? 0)
  }, 0)
})

const topItems = computed(() => {
  const itemStats = orders.value.reduce((acc, order) => {
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

  return Object.entries(itemStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
})

// ==================== Chart Configuration ====================
const chartData = computed(() => {
  if (!orders.value.length) return null

  const counts = Array(24).fill(0)
  orders.value.forEach(order => {
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
</style>
