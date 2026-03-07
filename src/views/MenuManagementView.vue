<template>
  <div class="menu-mgmt-root">

    <!-- HEADER -->
    <header class="app-header">
      <div class="header-brand">
        <span class="header-icon">🍴</span>
        <h1 class="header-title">Zarządzanie Menu</h1>
      </div>
      <nav class="header-nav">
        <button class="btn-nav" @click="router.push('/admin')">Panel admina</button>
        <button class="btn-nav btn-nav--logout" @click="logout">Wyloguj</button>
      </nav>
    </header>

    <main class="menu-mgmt-layout">

      <!-- ZAKŁADKI -->
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'menu' }" @click="activeTab = 'menu'">
          🍽️ Menu
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'extras' }" @click="activeTab = 'extras'">
          🧂 Dodatki (Extras)
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'daily' }" @click="activeTab = 'daily'">
          📅 Menu dnia
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'matrix' }" @click="activeTab = 'matrix'">
          🔗 Matryca dodatków
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'portions' }" @click="activeTab = 'portions'">
          ⚖️ Porcje
        </button>
      </div>

      <!-- ==================== ZAKŁADKA: MENU ==================== -->
      <template v-if="activeTab === 'menu'">
        <div class="actions-bar">
          <button class="btn-add-item btn-add-item--menu" @click="openAddDialog('menu')">
            ➕ Dodaj nową pozycję
          </button>
        </div>

        <div v-if="menuLoading && !menuItems.length" class="state-info muted">Ładowanie menu…</div>
        <div v-if="menuError" class="state-error">❌ Błąd: {{ menuError }}</div>

        <div class="categories-grid">
          <section
            v-for="category in MENU_CATEGORIES"
            :key="category.value"
            class="card category-section"
          >
            <h2 class="category-title category-title--menu">{{ category.label }}</h2>
            <draggable
              :list="localMenuLists[category.value]"
              item-key="id"
              ghost-class="drag-ghost"
              drag-class="drag-active"
              tag="ol"
              class="items-list items-list--droppable"
              :class="{ 'items-list--empty': !localMenuLists[category.value]?.length }"
              :group="{ name: 'menu' }"
              @start="(evt) => { draggedFromCategory = category.value; draggedItem = localMenuLists[category.value][evt.oldIndex] }"
              @end="(evt) => onMenuDragEnd(evt, category.value)"
            >
              <template #item="{ element: item, index }">
                <li class="item-row item-row--draggable">
                  <span class="item-num">{{ index + 1 }}</span>
                  <span
                    v-if="category.value === 'napoje'"
                    class="kitchen-dot"
                    :class="item.showInKitchen ? 'kitchen-dot--on' : 'kitchen-dot--off'"
                    :title="item.showInKitchen ? 'Widoczny na paragonach kuchni' : 'Ukryty na paragonach kuchni'"
                  ></span>
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-price">{{ item.price }} zł</span>
                  <div class="item-actions">
                    <button class="btn-icon btn-icon--edit" @click="openEditDialog('menu', item)" title="Edytuj">✏️</button>
                    <button class="btn-icon btn-icon--delete" @click="confirmDelete('menu', item)" title="Usuń">🗑️</button>
                  </div>
                </li>
              </template>
              <template v-if="!localMenuLists[category.value]?.length" #header>
                <li class="empty-drop-hint">Przeciągnij tu pozycję z innej kategorii</li>
              </template>
            </draggable>
          </section>
        </div>
      </template>

      <!-- ==================== ZAKŁADKA: EXTRAS ==================== -->
      <template v-if="activeTab === 'extras'">
        <div class="actions-bar">
          <button class="btn-add-item btn-add-item--extras" @click="openAddDialog('extras')">
            ➕ Dodaj nowy extras
          </button>
        </div>

        <div v-if="extrasLoading && !extrasItems.length" class="state-info muted">Ładowanie extras…</div>
        <div v-if="extrasError" class="state-error">❌ Błąd: {{ extrasError }}</div>

        <div class="categories-grid">
          <section
            v-for="category in EXTRAS_CATEGORIES"
            :key="category.value"
            class="card category-section"
          >
            <h2 class="category-title category-title--extras">{{ category.label }}</h2>
            <draggable
              :list="localExtrasLists[category.value]"
              item-key="id"
              ghost-class="drag-ghost"
              drag-class="drag-active"
              tag="ol"
              class="items-list items-list--droppable"
              :class="{ 'items-list--empty': !localExtrasLists[category.value]?.length }"
              :group="{ name: 'extras' }"
              @start="(evt) => { draggedFromCategory = category.value; draggedItem = localExtrasLists[category.value][evt.oldIndex] }"
              @add="() => onExtrasCrossCategory(category.value)"
              @end="() => onExtrasSameCategory(category.value)"
            >
              <template #item="{ element: item, index }">
                <li class="item-row item-row--extras item-row--draggable">
                  <span class="item-num item-num--extras">{{ index + 1 }}</span>
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-price item-price--extras">
                    {{ item.price > 0 ? `+${item.price} zł` : 'bezpłatny' }}
                  </span>
                  <div class="item-actions">
                    <button class="btn-icon btn-icon--edit" @click="openEditDialog('extras', item)" title="Edytuj">✏️</button>
                    <button class="btn-icon btn-icon--delete" @click="confirmDelete('extras', item)" title="Usuń">🗑️</button>
                  </div>
                </li>
              </template>
              <template v-if="!localExtrasLists[category.value]?.length" #header>
                <li class="empty-drop-hint empty-drop-hint--extras">Przeciągnij tu extras z innej kategorii</li>
              </template>
            </draggable>
          </section>
        </div>
      </template>

      <!-- ==================== ZAKŁADKA: MENU DNIA ==================== -->
      <template v-if="activeTab === 'daily'">
        <div v-if="dailyLoading" class="state-info muted">Ładowanie menu dnia…</div>
        <div v-if="dailyError" class="state-error">❌ Błąd: {{ dailyError }}</div>

        <div class="daily-grid">
          <div v-for="day in DAYS" :key="day.key" class="card daily-card">
            <h2 class="daily-card-title">{{ day.label }}</h2>

            <!-- Zupy dnia -->
            <div class="daily-section">
              <div class="daily-section-label">🍲 Zupa dnia</div>
              <div class="daily-assigned">
                <div
                  v-for="id in localDaily[day.key].zupy"
                  :key="id"
                  class="daily-assigned-item"
                >
                  <span>{{ menuItemName(id) }}</span>
                  <button class="daily-remove-btn" @click="removeFromDay(day.key, 'zupy', id)" title="Usuń">✕</button>
                </div>
                <div v-if="!localDaily[day.key].zupy.length" class="daily-empty">Brak przypisanych zup</div>
              </div>
              <div class="daily-add-row">
                <select
                  class="form-select daily-select"
                  v-model="addSelects[day.key].zupa"
                  @change="addToDay(day.key, 'zupy', addSelects[day.key].zupa)"
                >
                  <option value="">— wybierz zupę —</option>
                  <option v-for="item in availableZupy(day.key)" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </div>
            </div>

            <!-- Dania dnia -->
            <div class="daily-section">
              <div class="daily-section-label">🍽️ Danie dnia</div>
              <div class="daily-assigned">
                <div
                  v-for="id in localDaily[day.key].dania"
                  :key="id"
                  class="daily-assigned-item"
                >
                  <span>{{ menuItemName(id) }}</span>
                  <button class="daily-remove-btn" @click="removeFromDay(day.key, 'dania', id)" title="Usuń">✕</button>
                </div>
                <div v-if="!localDaily[day.key].dania.length" class="daily-empty">Brak przypisanych dań</div>
              </div>
              <div class="daily-add-row">
                <select
                  class="form-select daily-select"
                  v-model="addSelects[day.key].danie"
                  @change="addToDay(day.key, 'dania', addSelects[day.key].danie)"
                >
                  <option value="">— wybierz danie —</option>
                  <option v-for="item in availableDania(day.key)" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </div>
            </div>

            <div v-if="dailySaving[day.key] || dailySaved[day.key]" class="daily-status">
              <span v-if="dailySaving[day.key]" class="daily-saving">Zapisywanie…</span>
              <span v-else-if="dailySaved[day.key]" class="daily-saved">✓ Zapisano</span>
            </div>
            <div class="daily-card-footer">
              <button class="btn-daily-save" @click="saveDay(day.key)" :disabled="dailySaving[day.key]">
                Zapisz
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== ZAKŁADKA: MATRYCA DODATKÓW ==================== -->
      <template v-if="activeTab === 'matrix'">
        <div class="matrix-filter-bar">
          <button
            v-for="cat in matrixCategories"
            :key="cat.value"
            class="matrix-cat-pill"
            :class="{ active: matrixCategory === cat.value }"
            @click="matrixCategory = cat.value"
          >{{ cat.label }}</button>
        </div>

        <div v-if="matrixMenuItems.length === 0" class="state-info muted">Brak pozycji w tej kategorii.</div>

        <div class="matrix-grid">
          <div
            v-for="item in matrixMenuItems"
            :key="item.id"
            class="card matrix-card"
          >
            <div class="matrix-card-header">
              <span class="matrix-item-name">{{ item.name }}</span>
              <span class="matrix-item-price">{{ item.price }} zł</span>
            </div>

            <!-- Przypisane extras -->
            <div class="matrix-assigned">
              <div
                v-for="eid in (matrixLocal[item.id] ?? [])"
                :key="eid"
                class="matrix-tag"
                :class="extrasTypeClass(eid)"
              >
                <span>{{ extrasName(eid) }}</span>
                <button class="matrix-tag-remove" @click="matrixRemove(item.id, eid)">✕</button>
              </div>
              <div v-if="!(matrixLocal[item.id] ?? []).length" class="daily-empty">Brak przypisanych dodatków</div>
            </div>

            <!-- Dodaj extras -->
            <select
              class="form-select matrix-add-select"
              @change="(e) => { matrixAdd(item.id, e.target.value); e.target.value = '' }"
            >
              <option value="">— dodaj extras —</option>
              <optgroup label="Dodatki">
                <option
                  v-for="e in availableExtrasForItem(item.id, 'dodatek')"
                  :key="e.id"
                  :value="e.id"
                >{{ e.name }}</option>
              </optgroup>
              <optgroup label="Opcje">
                <option
                  v-for="e in availableExtrasForItem(item.id, 'opcja')"
                  :key="e.id"
                  :value="e.id"
                >{{ e.name }}</option>
              </optgroup>
            </select>

            <div v-if="matrixSaving[item.id] || matrixSaved[item.id]" class="daily-status">
              <span v-if="matrixSaving[item.id]" class="daily-saving">Zapisywanie…</span>
              <span v-else-if="matrixSaved[item.id]" class="daily-saved">✓ Zapisano</span>
            </div>
            <div class="daily-card-footer">
              <button class="btn-daily-save btn-matrix-save" @click="matrixSave(item.id)" :disabled="matrixSaving[item.id]">
                Zapisz
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== ZAKŁADKA: PORCJE ==================== -->
      <template v-if="activeTab === 'portions'">
        <div class="matrix-filter-bar">
          <button
            v-for="cat in portionCategories"
            :key="cat.value"
            class="portion-cat-pill"
            :class="{ active: portionCategory === cat.value }"
            @click="portionCategory = cat.value"
          >{{ cat.label }}</button>
        </div>

        <div v-if="portionMenuItems.length === 0" class="state-info muted">Brak pozycji w tej kategorii.</div>

        <div class="matrix-grid">
          <div v-for="item in portionMenuItems" :key="item.id" class="card matrix-card">
            <div class="matrix-card-header" style="border-bottom-color: #10b981;">
              <span class="matrix-item-name" style="color: #065f46;">{{ item.name }}</span>
              <span class="matrix-item-price">{{ item.price }} zł</span>
            </div>

            <!-- Tryb -->
            <div class="portion-mode-row">
              <label
                v-for="m in portionModes"
                :key="m.value"
                class="portion-mode-option"
                :class="{ active: (portionLocal[item.id]?.mode ?? PORTION_MODE_COUNT) === m.value }"
              >
                <input type="radio" :name="'mode_' + item.id" :value="m.value" v-model="portionLocal[item.id].mode" />
                {{ m.label }}
              </label>
            </div>

            <!-- Checkboxy porcji (tylko gdy tryb = portions) -->
            <div v-if="portionLocal[item.id]?.mode === 'portions'" class="portion-checks">
              <label
                v-for="p in ALL_PORTIONS"
                :key="p.value"
                class="portion-check-row"
                :class="{ checked: portionLocal[item.id]?.portions?.includes(p.value) }"
              >
                <input
                  type="checkbox"
                  :value="p.value"
                  v-model="portionLocal[item.id].portions"
                />
                {{ p.label }}
              </label>
            </div>
            <div v-else-if="portionLocal[item.id]?.mode === PORTION_MODE_GRAM" class="daily-empty">
              Użytkownik wpisuje gramaturę ręcznie
            </div>
            <div v-else class="daily-empty">
              Brak dialogu porcji — tylko licznik sztuk
            </div>

            <div v-if="portionSaving[item.id] || portionSaved[item.id]" class="daily-status">
              <span v-if="portionSaving[item.id]" class="daily-saving">Zapisywanie…</span>
              <span v-else-if="portionSaved[item.id]" class="daily-saved">✓ Zapisano</span>
            </div>
            <div class="daily-card-footer">
              <button class="btn-portion-save" @click="portionSave(item.id)" :disabled="portionSaving[item.id]">
                Zapisz
              </button>
            </div>
          </div>
        </div>
      </template>

    </main>

    <!-- ===== Dialog dodawania/edycji ===== -->
    <div v-if="dialogOpen" class="dialog-backdrop" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2 class="dialog-header-title" :class="dialogMode === 'extras' ? 'dialog-header-title--extras' : ''">
            {{ editMode ? '✏️ Edytuj' : '➕ Dodaj' }}
            {{ dialogMode === 'extras' ? 'extras' : 'pozycję' }}
          </h2>
          <button class="dialog-close" @click="closeDialog">✖</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveItem" class="form">
            <div class="form-group">
              <label class="form-label">Nazwa</label>
              <input v-model="formData.name" type="text" class="form-input"
                :placeholder="dialogMode === 'extras' ? 'np. bez sosu' : 'np. Kotlet schabowy'" required />
            </div>
            <div class="form-group">
              <label class="form-label">Cena (zł)</label>
              <input v-model="formData.price" type="number" step="0.01" min="0" class="form-input" placeholder="0" required />
            </div>
            <div class="form-group">
              <label class="form-label">Kategoria</label>
              <select v-model="formData.category" class="form-select" :class="dialogMode === 'extras' ? 'form-select--extras' : ''" required>
                <option value="" disabled>Wybierz kategorię</option>
                <option v-for="cat in (dialogMode === 'extras' ? EXTRAS_CATEGORIES : MENU_CATEGORIES)" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>
            <div v-if="formData.category === 'napoje'" class="form-group form-group--checkbox">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.showInKitchen" />
                <span>Pokazuj na paragonach kuchni</span>
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary-form" @click="closeDialog">Anuluj</button>
              <button type="submit" class="btn-primary" :class="dialogMode === 'extras' ? 'btn-primary--extras' : ''" :disabled="saving">
                {{ saving ? 'Zapisywanie…' : (editMode ? 'Zapisz zmiany' : 'Dodaj') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ===== Dialog potwierdzenia usunięcia ===== -->
    <div v-if="deleteDialog" class="dialog-backdrop" @click.self="deleteDialog = null">
      <div class="dialog-content" style="max-width: 480px;">
        <div class="dialog-header">
          <h2 class="dialog-header-title">🗑️ Potwierdź usunięcie</h2>
          <button class="dialog-close" @click="deleteDialog = null">✖</button>
        </div>
        <div class="dialog-body">
          <p class="delete-confirm-text">
            Czy na pewno chcesz usunąć:<br/>
            <strong>{{ deleteDialog?.item?.name }}</strong>
            <span class="muted"> ({{ deleteDialog?.item?.price }} zł)</span>?
          </p>
          <div class="form-actions">
            <button type="button" class="btn-secondary-form" @click="deleteDialog = null">Anuluj</button>
            <button type="button" class="btn-danger-form" @click="executeDelete" :disabled="saving">
              {{ saving ? 'Usuwanie…' : 'Usuń' }}
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMenu, MENU_CATEGORIES } from '@/composables/useMenu'
import { useExtras, EXTRAS_CATEGORIES } from '@/composables/useExtras'
import { useAuth } from '@/composables/useAuth'
import { useDailyMenu, DAYS } from '@/composables/useDailyMenu'
import { useExtrasMatrix } from '@/composables/useExtrasMatrix'
import { usePortionConfig, ALL_PORTIONS, PORTION_MODE_GRAM, PORTION_MODE_COUNT } from '@/composables/usePortionConfig'
import draggable from 'vuedraggable'

const router = useRouter()
const { logout } = useAuth()

const {  menuItems, menuByCategory,
  loading: menuLoading, error: menuError,
  fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem, reorderMenuItems
} = useMenu()

const {
  extrasItems, extrasByCategory,
  loading: extrasLoading, error: extrasError,
  fetchExtras, addExtra, updateExtra, deleteExtra, reorderExtras,
} = useExtras()


// ==================== Menu dnia ====================
const {
  dailyMenu,
  loading: dailyLoading,
  error: dailyError,
  fetchDailyMenu,
  saveDayMenu,
} = useDailyMenu()

// Pozycje z menu w kategoriach zupa dnia / danie dnia
const zupaDniaItems  = computed(() => menuItems.value.filter(i => i.category === 'zupa dnia').sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)))
const danieDniaItems = computed(() => menuItems.value.filter(i => i.category === 'danie dnia').sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)))

