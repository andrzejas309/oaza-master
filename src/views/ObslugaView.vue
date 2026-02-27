<template>
  <div class="obsluga-root">
    <!-- HEADER -->
    <header class="obsluga-header">
      <div class="header-brand">
        <span class="header-icon">🍽️</span>
        <h1 class="obsluga-title">Panel Obsługi</h1>
      </div>
      <nav class="header-nav">
        <button v-if="userRole === 'admin'" class="btn-nav" @click="router.push('/admin')">Admin</button>
        <button v-if="userRole === 'admin'" class="btn-nav" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-nav btn-nav--logout" @click="logout">Wyloguj</button>
      </nav>
    </header>

    <main class="obsluga-layout">
      <!-- PASEK AKCJI -->
      <div class="actions-bar">
        <div class="actions-bar-left"></div>
        <div class="actions-bar-center">
          <template v-if="showForm">
            <button class="order-type-pill" :class="{ active: selectedOrderType === 'na_miejscu' }" @touchstart.prevent="selectedOrderType = 'na_miejscu'" @click="selectedOrderType = 'na_miejscu'">Na miejscu</button>
            <button class="order-type-pill" :class="{ active: selectedOrderType === 'na_wynos' }" @touchstart.prevent="selectedOrderType = 'na_wynos'" @click="selectedOrderType = 'na_wynos'">Na wynos</button>
          </template>
        </div>
        <div class="actions-bar-right">
          <button class="btn-sage btn-large" @click="toggleOrderForm">
            {{ showForm ? '✖ Anuluj' : (editingOrderId ? '✏️ Edytuj zamówienie' : '+ Nowe zamówienie') }}
          </button>
        </div>
      </div>

      <!-- FORMULARZ ZAMÓWIENIA -->
      <section v-if="showForm" class="card order-form">
        <div class="order-form-header">
          <h3 class="section-title">{{ editingOrderId ? '✏️ Edytuj zamówienie' : '🛒 Nowe zamówienie' }}</h3>
        </div>

        <!-- LEWA: MENU -->
        <div class="menu-section">
          <div class="alphabet-row">
            <button
              v-for="cat in categoryList"
              :key="cat"
              class="letter-pill"
              :class="{ active: selectedCategory === cat }"
              @touchstart.prevent="selectedCategory = cat"
              @click="selectedCategory = cat"
            >{{ cat }}</button>
          </div>
          <div class="menu-list">
            <template v-for="(items, cat) in filteredMenu" :key="cat">
              <h4 class="menu-category-title">{{ cat }}</h4>
              <div v-for="item in items" :key="item.name" class="menu-item-row" @click="increase(item)">
                <span class="menu-item-name">{{ item.name }}</span>
                <span class="menu-item-price">{{ item.price }} zł</span>
              </div>
            </template>
          </div>
        </div>

        <!-- PRAWA: AKTUALNE ZAMÓWIENIE -->
        <div class="current-order">
          <h3 class="section-title">🧾 Aktualne zamówienie</h3>
          <ul v-if="orderItems.length" class="order-items-list">
            <li v-for="item in orderItems" :key="item.name" class="order-item-row">
              <div class="order-item-info">
                <div>
                  <span class="order-item-name">{{ item.name }}</span>
                  <span class="portion-label"> ({{ formatPortionLabel(item.quantity, item.name) }})</span>
                  <span v-if="item.count > 1" class="count-badge">×{{ item.count }}</span>
                </div>
                <div v-if="item.extras && item.extras.length" class="order-item-extras muted">+ {{ item.extras.join(', ') }}</div>
              </div>
              <div class="order-item-right">
                <span class="order-item-price">{{ item.finalPrice.toFixed(2) }} zł</span>
                <div class="order-item-actions">
                  <button class="icon-btn add" @click="increaseOrderItemCount(item.name, item.quantity, item.extras)" title="Dodaj jeszcze">+</button>
                  <button v-if="canEditItem(item)" class="icon-btn edit" @click="startEditItem(item)" title="Edytuj składniki">✏️</button>
                  <button class="icon-btn subtract" @click="item.count <= 1 ? removeItemByKey(item.key) : decreaseOrderItemCount(item.name, item.quantity, item.extras)" :title="item.count <= 1 ? 'Usuń' : 'Odejmij'">−</button>
                </div>
              </div>
            </li>
          </ul>

          <!-- POJEMNIKI -->
          <div class="containers-row">
            <span class="containers-label">📦 Pojemniki</span>
            <div class="containers-controls">
              <button class="counter-btn" @click="increaseContainers">+</button>
              <span class="counter-value">{{ containerCount }}</span>
              <button class="counter-btn" @click="decreaseContainers">−</button>
            </div>
          </div>

          <p v-if="!orderItems.length && containerCount === 0" class="muted empty-hint">Brak pozycji.</p>

          <div class="order-summary" v-if="orderItems.length || containerCount > 0">
            <span>Razem:</span>
            <strong>{{ totalPrice.toFixed(2) }} zł</strong>
          </div>

          <div class="order-actions">
            <button class="btn-sage btn-large" @click="saveOrder" :disabled="!orderItems.length || saving || !selectedOrderType">
              ✅ {{ saving ? 'Zapisywanie…' : (editingOrderId ? 'Zaktualizuj zamówienie' : 'Zapisz zamówienie') }}
            </button>
          </div>
        </div>
      </section>

      <!-- ZAMÓWIENIA NA MIEJSCU -->
      <section class="card orders-section">
        <div class="section-header">
          <h2 class="section-title">Zamówienia na miejscu</h2>
          <span v-if="onSiteQueueCount > 0" class="queue-badge">+{{ onSiteQueueCount }} w kolejce</span>
        </div>
        <transition-group name="fade" tag="div" class="orders-list">
          <div v-for="order in ordersOnSite" :key="order.id" class="order-card">
            <div class="order-info">
              <div class="order-number">
                <span class="order-num-badge">#{{ order.number }}</span>
                <span class="order-time">{{ formatTime(order.createdAt) }}</span>
              </div>
              <div class="order-items">
                <div v-for="item in order.items" :key="item.name" class="order-item">
                  <span>{{ item.name }} <span class="portion-label">({{ formatPortionLabel(item.quantity ?? 1, item.name) }})</span></span>
                  <div v-if="item.extras && item.extras.length" class="muted" style="font-size:0.8rem">+ {{ item.extras.join(', ') }}</div>
                </div>
              </div>
            </div>
            <div class="order-card-actions">
              <button class="btn-action btn-action--edit" @click="startEditOrder(order)">Edytuj</button>
              <button class="btn-action btn-action--done" @click="markAsReady(order)">✓ Gotowe</button>
            </div>
          </div>
        </transition-group>
        <p v-if="ordersOnSite.length === 0" class="muted empty-hint">Brak aktywnych zamówień</p>
      </section>

      <!-- ZAMÓWIENIA NA WYNOS -->
      <section class="card orders-section">
        <div class="section-header">
          <h2 class="section-title">Zamówienia na wynos</h2>
          <span v-if="toGoQueueCount > 0" class="queue-badge">+{{ toGoQueueCount }} w kolejce</span>
        </div>
        <transition-group name="fade" tag="div" class="orders-list">
          <div v-for="order in ordersToGo" :key="order.id" class="order-card">
            <div class="order-info">
              <div class="order-number">
                <span class="order-num-badge">#{{ order.number }}</span>
                <span class="order-time">{{ formatTime(order.createdAt) }}</span>
              </div>
              <div class="order-items">
                <div v-for="item in order.items" :key="item.name" class="order-item">
                  <span>{{ item.name }} <span class="portion-label">({{ formatPortionLabel(item.quantity ?? 1, item.name) }})</span></span>
                  <div v-if="item.extras && item.extras.length" class="muted" style="font-size:0.8rem">+ {{ item.extras.join(', ') }}</div>
                </div>
              </div>
            </div>
            <div class="order-card-actions">
              <button class="btn-action btn-action--edit" @click="startEditOrder(order)">Edytuj</button>
              <button class="btn-action btn-action--done" @click="markAsReady(order)">✓ Gotowe</button>
            </div>
          </div>
        </transition-group>
        <p v-if="ordersToGo.length === 0" class="muted empty-hint">Brak aktywnych zamówień</p>
      </section>
    </main>

    <!-- DIALOG: WYBÓR PORCJI -->
    <div v-if="portionDialogOpen" class="dialog-backdrop" @click.self="portionDialogOpen = false">
      <div class="dialog">
        <h3 class="dialog-title">Wybierz porcję</h3>
        <p class="muted">{{ portionDialogItem?.name }}</p>
        <div class="dialog-buttons">
          <button v-for="p in PORTIONS" :key="p.value" class="btn-sage dialog-btn" @click="choosePortion(p.value)">{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- DIALOG: SKŁADNIKI -->
    <div v-if="extrasDialogOpen" class="dialog-backdrop" @click.self="extrasDialogOpen = false">
      <div class="dialog">
        <h3 class="dialog-title">Składniki dodatkowe</h3>
        <p class="muted">{{ extrasDialogItem?.name }}</p>
        <div class="dialog-buttons">
          <button v-for="extra in extrasOptions" :key="extra.name" class="btn-sage dialog-btn" :class="{ active: extrasSelected.includes(extra.name) }" @click="toggleExtra(extra.name)">
            {{ extra.name }} <span class="dialog-btn-price">(+{{ extra.price }} zł)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- DIALOG: GRAMATURA -->
    <div v-if="gramDialogOpen" class="dialog-backdrop" @click.self="gramDialogOpen = false">
      <div class="dialog">
        <h3 class="dialog-title">Golonka</h3>
        <p class="muted">Cena: 7 zł za 100g</p>
        <div class="gram-input-container">
          <label for="gram-input">Gramatura (g):</label>
          <input id="gram-input" type="number" v-model="gramValue" placeholder="np. 300" min="1" step="1" class="gram-input" @keyup.enter="confirmGramAmount" />
        </div>
        <button class="btn-sage btn-large" @click="confirmGramAmount">Zatwierdź</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AI: Vue component should contain only presentation logic.
 * Move business logic to composables.
 */
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
import { useRouter } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { useExtras } from '@/composables/useExtras'
import { getRoleForEmail } from '@/router/index'

const router = useRouter()

// ==================== Menu from Firestore ====================
const { menuItems, fetchMenu } = useMenu()
const menu = computed(() => menuItems.value)

// ==================== Extras from Firestore ====================
const { extrasPriceMap, extrasForCategory, fetchExtras } = useExtras()

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


const portionExcluded = [
  'barszcz czerwony',
  'chłodnik',
  'flaczki',
  'żurek z kiełbaską',
]

// Dania, które mimo braku kategorii zupowej/dodatków mają popup porcji
const portionIncludedNames = ['naleśniki', 'pierogi']

const categoryList = ['zupy', 'zupa dnia', 'dania główne', 'danie dnia', 'dodatki', 'surówki', 'napoje', 'składniki']


// ==================== State ====================
const showForm = ref(false)
const saving = ref(false)
const activeOrders = ref([])
const selectedOrderType = ref(null)
const selectedCategory = ref('zupy')
const containerCount = ref(0)
const orderDraft = reactive({ items: {} })
const editingOrderId = ref(null)
const userRole = ref(null)

// Dialog state
const portionDialogOpen = ref(false)
const portionDialogItem = ref(null)
const PORTIONS = ref(PORTIONS_FULL)
const extrasDialogOpen = ref(false)
const extrasDialogItem = ref(null)
const extrasDialogItemKey = ref(null) // Klucz edytowanej pozycji
const extrasSelected = ref([])
const extrasOptions = ref([])

// Dialog gramatury dla wątróbki
const gramDialogOpen = ref(false)
const gramDialogItem = ref(null)
const gramValue = ref('')

let unsub = null

// ==================== Lifecycle ====================
onMounted(() => {
  fetchMenu()
  fetchExtras()
  unsub = onSnapshot(collection(db, 'orders'), (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    activeOrders.value = all.filter((o) => o.status === 'w_toku')
  })
  const currentUser = auth.currentUser
  if (currentUser?.email) {
    getRoleForEmail(currentUser.email).then(role => {
      userRole.value = role
    })
  }
})

onUnmounted(() => unsub && unsub())

// ==================== Computed - Containers ====================
const containerPrice = computed(() => {
  const container = menu.value.find((m) => m.name === 'pojemniki')
  return container ? container.price : 0
})

const containersPrice = computed(() => containerCount.value * containerPrice.value)

// ==================== Computed - Menu ====================
const filteredMenu = computed(() => {
  const grouped = {}

  for (const item of menu.value) {
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
    .map(([key, data]) => {
      // data.name zawiera prawdziwą nazwę pozycji
      const itemName = data.name
      const found = menu.value.find((m) => m.name === itemName)
      const basePrice = found?.price || 0

      const extrasPrice = (data.extras || []).reduce(
        (sum, extraName) => sum + (extrasPriceMap.value[extraName] || 0),
        0,
      )

      const unitPrice = basePrice + extrasPrice
      const itemCount = data.count || 1
      const finalPrice = unitPrice * data.quantity * itemCount

      return {
        key: key,  // Unikalny klucz do identyfikacji
        name: itemName,  // Prawdziwa nazwa
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
// Generuje unikalny klucz dla pozycji (name + quantity + extras)
const generateItemKey = (name, quantity = 1, extras = []) => {
  let key = name

  // Dodaj quantity do klucza (różne porcje = różne pozycje)
  if (quantity !== 1) {
    key += `|q${quantity}`
  }

  // Dodaj extras do klucza
  if (extras && extras.length > 0) {
    const sortedExtras = [...extras].sort().join(',')
    key += `|${sortedExtras}`
  }

  return key
}

const ensureEntry = (name, quantity = 1, extras = []) => {
  const key = generateItemKey(name, quantity, extras)
  if (!orderDraft.items[key]) {
    orderDraft.items[key] = {
      name: name,
      quantity: quantity,
      count: 1,
      extras: [...extras],
    }
  }
  return orderDraft.items[key]
}

const canEditItem = (orderItem) => {
  const base = menu.value.find((m) => m.name === orderItem.name)
  if (!base) return false
  return ['zupy', 'zupa dnia', 'dania główne', 'danie dnia', 'dodatki'].includes(base.category)
}

const formatPortionLabel = (val, itemName) => {
  if (val == null) return '1 porcja'

  // Specjalne formatowanie dla golonki (gramatura)
  if (itemName === 'golonka') {
    const grams = Math.round(val * 100)
    return `${grams}g`
  }

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
  const key = generateItemKey(item.name, item.quantity, item.extras)
  delete orderDraft.items[key]
}

const removeItemByKey = (key) => {
  delete orderDraft.items[key]
}

const increase = (item) => {
  // Specjalna obsługa dla golonki - popup gramatury
  if (item.name === 'golonka') {
    gramDialogItem.value = item
    gramValue.value = ''
    gramDialogOpen.value = true
    return
  }

  const portionCategories = ['zupy', 'zupa dnia', 'dodatki', 'surówki']

  // Pozycje bez wyboru porcji - standardowa porcja (quantity=1)
  if (portionExcluded.includes(item.name)) {
    const key = generateItemKey(item.name, 1, [])
    if (orderDraft.items[key]) {
      orderDraft.items[key].count += 1
    } else {
      ensureEntry(item.name, 1, [])
    }
    return
  }

  // Pozycje z wyborem porcji - pokazuj dialog
  const nameLC = item.name.toLowerCase()
  const isPortionName = portionIncludedNames.some(n => nameLC.includes(n))

  if (portionCategories.includes(item.category) || isPortionName) {
    PORTIONS.value = ['dodatki', 'surówki'].includes(item.category)
      ? PORTIONS_HALF
      : PORTIONS_FULL

    portionDialogItem.value = item
    portionDialogOpen.value = true
    return
  }

  // Pozostałe pozycje (dania główne) - standardowa porcja (quantity=1)
  const key = generateItemKey(item.name, 1, [])
  if (orderDraft.items[key]) {
    orderDraft.items[key].count += 1
  } else {
    ensureEntry(item.name, 1, [])
  }
}

const increaseOrderItemCount = (itemName, itemQuantity, itemExtras = []) => {
  const key = generateItemKey(itemName, itemQuantity, itemExtras)
  const entry = orderDraft.items[key]
  if (entry) {
    entry.count = (entry.count || 1) + 1
  }
}

const decreaseOrderItemCount = (itemName, itemQuantity, itemExtras = []) => {
  const key = generateItemKey(itemName, itemQuantity, itemExtras)
  const entry = orderDraft.items[key]
  if (entry && entry.count > 1) {
    entry.count -= 1
  }
}

// ==================== Portion Dialog ====================
const choosePortion = (value) => {
  const item = portionDialogItem.value
  if (!item) return

  // Każdy rozmiar porcji to osobna pozycja
  const key = generateItemKey(item.name, value, [])

  if (orderDraft.items[key]) {
    // Ta sama porcja już istnieje - zwiększ count
    orderDraft.items[key].count += 1
  } else {
    // Nowy rozmiar porcji - utwórz nową pozycję
    ensureEntry(item.name, value, [])
  }

  portionDialogOpen.value = false
  portionDialogItem.value = null
}

// ==================== Gram Dialog (dla wątróbki) ====================
const confirmGramAmount = () => {
  const item = gramDialogItem.value
  if (!item) return

  const grams = parseInt(gramValue.value)
  if (!grams || grams <= 0) {
    alert('Proszę podać prawidłową gramaaturę')
    return
  }

  // Cena za 100g, więc quantity = grams / 100
  const quantity = grams / 100
  const key = generateItemKey(item.name, quantity, [])

  if (orderDraft.items[key]) {
    // Ta sama gramatura już istnieje - zwiększ count
    orderDraft.items[key].count += 1
  } else {
    // Nowa gramatura - utwórz nową pozycję
    ensureEntry(item.name, quantity, [])
  }

  gramDialogOpen.value = false
  gramDialogItem.value = null
  gramValue.value = ''
}

// ==================== Extras Dialog ====================
const startEditItem = (orderItem) => {
  const base = menu.value.find((m) => m.name === orderItem.name)
  if (!base) return

  const extras = extrasForCategory(base.category)
  if (!extras || !extras.length) return

  extrasOptions.value = extras
  extrasDialogItem.value = base

  // Zapisz oryginalny klucz (z quantity) i extras
  extrasDialogItemKey.value = generateItemKey(orderItem.name, orderItem.quantity, orderItem.extras)
  extrasSelected.value = orderItem.extras ? [...orderItem.extras] : []

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

  const oldKey = extrasDialogItemKey.value
  const oldEntry = orderDraft.items[oldKey]
  if (!oldEntry) return

  const newExtras = [...extrasSelected.value]
  const newKey = generateItemKey(item.name, oldEntry.quantity, newExtras)

  // Jeśli klucz się zmienił (inne extras), przenieś dane do nowej pozycji
  if (oldKey !== newKey) {
    // Utwórz nową pozycję z nowymi extras
    orderDraft.items[newKey] = {
      name: item.name,
      quantity: oldEntry.quantity,
      count: oldEntry.count,
      extras: newExtras,
    }

    // Usuń starą pozycję
    delete orderDraft.items[oldKey]
  } else {
    // Ten sam klucz - tylko aktualizuj extras (na wszelki wypadek)
    oldEntry.extras = newExtras
  }

  extrasDialogOpen.value = false
  extrasDialogItem.value = null
  extrasDialogItemKey.value = null
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
    editingOrderId.value = null
  }
}

const startEditOrder = (order) => {
  // Wyczyść bieżący draft
  orderDraft.items = {}

  // Załaduj typ zamówienia
  selectedOrderType.value = order.type

  // Załaduj pojemniki
  containerCount.value = order.containers || 0

  // Załaduj pozycje — odbuduj orderDraft.items z zapisanych danych
  for (const item of order.items) {
    const name = item.name
    const quantity = item.quantity ?? 1
    const extras = item.extras || []
    const count = item.count || 1
    const key = generateItemKey(name, quantity, extras)
    orderDraft.items[key] = { name, quantity, count, extras: [...extras] }
  }

  // Ustaw tryb edycji
  editingOrderId.value = order.id

  // Pokaż formularz i przewiń do góry
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ==================== Order Operations ====================
const saveOrder = async () => {
  if (!orderItems.value.length) return
  saving.value = true

  if (editingOrderId.value) {
    // Tryb edycji — zaktualizuj istniejące zamówienie
    await updateDoc(doc(db, 'orders', editingOrderId.value), {
      items: orderItems.value,
      containers: containerCount.value,
      type: selectedOrderType.value,
      edited: true,
    })
  } else {
    // Nowe zamówienie
    await addDoc(collection(db, 'orders'), {
      number: Date.now(),
      items: orderItems.value,
      containers: containerCount.value,
      type: selectedOrderType.value,
      status: 'w_toku',
      createdAt: serverTimestamp(),
    })
  }

  orderDraft.items = {}
  selectedOrderType.value = null
  containerCount.value = 0
  editingOrderId.value = null
  showForm.value = false
  saving.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
/* ===================== ZMIENNE ===================== */
:root {
  --green: #2f9e44;
  --green-dark: #2b8a3e;
  --green-soft: #d3f9d8;
  --orange: #ff8a3c;
  --orange-dark: #e67700;
  --orange-soft: #ffe8d5;
  --bg: #fff7f0;
  --card: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border-subtle: #e5e7eb;
  --radius: 1rem;
}

/* ===================== ROOT ===================== */
.obsluga-root {
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--text);
}

/* ===================== HEADER ===================== */
.obsluga-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  color: #111827;
  padding: 0.65rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-icon {
  font-size: 1.6rem;
  line-height: 1;
}

.obsluga-title {
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
.btn-nav--logout:hover { background: #d1d5db; }

/* ===================== LAYOUT ===================== */
.obsluga-layout {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2rem;
}

/* ===================== KARTY ===================== */
.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 1.25rem;
  margin-top: 1rem;
  border: 1px solid var(--border-subtle);
}

/* ===================== PASEK AKCJI ===================== */
.actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  gap: 0.75rem;
}

.actions-bar-left {
  flex-shrink: 0;
  min-width: 160px;
}

.actions-bar-center {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.actions-bar-right {
  flex-shrink: 0;
  min-width: 160px;
  display: flex;
  justify-content: flex-end;
}

/* ===================== PRZYCISKI GŁÓWNE ===================== */
button { font-family: inherit; }

.btn-sage {
  background: #8fbc8f;
  color: #1a3a1a;
  border: none;
  border-radius: 9999px;
  padding: 0.7rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  transition: filter 0.15s, box-shadow 0.15s;
}
.btn-sage:hover { filter: brightness(1.05); }
.btn-sage:active { filter: brightness(0.95); }

.btn-large {
  padding: 0.9rem 2rem;
  font-size: 1.1rem;
  font-weight: 700;
  min-height: 50px;
}

button[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
  filter: none !important;
  box-shadow: none !important;
}


.btn-sage.btn-large:not([disabled]) {
  animation: pulse 2.5s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  50%       { box-shadow: 0 2px 20px rgba(47,158,68,0.4); }
}

/* ===================== PILLS TYPU ZAMÓWIENIA ===================== */
.order-type-pill {
  border-radius: 9999px;
  background: #e5e7eb;
  color: #374151;
  padding: 0.75rem 1.6rem;
  font-weight: 700;
  border: 2px solid transparent;
  cursor: pointer;
  font-size: 1.05rem;
  min-height: 48px;
  transition: background 0.18s, border-color 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.order-type-pill:hover { background: #d1d5db; }
.order-type-pill.active {
  background: #8fbc8f;
  color: #1a3a1a;
  border-color: #2f9e44;
  box-shadow: 0 0 0 3px var(--green-soft);
}

/* ===================== FORMULARZ ZAMÓWIENIA ===================== */
.order-form {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr;
  column-gap: 1.5rem;
  row-gap: 0.75rem;
  align-items: start;
}

.order-form-header {
  grid-column: 1 / -1;
}

.menu-section { min-width: 0; }

.current-order {
  grid-column: 2;
  border-left: 3px solid #ffc078;
  padding-left: 1.1rem;
  position: sticky;
  top: 4.5rem;
}

/* KATEGORIE */
.alphabet-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.letter-pill {
  border-radius: 9999px;
  background: #f3f4f6;
  color: #374151;
  padding: 0.4rem 0.9rem;
  font-weight: 600;
  border: 1.5px solid #e5e7eb;
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 38px;
  transition: background 0.15s, border-color 0.15s;
}
.letter-pill:hover { background: #e5e7eb; }
.letter-pill.active {
  background: #8fbc8f;
  color: #1a3a1a;
  border-color: #2f9e44;
  box-shadow: 0 0 0 2px var(--green-soft);
}

/* LISTA MENU */
.menu-list { display: flex; flex-direction: column; gap: 0.35rem; }

.menu-category-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin: 0.75rem 0 0.3rem;
}

.menu-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 0.9rem;
  background: #f9fafb;
  border-radius: 0.65rem;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  min-height: 46px;
  font-size: 1rem;
  transition: background 0.12s, transform 0.1s, box-shadow 0.12s;
}
.menu-item-row:hover {
  background: var(--green-soft);
  box-shadow: 0 1px 6px rgba(47,158,68,0.18);
  transform: translateY(-1px);
}

.menu-item-name { font-weight: 500; }
.menu-item-price { color: var(--muted); font-size: 0.95rem; white-space: nowrap; margin-left: 0.5rem; }

/* ===================== AKTUALNE ZAMÓWIENIE ===================== */
.order-items-list {
  list-style: none;
  padding: 0;
  margin: 0.4rem 0 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.95rem;
}
.order-item-row:last-child { border-bottom: none; }

.order-item-info { flex: 1; min-width: 0; }
.order-item-name { font-weight: 600; }
.order-item-extras { font-size: 0.83rem; margin-top: 0.1rem; }

.order-item-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.order-item-price { color: var(--orange-dark); font-weight: 700; font-size: 0.9rem; white-space: nowrap; }

.order-item-actions { display: flex; gap: 0.3rem; }

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 9999px;
  width: 42px;
  height: 42px;
  padding: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  transition: filter 0.15s;
}
.icon-btn:hover { filter: brightness(0.92); }

.icon-btn.add      { border: 1.5px solid #2f9e44; background: #d3f9d8; color: #1a3a1a; }
.icon-btn.subtract { border: 1.5px solid #cc0000; background: #ffe3e3; color: #cc0000; }
.icon-btn.edit     { border: 1.5px solid #f59f00; background: #fff7e6; color: #e67700; font-size: 0.95rem; }

.count-badge {
  display: inline-block;
  background: #8fbc8f;
  color: white;
  padding: 0.1rem 0.45rem;
  border-radius: 0.3rem;
  font-weight: 700;
  font-size: 0.82rem;
  margin-left: 0.35rem;
}

/* POJEMNIKI */
.containers-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  background: #f9fafb;
  border-radius: 0.65rem;
  margin: 0.5rem 0 0.65rem;
  border: 1px solid #e5e7eb;
}
.containers-label { font-weight: 600; }
.containers-controls { display: flex; align-items: center; gap: 0.65rem; }

.counter-btn {
  background: #8fbc8f;
  color: #1a3a1a;
  border: none;
  border-radius: 50%;
  width: 2.2rem;
  height: 2.2rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter 0.15s;
}
.counter-btn:hover { filter: brightness(1.08); }
.counter-btn:active { filter: brightness(0.92); }

.counter-value { min-width: 2rem; text-align: center; font-weight: 700; font-size: 1.1rem; }

/* PODSUMOWANIE */
.order-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--orange-soft);
  padding: 0.55rem 0.8rem;
  border-radius: 0.65rem;
  font-weight: 600;
  margin-bottom: 0.6rem;
  border: 1px solid #ffd6aa;
}
.order-summary strong { color: var(--orange-dark); font-size: 1.1rem; }

.order-actions {
  position: sticky;
  bottom: 0;
  background: #ffffff;
  margin: 0 0 -1.25rem 0;
  padding: 0.85rem 1.25rem;
  border-top: 2px solid var(--border-subtle);
  border-radius: 0 0 var(--radius) var(--radius);
}
.order-actions button { width: 100%; }

/* ===================== SEKCJA ZAMÓWIEŃ ===================== */
.orders-section { margin-top: 1.25rem; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.queue-badge {
  background: #ffe3e3;
  color: #cc0000;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.85rem;
  border: 1px solid #ffb3b3;
}

.orders-list { display: flex; flex-direction: column; gap: 0.55rem; }

.order-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: #fff;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #ffd6aa;
  transition: transform 0.15s, box-shadow 0.15s;
}
.order-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(230,119,0,0.18); }

.order-number {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.3rem;
}

.order-num-badge {
  background: var(--orange-soft);
  color: var(--orange-dark);
  font-weight: 800;
  font-size: 1rem;
  padding: 0.15rem 0.55rem;
  border-radius: 0.4rem;
  border: 1px solid #ffd6aa;
}

.order-info { flex: 1; min-width: 0; }
.order-time { font-size: 0.95rem; font-weight: 700; color: var(--muted); }
.order-items { font-size: 0.9rem; color: var(--muted); margin-top: 0.1rem; }
.order-item { margin-top: 0.15rem; }

.order-card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: stretch;
  min-width: 90px;
  margin-left: 0.75rem;
}

.btn-action {
  border: none;
  border-radius: 0.55rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: filter 0.15s;
  text-align: center;
}
.btn-action:hover { filter: brightness(0.93); }

.btn-action--edit { background: #e5e7eb; color: #374151; border: 1px solid #d1d5db; }
.btn-action--done { background: #8fbc8f; color: #1a3a1a; border: 1px solid #7aad7a; }

/* ===================== DIALOGI ===================== */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.dialog {
  background: #fff;
  padding: 1.75rem 2rem;
  border-radius: var(--radius);
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
}

.dialog-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0;
  color: var(--text);
}

.dialog-buttons { display: flex; flex-direction: column; gap: 0.65rem; }

.dialog-btn {
  font-size: 1rem;
  padding: 0.85rem 1.25rem;
  min-height: 48px;
  border-radius: 0.7rem !important;
  text-align: center;
}

.dialog-btn.active {
  outline: 3px solid #2f9e44;
  box-shadow: 0 0 0 4px #d3f9d8;
}

.dialog-btn-price { color: var(--muted); font-size: 0.88em; font-weight: 400; }

/* INPUT GRAMATURY */
.gram-input-container { display: flex; flex-direction: column; gap: 0.4rem; text-align: left; }
.gram-input-container label { font-weight: 600; font-size: 0.95rem; }

.gram-input {
  padding: 0.85rem;
  font-size: 1.2rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.65rem;
  text-align: center;
  font-weight: 600;
  width: 100%;
  transition: border-color 0.18s;
}
.gram-input:focus { outline: none; border-color: #8fbc8f; box-shadow: 0 0 0 3px var(--green-soft); }
.gram-input::placeholder { color: var(--muted); font-weight: 400; }
.gram-input::-webkit-outer-spin-button,
.gram-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.gram-input[type=number] { -moz-appearance: textfield; }

/* ===================== TYPOGRAFIA ===================== */
.section-title { font-weight: 800; margin: 0 0 0.4rem; color: var(--green-dark); font-size: 1.05rem; }
.muted { color: var(--muted); }
.empty-hint { text-align: center; padding: 1rem 0; }

.portion-label {
  color: #3a9a52;
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
}

/* ===================== ANIMACJE ===================== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from { opacity: 0; transform: translateY(-6px); }
.fade-leave-to   { opacity: 0; transform: translateY(6px); }

/* ===================== RWD ===================== */
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
    position: static;
  }
  .obsluga-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }
  .actions-bar {
    flex-wrap: wrap;
  }
}

</style>
