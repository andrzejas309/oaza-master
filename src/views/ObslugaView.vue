<template>
  <div class="view-container obsluga-layout">
    <!-- HEADER -->
    <header class="obsluga-header">
      <h1 class="obsluga-title">Panel Obsługi</h1>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn-outline btn-sm" @click="router.push('/admin')">Admin</button>
        <button class="btn-outline btn-sm" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-outline btn-sm" @click="logout">Wyloguj</button>
      </div>
    </header>

    <!-- AKCJE -->
    <div class="actions-bar">
      <button class="btn-sage" @click="toggleOrderForm">
        {{ showForm ? '✖ Anuluj' : '+ Dodaj zamówienie' }}
      </button>
    </div>

    <!-- SEKCJA DODAWANIA ZAMÓWIENIA -->
    <section v-if="showForm" class="card order-form">
      <h2 class="section-title">Nowe zamówienie</h2>
      <div class="order-type-buttons">
        <button class="order-type-pill" :class="{ active: selectedOrderType === 'na_miejscu' }" @click="selectedOrderType = 'na_miejscu'">Na miejscu</button>
        <button class="order-type-pill" :class="{ active: selectedOrderType === 'na_wynos' }" @click="selectedOrderType = 'na_wynos'">Na wynos</button>
      </div>
      <p class="muted">Kliknij na danie, aby dodać do zamówienia.</p>

      <!-- MENU -->
      <div class="menu-section">
        <!-- KATEGORIE -->
        <div class="alphabet-row">
          <button
              v-for="cat in categoryList"
              :key="cat"
              class="letter-pill"
              :class="{ active: selectedCategory === cat }"
              @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <!-- MENU POGRUPOWANE -->
        <div class="menu-list">
          <template v-for="(items, cat) in filteredMenu" :key="cat">
            <h3 class="section-title">{{ cat }}</h3>

            <div
                v-for="item in items"
                :key="item.name"
                class="menu-item-row"
                @click="increase(item)"
            >
              <div>{{ item.name }}</div>
              <div class="muted">{{ item.price }} zł</div>
            </div>
          </template>
        </div>
      </div>

      <!-- AKTUALNE ZAMÓWIENIE -->
      <div class="current-order">
        <h3 class="section-title">Aktualne zamówienie</h3>
        <ul v-if="orderItems.length" class="order-items-list">
          <li
              v-for="item in orderItems"
              :key="item.name"
              class="order-item-row"
          >
            <div>
              <div>
                {{ item.name }}
                <span class="muted">
                  ({{ formatPortionLabel(item.quantity) }})
                </span>
                <span v-if="item.count > 1" class="count-badge">x{{ item.count }}</span>
              </div>
              <div
                  v-if="item.extras && item.extras.length"
                  class="muted"
                  style="font-size: 0.85rem;"
              >
                + {{ item.extras.join(', ') }}
              </div>
            </div>

            <div class="order-item-right">
              <span class="muted">{{ item.finalPrice.toFixed(2) }} zł</span>

              <div class="order-item-actions">
                <button
                    class="icon-btn add"
                    @click="increaseOrderItemCount(item.name)"
                    title="Dodaj jeszcze jedną pozycję"
                >
                  +
                </button>
                <button
                    class="icon-btn subtract"
                    @click="decreaseOrderItemCount(item.name)"
                    title="Usuń jedną pozycję"
                    :disabled="item.count <= 1"
                >
                  −
                </button>
                <button
                    v-if="canEditItem(item)"
                    class="icon-btn edit"
                    @click="startEditItem(item)"
                    title="Edytuj składniki"
                >
                  ✏️
                </button>
                <button
                    class="icon-btn delete"
                    @click="removeItem(item)"
                    title="Usuń pozycję"
                >
                  ✖
                </button>
              </div>
            </div>
          </li>
        </ul>

        <!-- POJEMNIKI -->
        <div class="containers-row">
          <div class="containers-label">
            <span>Pojemniki</span>
          </div>
          <div class="containers-controls">
            <button class="counter-btn" @click="decreaseContainers">−</button>
            <span class="counter-value">{{ containerCount }}</span>
            <button class="counter-btn" @click="increaseContainers">+</button>
          </div>
        </div>

        <p v-if="!orderItems.length && containerCount === 0" class="muted">Brak pozycji.</p>

        <div class="order-summary" v-if="orderItems.length || containerCount > 0">
          <span>Razem:</span>
          <strong>{{ totalPrice.toFixed(2) }} zł</strong>
        </div>

        <div class="order-actions">
          <button
              class="btn-sage"
              @click="saveOrder"
              :disabled="!orderItems.length || saving || !selectedOrderType"
          >
            ✅ {{ saving ? 'Zapisywanie...' : 'Zapisz zamówienie' }}
          </button>
        </div>
      </div>
    </section>

    <!-- SEKCJA AKTYWNYCH ZAMÓWIEŃ -->
    <section class="card orders-section">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 class="section-title">Zamówienia na miejscu</h2>
        <span v-if="onSiteQueueCount > 0" class="queue-badge">Kolejka: {{ onSiteQueueCount }}</span>
      </div>
      <transition-group name="fade" tag="div" class="orders-list">
        <div
            v-for="order in ordersOnSite"
            :key="order.id"
            class="order-card"
        >
          <div class="order-info">
            <div class="order-number">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>#{{ order.number }}</span>
                <span class="order-time">{{ formatTime(order.createdAt) }}</span>
              </div>
            </div>
            <div class="order-items">
              <div
                  v-for="item in order.items"
                  :key="item.name"
                  class="order-item"
              >
                <div>
                  {{ item.name }}
                  <span class="muted">
                    ({{ formatPortionLabel(item.quantity ?? 1) }})
                  </span>
                </div>
                <div
                    v-if="item.extras && item.extras.length"
                    class="muted"
                    style="font-size: 0.8rem;"
                >
                  + {{ item.extras.join(', ') }}
                </div>
              </div>
            </div>
          </div>
          <button
              class="btn-sage-outline btn-sm"
              @click="markAsReady(order)"
          >
            Gotowe
          </button>
        </div>
      </transition-group>

      <p
          v-if="ordersOnSite.length === 0"
          class="muted"
          style="text-align:center;"
      >
        Brak aktywnych zamówień
      </p>
    </section>

    <section class="card orders-section">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 class="section-title">Zamówienia na wynos</h2>
        <span v-if="toGoQueueCount > 0" class="queue-badge">Kolejka: {{ toGoQueueCount }}</span>
      </div>
      <transition-group name="fade" tag="div" class="orders-list">
        <div
            v-for="order in ordersToGo"
            :key="order.id"
            class="order-card"
        >
          <div class="order-info">
            <div class="order-number">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>#{{ order.number }}</span>
                <span class="order-time">{{ formatTime(order.createdAt) }}</span>
              </div>
            </div>
            <div class="order-items">
              <div
                  v-for="item in order.items"
                  :key="item.name"
                  class="order-item"
              >
                <div>
                  {{ item.name }}
                  <span class="muted">
                    ({{ formatPortionLabel(item.quantity ?? 1) }})
                  </span>
                </div>
                <div
                    v-if="item.extras && item.extras.length"
                    class="muted"
                    style="font-size: 0.8rem;"
                >
                  + {{ item.extras.join(', ') }}
                </div>
              </div>
            </div>
          </div>
          <button
              class="btn-sage-outline btn-sm"
              @click="markAsReady(order)"
          >
            Gotowe
          </button>
        </div>
      </transition-group>

      <p
          v-if="ordersToGo.length === 0"
          class="muted"
          style="text-align:center;"
      >
        Brak aktywnych zamówień
      </p>
    </section>

    <!-- OKNO WYBORU PORCJI (DODAWANIE) -->
    <div v-if="portionDialogOpen" class="portion-dialog-backdrop" @click.self="portionDialogOpen = false">
      <div class="portion-dialog">
        <h3>Wybierz porcję</h3>
        <p class="muted">{{ portionDialogItem?.name }}</p>

        <div class="portion-buttons">
          <button
              v-for="p in PORTIONS"
              :key="p.value"
              class="btn-sage"
              @click="choosePortion(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- POPUP EDYCJI SKŁADNIKÓW -->
    <div v-if="extrasDialogOpen" class="portion-dialog-backdrop" @click.self="extrasDialogOpen = false">
      <div class="portion-dialog">
        <h3>Składniki dodatkowe</h3>
        <p class="muted">{{ extrasDialogItem?.name }}</p>

        <div class="portion-buttons">
          <button
              v-for="extra in extrasOptions"
              :key="extra.name"
              class="btn-sage"
              :class="{ active: extrasSelected.includes(extra.name) }"
              @click="toggleExtra(extra.name)"
          >
            {{ extra.name }} (+{{ extra.price }} zł)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { auth, db } from '@/firebase'
