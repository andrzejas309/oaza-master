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

      <!-- Backfill date -->
      <section class="backfill-section">
        <div class="backfill-row">
          <div class="backfill-info">
            <span class="backfill-icon">📅</span>
            <div>
              <div class="backfill-title">Wprowadzanie dla innego dnia</div>
              <div class="backfill-desc">
                <template v-if="backfillActive">
                  Zamówienia w panelu obsługi będą zapisywane jako: <strong>{{ backfillLabel }}</strong>
                </template>
                <template v-else>
                  Aktualnie zamówienia zapisywane są z dzisiejszą datą
                </template>
              </div>
            </div>
          </div>
          <div class="backfill-actions">
            <button v-if="backfillActive" class="btn-backfill-clear" @click="clearBackfill">
              ✖ Dezaktywuj
            </button>
            <button class="btn-backfill-set" @click="openBackfillPicker">
              {{ backfillActive ? '✏️ Zmień datę' : '📅 Ustaw datę' }}
            </button>
          </div>
        </div>
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
                      <span v-if="order.editedAt" class="order-edited-badge" :title="`Edytowano: ${formatOrderTime(order.editedAt?.toDate?.() ?? order.editedAt)}`">
                        ✏️ edytowano
                      </span>
                    </div>
                    <div class="history-order-right">
                      <span class="history-order-total">{{ calculateOrderTotal(order).toFixed(2) }} zł</span>
                      <button class="btn-edit-order" @click.stop="openEditOrderDialog(order)" title="Edytuj zamówienie">✏️</button>
                      <button class="btn-edit-date" @click.stop="openEditDateDialog(order)" title="Zmień datę zamówienia">📅</button>
                    </div>
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

    <!-- ===== DIALOG: Picker daty backfill ===== -->
    <div v-if="showBackfillPicker" class="dialog-backdrop" @click.self="showBackfillPicker = false">
      <div class="dialog-panel" style="max-width: 420px;">
        <div class="dialog-panel-header">
          <h2 class="dialog-panel-title">📅 Ustaw datę wprowadzania</h2>
          <button class="dialog-close-btn" @click="showBackfillPicker = false">✖</button>
        </div>
        <div class="dialog-panel-body" style="padding: 1.5rem;">
          <p style="color: var(--muted); font-size: 0.9rem; margin: 0 0 1.25rem;">
            Zamówienia wprowadzone w panelu obsługi będą zapisane z wybraną datą (z aktualną godziną).
          </p>
          <div class="form-group">
            <label class="form-label">Wybierz datę</label>
            <input
              v-model="tempBackfillDate"
              type="date"
              class="form-input"
              :max="maxBackfillDate"
            />
          </div>
          <div class="form-actions" style="margin-top: 1.25rem;">
            <button class="btn-secondary-form" @click="showBackfillPicker = false">Anuluj</button>
            <button class="btn-primary" :disabled="!tempBackfillDate" @click="confirmBackfill">
              ✅ Potwierdź
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== DIALOG: Edycja zamówienia ===== -->
    <div v-if="editOrderDialog" class="dialog-backdrop" @click.self="editOrderDialog = null">
      <div class="dialog-panel dialog-panel--wide">
        <div class="dialog-panel-header">
          <h2 class="dialog-panel-title">✏️ Edytuj zamówienie #{{ editOrderDialog.order.number }}</h2>
          <button class="dialog-close-btn" @click="editOrderDialog = null">✖</button>
        </div>
        <div class="dialog-panel-body edit-order-body">

          <!-- Typ zamówienia -->
          <div class="edit-order-type-row">
            <button
              class="order-type-pill"
              :class="{ active: editOrderType === 'na_miejscu' }"
              @click="editOrderType = 'na_miejscu'"
            >Na miejscu</button>
            <button
              class="order-type-pill"
              :class="{ active: editOrderType === 'na_wynos' }"
              @click="editOrderType = 'na_wynos'"
            >Na wynos</button>
          </div>

          <div class="edit-order-columns">

            <!-- LEWA: Mini menu -->
            <div class="edit-order-menu">
              <div class="edit-cat-pills">
                <button
                  v-for="cat in categoryList"
                  :key="cat"
                  class="edit-cat-pill"
                  :class="{ active: editOrderCategory === cat }"
                  @click="editOrderCategory = cat"
                >{{ cat }}</button>
              </div>
              <div class="edit-menu-list">
                <div
                  v-for="item in editFilteredMenu"
                  :key="item.name"
                  class="edit-menu-item"
                  @click="editAddItem(item)"
                >
                  <span class="edit-menu-name">{{ item.name }}</span>
                  <span class="edit-menu-price">{{ item.price }} zł</span>
                </div>
                <p v-if="!editFilteredMenu.length" class="edit-menu-empty muted">Brak pozycji</p>
              </div>
            </div>

            <!-- PRAWA: Lista zamówienia -->
            <div class="edit-order-items">
              <h4 class="edit-order-items-title">🧾 Pozycje zamówienia</h4>

              <div v-if="editOrderItems.length" class="edit-items-list">
                <div v-for="item in editOrderItems" :key="item.key" class="edit-item-row">
                  <div class="edit-item-info">
                    <span class="edit-item-name">{{ item.name }}</span>
                    <span v-if="item.quantity !== 1" class="edit-item-portion muted"> ({{ item.quantity === 0.5 ? '½' : item.quantity }})</span>
                    <span v-if="item.extras?.length" class="edit-item-extras muted"> + {{ item.extras.join(', ') }}</span>
                  </div>
                  <div class="edit-item-controls">
                    <span class="edit-item-price">{{ item.finalPrice.toFixed(2) }} zł</span>
                    <button class="edit-ctrl-btn edit-ctrl-btn--minus" @click="editDecreaseItem(item.key)">−</button>
                    <span class="edit-ctrl-count">× {{ item.count }}</span>
                    <button class="edit-ctrl-btn edit-ctrl-btn--plus" @click="editOrderDraft.items[item.key] && editOrderDraft.items[item.key].count++">+</button>
                    <button class="edit-ctrl-btn edit-ctrl-btn--del" @click="editRemoveItem(item.key)">🗑</button>
                  </div>
                </div>
              </div>
              <p v-else class="muted" style="text-align:center; padding: 1rem 0; font-style: italic;">Brak pozycji</p>

              <!-- Pojemniki -->
              <div class="edit-containers-row">
                <span>📦 Pojemniki</span>
                <div class="edit-containers-controls">
                  <button class="edit-ctrl-btn edit-ctrl-btn--minus" @click="editOrderContainers = Math.max(0, editOrderContainers - 1)">−</button>
                  <span class="edit-ctrl-count">{{ editOrderContainers }}</span>
                  <button class="edit-ctrl-btn edit-ctrl-btn--plus" @click="editOrderContainers++">+</button>
                </div>
              </div>

              <!-- Suma -->
              <div class="edit-order-summary">
                <span>Razem:</span>
                <strong>{{ editOrderTotal.toFixed(2) }} zł</strong>
              </div>

              <div class="form-actions" style="margin-top: 0.75rem;">
                <button class="btn-secondary-form" @click="editOrderDialog = null">Anuluj</button>
                <button
                  class="btn-primary"
                  :disabled="!editOrderItems.length || !editOrderType || editOrderSaving"
                  @click="confirmEditOrder"
                >
                  {{ editOrderSaving ? 'Zapisywanie…' : '✅ Zapisz zmiany' }}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ===== DIALOG: Edycja daty zamówienia ===== -->
    <div v-if="editDateDialog" class="dialog-backdrop" @click.self="editDateDialog = null">
      <div class="dialog-panel" style="max-width: 420px;">
        <div class="dialog-panel-header">
          <h2 class="dialog-panel-title">📅 Zmień datę zamówienia</h2>
          <button class="dialog-close-btn" @click="editDateDialog = null">✖</button>
        </div>
        <div class="dialog-panel-body" style="padding: 1.5rem;">
          <p style="color: var(--muted); font-size: 0.9rem; margin: 0 0 1.25rem;">
            Zamówienie <strong>#{{ editDateDialog.order.number }}</strong> —
            aktualna data: <strong>{{ formatOrderTime(editDateDialog.order.createdAt) }}</strong>
          </p>
          <div class="edit-date-fields">
            <div class="form-group">
              <label class="form-label">Data</label>
              <input v-model="editDateValue" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Godzina</label>
              <input v-model="editTimeValue" type="time" class="form-input" />
            </div>
          </div>
          <div class="form-actions" style="margin-top: 1.25rem;">
            <button class="btn-secondary-form" @click="editDateDialog = null">Anuluj</button>
            <button
              class="btn-primary"
              :disabled="!editDateValue || !editTimeValue || editDateSaving"
              @click="confirmEditDate"
            >
              {{ editDateSaving ? 'Zapisywanie…' : '✅ Zapisz' }}
            </button>
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

