<template>
  <div class="view-container">
    <header class="flex flex-row" style="justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h1 style="font-size: 1.75rem; font-weight: 800;">Zarządzanie Menu</h1>
      <div class="flex flex-row" style="gap: 0.5rem; align-items: center;">
        <button class="btn-outline btn-sm" @click="router.push('/admin')">Panel admina</button>
        <button class="btn-outline btn-sm" @click="logout">Wyloguj</button>
      </div>
    </header>

    <!-- Przycisk dodawania -->
    <section style="margin-bottom: 1rem;">
      <button class="btn-add" @click="openAddDialog">
        ➕ Dodaj nową pozycję
      </button>
    </section>

    <!-- Loader -->
    <div v-if="loading && !menuItems.length" class="loader">
      Ładowanie menu...
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      ❌ Błąd: {{ error }}
    </div>

    <!-- Menu pogrupowane po kategoriach -->
    <section v-for="category in MENU_CATEGORIES" :key="category.value" class="card category-section">
      <h2 class="category-title">{{ category.label }}</h2>

      <div v-if="menuByCategory[category.value]?.length" class="menu-items-grid">
        <div
          v-for="item in menuByCategory[category.value]"
          :key="item.id"
          class="menu-item-card"
        >
          <div class="item-info">
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-price">{{ item.price }} zł</p>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-edit" @click="openEditDialog(item)" title="Edytuj">
              ✏️
            </button>
            <button class="btn-icon btn-delete" @click="confirmDelete(item)" title="Usuń">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <p v-else class="empty-category">
        Brak pozycji w tej kategorii
      </p>
    </section>

    <!-- Dialog dodawania/edycji -->
    <div v-if="dialogOpen" class="dialog-backdrop" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">
            {{ editMode ? 'Edytuj pozycję' : 'Dodaj nową pozycję' }}
          </h2>
          <button class="dialog-close" @click="closeDialog">✖</button>
        </div>

        <div class="dialog-body" style="padding: 1.5rem;">
          <form @submit.prevent="saveItem" class="form">
            <div class="form-group">
              <label class="form-label">Nazwa pozycji</label>
              <input
                v-model="formData.name"
                type="text"
                class="form-input"
                placeholder="np. Kotlet schabowy"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Cena (zł)</label>
              <input
                v-model="formData.price"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="np. 17"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Kategoria</label>
              <select v-model="formData.category" class="form-select" required>
                <option value="" disabled>Wybierz kategorię</option>
                <option v-for="cat in MENU_CATEGORIES" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeDialog">
                Anuluj
              </button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? 'Zapisywanie...' : (editMode ? 'Zapisz zmiany' : 'Dodaj pozycję') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Dialog potwierdzenia usunięcia -->
    <div v-if="deleteDialog" class="dialog-backdrop" @click.self="deleteDialog = null">
      <div class="dialog-content" style="max-width: 500px;">
        <div class="dialog-header">
          <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Potwierdź usunięcie</h2>
          <button class="dialog-close" @click="deleteDialog = null">✖</button>
        </div>

        <div class="dialog-body" style="padding: 1.5rem;">
          <p style="margin-bottom: 1.5rem; color: #6b7280;">
            Czy na pewno chcesz usunąć pozycję:<br/>
            <strong style="color: #1f2937;">{{ deleteDialog?.name }}</strong> ({{ deleteDialog?.price }} zł)?
          </p>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="deleteDialog = null">
              Anuluj
            </button>
            <button type="button" class="btn-danger" @click="executeDelete" :disabled="saving">
              {{ saving ? 'Usuwanie...' : 'Usuń' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import { useMenu, MENU_CATEGORIES } from '@/composables/useMenu'

const router = useRouter()
const { menuItems, menuByCategory, loading, error, fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem } = useMenu()

const dialogOpen = ref(false)
const deleteDialog = ref(null)
const editMode = ref(false)
const saving = ref(false)
const formData = ref({
  name: '',
  price: '',
  category: ''
})
const editingId = ref(null)

// ==================== Lifecycle ====================
onMounted(() => {
  fetchMenu()
})

// ==================== Auth ====================
const logout = async () => {
  await signOut(auth)
  router.replace('/login')
}

// ==================== Dialog Management ====================
const openAddDialog = () => {
  editMode.value = false
  editingId.value = null
  formData.value = {
    name: '',
    price: '',
    category: ''
  }
  dialogOpen.value = true
}

const openEditDialog = (item) => {
  editMode.value = true
  editingId.value = item.id
  formData.value = {
    name: item.name,
    price: item.price,
    category: item.category
  }
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
  formData.value = {
    name: '',
    price: '',
    category: ''
  }
  editingId.value = null
}

// ==================== CRUD Operations ====================
const saveItem = async () => {
  if (!formData.value.name || !formData.value.price || !formData.value.category) {
    return
  }

  saving.value = true

  try {
    if (editMode.value) {
      await updateMenuItem(editingId.value, formData.value)
    } else {
      await addMenuItem(formData.value)
    }
    closeDialog()
  } catch (err) {
    alert('Błąd podczas zapisywania: ' + err.message)
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item) => {
  deleteDialog.value = item
}

const executeDelete = async () => {
  if (!deleteDialog.value) return

  saving.value = true

  try {
    await deleteMenuItem(deleteDialog.value.id)
    deleteDialog.value = null
  } catch (err) {
    alert('Błąd podczas usuwania: ' + err.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.category-section {
  margin-bottom: 1.5rem;
}

.category-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #ff8a3c;
}

.menu-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.menu-item-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}

.menu-item-card:hover {
  background: #ffe8d5;
  border-color: #ff8a3c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(230, 119, 0, 0.2);
}

.item-info {
  flex: 1;
}

.item-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.item-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e67700;
  margin: 0;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit:hover {
  background: #dbeafe;
  border-color: #3b82f6;
}

.btn-delete:hover {
  background: #fee2e2;
  border-color: #ef4444;
}

.btn-add {
  width: 100%;
  background: linear-gradient(135deg, #2f9e44 0%, #2b8a3e 100%);
  color: white;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 1rem;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(47, 158, 68, 0.3);
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(47, 158, 68, 0.4);
}

.empty-category {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

.loader {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-size: 1.1rem;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #fecaca;
}

/* Form styles */
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-input,
.form-select {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #ff8a3c;
  box-shadow: 0 0 0 3px rgba(255, 138, 60, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #ff8a3c 0%, #e67700 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(230, 119, 0, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #6b7280;
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Reuse existing dialog styles */
.btn-outline {
  background: white;
  border: 2px solid #ff8a3c;
  color: #e67700;
  padding: 0.6rem 1.2rem;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
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

.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.dialog-content {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  transition: color 0.2s ease;
}

.dialog-close:hover {
  color: #e67700;
}

.dialog-body {
  overflow-y: auto;
}

@media (max-width: 768px) {
  .menu-items-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    width: 100%;
  }
}
</style>

