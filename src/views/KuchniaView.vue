<template>
  <div class="view-container kitchen-layout">
    <header class="kitchen-header">
      <h1 class="title">👩‍🍳 Panel Kuchni</h1>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn-outline btn-sm" @click="router.push('/admin')">Admin</button>
        <button class="btn-outline btn-sm" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-outline btn-sm" @click="logout">Wyloguj</button>
      </div>
    </header>

    <div class="main-layout">
      <!-- LEWA STRONA – ZAMÓWIENIA -->
      <section class="orders-section">
        <transition-group name="fade" tag="div" class="orders-grid">
          <div
              v-for="order in orders"
              :key="order.id"
              class="order-card"
          >
            <!-- kolorowy pasek zależny od typu -->
            <div class="order-top" :class="orderTypeClass(order)">
              <div class="order-number">Zamówienie #{{ order.number }}</div>
              <div class="order-meta">
                {{ formatTime(order.createdAt) }}
                <span v-if="order.waiter">, {{ order.waiter }}</span>
              </div>
            </div>

            <!-- biała kartka -->
            <div class="order-body">
              <p class="order-place" v-if="order.place || order.type">
                {{ order.place || order.type }}
              </p>

              <ul class="order-items">
                <li v-for="item in order.items" :key="item.name">
                  {{ item.quantity }} × {{ item.name }}
                </li>
              </ul>
            </div>
          </div>
        </transition-group>

        <p
            v-if="orders.length === 0"
            class="muted empty-info"
        >
          Brak aktywnych zamówień 🍲
        </p>
      </section>

      <!-- PRAWA STRONA – PODSUMOWANIE -->
      <aside class="summary-bar card">
        <h2 class="section-title">Podsumowanie</h2>
        <div class="summary-grid">
          <div
              class="summary-item"
              v-for="(count, name) in summary"
              :key="name"
          >
            <div class="summary-name">{{ name }}</div>
            <div class="summary-count">{{ count }}</div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { auth, db } from '@/firebase'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()
const orders = ref([])
const summary = ref({})

let unsub = null

onMounted(() => {
  // nasłuchujemy tylko zamówień w toku
  const q = query(
      collection(db, 'orders'),
      where('status', '==', 'w_toku')
  )

  unsub = onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    orders.value = all

    // podsumowanie: zliczamy ilości pozycji
    const counts = {}
    all.forEach((o) =>
        (o.items || []).forEach((i) => {
          counts[i.name] = (counts[i.name] || 0) + (i.quantity || 0)
        })
    )
    summary.value = counts
  })
})

onUnmounted(() => {
  if (unsub) unsub()
})

// kolor paska na górze w zależności od typu zamówienia
const orderTypeClass = (order) => {
  const type = (order.place || order.type || '').toLowerCase()

  if (type.includes('miejs')) return 'k-type-namiejscu'     // "na miejscu"
  if (type.includes('wynos')) return 'k-type-nawynos'      // "na wynos"
  if (type.includes('dostaw')) return 'k-type-dostawa'     // "dostawa"

  return 'order-top-default'
}

const logout = async () => {
  await signOut(auth)
  router.replace('/login')
}

const formatTime = (ts) => {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
:root {
  --sage: #88b29a;
  --sage-dark: #6a9b81;
  --orange-soft: #ffe3c2;
  --gray-soft: #e5e7eb;
  --bg: #f5f7f5;
  --card: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --radius: 1rem;
}

.view-container {
  background: var(--bg);
  min-height: 100vh;
  padding: 1.5rem;
  font-family: 'Inter', sans-serif;
  color: var(--text);
}

.kitchen-layout {
  max-width: 1200px;
  margin: 0 auto;
}

.kitchen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
}

/* layout: zamówienia z lewej, podsumowanie z prawej */
.main-layout {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-top: 1rem;
}

.orders-section {
  flex: 3;
}

.summary-bar {
  flex: 1;
  margin-top: 0;
}

/* przyciski */
.btn-outline {
  border-radius: 9999px;
  padding: 0.6rem 1.2rem;
  border: 2px solid #ff8a3c;
  color: #e67700;
  background: white;
  cursor: pointer;
  font-weight: 600;
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

/* karta podsumowania */
.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

.section-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
}
.summary-item {
  background: #f9faf9;
  border-radius: 0.75rem;
  padding: 0.6rem;
  text-align: center;
}
.summary-name {
  font-weight: 600;
  color: var(--muted);
}
.summary-count {
  font-size: 1.25rem;
  color: var(--sage-dark);
}

/* ZAMÓWIENIA – siatka, która się zawija */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem; /* mniejsze odstępy */
  margin-top: 0.75rem;
}

/* pojedyncza „kolumna” */
.order-card {
  background: transparent;
  border: none;
  box-shadow: none;
}
/* pasek nagłówka wspólne style */
.order-top {
  padding: 0.45rem 0.7rem;
  border-radius: 12px 12px 0 0;
  font-weight: 600;
  color: #111;
  border-bottom: 1px solid #e5e7eb;
}

.order-number {
  font-weight: 700;
}
.order-meta {
  font-size: 0.8rem;
  opacity: 0.9;
}

/* biała kartka */
.order-body {
  background: #ffffff;
  border-radius: 0 0 12px 12px;
  padding: 0.6rem 0.7rem 0.7rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.16);
}

.order-place {
  font-style: italic;
  margin-bottom: 0.25rem;
}

.order-items {
  margin: 0;
  padding: 0.2rem 0 0.1rem;
  list-style: none;
}
.order-items li {
  font-size: 0.9rem;
}

.empty-info {
  margin-top: 1rem;
  text-align: center;
}

.muted {
  color: var(--muted);
}

/* RWD – na mniejszych ekranach podsumowanie pod spodem */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }
  .summary-bar {
    width: 100%;
  }
}
</style>
