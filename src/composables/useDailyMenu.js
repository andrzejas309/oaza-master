/**
 * useDailyMenu — przypisuje pozycje z menu (zupa dnia / danie dnia) do dni tygodnia.
 * Kolekcja Firestore: /dailyMenu/{dayKey}
 * Dokument: { zupy: string[], dania: string[] }  — tablice ID pozycji z kolekcji menu
 */
import { ref } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, setDoc, doc } from 'firebase/firestore'

export const DAYS = [
  { key: 'poniedzialek', label: 'Poniedziałek', jsDay: 1 },
  { key: 'wtorek',       label: 'Wtorek',       jsDay: 2 },
  { key: 'sroda',        label: 'Środa',        jsDay: 3 },
  { key: 'czwartek',     label: 'Czwartek',     jsDay: 4 },
  { key: 'piatek',       label: 'Piątek',       jsDay: 5 },
  { key: 'sobota',       label: 'Sobota',       jsDay: 6 },
]

/** Zwraca klucz dnia dla dzisiaj (lub null w niedzielę) */
export const getTodayKey = () => {
  const jsDay = new Date().getDay() // 0=nd, 1=pn, ...
  return DAYS.find(d => d.jsDay === jsDay)?.key ?? null
}

const dailyMenu = ref({})   // { poniedzialek: { zupy: [], dania: [] }, ... }
const loading = ref(false)
const error = ref(null)

const emptyDay = () => ({ zupy: [], dania: [] })

export function useDailyMenu() {
  const fetchDailyMenu = async () => {
    loading.value = true
    error.value = null
    try {
      const snap = await getDocs(collection(db, 'dailyMenu'))
      const result = {}
      DAYS.forEach(d => { result[d.key] = emptyDay() })
      snap.docs.forEach(d => {
        result[d.id] = {
          zupy:  Array.isArray(d.data().zupy)  ? d.data().zupy  : [],
          dania: Array.isArray(d.data().dania) ? d.data().dania : [],
        }
      })
      dailyMenu.value = result
    } catch (err) {
      error.value = err.message
      console.error('Błąd podczas pobierania menu dnia:', err)
    } finally {
      loading.value = false
    }
  }

  const saveDayMenu = async (dayKey, zupy, dania) => {
    await setDoc(doc(db, 'dailyMenu', dayKey), { zupy, dania })
    dailyMenu.value[dayKey] = { zupy: [...zupy], dania: [...dania] }
  }

  return {
    dailyMenu,
    loading,
    error,
    fetchDailyMenu,
    saveDayMenu,
  }
}
