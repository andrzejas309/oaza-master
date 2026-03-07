/**
 * usePortionConfig — konfiguracja dostępnych porcji per pozycja menu.
 * Kolekcja Firestore: /portionConfig/{menuItemId}
 * Dokument: { portions: number[] }  — np. [1, 0.5] lub [] (= tylko licznik, brak dialogu porcji)
 *
 * Możliwe wartości porcji (podzbiór PORTIONS_FULL):
 *   1    = cała porcja
 *   0.5  = pół porcji
 *   1.5  = półtora porcji
 *   2    = podwójna porcja
 *
 * Specjalny tryb 'gram' — zamiast porcji użytkownik wpisuje gramaturę.
 */
import { ref } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, setDoc, doc } from 'firebase/firestore'

/** Wszystkie dostępne opcje porcji do wyboru w UI */
export const ALL_PORTIONS = [
  { label: 'Cała porcja',     value: 1   },
  { label: 'Pół porcji',      value: 0.5 },
  { label: 'Półtora porcji',  value: 1.5 },
  { label: 'Podwójna porcja', value: 2   },
]

/** Specjalny tryb gramaturowy (dla golonki itp.) */
export const PORTION_MODE_GRAM = 'gram'
/** Brak dialogu porcji — tylko licznik */
export const PORTION_MODE_COUNT = 'count'

const portionConfig = ref({})  // { [menuItemId]: { mode: 'portions'|'gram'|'count', portions: number[] } }
const initialized = ref(false)
const loading = ref(false)
const error = ref(null)

export function usePortionConfig() {
  const fetchPortionConfig = async (force = false) => {
    if (initialized.value && !force) return
    loading.value = true
    error.value = null
    try {
      const snap = await getDocs(collection(db, 'portionConfig'))
      const result = {}
      snap.docs.forEach(d => {
        result[d.id] = {
          mode:     d.data().mode     ?? 'portions',
          portions: Array.isArray(d.data().portions) ? d.data().portions : [1],
        }
      })
      portionConfig.value = result
      initialized.value = true
    } catch (err) {
      error.value = err.message
      console.error('Błąd pobierania konfiguracji porcji:', err)
    } finally {
      loading.value = false
    }
  }

  const savePortionConfig = async (menuItemId, mode, portions) => {
    await setDoc(doc(db, 'portionConfig', menuItemId), { mode, portions })
    portionConfig.value[menuItemId] = { mode, portions: [...portions] }
  }

  /**
   * Zwraca konfigurację porcji dla danej pozycji.
   * Fallback: jeśli brak wpisu → tryb 'count' (tylko licznik, bez dialogu)
   */
  const getPortionConfig = (menuItemId) => {
    return portionConfig.value[menuItemId] ?? { mode: PORTION_MODE_COUNT, portions: [] }
  }

  return {
    portionConfig,
    loading,
    error,
    fetchPortionConfig,
    savePortionConfig,
    getPortionConfig,
  }
}