// Pomocnicza — nazwa pozycji po ID
const menuItemName = (id) => menuItems.value.find(i => i.id === id)?.name ?? id

// Pozycje jeszcze nieprzypisane do danego dnia
const availableZupy  = (dayKey) => zupaDniaItems.value.filter(i => !localDaily[dayKey].zupy.includes(i.id))
const availableDania = (dayKey) => danieDniaItems.value.filter(i => !localDaily[dayKey].dania.includes(i.id))

// Lokalne kopie per dzień
const localDaily = reactive(Object.fromEntries(DAYS.map(d => [d.key, { zupy: [], dania: [] }])))
const dailySaving = reactive(Object.fromEntries(DAYS.map(d => [d.key, false])))
const dailySaved  = reactive(Object.fromEntries(DAYS.map(d => [d.key, false])))

// Stan selectów per dzień
const addSelects = reactive(Object.fromEntries(DAYS.map(d => [d.key, { zupa: '', danie: '' }])))

// Synchronizuj localDaily gdy dane z bazy się załadują
watch(dailyMenu, (val) => {
  DAYS.forEach(d => {
    localDaily[d.key].zupy  = [...(val[d.key]?.zupy  ?? [])]
    localDaily[d.key].dania = [...(val[d.key]?.dania ?? [])]
  })
}, { immediate: true, deep: true })