import { signOut } from 'firebase/auth'
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import menuJson from '../data/menu.json'
import { useRouter } from 'vue-router'

const router = useRouter()

// ==================== Constants ====================
const MAX_ORDERS_DISPLAY = 8

const PORTIONS_FULL = [
  { label: 'Cała porcja', value: 1 },
  { label: 'Pół', value: 0.5 },
  { label: 'Półtora', value: 1.5 },
  { label: 'Podwójna', value: 2 },
]

const PORTIONS_HALF = [
  { label: 'Cała porcja', value: 1 },
  { label: 'Pół', value: 0.5 },
]

const EXTRAS = [
  { name: 'jajko', price: 3 },
  { name: 'pieczarki', price: 3 },
  { name: 'cebula', price: 3 },
  { name: 'ser', price: 3 },
  { name: 'porcja uszek', price: 6 },
  { name: 'porcja makaronu', price: 3 },
  { name: 'porcja ryżu', price: 3 },
  { name: 'bez kiełbasy', price: 0 },
  { name: 'bez sosu', price: 0 },
  { name: 'bez sera', price: 0 },
  { name: 'bez ananasa', price: 0 },
  { name: 'w panierce z mąki', price: 0 },
  { name: 'pieczywo', price: 1 },
  { name: 'bez ziela', price: 0 },
]

