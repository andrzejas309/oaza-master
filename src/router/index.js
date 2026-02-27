import { createRouter, createWebHashHistory } from 'vue-router'
import { onAuthStateChanged, getAuth } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import '../firebase'

const LoginView        = () => import('../views/LoginView.vue')
const ObslugaView      = () => import('../views/ObslugaView.vue')
const KuchniaView      = () => import('../views/KuchniaView.vue')
const AdminView        = () => import('../views/AdminView.vue')
const MenuManagementView = () => import('../views/MenuManagementView.vue')
// const DevSeedView   = () => import('../views/DevSeedView.vue')

// ─── Cache roli ────────────────────────────────────────────────────────────────
// BEZPIECZEŃSTWO:
//   - Cache to tylko optymalizacja UX (brak opóźnienia przy nawigacji).
//   - Dla ról admin/menu-management ZAWSZE wykonujemy świeży fetch z Firestore —
//     nawet jeśli ktoś edytuje sessionStorage w DevTools, Firestore Rules
//     i tak zablokują każdą niedozwoloną operację.
//   - Cache jest wiązany z UID (nie emailem) — podmiana emaila w storage nic nie da.
//   - sessionStorage żyje tylko w jednej karcie — zamknięcie okna = wyczyszczenie.

const ROLE_CACHE_KEY = 'oaza_role_cache'
const ROLE_TTL_MS    = 8 * 60 * 60 * 1000 // 8 godzin

// Role wymagające ZAWSZE świeżego fetcha (wysokie uprawnienia)
const HIGH_PRIVILEGE_ROLES = ['admin']

function getCachedRole(uid) {
    try {
        const raw = sessionStorage.getItem(ROLE_CACHE_KEY)
        if (!raw) return null
        const { cachedUid, role, expiresAt } = JSON.parse(raw)
        // Walidacja: UID musi pasować do zalogowanego użytkownika
        if (cachedUid !== uid) {
            sessionStorage.removeItem(ROLE_CACHE_KEY)
            return null
        }
        if (Date.now() > expiresAt) {
            sessionStorage.removeItem(ROLE_CACHE_KEY)
            return null
        }
        // Nie zwracaj cache dla wysokich uprawnień
        if (HIGH_PRIVILEGE_ROLES.includes(role)) return null
        return role
    } catch {
        return null
    }
}

function setCachedRole(uid, role) {
    // Nie cachuj wysokich uprawnień — zawsze świeży fetch
    if (HIGH_PRIVILEGE_ROLES.includes(role)) return
    try {
        sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({
            cachedUid: uid,
            role,
            expiresAt: Date.now() + ROLE_TTL_MS,
        }))
    } catch { /* ignore quota errors */ }
}

export function clearRoleCache() {
    sessionStorage.removeItem(ROLE_CACHE_KEY)
}

// Pobiera rolę z Firestore (z cache dla niskich uprawnień)
export async function getRoleForEmail(email, uid = null) {
    if (!email) return null

    // Cache tylko gdy mamy UID i rola nie jest wysokich uprawnień
    if (uid) {
        const cached = getCachedRole(uid)
        if (cached) return cached
    }

    const snap = await getDoc(doc(db, 'role', email))
    const role = snap.exists() ? snap.data().role || null : null

    if (role && uid) setCachedRole(uid, role)
    return role
}

const routes = [
    { path: '/',               redirect: '/login' },
    { path: '/login',          name: 'login',           component: LoginView,          meta: { public: true } },
    // { path: '/dev-seed',    name: 'dev-seed',         component: DevSeedView,        meta: { public: true } },
    { path: '/obsluga',        name: 'obsluga',         component: ObslugaView,        meta: { requiredRole: 'obsluga' } },
    { path: '/kuchnia',        name: 'kuchnia',         component: KuchniaView,        meta: { requiredRole: 'kuchnia' } },
    { path: '/admin',          name: 'admin',           component: AdminView,          meta: { requiredRole: 'admin' } },
    { path: '/menu-management',name: 'menu-management', component: MenuManagementView, meta: { requiredRole: 'admin' } },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

function getCurrentUser() {
    return new Promise((resolve) => {
        const auth = getAuth()
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe()
            resolve(user)
        })
    })
}

router.beforeEach(async (to, from, next) => {
    // Trasy publiczne — przepuść bez sprawdzania
    if (to.meta.public) return next()

    // Czekaj na inicjalizację Firebase Auth (po odświeżeniu strony)
    const user = await getCurrentUser()
    if (!user) return next('/login')

    // Pobierz rolę — świeży fetch dla admina, cache dla pozostałych
    let role = null
    try {
        role = await getRoleForEmail(user.email, user.uid)
    } catch (err) {
        console.error('Błąd pobierania roli:', err)
        return next('/login')
    }

    if (!role) return next('/login')

    const required = to.meta.requiredRole
    // Admin może wejść wszędzie
    if (required && role !== required && role !== 'admin') {
        // Przekieruj do widoku wynikającego z własnej roli
        const roleRoutes = { obsluga: '/obsluga', kuchnia: '/kuchnia', admin: '/admin' }
        return next(roleRoutes[role] ?? '/login')
    }

    next()
})

export default router
