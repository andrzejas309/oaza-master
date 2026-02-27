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
              @end="(evt) => onExtrasDragEnd(evt, category.value)"
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
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import { useMenu, MENU_CATEGORIES } from '@/composables/useMenu'
import { useExtras, EXTRAS_CATEGORIES } from '@/composables/useExtras'
import draggable from 'vuedraggable'
import { clearRoleCache } from '@/router'

const router = useRouter()

const {
  menuItems, menuByCategory,
  loading: menuLoading, error: menuError,
  fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem, reorderMenuItems
} = useMenu()

const {
  extrasItems, extrasByCategory,
  loading: extrasLoading, error: extrasError,
  fetchExtras, addExtra, updateExtra, deleteExtra, reorderExtras
} = useExtras()

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
})

// ==================== Auth ====================
const logout = async () => {
  clearRoleCache()
  await signOut(auth)
  router.replace('/login')
}

// ==================== Dialog Management ====================
const openAddDialog = (mode) => {
  dialogMode.value = mode
  editMode.value = false
  editingId.value = null
  formData.value = { name: '', price: mode === 'extras' ? 0 : '', category: '' }
  dialogOpen.value = true
}

const openEditDialog = (mode, item) => {
  dialogMode.value = mode
  editMode.value = true
  editingId.value = item.id
  formData.value = { name: item.name, price: item.price, category: item.category }
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

const onExtrasDragEnd = async (evt, targetCategory) => {
  if (reordering.value) return
  reordering.value = true
  try {
    const crossCategory = draggedFromCategory !== targetCategory

    if (crossCategory && draggedItem) {
      await updateExtra(draggedItem.id, {
        name: draggedItem.name,
        price: draggedItem.price,
        category: targetCategory,
      })
      await reorderExtras(localExtrasLists[targetCategory])
      if (localExtrasLists[draggedFromCategory]?.length) {
        await reorderExtras(localExtrasLists[draggedFromCategory])
      }
      await fetchExtras()
    } else {
      await reorderExtras(localExtrasLists[targetCategory])
    }
  } finally {
    draggedItem = null
    draggedFromCategory = null
    reordering.value = false
  }
}

// ==================== CRUD ====================
const saveItem = async () => {
  if (!formData.value.name || formData.value.price === '' || !formData.value.category) return
  saving.value = true
  // Normalizuj nazwę do małych liter
  formData.value.name = formData.value.name.trim().toLowerCase()
  try {
    if (dialogMode.value === 'menu') {
      editMode.value
        ? await updateMenuItem(editingId.value, formData.value)
        : await addMenuItem(formData.value)
    } else {
      editMode.value
        ? await updateExtra(editingId.value, formData.value)
        : await addExtra(formData.value)
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
  gap: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  border-bottom: 2px solid var(--border-subtle);
  padding-bottom: 0;
}

.tab-btn {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  padding: 0.65rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: var(--muted);
  border-radius: 0.5rem 0.5rem 0 0;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.tab-btn:hover { background: #f3f4f6; color: var(--text); }
.tab-btn.active { color: var(--text); border-bottom-color: var(--orange); font-weight: 800; }

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
  background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%);
  box-shadow: 0 4px 12px rgba(47, 158, 68, 0.25);
}
.btn-add-item--menu:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47, 158, 68, 0.4); }
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
.delete-confirm-text { color: #374151; line-height: 1.6; margin-bottom: 1.5rem; }

/* ===================== RESPONSIVE ===================== */
@media (max-width: 768px) {
  .form-actions { flex-direction: column; }
  .btn-primary, .btn-secondary-form, .btn-danger-form { width: 100%; text-align: center; }
  .tabs-bar { overflow-x: auto; }
}
</style>