import { computed, ref, reactive, onMounted } from 'vue'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { useRouter } from 'vue-router'
import { collection, getDocs, query, orderBy, limit, updateDoc, doc, Timestamp } from 'firebase/firestore'
import DateFilterBar from '../components/DateFilterBar.vue'
import { Bar } from 'vue-chartjs'
import { useBackfillDate } from '@/composables/useBackfillDate'
import { useMenu } from '@/composables/useMenu'
import { useExtras } from '@/composables/useExtras'

const router = useRouter()
const orders = ref([])
const filter = ref({ mode: 'day', date: null, month: null, year: null })
const showAllItemsDialog = ref(false)
const showHistoryDialog = ref(false)
const showBackfillPicker = ref(false)

// ==================== Menu + Extras (do edycji zamówień) ====================
const { menuItems, fetchMenu } = useMenu()
const { extrasPriceMap, fetchExtras } = useExtras()
const menu = computed(() => menuItems.value)
const categoryList = ['zupy', 'zupa dnia', 'dania główne', 'danie dnia', 'dodatki', 'surówki', 'napoje', 'składniki']

// ==================== Edycja zamówienia (z historii) ====================
const editOrderDialog = ref(null)        // { order }
const editOrderDraft = reactive({ items: {} })
const editOrderType = ref(null)
const editOrderContainers = ref(0)
const editOrderCategory = ref('zupy')
const editOrderSaving = ref(false)