const addToDay = (dayKey, field, id) => {
  if (!id || localDaily[dayKey][field].includes(id)) return
  localDaily[dayKey][field].push(id)
  addSelects[dayKey][field === 'zupy' ? 'zupa' : 'danie'] = ''
}

const removeFromDay = (dayKey, field, id) => {
  localDaily[dayKey][field] = localDaily[dayKey][field].filter(i => i !== id)
}

const saveDay = async (dayKey) => {
  dailySaving[dayKey] = true
  dailySaved[dayKey]  = false
  try {
    await saveDayMenu(dayKey, localDaily[dayKey].zupy, localDaily[dayKey].dania)
    dailySaved[dayKey] = true
    setTimeout(() => { dailySaved[dayKey] = false }, 2000)
  } catch (err) {
    alert('Błąd zapisu: ' + err.message)
  } finally {
    dailySaving[dayKey] = false
  }
}

// ==================== Matryca dodatków ====================
const { matrix, fetchMatrix, saveMatrix } = useExtrasMatrix()

const matrixCategory = ref('dania główne')
const MATRIX_EXCLUDED = ['składniki', 'opakowania']
const matrixCategories = computed(() => MENU_CATEGORIES.filter(c => !MATRIX_EXCLUDED.includes(c.value)))
const matrixLocal    = reactive({})   // { [menuItemId]: string[] }
const matrixSaving   = reactive({})
const matrixSaved    = reactive({})

