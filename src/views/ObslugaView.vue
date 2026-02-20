<template>
  <div class="view-container obsluga-layout">
    <!-- HEADER -->
    <header class="obsluga-header">
      <h1 class="obsluga-title">Panel Obsługi</h1>
      <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <button v-if="userRole === 'admin'" class="btn-outline btn-sm" @click="router.push('/admin')">Admin</button>
        <button v-if="userRole === 'admin'" class="btn-outline btn-sm" @click="router.push('/kuchnia')">Kuchnia</button>
        <button class="btn-outline btn-sm" @click="logout">Wyloguj</button>
      </div>
    </header>

    <!-- AKCJE -->
    <div class="actions-bar">
      <div class="actions-bar-spacer"></div>
      <div class="actions-bar-center">
        <template v-if="showForm">
          <button class="order-type-pill" :class="{ active: selectedOrderType === 'na_miejscu' }" @touchstart.prevent="selectedOrderType = 'na_miejscu'" @click="selectedOrderType = 'na_miejscu'">Na miejscu</button>
          <button class="order-type-pill" :class="{ active: selectedOrderType === 'na_wynos' }" @touchstart.prevent="selectedOrderType = 'na_wynos'" @click="selectedOrderType = 'na_wynos'">Na wynos</button>
        </template>
      </div>
      <div class="actions-bar-right">
        <button class="btn-sage btn-large" @click="toggleOrderForm">
          {{ showForm ? '✖ Anuluj' : (editingOrderId ? '✏️ Edytuj zamówienie' : '+ Dodaj zamówienie') }}
        </button>
      </div>
    </div>

    <!-- SEKCJA DODAWANIA ZAMÓWIENIA -->
    <section v-if="showForm" class="card order-form">
      <h3 class="section-title">{{ editingOrderId ? 'Edytuj zamówienie' : 'Nowe zamówienie' }}</h3>

      <!-- MENU -->
      <div class="menu-section">
        <!-- KATEGORIE -->
        <div class="alphabet-row">
          <button
              v-for="cat in categoryList"
              :key="cat"
              class="letter-pill"
              :class="{ active: selectedCategory === cat }"
              @touchstart.prevent="selectedCategory = cat"
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
                <span class="portion-label">
                  ({{ formatPortionLabel(item.quantity, item.name) }})
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
                    @click="increaseOrderItemCount(item.name, item.quantity, item.extras)"
                    title="Dodaj jeszcze jedną pozycję"
                >
                  +
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
                    class="icon-btn subtract"
                    @click="item.count <= 1 ? removeItemByKey(item.key) : decreaseOrderItemCount(item.name, item.quantity, item.extras)"
                    :title="item.count <= 1 ? 'Usuń pozycję' : 'Usuń jedną pozycję'"
                >
                  −
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
            <button class="counter-btn" @click="increaseContainers">+</button>
            <span class="counter-value">{{ containerCount }}</span>
            <button class="counter-btn" @click="decreaseContainers">−</button>
          </div>
        </div>

        <p v-if="!orderItems.length && containerCount === 0" class="muted">Brak pozycji.</p>

        <div class="order-summary" v-if="orderItems.length || containerCount > 0">
          <span>Razem:</span>
          <strong>{{ totalPrice.toFixed(2) }} zł</strong>
        </div>

        <div class="order-actions">
          <button
              class="btn-sage btn-large"
              @click="saveOrder"
              :disabled="!orderItems.length || saving || !selectedOrderType"
          >
            ✅ {{ saving ? 'Zapisywanie...' : (editingOrderId ? 'Zaktualizuj zamówienie' : 'Zapisz zamówienie') }}
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
              <span>#{{ order.number }}</span>
              <span class="order-time">{{ formatTime(order.createdAt) }}</span>
            </div>
            <div class="order-items">
              <div
                  v-for="item in order.items"
                  :key="item.name"
                  class="order-item"
              >
                <div>
                  {{ item.name }}
                  <span class="portion-label">
                    ({{ formatPortionLabel(item.quantity ?? 1, item.name) }})
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
          <div class="order-card-actions">
            <button
                class="btn-sage-outline btn-sm"
                @click="startEditOrder(order)"
            >
              Edytuj
            </button>
            <button
                class="btn-sage-outline btn-sm"
                @click="markAsReady(order)"
            >
              Gotowe
            </button>
          </div>
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
              <span>#{{ order.number }}</span>
              <span class="order-time">{{ formatTime(order.createdAt) }}</span>
            </div>
            <div class="order-items">
              <div
                  v-for="item in order.items"
                  :key="item.name"
                  class="order-item"
              >
                <div>
                  {{ item.name }}
                  <span class="portion-label">
                    ({{ formatPortionLabel(item.quantity ?? 1, item.name) }})
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
          <div class="order-card-actions">
            <button
                class="btn-sage-outline btn-sm"
                @click="startEditOrder(order)"
            >
              Edytuj
            </button>
            <button
                class="btn-sage-outline btn-sm"
                @click="markAsReady(order)"
            >
              Gotowe
            </button>
          </div>
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

    <!-- POPUP GRAMATURY DLA GOLONKI -->
    <div v-if="gramDialogOpen" class="portion-dialog-backdrop" @click.self="gramDialogOpen = false">
      <div class="portion-dialog">
        <h3>Golonka</h3>
        <p class="muted">Cena: 7 zł za 100g</p>

        <div class="gram-input-container">
          <label for="gram-input">Podaj gramaaturę (w gramach):</label>
          <input
              id="gram-input"
              type="number"
              v-model="gramValue"
              placeholder="np. 300"
              min="1"
              step="1"
              class="gram-input"
              @keyup.enter="confirmGramAmount"
          />
        </div>

        <button
            class="btn-sage btn-large"
            @click="confirmGramAmount"
        >
          Zatwierdź
        </button>
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
import { getRoleForEmail } from '@/router/index'

