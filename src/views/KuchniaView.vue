<template>
  <div class="kuchnia-root">

    <!-- HEADER -->
    <header class="kuchnia-header">
      <div class="header-brand">
        <h1 class="kuchnia-title">Panel Kuchni</h1>
      </div>
      <nav class="header-nav">
        <button v-if="userRole === 'admin'" class="btn-nav" @click="router.push('/admin')">Admin</button>
        <button v-if="userRole === 'admin'" class="btn-nav" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-nav btn-nav--logout" @click="logout">Wyloguj</button>
      </nav>
    </header>

    <div class="kuchnia-layout">
      <!-- ZEGAR -->
      <div class="kitchen-clock">
        {{ currentTime.slice(0, 5) }}<span class="clock-seconds">:{{ currentTime.slice(6) }}</span>
      </div>

      <div class="main-layout">

        <!-- LEWA – ZAMÓWIENIA -->
        <section class="orders-section">
          <transition-group name="fade" tag="div" class="orders-grid">
            <div v-for="order in orders" :key="order.id" class="order-card">

              <!-- nagłówek karty -->
              <div class="order-top" :class="orderTypeClass(order)">
                <div class="order-top-row">
                  <div class="order-number">
                    <span class="order-num-badge">{{ order.table ? 'Stolik: ' + order.table : String(order.number).slice(-5) }}</span>
                    <span v-if="order.edited" class="edited-badge">EDITED</span>
                  </div>
                  <span class="order-timer" :class="elapsedClass(order.createdAt)">⏱ {{ formatElapsed(order.createdAt) }}</span>
                </div>
                <div class="order-meta">
                  {{ formatTime(order.createdAt) }}
                  <span v-if="order.waiter">, {{ order.waiter }}</span>
                  <span class="order-type-pill">{{ order.type === 'na_miejscu' ? 'Na miejscu' : 'Na wynos' }}</span>
                </div>
              </div>

              <!-- ciało karty -->
              <div class="order-body">
                <!-- Nowy format: osoby -->
                <template v-if="order.persons && order.persons.length">
                  <div v-for="person in order.persons" :key="person.seat" class="person-block">
                    <div class="person-block-header">Osoba {{ person.seat }}</div>
                    <ol class="order-items">
                      <li v-for="(item, i) in filterKitchenItems(person.items)" :key="item.name + i" class="order-item-line">
                        <div class="order-item-main">
                          <span class="item-num">•</span>
                          <span v-if="item.quantity && item.quantity !== 1" class="item-portion-prefix">{{ formatPortionPrefix(item.quantity, item.name) }}</span>
                          <span class="item-name">{{ item.name }}</span>
                        </div>
                        <div v-if="item.extras && item.extras.length" class="item-extras-list">
                          <span v-for="extra in item.extras" :key="extra" class="item-extras">+ {{ extra }}</span>
                        </div>
                      </li>
                    </ol>
                  </div>
                </template>
                <!-- Stary format: płaska lista -->
                <template v-else>
                  <ol class="order-items">
                    <li v-for="(item, i) in filterKitchenItems(order.items)" :key="item.name + i" class="order-item-line">
                      <div class="order-item-main">
                        <span class="item-num">•</span>
                        <span v-if="item.quantity && item.quantity !== 1" class="item-portion-prefix">{{ formatPortionPrefix(item.quantity, item.name) }}</span>
                        <span class="item-name">{{ item.name }}</span>
                      </div>
                    </li>
                  </ol>
                </template>
              </div>

            </div>
          </transition-group>

          <p v-if="orders.length === 0" class="empty-info muted">Brak aktywnych zamówień 🍲</p>
        </section>

        <!-- PRAWA – PODSUMOWANIE (wyłączone)
        <aside class="summary-bar">
          <h2 class="summary-title">📋 Podsumowanie</h2>
          <div class="summary-list">
            <div v-for="(count, name) in summary" :key="name" class="summary-item">
              <span class="summary-name">{{ name }}</span>
              <span class="summary-count">{{ count }}</span>
            </div>
          </div>
          <p v-if="Object.keys(summary).length === 0" class="muted empty-info">Brak pozycji</p>
        </aside>
        -->

      </div>
    </div>

  </div>
</template>

<script setup>
/**
 * AI: Vue component should contain only presentation logic.
 * Move business logic to composables.
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { db } from '@/firebase'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { formatTime, formatPortionPrefix } from '@/utils/formatters'
import { getRoleForEmail } from '@/router'
import { auth } from '@/firebase'

const router = useRouter()
const { logout } = useAuth()
const orders = ref([])
const now = ref(Date.now())
const userRole = ref(null)

let unsub = null
let ticker = null

// ==================== Lifecycle ====================
onMounted(() => {
  ticker = setInterval(() => { now.value = Date.now() }, 1000)

  const currentUser = auth.currentUser
  if (currentUser?.email) {
    getRoleForEmail(currentUser.email, currentUser.uid).then(role => {
      userRole.value = role
    })
  }

  const q = query(
    collection(db, 'orders'),
    where('status', '==', 'w_toku')
  )

  unsub = onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    orders.value = all.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0))
  })
})

onUnmounted(() => {
  if (unsub) unsub()
  if (ticker) clearInterval(ticker)
})

// ==================== Auth ====================
// logout provided by useAuth()

// ==================== Helpers ====================
const orderTypeClass = (order) => {
  const type = (order.place || order.type || '').toLowerCase()
  if (type.includes('miejs')) return 'k-type-namiejscu'
  if (type.includes('wynos')) return 'k-type-nawynos'
  if (type.includes('dostaw')) return 'k-type-dostawa'
  return 'order-top-default'
}

const filterKitchenItems = (items) => {
  if (!items) return []
  return items.filter(item => {
    if (item.category === 'napoje') return item.showInKitchen === true
    return true
  })
}

const currentTime = computed(() => {
  return new Date(now.value).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
})

const formatElapsed = (ts) => {
  if (!ts?.seconds) return '00:00'
  const elapsed = Math.floor((now.value - ts.seconds * 1000) / 1000)
  if (elapsed < 0) return '00:00'
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const elapsedClass = (ts) => {
  if (!ts?.seconds) return ''
  const mins = (now.value - ts.seconds * 1000) / 60000
  if (mins >= 20) return 'timer--danger'
  if (mins >= 10) return 'timer--warning'
  return 'timer--ok'
}
</script>

<style scoped>

/* ===================== ROOT ===================== */
.kuchnia-root {
  min-height: 100vh;
  background: #ffffff;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--text);
}