// Pozycje menu dla wybranej kategorii
const matrixMenuItems = computed(() =>
  menuItems.value
    .filter(i => i.category === matrixCategory.value)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
)

// Synchronizuj matrixLocal z bazą gdy dane się załadują
watch(matrix, (val) => {
  Object.entries(val).forEach(([id, ids]) => {
    matrixLocal[id] = [...ids]
  })
}, { immediate: true, deep: true })

// Pomocnicze
const extrasName      = (eid) => extrasItems.value.find(e => e.id === eid)?.name ?? eid
const extrasTypeClass = (eid) => {
  const cat = extrasItems.value.find(e => e.id === eid)?.category
  return cat === 'opcja' ? 'matrix-tag--opcja' : 'matrix-tag--dodatek'
}
const availableExtrasForItem = (itemId, category) =>
  extrasItems.value.filter(e => e.category === category && !(matrixLocal[itemId] ?? []).includes(e.id))

const matrixAdd = (itemId, eid) => {
  if (!eid) return
  if (!matrixLocal[itemId]) matrixLocal[itemId] = []
  if (!matrixLocal[itemId].includes(eid)) matrixLocal[itemId].push(eid)
}

const matrixRemove = (itemId, eid) => {
  if (!matrixLocal[itemId]) return
  matrixLocal[itemId] = matrixLocal[itemId].filter(id => id !== eid)
}