const router = useRouter()

// ==================== Menu from Firestore ====================
const { menuItems, fetchMenu } = useMenu()
const menu = computed(() => menuItems.value)

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
const extrasOptions = ref(EXTRAS)

// Dialog gramatury dla wątróbki
const gramDialogOpen = ref(false)
const gramDialogItem = ref(null)
const gramValue = ref('')

let unsub = null

// ==================== Lifecycle ====================
onMounted(() => {
  fetchMenu()
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
        (sum, extraName) => sum + (EXTRAS_PRICE[extraName] || 0),
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
  if (portionCategories.includes(item.category)) {
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

  const categoryExtras = {
    'dania główne': EXTRAS_FOR_MAIN,
    'danie dnia': EXTRAS_FOR_MAIN,
    'zupy': EXTRAS_FOR_SOUPS,
    'zupa dnia': EXTRAS_FOR_SOUPS,
    'dodatki': EXTRAS_FOR_SIDES
  }

  const extras = categoryExtras[base.category]
  if (!extras) return

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
  margin-top: 0.4rem;
  border: 1px solid var(--border-subtle);
}

/* HEADER – pomarańczowy pasek na górze */
.obsluga-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(90deg, var(--orange-dark), var(--orange));
  color: black;
  padding: 0.6rem 1rem;
  border-radius: var(--radius);
}
.obsluga-title {
  font-size: 1.8rem;
  font-weight: 800;
  padding-top: 0.1rem;
}

/* Pasek akcji */
.actions-bar {
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
}

.actions-bar-spacer {
  flex: 1;
}

.actions-bar-center {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex: 0 0 auto;
}

.actions-bar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

/* PRZYCISKI – spójna zielona paleta */
button {
  font-family: inherit;
}

.btn-outline,
.btn-sage,
.btn-sage-outline {
  border-radius: 9999px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  border: none;
}

/* Zielony przycisk główny (Dodaj zamówienie / Anuluj / Zapisz) – zawsze #8fbc8f, bez zmiany przy hover */
.btn-sage {
  background: #8fbc8f;
  color: #1a3a1a;
  padding: 0.7rem 1.4rem;
  font-size: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.btn-sage:hover {
  background: #8fbc8f;
  color: #1a3a1a;
}
.btn-sage:active {
  background: #8fbc8f;
  color: #1a3a1a;
}

/* Większe przyciski dla głównych akcji */
.btn-large {
  padding: 1rem 2rem;
  font-size: 1.15rem;
  font-weight: 700;
  min-height: 50px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* Przyciski nawigacyjne w headerze (Admin / Kuchnia / Wyloguj) – szare, bez hover-koloru */
.btn-outline {
  background: #e5e7eb;
  border: 2px solid #9ca3af;
  color: #374151;
  padding: 0.6rem 1.2rem;
}
.btn-outline:hover {
  background: #e5e7eb;
  color: #374151;
  border-color: #9ca3af;
}
.btn-outline:active {
  background: #d1d5db;
}

/* Przyciski w kartach zamówień (Gotowe / Edytuj) – szare, bez hover-koloru */
.btn-sage-outline {
  border: 2px solid #9ca3af;
  background: #e5e7eb;
  color: #374151;
  padding: 0.45rem 1rem;
}
.btn-sage-outline:hover {
  background: #e5e7eb;
  color: #374151;
  border-color: #9ca3af;
}
.btn-sage-outline:active {
  background: #d1d5db;
}

.btn-sm {
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
}


/* Przyciski typu zamówienia */
.order-type-pill {
  border-radius: 9999px;
  background: #e5e7eb;
  color: #374151;
  padding: 1rem 2rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-size: 1.15rem;
  min-height: 50px;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.order-type-pill:hover {
  background: #e5e7eb;
}


.order-type-pill.active {
  background: #8fbc8f;
  color: #1a3a1a;
  box-shadow: 0 0 0 3px var(--green-soft);
}
.order-type-pill.active:hover,
.order-type-pill.active:active {
  background: #8fbc8f;
  color: #1a3a1a;
}

/* SEKCJA FORMULARZA ZAMÓWIENIA */
.order-form {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr;
  column-gap: 1.5rem;
  row-gap: 0.75rem;
  align-items: start;
}

.order-form > .section-title,
.order-form > .muted {
  grid-column: 1 / -1;
}

.current-order {
  grid-column: 2;
  border-left: 3px solid #ffc078;
  padding-left: 1rem;
  position: sticky;
  top: 0.5rem;
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
  color: #374151;
  padding: 0.5rem 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  min-height: 40px;
  transition: background 0.2s ease;
}
.letter-pill.active {
  background: #8fbc8f;
  color: #1a3a1a;
  box-shadow: 0 0 0 2px var(--green-soft);
}
.letter-pill:hover {
  background: #e5e7eb;
}
.letter-pill.active:hover,
.letter-pill.active:active {
  background: #8fbc8f;
  color: #1a3a1a;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.menu-item-row {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  border: 1px solid #e5e7eb;
  min-height: 48px;
  align-items: center;
  font-size: 1rem;
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
  justify-content: stretch;
  position: sticky;
  bottom: 0;
  background: var(--green-soft);
  margin: 0 0 -1.25rem 0;
  padding: 1rem 1rem;
  border-top: 2px solid #8fbc8f;
}

.order-actions button {
  width: 100%;
}

/* Stan disabled dla zapisu */
button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* Pulsowanie dla przycisku zapisu gdy jest aktywny */
.btn-sage.btn-large:not([disabled]) {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 2px 20px rgba(47, 158, 68, 0.4);
  }
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  color: var(--orange-dark);
  margin-bottom: 0.2rem;
  width: 100%;
}
.order-info {
  flex: 1;
  min-width: 0;
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

.portion-label {
  color: #3a9a52;
  font-size: 0.88em;
  font-weight: 500;
  white-space: nowrap;
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
  padding: 2rem;
  border-radius: var(--radius);
  width: 350px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.portion-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.portion-buttons .btn-sage {
  font-size: 1.1rem;
  padding: 1rem 1.5rem;
  min-height: 50px;
}

.portion-buttons .btn-sage.active {
  outline: 3px solid #2f9e44;
  box-shadow: 0 0 0 4px #d3f9d8;
  transform: scale(1.02);
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
  padding: 0.5rem 0.8rem;
  font-size: 1.1rem;
  min-width: 40px;
  min-height: 40px;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.4rem 0.6rem;
  border-radius: 999px;
  min-width: 36px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.add {
  border: 1px solid #2f9e44;
  background: #d3f9d8;
  color: #000000;
  font-weight: 700;
  font-size: 1.15rem;
  padding: 0.5rem 0.7rem;
  min-width: 40px;
  min-height: 40px;
}

.icon-btn.add:hover {
  background: #d3f9d8;
  color: #000000;
}

.icon-btn.add:active {
  background: #d3f9d8;
}

.icon-btn.subtract {
  border: 1px solid #cc0000;
  background: #ffe3e3;
  color: #000000;
  font-weight: 700;
  font-size: 1.15rem;
  padding: 0.5rem 0.7rem;
  min-width: 40px;
  min-height: 40px;
}

.icon-btn.subtract:hover {
  background: #ff9999;
  color: #000000;
}


.icon-btn.edit {
  border: 1px solid #f59f00;
  background: #fff7e6;
  color: #e67700;
  font-size: 1rem;
  padding: 0.4rem 0.6rem;
  min-width: 40px;
  min-height: 40px;
}

.icon-btn.edit:hover {
  background: #fff7e6;
  color: #e67700;
}

.icon-btn.edit:active {
  background: #ffe8b2;
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
  color: #1a3a1a;
  border: none;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.3rem;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-btn:hover {
  background: #8fbc8f;
}

.counter-btn:active {
  background: #7aad7a;
}

.counter-value {
  min-width: 2.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 1.1rem;
}

/* Popup gramatury */
.gram-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;
}

.gram-input-container label {
  font-weight: 600;
  color: var(--text);
  text-align: left;
}

.gram-input {
  padding: 1rem;
  font-size: 1.2rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  text-align: center;
  font-weight: 600;
  transition: border-color 0.2s;
  width: 100%;
}

.gram-input:focus {
  outline: none;
  border-color: #8fbc8f;
  box-shadow: 0 0 0 3px var(--green-soft);
}

.gram-input::placeholder {
  color: var(--muted);
  font-weight: 400;
}

.order-card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: stretch;
  min-width: 90px;
}

/* Usuń strzałki z input type=number */
.gram-input::-webkit-outer-spin-button,
.gram-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.gram-input[type=number] {
  -moz-appearance: textfield;
}

</style>
