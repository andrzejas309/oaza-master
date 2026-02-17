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

        <p v-else class="muted">Brak pozycji.</p>

        <div class="order-summary" v-if="orderItems.length">
          <span>Razem:</span>
          <strong>{{ totalPrice.toFixed(2) }} zł</strong>
        </div>

        <div class="order-actions">
          <button
              class="btn-sage"
              @click="saveOrder"
              :disabled="!orderItems.length || saving"
          >
            ✅ {{ saving ? 'Zapisywanie...' : 'Zapisz zamówienie' }}
          </button>
        </div>
      </div>
    </section>

    <!-- SEKCJA AKTYWNYCH ZAMÓWIEŃ -->
    <section class="card orders-section">
      <h2 class="section-title">Aktualne zamówienia (w toku)</h2>
      <transition-group name="fade" tag="div" class="orders-list">
        <div
            v-for="order in activeOrders"
            :key="order.id"
            class="order-card"
        >
          <div class="order-info">
            <div class="order-number">#{{ order.number }}</div>
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
          v-if="activeOrders.length === 0"
          class="muted"
          style="text-align:center;"
      >
        Brak aktywnych zamówień
      </p>
    </section>

    <section class="card orders-section">
      <h2 class="section-title">Oczekujące na odbiór</h2>
    </section>

    <!-- OKNO WYBORU PORCJI (DODAWANIE) -->
    <div v-if="portionDialogOpen" class="portion-dialog-backdrop">
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

        <button class="btn-outline" @click="portionDialogOpen = false">
          Anuluj
        </button>
      </div>
    </div>

    <!-- POPUP EDYCJI SKŁADNIKÓW -->
    <div v-if="extrasDialogOpen" class="portion-dialog-backdrop">
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

        <div
            style="display:flex; gap:0.5rem; justify-content: center; margin-top:0.5rem;"
        >
          <button class="btn-sage" @click="saveExtras">
            Zapisz
          </button>
          <button class="btn-outline" @click="extrasDialogOpen = false">
            Anuluj
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { auth, db } from '../firebase'
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
const showForm = ref(false)
const saving = ref(false)
const activeOrders = ref([])

// orderDraft.items: { [name]: { quantity: number, extras: string[] } }
const orderDraft = reactive({ items: {} })

// 📌 Kategorie – zamiast alfabetu
const categoryList = ['zupy', 'dania główne', 'dodatki', 'surówki', 'napoje', 'składniki']
const selectedCategory = ref('zupy')

// 📌 SKŁADNIKI dodatkowe
const EXTRAS = [
  { name: 'jajko', price: 3 },
  { name: 'pieczarki', price: 3 },
  { name: 'cebula', price: 3 },
  { name: 'ser', price: 3 },
  { name: 'porcja uszek', price: 6 },
  { name: 'porcja makaronu', price: 3 },
  { name: 'bez kiełbasy', price: 0 },
  { name: 'bez sosu', price: 0 },
  { name: 'bez sera', price: 0 },
  { name: 'bez ananasa', price: 0 },
  { name: 'w panierce z mąki', price: 0 },
]
const EXTRAS_PRICE = EXTRAS.reduce((map, e) => {
  map[e.name] = e.price
  return map
}, {})

// warianty składników dla różnych kategorii
const EXTRAS_FOR_MAIN = EXTRAS.filter(
    (e) => e.name !== 'porcja uszek' && e.name !== 'porcja makaronu' && e.name !== 'bez kiełbasy',
)
const EXTRAS_FOR_SOUPS = EXTRAS.filter(
    (e) => e.name === 'porcja uszek' || e.name === 'porcja makaronu' || e.name === 'bez kiełbasy',
)

// aktualnie używana lista w popupie składników
const extrasOptions = ref(EXTRAS)

// 🔢 popup porcji (dodawanie)
const portionDialogOpen = ref(false)
const portionDialogItem = ref(null)

// pełne opcje porcji (dla zup — z wyjątkiem wykluczonych)
const PORTIONS_FULL = [
  { label: 'Cała porcja', value: 1 },
  { label: 'Pół', value: 0.5 },
  { label: 'Półtora', value: 1.5 },
  { label: 'Podwójna', value: 2 },
]

// skrócone opcje porcji (dla dodatków i surówek)
const PORTIONS_HALF = [
  { label: 'Cała porcja', value: 1 },
  { label: 'Pół', value: 0.5 },
]

const PORTIONS = ref(PORTIONS_FULL)

// wyjątki dla porcji – zupy bez popupu
const portionExcluded = [
  'rosół',
  'barszcz czerwony',
  'chłodnik',
  'flaczki',
  'żurek z kiełbaską',
]

const formatPortionLabel = (val) => {
  if (val == null) return '1 porcja'
  switch (val) {
    case 1:
      return 'cała porcja'
    case 0.5:
      return '½ porcji'
    case 1.5:
      return '1 ½ porcji'
    case 2:
      return 'podwójna porcja'
    default:
      return val + ' porcji'
  }
}

// popup edycji SKŁADNIKÓW
const extrasDialogOpen = ref(false)
const extrasDialogItem = ref(null)
const extrasSelected = ref([])