const EXTRAS_FOR_SIDES = [
  { name: 'z sosem', price: 0 },
  { name: 'ubite', price: 0 },
  { name: 'bez ziela', price: 0 },
]

const EXTRAS_FOR_MAIN = EXTRAS.filter(
  (e) => e.name !== 'porcja uszek' && e.name !== 'porcja makaronu' && e.name !== 'bez kiełbasy',
)

const EXTRAS_FOR_SOUPS = EXTRAS.filter(
  (e) => ['porcja uszek', 'porcja makaronu', 'porcja ryżu', 'bez kiełbasy', 'pieczywo', 'bez ziela'].includes(e.name),
)

const EXTRAS_PRICE = EXTRAS.reduce((map, e) => {
  map[e.name] = e.price
  return map
}, {})

const portionExcluded = [
  'rosół',
  'barszcz czerwony',
  'chłodnik',
  'flaczki',
  'żurek z kiełbaską',
]

const categoryList = ['zupy', 'dania główne', 'dodatki', 'surówki', 'napoje', 'składniki']

const menu = menuJson

// ==================== State ====================
const showForm = ref(false)
const saving = ref(false)
const activeOrders = ref([])
const selectedOrderType = ref(null)
const selectedCategory = ref('zupy')
const containerCount = ref(0)
const orderDraft = reactive({ items: {} })

// Dialog state
const portionDialogOpen = ref(false)
const portionDialogItem = ref(null)
const PORTIONS = ref(PORTIONS_FULL)
const extrasDialogOpen = ref(false)
const extrasDialogItem = ref(null)
const extrasSelected = ref([])
const extrasOptions = ref(EXTRAS)

let unsub = null

// ==================== Lifecycle ====================
onMounted(() => {
  unsub = onSnapshot(collection(db, 'orders'), (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    activeOrders.value = all.filter((o) => o.status === 'w_toku')
  })
})

onUnmounted(() => unsub && unsub())

// ==================== Computed - Containers ====================
const containerPrice = computed(() => {
  const container = menu.find((m) => m.name === 'pojemniki')
  return container ? container.price : 0
})

const containersPrice = computed(() => containerCount.value * containerPrice.value)

// ==================== Computed - Menu ====================
const filteredMenu = computed(() => {
  const grouped = {}

  for (const item of menu) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }

  const selectedItems = (grouped[selectedCategory.value] || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }))

  return {
    [selectedCategory.value]: selectedItems,
  }
})

// ==================== Computed - Order Items ====================
const orderItems = computed(() =>
  Object.entries(orderDraft.items)
    .filter(([, data]) => data.quantity > 0)
    .map(([name, data]) => {
      const found = menu.find((m) => m.name === name)
      const basePrice = found?.price || 0

      const extrasPrice = (data.extras || []).reduce(
        (sum, extraName) => sum + (EXTRAS_PRICE[extraName] || 0),
        0,
      )

      const unitPrice = basePrice + extrasPrice
      const itemCount = data.count || 1
      const finalPrice = unitPrice * data.quantity * itemCount

      return {
        name,
        quantity: data.quantity,
        count: itemCount,
        extras: data.extras || [],
        basePrice,
        extrasPrice,
        unitPrice,
        finalPrice,
      }
    }),
)