const matrixSave = async (itemId) => {
  matrixSaving[itemId] = true
  matrixSaved[itemId]  = false
  try {
    await saveMatrix(itemId, matrixLocal[itemId] ?? [])
    matrixSaved[itemId] = true
    setTimeout(() => { matrixSaved[itemId] = false }, 2000)
  } catch (err) {
    alert('Błąd zapisu: ' + err.message)
  } finally {
    matrixSaving[itemId] = false
  }
}

// ==================== Konfiguracja porcji ====================
const { portionConfig, fetchPortionConfig, savePortionConfig } = usePortionConfig()

const PORTION_CATEGORIES_EXCLUDED = ['składniki', 'opakowania', 'napoje']
const portionCategories = computed(() => MENU_CATEGORIES.filter(c => !PORTION_CATEGORIES_EXCLUDED.includes(c.value)))
const portionCategory = ref('dania główne')

const portionModes = [
  { value: 'portions', label: '⚖️ Wybór porcji' },
  { value: PORTION_MODE_GRAM,  label: '⚖️ Gramatura' },
  { value: PORTION_MODE_COUNT, label: '🔢 Tylko licznik' },
]

const portionMenuItems = computed(() =>
  menuItems.value
    .filter(i => i.category === portionCategory.value)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
)

// Lokalne kopie per item
const portionLocal = reactive({})
const portionSaving = reactive({})
const portionSaved  = reactive({})

// Inicjalizuj portionLocal gdy item pojawia się w widoku
watch(portionMenuItems, (items) => {
  items.forEach(item => {
    if (!portionLocal[item.id]) {
      const cfg = portionConfig.value[item.id]
      portionLocal[item.id] = {
        mode:     cfg?.mode     ?? PORTION_MODE_COUNT,
        portions: cfg?.portions ? [...cfg.portions] : [1],
      }
    }
  })
}, { immediate: true })

// Synchronizuj gdy dane z bazy załadowane
watch(portionConfig, (val) => {
  Object.entries(val).forEach(([id, cfg]) => {
    portionLocal[id] = {
      mode:     cfg.mode     ?? PORTION_MODE_COUNT,
      portions: cfg.portions ? [...cfg.portions] : [1],
    }
  })
}, { deep: true })

const portionSave = async (itemId) => {
  portionSaving[itemId] = true
  portionSaved[itemId]  = false
  try {
    const cfg = portionLocal[itemId]
    await savePortionConfig(itemId, cfg.mode, cfg.mode === 'portions' ? cfg.portions : [])
    portionSaved[itemId] = true
    setTimeout(() => { portionSaved[itemId] = false }, 2000)
  } catch (err) {
    alert('Błąd zapisu: ' + err.message)
  } finally {
    portionSaving[itemId] = false
  }
}

// Lokalne kopie list per kategoria — reactive (draggable mutuje je bezpośrednio)
const localMenuLists = reactive({})
const localExtrasLists = reactive({})

// Synchronizacja z Firestore gdy dane się zmienią (po fetch)
watch(() => menuByCategory.value, (byCategory) => {
  MENU_CATEGORIES.forEach(cat => {
    localMenuLists[cat.value] = (byCategory[cat.value] ?? []).slice()
  })
}, { immediate: true, deep: true })

watch(() => extrasByCategory.value, (byCategory) => {
  EXTRAS_CATEGORIES.forEach(cat => {
    localExtrasLists[cat.value] = (byCategory[cat.value] ?? []).slice()
  })
}, { immediate: true, deep: true })

