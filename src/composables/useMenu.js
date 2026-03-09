import { ref, computed } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore'

const menuItems = ref([])
const loading = ref(false)
const error = ref(null)
const initialized = ref(false)

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
  const fetchMenu = async (force = false) => {
    if (initialized.value && !force) return
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
      initialized.value = true
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas pobierania menu:', err)
    } finally {
      loading.value = false
    }
  }

  // Dodaj nową pozycję
  const addMenuItem = async (item) => {
    error.value = null
    // Optymistyczny update — tymczasowe ID
    const tempId = '_tmp_' + Date.now()
    const optimistic = {
      id: tempId,
      name: item.name.trim(),
      price: Number(item.price),
      category: item.category,
      order: menuItems.value.length,
      ...(item.category === 'napoje' ? { showInKitchen: item.showInKitchen ?? false } : {}),
    }
    menuItems.value = [...menuItems.value, optimistic]
    try {
      const docRef = await addDoc(collection(db, 'menu'), {
        name: optimistic.name,
        price: optimistic.price,
        category: optimistic.category,
        ...(item.category === 'napoje' ? { showInKitchen: optimistic.showInKitchen } : {}),
      })
      // Zamień tymczasowy rekord na prawdziwy
      menuItems.value = menuItems.value.map(m => m.id === tempId ? { ...optimistic, id: docRef.id } : m)
      return docRef.id
    } catch (err) {
      // Rollback
      menuItems.value = menuItems.value.filter(m => m.id !== tempId)
      error.value = err.message
      throw err
    }
  }

  // Zaktualizuj pozycję
  const updateMenuItem = async (id, updates) => {
    error.value = null
    const prev = menuItems.value.find(m => m.id === id)
    // Optymistyczny update
    menuItems.value = menuItems.value.map(m =>
      m.id === id ? {
        ...m,
        name: updates.name.trim(),
        price: Number(updates.price),
        category: updates.category,
        ...(updates.category === 'napoje' ? { showInKitchen: updates.showInKitchen ?? false } : {}),
      } : m
    )
    try {
      await updateDoc(doc(db, 'menu', id), {
        name: updates.name.trim(),
        price: Number(updates.price),
        category: updates.category,
        ...(updates.category === 'napoje' ? { showInKitchen: updates.showInKitchen ?? false } : {}),
      })
    } catch (err) {
      // Rollback
      if (prev) menuItems.value = menuItems.value.map(m => m.id === id ? prev : m)
      error.value = err.message
      throw err
    }
  }

  // Usuń pozycję + zależności (menu dnia, matryca extras, konfiguracja porcji)
  const deleteMenuItem = async (id) => {
    error.value = null
    const prev = menuItems.value.find(m => m.id === id)
    // Optymistyczny update
    menuItems.value = menuItems.value.filter(m => m.id !== id)
    try {
      const batch = writeBatch(db)

      // Główny dokument menu
      batch.delete(doc(db, 'menu', id))

      // Dokumenty zależne 1:1 po menuItemId
      batch.delete(doc(db, 'extrasMatrix', id))
      batch.delete(doc(db, 'portionConfig', id))

      // Usuń ID z menu dnia (we wszystkich dniach)
      const dailySnap = await getDocs(collection(db, 'dailyMenu'))
      dailySnap.forEach(dayDoc => {
        const data = dayDoc.data()
        const zupy = Array.isArray(data.zupy) ? data.zupy : []
        const dania = Array.isArray(data.dania) ? data.dania : []

        const nextZupy = zupy.filter(itemId => itemId !== id)
        const nextDania = dania.filter(itemId => itemId !== id)

        if (nextZupy.length !== zupy.length || nextDania.length !== dania.length) {
          batch.set(doc(db, 'dailyMenu', dayDoc.id), { zupy: nextZupy, dania: nextDania }, { merge: true })
        }
      })

      await batch.commit()
    } catch (err) {
      // Rollback
      if (prev) menuItems.value = [...menuItems.value, prev]
      error.value = err.message
      throw err
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

  const cleanupMenuDependencies = async () => {
    error.value = null

    const stats = {
      removedDailyRefs: 0,
      removedExtrasMatrixDocs: 0,
      removedPortionConfigDocs: 0,
      updatedDailyDocs: 0,
    }

    try {
      const [menuSnap, dailySnap, matrixSnap, portionSnap] = await Promise.all([
        getDocs(collection(db, 'menu')),
        getDocs(collection(db, 'dailyMenu')),
        getDocs(collection(db, 'extrasMatrix')),
        getDocs(collection(db, 'portionConfig')),
      ])

      const menuIds = new Set(menuSnap.docs.map(d => d.id))
      const batch = writeBatch(db)

      dailySnap.forEach(dayDoc => {
        const data = dayDoc.data()
        const zupy = Array.isArray(data.zupy) ? data.zupy : []
        const dania = Array.isArray(data.dania) ? data.dania : []

        const nextZupy = zupy.filter(itemId => menuIds.has(itemId))
        const nextDania = dania.filter(itemId => menuIds.has(itemId))

        if (nextZupy.length !== zupy.length || nextDania.length !== dania.length) {
          stats.removedDailyRefs += (zupy.length - nextZupy.length) + (dania.length - nextDania.length)
          stats.updatedDailyDocs += 1
          batch.set(doc(db, 'dailyMenu', dayDoc.id), { zupy: nextZupy, dania: nextDania }, { merge: true })
        }
      })

      matrixSnap.forEach(matrixDoc => {
        if (!menuIds.has(matrixDoc.id)) {
          stats.removedExtrasMatrixDocs += 1
          batch.delete(doc(db, 'extrasMatrix', matrixDoc.id))
        }
      })

      portionSnap.forEach(portionDoc => {
        if (!menuIds.has(portionDoc.id)) {
          stats.removedPortionConfigDocs += 1
          batch.delete(doc(db, 'portionConfig', portionDoc.id))
        }
      })

      const hasChanges =
        stats.removedDailyRefs > 0 ||
        stats.removedExtrasMatrixDocs > 0 ||
        stats.removedPortionConfigDocs > 0

      if (hasChanges) {
        await batch.commit()
      }

      return stats
    } catch (err) {
      error.value = err.message
      throw err
    }
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
    reorderMenuItems,
    cleanupMenuDependencies,
  }
}
