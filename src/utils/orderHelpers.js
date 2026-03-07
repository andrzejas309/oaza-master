/**
 * Shared order helpers — key generation, role routing.
 */

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

