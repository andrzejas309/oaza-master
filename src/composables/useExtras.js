import { ref, computed } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'

const extrasItems = ref([])
const loading = ref(false)
const error = ref(null)

// Kategorie dodatków (extras)
export const EXTRAS_CATEGORIES = [
  { value: 'main', label: 'Extras – Dania główne' },
  { value: 'soups', label: 'Extras – Zupy' },
  { value: 'sides', label: 'Extras – Dodatki/Surówki' },
]

export function useExtras() {
  const fetchExtras = async () => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(collection(db, 'extras'))
      extrasItems.value = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => item.name)
      extrasItems.value.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas pobierania extras:', err)
    } finally {
      loading.value = false
    }
  }

  const addExtra = async (item) => {
    loading.value = true
    error.value = null
    try {
      const docRef = await addDoc(collection(db, 'extras'), {
        name: item.name.trim(),
        price: Number(item.price),
        category: item.category,
      })
      await fetchExtras()
      return docRef.id
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateExtra = async (id, updates) => {
    loading.value = true
    error.value = null
    try {
      await updateDoc(doc(db, 'extras', id), {
        name: updates.name.trim(),
        price: Number(updates.price),
        category: updates.category,
      })
      await fetchExtras()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteExtra = async (id) => {
    loading.value = true
    error.value = null
    try {
      await deleteDoc(doc(db, 'extras', id))
      await fetchExtras()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Extras pogrupowane po kategorii
  const extrasByCategory = computed(() => {
    const grouped = {}
    EXTRAS_CATEGORIES.forEach(cat => {
      grouped[cat.value] = extrasItems.value
        .filter(item => item.category === cat.value)
        .slice()
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    })
    return grouped
  })

  // Zapisz nową kolejność extras (batch update)
  const reorderExtras = async (orderedItems) => {
    const batch = writeBatch(db)
    orderedItems.forEach((item, index) => {
      batch.update(doc(db, 'extras', item.id), { order: index })
    })
    await batch.commit()
    orderedItems.forEach((item, index) => {
      const found = extrasItems.value.find(e => e.id === item.id)
      if (found) found.order = index
    })
  }

  // Mapa name → price (do liczenia cen w zamówieniu)
  const extrasPriceMap = computed(() => {
    const map = {}
    extrasItems.value.forEach(e => { map[e.name] = e.price })
    return map
  })

  // Extras dla konkretnej kategorii menu
  const extrasForCategory = (menuCategory) => {
    const catMap = {
      'dania główne': 'main',
      'danie dnia':   'main',
      'zupy':         'soups',
      'zupa dnia':    'soups',
      'dodatki':      'sides',
    }
    const key = catMap[menuCategory]
    if (!key) return []
    return extrasByCategory.value[key] || []
  }

  return {
    extrasItems,
    extrasByCategory,
    extrasPriceMap,
    extrasForCategory,
    loading,
    error,
    fetchExtras,
    addExtra,
    updateExtra,
    deleteExtra,
    reorderExtras,
  }
}