const generateItemKey = (name, quantity = 1, extras = []) => {
  let key = name
  if (quantity !== 1) key += `|q${quantity}`
  if (extras?.length) key += `|${[...extras].sort().join(',')}`
  return key
}

const openEditOrderDialog = (order) => {
  // Załaduj pozycje do draftu
  editOrderDraft.items = {}
  for (const item of (order.items || [])) {
    const key = generateItemKey(item.name, item.quantity ?? 1, item.extras ?? [])
    editOrderDraft.items[key] = {
      name: item.name,
      quantity: item.quantity ?? 1,
      count: item.count ?? 1,
      extras: [...(item.extras ?? [])],
    }
  }
  editOrderType.value = order.type ?? null
  editOrderContainers.value = order.containers ?? 0
  editOrderCategory.value = 'zupy'
  editOrderDialog.value = { order }
}

const editOrderItems = computed(() =>
  Object.entries(editOrderDraft.items).map(([key, data]) => {
    const found = menu.value.find(m => m.name === data.name)
    const basePrice = found?.price ?? 0
    const extrasPrice = (data.extras ?? []).reduce((s, n) => s + (extrasPriceMap.value[n] ?? 0), 0)
    const unitPrice = basePrice + extrasPrice
    const finalPrice = unitPrice * data.quantity * (data.count ?? 1)
    return { key, name: data.name, quantity: data.quantity, count: data.count ?? 1, extras: data.extras ?? [], finalPrice }
  })
)

const editOrderTotal = computed(() => {
  const itemsTotal = editOrderItems.value.reduce((s, i) => s + i.finalPrice, 0)
  const containerItem = menu.value.find(m => m.name === 'pojemniki')
  return itemsTotal + editOrderContainers.value * (containerItem?.price ?? 0)
})

const editFilteredMenu = computed(() => {
  return menu.value
    .filter(i => i.category === editOrderCategory.value)
    .slice()
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
})

const editAddItem = (item) => {
  const key = generateItemKey(item.name, 1, [])
  if (editOrderDraft.items[key]) {
    editOrderDraft.items[key].count++
  } else {
    editOrderDraft.items[key] = { name: item.name, quantity: 1, count: 1, extras: [] }
  }
}

