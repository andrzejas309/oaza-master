/**
 * useExtrasMatrix — przypisuje extras (dodatki/opcje) do konkretnych pozycji menu.
 * Kolekcja Firestore: /extrasMatrix/{menuItemId}
 * Dokument: { extrasIds: string[] }
 */
import { ref } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, setDoc, doc } from 'firebase/firestore'

const matrix = ref({})   // { [menuItemId]: string[] }
const loading = ref(false)
const error = ref(null)

export function useExtrasMatrix() {
  const fetchMatrix = async () => {
    loading.value = true
    error.value = null
    try {
      const snap = await getDocs(collection(db, 'extrasMatrix'))
      const result = {}
      snap.docs.forEach(d => {
        result[d.id] = Array.isArray(d.data().extrasIds) ? d.data().extrasIds : []
      })
      matrix.value = result
    } catch (err) {
      error.value = err.message
      console.error('Błąd pobierania matrycy:', err)
    } finally {
      loading.value = false
    }
  }

  const saveMatrix = async (menuItemId, extrasIds) => {
    await setDoc(doc(db, 'extrasMatrix', menuItemId), { extrasIds })
    matrix.value[menuItemId] = [...extrasIds]
  }

  /**
   * Zwraca listę extras przypisanych do danej pozycji menu.
   * Używane w panelu obsługi przy wyborze dania.
   */
  const getExtrasForItem = (menuItemId, allExtras) => {
    const ids = matrix.value[menuItemId] ?? []
    if (!ids.length) return []
    return allExtras.filter(e => ids.includes(e.id))
  }

  return {
    matrix,
    loading,
    error,
    fetchMatrix,
    saveMatrix,
    getExtrasForItem,
  }
}