const totalPrice = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.finalPrice, 0) + containersPrice.value
)

// ==================== Computed - Orders Filtering ====================
const ordersOnSite = computed(() =>
  activeOrders.value.filter((o) => o.type === 'na_miejscu').slice(0, MAX_ORDERS_DISPLAY)
)

const ordersToGo = computed(() =>
  activeOrders.value.filter((o) => o.type === 'na_wynos').slice(0, MAX_ORDERS_DISPLAY)
)

const onSiteQueueCount = computed(() => {
  const total = activeOrders.value.filter((o) => o.type === 'na_miejscu').length
  return Math.max(0, total - MAX_ORDERS_DISPLAY)
})

const toGoQueueCount = computed(() => {
  const total = activeOrders.value.filter((o) => o.type === 'na_wynos').length
  return Math.max(0, total - MAX_ORDERS_DISPLAY)
})

// ==================== Helper Functions ====================
const ensureEntry = (name) => {
  if (!orderDraft.items[name]) {
    orderDraft.items[name] = {
      quantity: 0,
      count: 1,
      extras: [],
    }
  }
  return orderDraft.items[name]
}

const canEditItem = (orderItem) => {
  const base = menu.find((m) => m.name === orderItem.name)
  if (!base) return false
  return ['zupy', 'dania główne', 'dodatki'].includes(base.category)
}

const formatPortionLabel = (val) => {
  if (val == null) return '1 porcja'
  const labels = {
    1: 'cała porcja',
    0.5: '½ porcji',
    1.5: '1 ½ porcji',
    2: 'podwójna porcja'
  }
  return labels[val] || `${val} porcji`
}

const formatTime = (ts) => {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ==================== Order Item Management ====================
const removeItem = (item) => {
  delete orderDraft.items[item.name]
}

const increase = (item) => {
  const portionCategories = ['zupy', 'dodatki', 'surówki']

  if (portionExcluded.includes(item.name)) {
    const entry = ensureEntry(item.name)
    entry.quantity += 1
    return
  }

  if (portionCategories.includes(item.category)) {
    PORTIONS.value = ['dodatki', 'surówki'].includes(item.category)
      ? PORTIONS_HALF
      : PORTIONS_FULL

    portionDialogItem.value = item
    portionDialogOpen.value = true
    return
  }

  const entry = ensureEntry(item.name)
  entry.quantity += 1
}

const increaseOrderItemCount = (itemName) => {
  const entry = orderDraft.items[itemName]
  if (entry) {
    entry.count = (entry.count || 1) + 1
  }
}

const decreaseOrderItemCount = (itemName) => {
  const entry = orderDraft.items[itemName]
  if (entry && entry.count > 1) {
    entry.count -= 1
  }
}

// ==================== Portion Dialog ====================
const choosePortion = (value) => {
  const item = portionDialogItem.value
  if (!item) return

  const entry = ensureEntry(item.name)
  entry.quantity += value

  portionDialogOpen.value = false
  portionDialogItem.value = null
}

// ==================== Extras Dialog ====================
const startEditItem = (orderItem) => {
  const base = menu.find((m) => m.name === orderItem.name)
  if (!base) return

  const categoryExtras = {
    'dania główne': EXTRAS_FOR_MAIN,
    'zupy': EXTRAS_FOR_SOUPS,
    'dodatki': EXTRAS_FOR_SIDES
  }

  const extras = categoryExtras[base.category]
  if (!extras) return

  extrasOptions.value = extras
  extrasDialogItem.value = base
  const current = orderDraft.items[orderItem.name]
  extrasSelected.value = current?.extras ? [...current.extras] : []

  extrasDialogOpen.value = true
}

const toggleExtra = (name) => {
  const idx = extrasSelected.value.indexOf(name)
  if (idx === -1) {
    extrasSelected.value.push(name)
  } else {
    extrasSelected.value.splice(idx, 1)
  }

  saveExtras()
}

const saveExtras = () => {
  const item = extrasDialogItem.value
  if (!item) return

  const entry = ensureEntry(item.name)
  entry.extras = [...extrasSelected.value]

  extrasDialogOpen.value = false
  extrasDialogItem.value = null
}

// ==================== Container Management ====================
const increaseContainers = () => {
  containerCount.value++
}

const decreaseContainers = () => {
  if (containerCount.value > 0) {
    containerCount.value--
  }
}

// ==================== Form Management ====================
const toggleOrderForm = () => {
  showForm.value = !showForm.value
  if (!showForm.value) {
    orderDraft.items = {}
    selectedOrderType.value = null
    containerCount.value = 0
  }
}

// ==================== Order Operations ====================
const saveOrder = async () => {
  if (!orderItems.value.length) return
  saving.value = true
  await addDoc(collection(db, 'orders'), {
    number: Date.now(),
    items: orderItems.value,
    containers: containerCount.value,
    type: selectedOrderType.value,
    status: 'w_toku',
    createdAt: serverTimestamp(),
  })
  orderDraft.items = {}
  selectedOrderType.value = null
  containerCount.value = 0
  showForm.value = false
  saving.value = false
}

const markAsReady = async (order) => {
  await updateDoc(doc(db, 'orders', order.id), { status: 'gotowe' })
}

// ==================== Auth ====================
const logout = async () => {
  await signOut(auth)
  router.replace('/login')
}
</script>

<style scoped>
:root {
  /* Główna paleta */
  --green: #2f9e44;
  --green-dark: #2b8a3e;
  --green-soft: #d3f9d8;

  --orange: #ff8a3c;
  --orange-dark: #e67700;
  --orange-soft: #ffe8d5;

  /* Tła / tekst */
  --bg: #fff7f0;
  --card: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border-subtle: #e5e7eb;
  --radius: 1rem;
}

/* GŁÓWNY KONTAINER */
.view-container {
  background: var(--bg);
  min-height: 100vh;
  padding: 1.5rem;
  font-family: 'Inter', sans-serif;
  color: var(--text);
}

.obsluga-layout {
  max-width: 1100px;
  margin: 0 auto;
}

/* KARTY */
.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 1.25rem;
  margin-top: 1rem;
  border: 1px solid var(--border-subtle);
}