const editRemoveItem = (key) => {
  delete editOrderDraft.items[key]
}

const editDecreaseItem = (key) => {
  const entry = editOrderDraft.items[key]
  if (!entry) return
  if (entry.count > 1) entry.count--
  else delete editOrderDraft.items[key]
}

const confirmEditOrder = async () => {
  if (!editOrderDialog.value) return
  editOrderSaving.value = true
  try {
    const items = editOrderItems.value.map(i => ({
      name: i.name,
      quantity: i.quantity,
      count: i.count,
      extras: i.extras,
      finalPrice: i.finalPrice,
    }))
    await updateDoc(doc(db, 'orders', editOrderDialog.value.order.id), {
      items,
      type: editOrderType.value,
      containers: editOrderContainers.value,
      editedAt: Timestamp.now(),
    })
    // Zaktualizuj lokalnie
    const found = orders.value.find(o => o.id === editOrderDialog.value.order.id)
    if (found) {
      found.items = items
      found.type = editOrderType.value
      found.containers = editOrderContainers.value
      found.editedAt = new Date()
    }
    editOrderDialog.value = null
  } catch (err) {
    alert('Błąd podczas zapisu: ' + err.message)
  } finally {
    editOrderSaving.value = false
  }
}

// Edycja daty zamówienia
const editDateDialog = ref(null)   // { order }
const editDateValue = ref('')       // 'YYYY-MM-DD'
const editTimeValue = ref('')       // 'HH:MM'
const editDateSaving = ref(false)

const openEditDateDialog = (order) => {
  const d = order.createdAt
  editDateValue.value = d.toISOString().slice(0, 10)
  editTimeValue.value = d.toTimeString().slice(0, 5)
  editDateDialog.value = { order }
}

const confirmEditDate = async () => {
  if (!editDateDialog.value || !editDateValue.value || !editTimeValue.value) return
  editDateSaving.value = true
  try {
    const [y, m, day] = editDateValue.value.split('-').map(Number)
    const [h, min] = editTimeValue.value.split(':').map(Number)
    const newDate = new Date(y, m - 1, day, h, min, 0)
    await updateDoc(doc(db, 'orders', editDateDialog.value.order.id), {
      createdAt: Timestamp.fromDate(newDate)
    })
    // Zaktualizuj lokalnie bez pełnego refetcha
    const found = orders.value.find(o => o.id === editDateDialog.value.order.id)
    if (found) found.createdAt = newDate
    editDateDialog.value = null
  } catch (err) {
    alert('Błąd podczas zapisu: ' + err.message)
  } finally {
    editDateSaving.value = false
  }
}

const { backfillDate, isActive: backfillActive, label: backfillLabel, setDate: setBackfillDate, clear: clearBackfill } = useBackfillDate()

const tempBackfillDate = ref('')

const openBackfillPicker = () => {
  tempBackfillDate.value = backfillDate.value || new Date().toISOString().slice(0, 10)
  showBackfillPicker.value = true
}

const confirmBackfill = () => {
  if (tempBackfillDate.value) {
    setBackfillDate(tempBackfillDate.value)
  }
  showBackfillPicker.value = false
}

const maxBackfillDate = new Date().toISOString().slice(0, 10)