// Flaga zapisu kolejności
const reordering = ref(false)
// Śledzenie przeciąganego elementu i jego oryginalnej kategorii (zwykłe let, nie reactive)
let draggedItem = null
let draggedFromCategory = null

const activeTab = ref('menu')
const dialogOpen = ref(false)
const dialogMode = ref('menu')   // 'menu' | 'extras'
const deleteDialog = ref(null)   // { mode, item }
const editMode = ref(false)
const saving = ref(false)
const formData = ref({ name: '', price: '', category: '' })
const editingId = ref(null)

// ==================== Lifecycle ====================
onMounted(() => {
  fetchMenu()
  fetchExtras()
  fetchDailyMenu()
  fetchMatrix()
  fetchPortionConfig()
})


// ==================== Dialog Management ====================
const openAddDialog = (mode) => {
  dialogMode.value = mode
  editMode.value = false
  editingId.value = null
  formData.value = { name: '', price: mode === 'extras' ? 0 : '', category: '', showInKitchen: false }
  dialogOpen.value = true
}

const openEditDialog = (mode, item) => {
  dialogMode.value = mode
  editMode.value = true
  editingId.value = item.id
  formData.value = { name: item.name, price: item.price, category: item.category, showInKitchen: item.showInKitchen ?? false }
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
  formData.value = { name: '', price: '', category: '' }
  editingId.value = null
}

// ==================== Drag & Drop ====================
const onMenuDragEnd = async (evt, targetCategory) => {
  if (reordering.value) return
  reordering.value = true
  try {
    const crossCategory = draggedFromCategory !== targetCategory

    if (crossCategory && draggedItem) {
      // Element trafił do innej kategorii — zaktualizuj category w Firestore
      await updateMenuItem(draggedItem.id, {
        name: draggedItem.name,
        price: draggedItem.price,
        category: targetCategory,
      })
      // Zapisz kolejność w kategorii docelowej (lista już zmutowana przez draggable)
      await reorderMenuItems(localMenuLists[targetCategory])
      // Zapisz kolejność w kategorii źródłowej (element usunięty)
      if (localMenuLists[draggedFromCategory]?.length) {
        await reorderMenuItems(localMenuLists[draggedFromCategory])
      }
      // Odśwież by zsynchronizować stan z Firestore
      await fetchMenu()
    } else {
      // Reorder w tej samej kategorii
      await reorderMenuItems(localMenuLists[targetCategory])
    }
  } finally {
    draggedItem = null
    draggedFromCategory = null
    reordering.value = false
  }
}

const onExtrasCrossCategory = async (targetCategory) => {
  // @add odpala się na liście docelowej — tutaj wiemy dokładnie gdzie element trafił
  if (reordering.value || !draggedItem || draggedFromCategory === targetCategory) return
  reordering.value = true
  const item = draggedItem
  const fromCategory = draggedFromCategory
  draggedItem = null
  draggedFromCategory = null
  try {
    await updateExtra(item.id, {
      name: item.name,
      price: item.price,
      category: targetCategory,
    })
    await reorderExtras(localExtrasLists[targetCategory])
    if (localExtrasLists[fromCategory]?.length) {
      await reorderExtras(localExtrasLists[fromCategory])
    }
    await fetchExtras()
  } finally {
    reordering.value = false
  }
}

const onExtrasSameCategory = async (targetCategory) => {
  // @end odpala się zawsze — ignoruj jeśli był cross-category (obsłużony przez @add)
  if (reordering.value || draggedFromCategory !== targetCategory) return
  reordering.value = true
  draggedItem = null
  draggedFromCategory = null
  try {
    await reorderExtras(localExtrasLists[targetCategory])
  } finally {
    reordering.value = false
  }
}

// ==================== CRUD ====================
const saveItem = async () => {
  if (!formData.value.name || formData.value.price === '' || !formData.value.category) return
  saving.value = true
  formData.value.name = formData.value.name.trim().toLowerCase()
  // showInKitchen dotyczy tylko napojów, reszta zawsze pokazywana
  const payload = {
    name: formData.value.name,
    price: formData.value.price,
    category: formData.value.category,
    ...(formData.value.category === 'napoje' ? { showInKitchen: formData.value.showInKitchen } : {}),
  }
  try {
    if (dialogMode.value === 'menu') {
      editMode.value
        ? await updateMenuItem(editingId.value, payload)
        : await addMenuItem(payload)
    } else {
      editMode.value
        ? await updateExtra(editingId.value, payload)
        : await addExtra(payload)
    }
    closeDialog()
  } catch (err) {
    alert('Błąd podczas zapisywania: ' + err.message)
  } finally {
    saving.value = false
  }
}

const confirmDelete = (mode, item) => {
  deleteDialog.value = { mode, item }
}