/* HEADER – pomarańczowy pasek na górze */
.obsluga-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, var(--orange-dark), var(--orange));
  color: black;
  padding: 1rem 1.5rem;
  border-radius: var(--radius);
}
.obsluga-title {
  font-size: 1.8rem;
  font-weight: 800;
}

/* PRZYCISKI – zielono/pomarańczowe, bez białych na białym */
button {
  font-family: inherit;
}

.btn-outline,
.btn-sage,
.btn-sage-outline {
  border-radius: 9999px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
}

/* Zielony przycisk główny */
.btn-sage {
  background: #8fbc8f;
  color: black;
  padding: 0.7rem 1.4rem;
  font-size: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.btn-sage:hover {
  background: var(--green-dark);
  transform: translateY(-1px);
}

/* Przyciski typu outline – zielono/pomarańczowe obramowanie */
.btn-outline {
  background: white;
  border: 2px solid var(--orange);
  color: var(--orange-dark);
  padding: 0.6rem 1.2rem;
}
.btn-outline:hover {
  background: var(--orange);
  color: black;
}

/* Przyciski w kartach zamówień */
.btn-sage-outline {
  border: 2px solid var(--green-dark);
  background: #7c7c7c;
  color: var(--green-dark);
  padding: 0.45rem 1rem;
}
.btn-sage-outline:hover {
  background: var(--green-dark);
  color: white;
}

.btn-sm {
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
}

/* Pasek akcji */
.actions-bar {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

/* Przyciski typu zamówienia */
.order-type-buttons {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  grid-column: 1 / -1;
  justify-content: center;
  align-items: center;
}

.order-type-pill {
  border-radius: 9999px;
  background: #e5e7eb;
  padding: 1rem 2.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.order-type-pill.active {
  background: #8fbc8f;
  color: black;
  box-shadow: 0 0 0 2px var(--green-soft);
}

/* SEKCJA FORMULARZA ZAMÓWIENIA */
.order-form {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr;
  column-gap: 1.5rem;
  row-gap: 0.75rem;
  align-items: flex-start;
}

.order-form > .section-title,
.order-form > .muted {
  grid-column: 1 / -1;
}

.current-order {
  grid-column: 2;
  border-left: 3px solid #ffc078;
  padding-left: 1rem;
}

/* ALFABET + MENU */
.alphabet-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.letter-pill {
  border-radius: 9999px;
  background: #e5e7eb;
  padding: 0.4rem 0.8rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}
.letter-pill.active {
  background: #8fbc8f;
  color: black;
  box-shadow: 0 0 0 2px var(--green-soft);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.menu-item-row {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  border: 1px solid #e5e7eb;
}
.menu-item-row:hover {
  background: var(--green-soft);
  box-shadow: 0 1px 4px rgba(47, 158, 68, 0.2);
  transform: translateY(-1px);
}

/* AKTUALNE ZAMÓWIENIE */
.order-items-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.order-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}

.count-badge {
  display: inline-block;
  background: #8fbc8f;
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 0.35rem;
  font-weight: 700;
  font-size: 0.85rem;
  margin-left: 0.5rem;
}
.order-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--orange-soft);
  padding: 0.5rem 0.7rem;
  border-radius: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.6rem;
}
.order-summary strong {
  color: var(--orange-dark);
}

.order-actions {
  display: flex;
  justify-content: flex-end;
}

/* Stan disabled dla zapisu */
button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* LISTA ZAMÓWIEŃ (W TOKU) */
.orders-section {
  margin-top: 1.5rem;
}

.queue-badge {
  background: #ffcccc;
  color: #cc0000;
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1rem;
}
.order-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: #ffffff;
  border-radius: var(--radius);
  padding: 0.8rem 1rem;
  transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
  border: 1px solid #ffd6aa;
  border-left: 4px solid var(--orange);
}
.order-card:hover {
  transform: translateY(-2px);
  background: #fff3e3;
  box-shadow: 0 2px 8px rgba(230, 119, 0, 0.25);
}
.order-number {
  font-weight: 700;
  color: var(--orange-dark);
  margin-bottom: 0.2rem;
}
.order-time {
   font-size: 1.1rem;
   font-weight: 700;
   color: var(--muted);
  margin-left: 1rem;
}
.order-items {
  font-size: 0.9rem;
  color: var(--muted);
}
.order-item {
  margin-top: 0.15rem;
}

