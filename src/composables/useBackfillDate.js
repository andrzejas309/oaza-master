/**
 * Globalny (singleton) stan daty backfill.
 * Gdy backfillDate jest ustawiona, zamówienia w ObslugaView
 * są zapisywane z tą datą zamiast aktualną.
 */
import { ref, computed } from 'vue'

const backfillDate = ref(null) // string 'YYYY-MM-DD' lub null

export function useBackfillDate() {
  const isActive = computed(() => backfillDate.value !== null)

  const label = computed(() => {
    if (!backfillDate.value) return null
    const [y, m, d] = backfillDate.value.split('-')
    return `${d}.${m}.${y}`
  })

  const setDate = (dateStr) => {
    backfillDate.value = dateStr || null
  }

  const clear = () => {
    backfillDate.value = null
  }

  /**
   * Zwraca obiekt Timestamp-like { seconds, nanoseconds }
   * kompatybilny z Firestore serverTimestamp() zastąpionym przez Timestamp.fromDate()
   * dla zapisania zamówienia z wybraną datą (godzina = teraz).
   */
  const getEffectiveDate = () => {
    if (!backfillDate.value) return null
    const [y, m, d] = backfillDate.value.split('-').map(Number)
    const now = new Date()
    // zachowaj aktualną godzinę/minutę, zmień tylko datę
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
  }

  return {
    backfillDate,
    isActive,
    label,
    setDate,
    clear,
    getEffectiveDate,
  }
}