const executeDelete = async () => {
  if (!deleteDialog.value) return
  saving.value = true
  try {
    const { mode, item } = deleteDialog.value
    mode === 'menu' ? await deleteMenuItem(item.id) : await deleteExtra(item.id)
    deleteDialog.value = null
  } catch (err) {
    alert('Błąd podczas usuwania: ' + err.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ===================== ROOT ===================== */
.menu-mgmt-root {
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--text);
}

/* ===================== LAYOUT ===================== */
.menu-mgmt-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2rem;
}

/* ===================== ZAKŁADKI ===================== */

.tabs-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  background: #f1f5f9;
  border-radius: 0.75rem;
  padding: 0.35rem;
  border: 1px solid #e2e8f0;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.55rem 1.15rem;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: #64748b;
  border-radius: 0.5rem;
  transition: color 0.15s, background 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.tab-btn:hover {
  background: #fff;
  color: #1e293b;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.tab-btn.active {
  background: #fff;
  color: var(--orange);
  font-weight: 800;
  box-shadow: 0 1px 6px rgba(0,0,0,0.1);
}


/* ===================== PASEK AKCJI ===================== */
.actions-bar {
  margin-top: 1rem;
  margin-bottom: 0.75rem;
}

.btn-add-item {
  width: 100%;
  color: white;
  padding: 0.9rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 1.05rem;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-add-item--menu {
  background: linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%);
  box-shadow: 0 4px 12px rgba(230, 119, 0, 0.25);
}
.btn-add-item--menu:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(230, 119, 0, 0.4); }
.btn-add-item--extras {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
}
.btn-add-item--extras:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); }

/* ===================== STANY ===================== */
.state-info { text-align: center; padding: 2rem; font-size: 1.05rem; }
.state-error {
  background: #fee2e2; color: #dc2626;
  padding: 1rem 1.25rem; border-radius: 0.75rem;
  margin-top: 1rem; border: 1px solid #fecaca; font-weight: 600;
}

/* ===================== SIATKA KATEGORII (2 obok siebie) ===================== */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  align-items: start;
}

@media (max-width: 800px) {
  .categories-grid { grid-template-columns: 1fr; }
}

/* ===================== SEKCJA KATEGORII ===================== */
.category-section {
  /* card z main.css + własny padding */
  padding: 1rem 1.1rem;
}