// ==================== Lifecycle ====================
onMounted(() => {
  fetchData()
  fetchMenu()
  fetchExtras()
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

/* ===================== BACKFILL DATE ===================== */
.backfill-section {
  margin-top: 1rem;
}

.backfill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #fff;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  flex-wrap: wrap;
}

.backfill-row.active {
  border-color: #f59e0b;
  background: #fffbeb;
}

.backfill-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.backfill-icon {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.backfill-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
  margin-bottom: 0.2rem;
}

.backfill-desc {
  font-size: 0.85rem;
  color: var(--muted);
}

.backfill-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.btn-backfill-set {
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 0.6rem;
  padding: 0.55rem 1.1rem;
  font-weight: 700;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: filter 0.15s;
}
.btn-backfill-set:hover { filter: brightness(1.08); }

.btn-backfill-clear {
  background: #fff;
  color: #dc2626;
  border: 2px solid #dc2626;
  border-radius: 0.6rem;
  padding: 0.55rem 1.1rem;
  font-weight: 700;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-backfill-clear:hover { background: #fee2e2; }

/* ===================== EDYCJA ZAMÓWIENIA ===================== */
.btn-edit-order {
  background: #fff;
  border: 1.5px solid var(--border-subtle);
  border-radius: 0.4rem;
  padding: 0.2rem 0.4rem;
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  transition: background 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.btn-edit-order:hover { background: #dbeafe; border-color: #3b82f6; }

.order-edited-badge {
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 0.3rem;
  border: 1px solid #bfdbfe;
  white-space: nowrap;
}

.edit-order-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-order-type-row {
  display: flex;
  gap: 0.5rem;
}

.order-type-pill {
  padding: 0.45rem 1.1rem;
  border-radius: 9999px;
  border: 2px solid var(--border-subtle);
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.order-type-pill.active {
  background: var(--orange);
  border-color: var(--orange-dark);
  color: #fff;
}

.edit-order-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 680px) {
  .edit-order-columns { grid-template-columns: 1fr; }
}

/* Mini menu */
.edit-cat-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.65rem;
}
.edit-cat-pill {
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  border: 1.5px solid var(--border-subtle);
  background: #f9fafb;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-transform: capitalize;
  transition: background 0.12s, border-color 0.12s;
}
.edit-cat-pill.active {
  background: var(--green-soft);
  border-color: var(--green);
  color: #1a3a1a;
}
.edit-cat-pill:hover:not(.active) { background: #e5e7eb; }

.edit-menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 320px;
  overflow-y: auto;
}
.edit-menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.65rem;
  border-radius: 0.5rem;
  background: #f9fafb;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  font-size: 0.88rem;
  transition: background 0.1s;
}
.edit-menu-item:hover { background: var(--green-soft); border-color: var(--green); }
.edit-menu-name { font-weight: 500; }
.edit-menu-price { color: var(--muted); font-size: 0.82rem; white-space: nowrap; margin-left: 0.5rem; }
.edit-menu-empty { text-align: center; padding: 1rem 0; font-style: italic; font-size: 0.88rem; }

/* Lista pozycji zamówienia */
.edit-order-items-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.65rem;
}
.edit-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 0.65rem;
}
.edit-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  background: #f9fafb;
  border: 1px solid var(--border-subtle);
  font-size: 0.88rem;
}
.edit-item-info { flex: 1; min-width: 0; }
.edit-item-name { font-weight: 600; }
.edit-item-portion, .edit-item-extras { font-size: 0.8rem; }
.edit-item-controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}
.edit-item-price { font-weight: 700; color: var(--orange-dark); font-size: 0.82rem; white-space: nowrap; }

.edit-ctrl-btn {
  border: 1.5px solid var(--border-subtle);
  border-radius: 0.35rem;
  background: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  width: 1.6rem;
  height: 1.6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, border-color 0.1s;
  padding: 0;
  font-family: inherit;
}
.edit-ctrl-btn--plus:hover  { background: var(--green-soft); border-color: var(--green); }
.edit-ctrl-btn--minus:hover { background: #ffe3e3; border-color: #cc0000; }
.edit-ctrl-btn--del:hover   { background: #fee2e2; border-color: #ef4444; }
.edit-ctrl-count { font-weight: 700; font-size: 0.88rem; min-width: 1.4rem; text-align: center; }

/* Pojemniki */
.edit-containers-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.65rem;
  background: #f9fafb;
  border-radius: 0.55rem;
  border: 1px solid var(--border-subtle);
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.edit-containers-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Suma */
.edit-order-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--orange-soft);
  padding: 0.5rem 0.65rem;
  border-radius: 0.55rem;
  font-weight: 600;
  border: 1px solid #ffd6aa;
  font-size: 0.95rem;
}
.edit-order-summary strong { color: var(--orange-dark); }

/* ===================== EDYCJA DATY ZAMÓWIENIA ===================== */
.history-order-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-edit-date {
  background: #fff;
  border: 1.5px solid var(--border-subtle);
  border-radius: 0.4rem;
  padding: 0.2rem 0.4rem;
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  transition: background 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.btn-edit-date:hover {
  background: #fef3c7;
  border-color: #f59e0b;
}

.edit-date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
</style>