/* TYPOGRAFIA */
.section-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--green-dark);
}
.muted {
  color: var(--muted);
}

/* RWD – węższe ekrany */
@media (max-width: 768px) {
  .order-form {
    grid-template-columns: 1fr;
  }
  .current-order {
    grid-column: 1;
    border-left: none;
    border-top: 3px solid #ffc078;
    padding-left: 0;
    padding-top: 1rem;
    margin-top: 0.5rem;
  }
  .obsluga-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .actions-bar {
    justify-content: flex-start;
  }
}

.portion-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.portion-dialog {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius);
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.portion-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.portion-buttons .btn-sage.active {
  outline: 2px solid #2f9e44;
  box-shadow: 0 0 0 2px #d3f9d8;
}

.order-item-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.order-item-actions {
  display: flex;
  gap: 0.4rem;
}

.order-item-actions button {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.24rem 0.44rem;
  border-radius: 999px;
}

.icon-btn.add {
  border: 1px solid #2f9e44;
  background: #d3f9d8;
  color: #2f9e44;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 0.38rem 0.56rem;
}

.icon-btn.add:hover {
  background: #8fbc8f;
  color: black;
}

.icon-btn.subtract {
  border: 1px solid #cc0000;
  background: #ffe3e3;
  color: #cc0000;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 0.38rem 0.56rem;
}

.icon-btn.subtract:hover:not([disabled]) {
  background: #ff9999;
  color: black;
}

.icon-btn.subtract[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn.edit {
  border: 1px solid #f59f00;
  background: #fff7e6;
  font-size: 0.95rem;
  padding: 0.24rem 0.44rem;
}

.icon-btn.edit:hover {
  background: #ffd08a;
}

.icon-btn.delete {
  border: 1px solid #e03131;
  background: #ffe3e3;
  font-size: 0.95rem;
  padding: 0.24rem 0.44rem;
}

.icon-btn.delete:hover {
  background: #ffc9c9;
}

/* Pojemniki */
.containers-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid #e5e7eb;
}

.containers-label {
  font-weight: 600;
  color: var(--text);
}

.containers-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.counter-btn {
  background: #8fbc8f;
  color: black;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-btn:hover {
  background: var(--green-dark);
  transform: scale(1.1);
}

.counter-value {
  min-width: 2rem;
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
}

</style>