/* ===================== HEADER ===================== */
.kuchnia-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 0.65rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.header-brand { display: flex; align-items: center; gap: 0.6rem; }
.header-icon { font-size: 1.6rem; line-height: 1; }
.kuchnia-title { font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: #000; }
.header-nav { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.btn-nav {
  background: #e5e7eb;
  border: 2px solid #111827;
  color: #111827;
  border-radius: 9999px;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.18s;
}
.btn-nav:hover { background: #d1d5db; }
.btn-nav--logout { background: #e5e7eb; border-color: #111827; color: #111827; }

/* ===================== LAYOUT ===================== */
.kuchnia-layout {
  width: 100%;
  padding: 1.25rem 1.25rem 2rem;
}
.main-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.orders-section { flex: 1; min-width: 0; width: 100%; }
.kitchen-clock {
  text-align: center;
  font-size: 3.5rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  color: #111827;
  padding: 0.5rem 0 1rem;
  line-height: 1;
}
.clock-seconds { color: #9ca3af; font-weight: 700; }

.orders-section { flex: 3; min-width: 0; }

/* ===================== SIATKA ZAMÓWIEŃ ===================== */
.orders-grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 1.25rem;
}

/* ===================== KARTA ZAMÓWIENIA ===================== */
.order-card {
  width: 345px;
  flex-shrink: 0;
  border-radius: var(--radius);
  box-shadow: 0 2px 10px rgba(0,0,0,0.09);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}

.order-top {
  padding: 0.45rem 0.6rem;
  font-weight: 600;
  color: #111;
}
.k-type-namiejscu  { background: #dbeafe; border-bottom: 2px solid #93c5fd; }
.k-type-nawynos    { background: #fef9c3; border-bottom: 2px solid #fde047; }
.k-type-dostawa    { background: #dcfce7; border-bottom: 2px solid #86efac; }
.order-top-default { background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }

.order-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.order-number {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.order-num-badge {
  font-weight: 900;
  font-size: 1.6rem;
  color: #111827;
}

.edited-badge {
  display: inline-block;
  background: #e03131;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.65rem;
  border-radius: 0.35rem;
  text-transform: uppercase;
  animation: blink 1.2s step-start infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}

.order-timer {
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.65rem;
  border-radius: 0.4rem;
}
.timer--ok      { background: #dcfce7; color: #15803d; }
.timer--warning { background: #fef9c3; color: #a16207; }
.timer--danger  { background: #fee2e2; color: #b91c1c; animation: blink 1s step-start infinite; }

.order-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 1.2rem;
  color: #374151;
}
.order-type-pill {
  background: rgba(0,0,0,0.08);
  border-radius: 9999px;
  padding: 0.05rem 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  margin-left: auto;
}

/* ciało karty */
.order-body {
  background: #ffffff;
  padding: 0.45rem 0.6rem 0.6rem;
}

/* ===================== BLOKI OSÓB ===================== */
.person-block {
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 2px solid #9ca3af;
}
.person-block:first-child { margin-top: 0; padding-top: 0; border-top: none; }
.person-block-header {
  font-size: 1rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #9ca3af;
  margin-bottom: 0.45rem;
}

/* ===================== POZYCJE ===================== */
.order-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.order-item-line {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  line-height: 1.35;
  min-width: 0;
}

.order-item-main {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.35rem;
  align-items: center;
  min-width: 0;
}
.item-num {
  font-size: 1rem;
  font-weight: 700;
  color: #9ca3af;
  min-width: 1rem;
  flex-shrink: 0;
  line-height: 1;
}

.item-portion-prefix {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1e3a8a;
  flex-shrink: 0;
  letter-spacing: -0.01em;
}
.item-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  flex: 1;
  min-width: 0;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}
.item-portion {
  font-size: 1.25rem;
  font-weight: 500;
  color: #6b7280;
}
.item-extras-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 1.35rem;
}
.item-extras {
  font-size: 1.35rem;
  font-weight: 500;
  color: #6b7280;
  font-style: italic;
}

/* ===================== MISC ===================== */
.muted { color: var(--muted); }
.empty-info { text-align: center; padding: 2rem 0; font-size: 0.95rem; }

/* ===================== ANIMACJE ===================== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(6px); }

/* ===================== RWD ===================== */
@media (max-width: 900px) {
  .main-layout { flex-direction: column; }
  .kuchnia-header { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
}
</style>
