import { ref, computed } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'

const extrasItems = ref([])
const loading = ref(false)
const error = ref(null)
const initialized = ref(false)

// Kategorie dodatków (extras)
export const EXTRAS_CATEGORIES = [
  { value: 'dodatek', label: 'Dodatek' },
  { value: 'opcja',   label: 'Opcja' },
]

export function useExtras() {
  const fetchExtras = async (force = false) => {
    if (initialized.value && !force) return
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(collection(db, 'extras'))
      extrasItems.value = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => item.name)
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
      initialized.value = true
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas pobierania extras:', err)
    } finally {
      loading.value = false
    }
  }

  const addExtra = async (item) => {
    error.value = null
    const tempId = '_tmp_' + Date.now()
    const optimistic = {
      id: tempId,
      name: item.name.trim(),
      price: Number(item.price),
      category: item.category,
      order: extrasItems.value.length,
    }
    extrasItems.value = [...extrasItems.value, optimistic]
    try {
      const docRef = await addDoc(collection(db, 'extras'), {
        name: optimistic.name,
        price: optimistic.price,
        category: optimistic.category,
      })
      extrasItems.value = extrasItems.value.map(e => e.id === tempId ? { ...optimistic, id: docRef.id } : e)
      return docRef.id
    } catch (err) {
      extrasItems.value = extrasItems.value.filter(e => e.id !== tempId)
      error.value = err.message
      throw err
    }
  }

  const updateExtra = async (id, updates) => {
    error.value = null
    const prev = extrasItems.value.find(e => e.id === id)
    extrasItems.value = extrasItems.value.map(e =>
      e.id === id ? { ...e, name: updates.name.trim(), price: Number(updates.price), category: updates.category } : e
    )
    try {
      await updateDoc(doc(db, 'extras', id), {
        name: updates.name.trim(),
        price: Number(updates.price),
        category: updates.category,
      })
    } catch (err) {
      if (prev) extrasItems.value = extrasItems.value.map(e => e.id === id ? prev : e)
      error.value = err.message
      throw err
    }
  }

  const deleteExtra = async (id) => {
    error.value = null
    const prev = extrasItems.value.find(e => e.id === id)
    extrasItems.value = extrasItems.value.filter(e => e.id !== id)
    try {
      await deleteDoc(doc(db, 'extras', id))
    } catch (err) {
      if (prev) extrasItems.value = [...extrasItems.value, prev]
      error.value = err.message
      throw err
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

  return {
    extrasItems,
    extrasByCategory,
    extrasPriceMap,
    loading,
    error,
    fetchExtras,
    addExtra,
    updateExtra,
    deleteExtra,
    reorderExtras,
  }
}