.category-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 0.75rem;
  padding-bottom: 0.45rem;
}
.category-title--menu  { border-bottom: 2px solid var(--orange); }
.category-title--extras { border-bottom: 2px solid #7c3aed; color: #4c1d95; }

/* ===================== LISTA POZYCJI ===================== */
.items-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.55rem;
  background: #f9fafb;
  border: 1px solid var(--border-subtle);
  transition: background 0.12s, border-color 0.12s;
  min-height: 2.4rem;
}
.item-row:hover { background: var(--orange-soft); border-color: #ffd6aa; }
.item-row--extras:hover { background: #f5f3ff; border-color: #c4b5fd; }

/* Numer porządkowy */
.item-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  background: var(--orange-dark);
  border-radius: 0.3rem;
  min-width: 1.35rem;
  height: 1.35rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.item-num--extras { background: #7c3aed; }

/* Uchwyt drag – cały wiersz */
.item-row--draggable {
  cursor: grab;
  user-select: none;
}
.item-row--draggable:active { cursor: grabbing; }

/* Nazwa */
.item-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Cena */
.item-price {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--orange-dark);
  white-space: nowrap;
  flex-shrink: 0;
}
.item-price--extras { color: #6d28d9; }

/* Akcje */
.item-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-icon {
  background: white;
  border: 1.5px solid var(--border-subtle);
  border-radius: 0.4rem;
  padding: 0;
  width: 1.8rem;
  height: 1.8rem;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, border-color 0.12s;
}
.btn-icon--edit:hover   { background: #dbeafe; border-color: #3b82f6; }
.btn-icon--delete:hover { background: #fee2e2; border-color: #ef4444; }

/* ===================== DRAG & DROP ===================== */
.items-list--droppable {
  min-height: 2.8rem;
}

.items-list--empty {
  border: 2px dashed var(--border-subtle);
  border-radius: 0.55rem;
  min-height: 3.5rem;
}

.empty-drop-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem;
  font-size: 0.8rem;
  color: var(--muted);
  font-style: italic;
  list-style: none;
}

.empty-drop-hint--extras {
  color: #a78bfa;
}

.drag-ghost {
  opacity: 0.35;
  background: var(--orange-soft) !important;
  border: 2px dashed var(--orange) !important;
}
.item-row--extras.drag-ghost {
  background: #f5f3ff !important;
  border-color: #7c3aed !important;
}
.drag-active {
  box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important;
  transform: scale(1.01) !important;
  opacity: 0.95;
  z-index: 10;
}

/* ===================== DIALOG EXTRAS ===================== */
.dialog-header-title--extras { color: #5b21b6; }
.form-select--extras:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
.btn-primary--extras {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  box-shadow: 0 2px 8px rgba(124,58,237,0.2);
}
.btn-primary--extras:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(124,58,237,0.35); }

/* ===================== MISC ===================== */
.empty-category { font-style: italic; text-align: center; padding: 0.75rem 0; color: var(--muted); font-size: 0.9rem; }

.kitchen-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid #d1d5db;
}
.kitchen-dot--on  { background: #16a34a; border-color: #16a34a; }
.kitchen-dot--off { background: #ffffff; border-color: #d1d5db; }

.form-group--checkbox {  padding: 0.5rem 0.75rem;
  background: #f0fdf4;
  border: 1.5px solid #86efac;
  border-radius: 0.65rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 600;
  color: #166534;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #16a34a;
  cursor: pointer;
  flex-shrink: 0;
}
.delete-confirm-text { color: #374151; line-height: 1.6; margin-bottom: 1.5rem; }

/* ===================== RESPONSIVE ===================== */
@media (max-width: 768px) {
  .form-actions { flex-direction: column; }
  .btn-primary, .btn-secondary-form, .btn-danger-form { width: 100%; text-align: center; }
  .tabs-bar { overflow-x: auto; }
}

/* ===================== MENU DNIA ===================== */
.daily-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 900px) { .daily-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .daily-grid { grid-template-columns: 1fr; } }

.daily-card {
  padding: 1rem 1.1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.daily-card-title {
  font-size: 1rem;
  font-weight: 800;
  margin: 0 0 0.1rem;
  padding-bottom: 0.45rem;
  border-bottom: 2px solid #0ea5e9;
  color: #0284c7;
}

.daily-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.daily-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.1rem;
}

.daily-assigned {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 1.5rem;
}

.daily-assigned-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.3rem 0.55rem;
  border-radius: 0.45rem;
  background: #e0f2fe;
  border: 1.5px solid #7dd3fc;
  font-size: 0.88rem;
  font-weight: 600;
  color: #0369a1;
}

.daily-remove-btn {
  background: none;
  border: none;
  color: #0284c7;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0 0.1rem;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.12s;
}
.daily-remove-btn:hover { opacity: 1; color: #dc2626; }

.daily-add-row {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.daily-select {
  flex: 1;
  font-size: 0.85rem;
  padding: 0.35rem 0.55rem;
  min-width: 0;
}

.daily-empty {
  font-size: 0.8rem;
  color: var(--muted);
  font-style: italic;
  padding: 0.15rem 0.1rem;
}

.daily-status {
  text-align: center;
  min-height: 1.2rem;
}

.daily-card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.1rem;
}

.daily-saving { font-size: 0.78rem; color: var(--muted); }
.daily-saved  { font-size: 0.78rem; color: #16a34a; font-weight: 700; }

.btn-daily-add {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: box-shadow 0.15s, transform 0.15s;
  flex-shrink: 0;
}
.btn-daily-add:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
  transform: translateY(-1px);
}
.btn-daily-add:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-daily-save {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.btn-daily-save:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
  transform: translateY(-1px);
}
.btn-daily-save:disabled { opacity: 0.6; cursor: not-allowed; }
/* ===================== MATRYCA DODATKÓW ===================== */
.matrix-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
  margin-bottom: 0.85rem;
}

.matrix-cat-pill {
  background: #f3f4f6;
  border: 1.5px solid #e5e7eb;
  color: #6b7280;
  padding: 0.4rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.matrix-cat-pill:hover {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}
.matrix-cat-pill.active {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
}
.matrix-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  align-items: start;
}
@media (max-width: 900px) { .matrix-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .matrix-grid { grid-template-columns: 1fr; } }

.matrix-card {
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.matrix-card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid #f59e0b;
}
.matrix-item-name {
  font-weight: 800;
  font-size: 0.95rem;
  color: #92400e;
}
.matrix-item-price {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}
.matrix-assigned {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-height: 1.5rem;
}
.matrix-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.matrix-tag--dodatek {
  background: #fef3c7;
  border: 1.5px solid #fcd34d;
  color: #92400e;
}
.matrix-tag--opcja {
  background: #ede9fe;
  border: 1.5px solid #c4b5fd;
  color: #4c1d95;
}
.matrix-tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  opacity: 0.6;
  padding: 0;
  line-height: 1;
  transition: opacity 0.12s;
}
.matrix-tag-remove:hover { opacity: 1; color: #dc2626; }

.matrix-add-select {
  font-size: 0.85rem;
  padding: 0.35rem 0.55rem;
}

.btn-matrix-save {
  font-size: 0.85rem;
  padding: 0.35rem 1.2rem;
}

/* ===================== PORCJE ===================== */
.portion-cat-pill {
  background: #f3f4f6;
  border: 1.5px solid #e5e7eb;
  color: #6b7280;
  padding: 0.4rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.portion-cat-pill:hover {
  background: #d1fae5;
  border-color: #6ee7b7;
  color: #065f46;
}
.portion-cat-pill.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
}

.portion-mode-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.portion-mode-option {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border-radius: 9999px;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  user-select: none;
  color: #6b7280;
}
.portion-mode-option input[type="radio"] { display: none; }
.portion-mode-option.active {
  background: #d1fae5;
  border-color: #10b981;
  color: #065f46;
}

.portion-checks {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.portion-check-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.55rem;
  border-radius: 0.45rem;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  user-select: none;
}
.portion-check-row:hover { background: #d1fae5; border-color: #6ee7b7; }
.portion-check-row.checked { background: #d1fae5; border-color: #10b981; color: #065f46; font-weight: 700; }
.portion-check-row input[type="checkbox"] {
  accent-color: #10b981;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.btn-portion-save {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.btn-portion-save:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
  transform: translateY(-1px);
}
.btn-portion-save:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
