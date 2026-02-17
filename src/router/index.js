import { createRouter, createWebHistory } from 'vue-router'
import { onAuthStateChanged, getAuth } from 'firebase/auth'
import '../firebase' // żeby mieć zainicjowane Firebase

const LoginView = () => import('../views/LoginView.vue')
const ObslugaView = () => import('../views/ObslugaView.vue')
const KuchniaView = () => import('../views/KuchniaView.vue')
const AdminView = () => import('../views/AdminView.vue')
// const DevSeedView = () => import('../views/DevSeedView.vue')

// Mapowanie email → rola
export const roleByEmail = {
    // 'obsluga@example.com': 'obsluga',
    // 'kuchnia@example.com': 'kuchnia',
    // 'admin@example.com': 'admin'
    'ada.myslinska21@gmail.com': 'obsluga'
}

const routes = [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    // { path: '/dev-seed', name: 'dev-seed', component: DevSeedView, meta: { public: true } }, // <== NOWE
    { path: '/obsluga', name: 'obsluga', component: ObslugaView, meta: { role: 'obsluga' } },
    { path: '/kuchnia', name: 'kuchnia', component: KuchniaView, meta: { role: 'kuchnia' } },
    { path: '/admin', name: 'admin', component: AdminView, meta: { role: 'admin' } },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// proste helper Promise do pobrania usera
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
    if (to.meta.public) {
        return next()
    }

    const user = await getCurrentUser()
    if (!user) {
        return next('/login')
    }

    const role = roleByEmail[user.email] || null
    if (!role) {
        return next('/login')
    }

    if (to.meta.role && to.meta.role !== role) {
        // przekieruj do widoku wynikającego z roli
        if (role === 'obsluga') return next('/obsluga')
        if (role === 'kuchnia') return next('/kuchnia')
        if (role === 'admin') return next('/admin')
    }

    next()
})

export default router
