/**
 * Shared order helpers — key generation, portion constants, category helpers.
 */

// ---------------------------------------------------------------------------
// Portion constants
// ---------------------------------------------------------------------------

export const PORTIONS_FULL = [
  { label: 'Cała porcja', value: 1 },
  { label: 'Pół porcji', value: 0.5 },
  { label: 'Półtora porcji', value: 1.5 },
  { label: 'Podwójna porcja', value: 2 },
]

export const PORTIONS_HALF = [
  { label: 'Cała porcja', value: 1 },
  { label: 'Pół porcji', value: 0.5 },
]

/** Items that always use count (never portion dialog) */
export const PORTION_EXCLUDED = [
  'barszcz czerwony',
  'chłodnik',
  'flaczki',
  'żurek z kiełbaską',
]

/** Item name substrings that trigger the portion dialog */
export const PORTION_INCLUDED_NAMES = ['naleśniki', 'pierogi']

// ---------------------------------------------------------------------------
// Role → route mapping (used in router & LoginView)
// ---------------------------------------------------------------------------

export const ROLE_ROUTES = {
  obsluga:      '/obsluga',
  kuchnia:      '/kuchnia',
  admin:        '/admin',
  master_admin: '/admin',
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generates a stable, unique key for an order item based on name, quantity
 * and selected extras.
 */
export const generateItemKey = (name, quantity = 1, extras = []) => {
  let key = name
  if (quantity !== 1) key += `|q${quantity}`
  if (extras && extras.length > 0) key += `|${[...extras].sort().join(',')}`
  return key
}

