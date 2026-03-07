/**
 * Shared formatting helpers used across multiple views.
 */

/**
 * Formats a Firestore Timestamp to HH:MM string.
 */
export const formatTime = (ts) => {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats a JS Date to full Polish date+time string (used in AdminView history).
 */
export const formatOrderTime = (date) => {
  if (!date) return ''
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Human-readable portion label (used in ObslugaView / AdminView).
 * e.g. 0.5 → "½ porcji", 2 → "podwójna porcja"
 */
export const formatPortionLabel = (val, itemName) => {
  if (val == null) return '1 porcja'
  if (itemName === 'golonka') return `${Math.round(val * 100)}g`
  const labels = {
    1: 'cała porcja',
    0.5: '½ porcji',
    1.5: '1 ½ porcji',
    2: 'podwójna porcja',
  }
  return labels[val] ?? `${val} porcji`
}

/**
 * Short prefix shown BEFORE item name on kitchen receipts.
 * e.g. 0.5 → "½×", 2 → "2×". Returns null for single portion.
 */
export const formatPortionPrefix = (val, itemName) => {
  if (!val || val === 1) return null
  if (itemName === 'golonka') return `${Math.round(val * 100)}g`
  const labels = { 0.5: '1/2x', 1.5: '1½x', 2: '2x', 3: '3x' }
  return labels[val] ?? `${val}x`
}

/**
 * Formats quantity for history view (fraction → readable string).
 */
export const formatQuantity = (qty) => {
  if (qty === 0.5) return '½ porcji'
  if (qty === 1) return '1 porcja'
  if (qty === 1.5) return '1½ porcji'
  if (qty === 2) return '2 porcje'
  if (qty % 1 === 0) return `${qty} porcji`
  // Dla golonki (gramatury)
  const grams = Math.round(qty * 100)
  if (grams >= 100) return `${grams}g`
  return qty.toString()
}