// 📌 Konwersja menu JSON – tablica [{ name, price, category }]
const menu = menuJson

// helper – upewnij się, że w orderDraft.items istnieje wpis
const ensureEntry = (name) => {
  if (!orderDraft.items[name]) {
    orderDraft.items[name] = {
      quantity: 0,
      extras: [],
    }
  }
  return orderDraft.items[name]
}

// 📌 czy pozycja może być edytowana (tylko zupy i dania główne)
const canEditItem = (orderItem) => {
  const base = menu.find((m) => m.name === orderItem.name)
  if (!base) return false
  return base.category === 'zupy' || base.category === 'dania główne'
}

// 📌 Menu pogrupowane wg kategorii
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

// 🔢 Zamówienie – z uwzględnieniem składników
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
          const finalPrice = unitPrice * data.quantity

          return {
            name,
            quantity: data.quantity,
            extras: data.extras || [],
            basePrice,
            extrasPrice,
            unitPrice,
            finalPrice,
          }
        }),
)

const totalPrice = computed(() =>
    orderItems.value.reduce((sum, item) => sum + item.finalPrice, 0),
)

// usuwanie pozycji
const removeItem = (item) => {
  delete orderDraft.items[item.name]
}

// dodawanie pozycji (klik w menu)
const increase = (item) => {
  const portionCategories = ['zupy', 'dodatki', 'surówki']

  // wyjątki — te zupy nie mają popupu
  if (portionExcluded.includes(item.name)) {
    const entry = ensureEntry(item.name)
    entry.quantity += 1
    return
  }

  // jeśli wymaga wyboru porcji
  if (portionCategories.includes(item.category)) {
    if (['dodatki', 'surówki'].includes(item.category)) {
      PORTIONS.value = PORTIONS_HALF
    } else if (item.category === 'zupy') {
      PORTIONS.value = PORTIONS_FULL
    }

    portionDialogItem.value = item
    portionDialogOpen.value = true
    return
  }

  // pozostałe kategorie → domyślnie cała porcja
  const entry = ensureEntry(item.name)
  entry.quantity += 1
}

// wybór porcji (dodawanie)
const choosePortion = (value) => {
  const item = portionDialogItem.value
  if (!item) return

  const entry = ensureEntry(item.name)
  entry.quantity += value

  portionDialogOpen.value = false
  portionDialogItem.value = null
}

// start edycji (SKŁADNIKI, tylko zupy i dania główne)
const startEditItem = (orderItem) => {
  const base = menu.find((m) => m.name === orderItem.name)
  if (!base) return

  // tylko dla zup i dań głównych
  if (base.category === 'dania główne') {
    // dania główne: bez porcji uszek i makaronu
    extrasOptions.value = EXTRAS_FOR_MAIN
  } else if (base.category === 'zupy') {
    // zupy: tylko porcja uszek i makaronu
    extrasOptions.value = EXTRAS_FOR_SOUPS
  } else {
    // inne kategorie – nie pozwalamy na edycję
    return
  }

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
}

const saveExtras = () => {
  const item = extrasDialogItem.value
  if (!item) return

  const entry = ensureEntry(item.name)
  entry.extras = [...extrasSelected.value]

  extrasDialogOpen.value = false
  extrasDialogItem.value = null
}

// 🔁 Firestore realtime
let unsub = null
onMounted(() => {
  unsub = onSnapshot(collection(db, 'orders'), (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Uwaga: jeśli w starszych zamówieniach items nie mają pola extras,
    // Firestore zwróci po prostu obiekty bez tego pola – UI i tak to obsłuży.
    activeOrders.value = all.filter((o) => o.status === 'w_toku')
  })
})
onUnmounted(() => unsub && unsub())

// 🧾 Zapisywanie zamówienia
const saveOrder = async () => {
  if (!orderItems.value.length) return
  saving.value = true
  await addDoc(collection(db, 'orders'), {
    number: Date.now(),
    items: orderItems.value,
    status: 'w_toku',
    createdAt: serverTimestamp(),
  })
  orderDraft.items = {}
  showForm.value = false
  saving.value = false
}

// 🔥 Oznacz jako gotowe
const markAsReady = async (order) => {
  await updateDoc(doc(db, 'orders', order.id), { status: 'gotowe' })
}

const toggleOrderForm = () => (showForm.value = !showForm.value)
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

.btn,
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

/* SEKCJA FORMULARZA ZAMÓWIENIA */
.order-form {
  display: grid;
  grid-template-columns: 1.6fr 1.2fr;
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

/* ANIMACJE */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
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
  gap: 0.5rem; /* większa przerwa między przyciskami */
}

.order-item-actions button {
  padding: 0.6rem 1rem; /* większe przyciski */
  font-size: 1rem;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.15rem 0.35rem;
  border-radius: 999px;
}

.icon-btn.edit {
  border: 1px solid #f59f00;
  background: #fff7e6;
}

.icon-btn.edit:hover {
  background: #ffd08a;
}

.icon-btn.delete {
  border: 1px solid #e03131;
  background: #ffe3e3;
}

.icon-btn.delete:hover {
  background: #ffc9c9;
}
</style>
