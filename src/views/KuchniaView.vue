<template>
  <div class="kuchnia-root">

    <!-- HEADER -->
    <header class="kuchnia-header">
      <div class="header-brand">
        <span class="header-icon">👩‍🍳</span>
        <h1 class="kuchnia-title">Panel Kuchni</h1>
      </div>
      <nav class="header-nav">
        <button class="btn-nav" @click="router.push('/admin')">Admin</button>
        <button class="btn-nav" @click="router.push('/obsluga')">Obsługa</button>
        <button class="btn-nav btn-nav--logout" @click="logout">Wyloguj</button>
      </nav>
    </header>

    <div class="kuchnia-layout">
      <div class="main-layout">

        <!-- LEWA – ZAMÓWIENIA -->
        <section class="orders-section">
          <transition-group name="fade" tag="div" class="orders-grid">
            <div v-for="order in orders" :key="order.id" class="order-card">

              <!-- nagłówek karty -->
              <div class="order-top" :class="orderTypeClass(order)">
                <div class="order-number">
                  <span class="order-num-badge">#{{ order.number }}</span>
                  <span v-if="order.edited" class="edited-badge">EDITED</span>
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
                      <li v-for="(item, i) in person.items" :key="item.name + i" class="order-item-line">
                        <span class="item-num">{{ i + 1 }}.</span>
                        <span class="item-name">
                          {{ item.count && item.count > 1 ? item.count + '× ' : '' }}{{ item.name }}
                        </span>
                        <span v-if="item.quantity && item.quantity !== 1" class="item-portion">({{ formatPortionLabel(item.quantity, item.name) }})</span>
                        <span v-if="item.extras && item.extras.length" class="item-extras">+ {{ item.extras.join(', ') }}</span>
                      </li>
                    </ol>
                  </div>
                </template>
                <!-- Stary format: płaska lista -->
                <template v-else>
                  <ol class="order-items">
                    <li v-for="(item, i) in order.items" :key="item.name + i" class="order-item-line">
                      <span class="item-num">{{ i + 1 }}.</span>
                      <span class="item-name">{{ item.count && item.count > 1 ? item.count + '× ' : '' }}{{ item.name }}</span>
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

import { ref, onMounted, onUnmounted } from 'vue'
import { auth, db } from '@/firebase'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { clearRoleCache } from '@/router'

const router = useRouter()
const orders = ref([])
const summary = ref({})

let unsub = null

// ==================== Lifecycle ====================
onMounted(() => {
  const q = query(
    collection(db, 'orders'),
    where('status', '==', 'w_toku')
  )

  unsub = onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    orders.value = all

    // Zliczanie ilości pozycji
    summary.value = all.reduce((acc, order) => {
      (order.items || []).forEach(item => {
        acc[item.name] = (acc[item.name] || 0) + (item.quantity || 0)
      })
      return acc
    }, {})
  })
})

onUnmounted(() => {
  if (unsub) unsub()
})

// ==================== Auth ====================
const logout = async () => {
  clearRoleCache()
  await signOut(auth)
  router.replace('/login')
}

// ==================== Helpers ====================
const orderTypeClass = (order) => {
  const type = (order.place || order.type || '').toLowerCase()

  if (type.includes('miejs')) return 'k-type-namiejscu'
  if (type.includes('wynos')) return 'k-type-nawynos'
  if (type.includes('dostaw')) return 'k-type-dostawa'

  return 'order-top-default'
}

const formatTime = (ts) => {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPortionLabel = (val, itemName) => {
  if (val == null) return ''
  if (itemName === 'golonka') return `${Math.round(val * 100)}g`
  const labels = { 1: 'cała porcja', 0.5: '½ porcji', 1.5: '1 ½ porcji', 2: 'podwójna porcja' }
  return labels[val] || `${val} porcji`
}
</script>

<style scoped>
/* ===================== ZMIENNE ===================== */
:root {
  --green-dark: #2b8a3e;
  --orange: #ff8a3c;
  --orange-dark: #e67700;
  --orange-soft: #ffe8d5;
  --text: #111827;
  --muted: #6b7280;
  --border-subtle: #e5e7eb;
  --radius: 1rem;
}

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

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-icon { font-size: 1.6rem; line-height: 1; }

.kuchnia-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
  color: #000;
}

.header-nav {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

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
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2rem;
}

.main-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.orders-section { flex: 3; min-width: 0; }

/* ===================== SIATKA ZAMÓWIEŃ ===================== */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.85rem;
}

/* ===================== KARTA ZAMÓWIENIA ===================== */
.order-card {
  border-radius: var(--radius);
  box-shadow: 0 2px 10px rgba(0,0,0,0.09);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}

/* nagłówek – kolorowy pasek */
.order-top {
  padding: 0.3rem 0.4rem;
  font-weight: 600;
  color: #111;
}

.k-type-namiejscu { background: #dbeafe; border-bottom: 2px solid #93c5fd; }
.k-type-nawynos   { background: #fef9c3; border-bottom: 2px solid #fde047; }
.k-type-dostawa   { background: #dcfce7; border-bottom: 2px solid #86efac; }
.order-top-default { background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }

.order-number {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-bottom: 0.15rem;
}

.order-num-badge {
  font-weight: 900;
  font-size: 1.1rem;
  color: #111827;
}

.edited-badge {
  display: inline-block;
  background: #e03131;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.45rem;
  border-radius: 0.35rem;
  text-transform: uppercase;
  animation: blink 1.2s step-start infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: #374151;
}

.order-type-pill {
  background: rgba(0,0,0,0.08);
  border-radius: 9999px;
  padding: 0.05rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
}

/* ciało karty */
.order-body {
  background: #ffffff;
  padding: 0.3rem 0.4rem 0.4rem;
}

/* ===================== BLOKI OSÓB ===================== */
.person-block {
  margin-top: 0.5rem;
  padding-top: 0.45rem;
  border-top: 2px solid #9ca3af;
}
.person-block:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.person-block-header {
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #9ca3af;
  margin-bottom: 0.3rem;
}

/* ===================== POZYCJE ===================== */
.order-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.order-item-line {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.25rem;
  align-items: baseline;
  line-height: 1.35;
  min-width: 0;
}

.item-num {
  font-size: 0.82rem;
  font-weight: 700;
  color: #9ca3af;
  min-width: 1.3rem;
  flex-shrink: 0;
}

.item-name {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  flex: 1;
  min-width: 0;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.item-portion {
  font-size: 0.85rem;
  font-weight: 500;
  color: #6b7280;
}

.item-extras {
  font-size: 0.85rem;
  font-weight: 500;
  color: #6b7280;
  font-style: italic;
}

/* ===================== PODSUMOWANIE ===================== */
.summary-bar {
  flex: 1;
  min-width: 180px;
  background: #ffffff;
  border-radius: var(--radius);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  padding: 1rem;
  position: sticky;
  top: 4.5rem;
}

.summary-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--green-dark);
  margin: 0 0 0.75rem;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
}

.summary-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #111827;
}

.summary-count {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--orange-dark);
  background: var(--orange-soft);
  border-radius: 0.35rem;
  padding: 0.05rem 0.5rem;
  border: 1px solid #ffd6aa;
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
  .summary-bar { width: 100%; position: static; }
  .kuchnia-header { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
}
</style>
