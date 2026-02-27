import { ref, computed } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'

const menuItems = ref([])
const loading = ref(false)
const error = ref(null)

// Kategorie menu
export const MENU_CATEGORIES = [
  { value: 'zupy', label: 'Zupy' },
  { value: 'zupa dnia', label: 'Zupa dnia' },
  { value: 'dania główne', label: 'Dania główne' },
  { value: 'danie dnia', label: 'Danie dnia' },
  { value: 'dodatki', label: 'Dodatki' },
  { value: 'surówki', label: 'Surówki' },
  { value: 'napoje', label: 'Napoje' },
  { value: 'składniki', label: 'Składniki' },
  { value: 'opakowania', label: 'Opakowania' }
]

export function useMenu() {
  // Pobierz menu z Firestore (bez orderBy - sortujemy po stronie klienta)
  const fetchMenu = async () => {
    loading.value = true
    error.value = null

    try {
      const snapshot = await getDocs(collection(db, 'menu'))

      menuItems.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Sortowanie po polu order (z fallbackiem na Infinity dla starych pozycji)
      menuItems.value.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas pobierania menu:', err)
    } finally {
      loading.value = false
    }
  }

  // Dodaj nową pozycję
  const addMenuItem = async (item) => {
    loading.value = true
    error.value = null

    try {
      const docRef = await addDoc(collection(db, 'menu'), {
        name: item.name.trim(),
        price: Number(item.price),
        category: item.category
      })

      await fetchMenu() // Odśwież listę
      return docRef.id
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas dodawania pozycji:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Zaktualizuj pozycję
  const updateMenuItem = async (id, updates) => {
    loading.value = true
    error.value = null

    try {
      const itemRef = doc(db, 'menu', id)
      await updateDoc(itemRef, {
        name: updates.name.trim(),
        price: Number(updates.price),
        category: updates.category
      })

      await fetchMenu() // Odśwież listę
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas aktualizacji pozycji:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Usuń pozycję
  const deleteMenuItem = async (id) => {
    loading.value = true
    error.value = null

    try {
      await deleteDoc(doc(db, 'menu', id))
      await fetchMenu() // Odśwież listę
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas usuwania pozycji:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Menu pogrupowane po kategoriach (sortowanie po polu order)
  const menuByCategory = computed(() => {
    const grouped = {}
    MENU_CATEGORIES.forEach(cat => {
      const items = menuItems.value.filter(item => item.category === cat.value)
      grouped[cat.value] = items.slice().sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    })
    return grouped
  })

  // Zapisz nową kolejność pozycji w danej kategorii (batch update)
  const reorderMenuItems = async (orderedItems) => {
    const batch = writeBatch(db)
    orderedItems.forEach((item, index) => {
      batch.update(doc(db, 'menu', item.id), { order: index })
    })
    await batch.commit()
    // Zaktualizuj lokalnie bez refetcha
    orderedItems.forEach((item, index) => {
      const found = menuItems.value.find(m => m.id === item.id)
      if (found) found.order = index
    })
  }

  return {
    menuItems,
    menuByCategory,
    loading,
    error,
    fetchMenu,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    reorderMenuItems
  }
}

