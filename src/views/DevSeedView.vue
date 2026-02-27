<template>
  <div class="view-container" style="max-width: 800px;">
    <div class="card" style="margin-top: 2rem;">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">
        🧩 Dev seed – użytkownicy i przykładowe zamówienia
      </h1>

      <p style="font-size: 0.9rem; color: #6b7280; margin-bottom: 1rem;">
        Tworzy konta testowe w Firebase + role użytkowników w Firestore.
        Po seedowaniu zalogujesz się automatycznie jako <strong>obsluga@example.com</strong>.
      </p>

      <!-- Seed użytkowników -->
      <div class="flex flex-col gap-2" style="margin-bottom: 1.5rem;">
        <button class="btn" @click="seedUsers" :disabled="seedingUsers">
          {{ seedingUsers ? 'Tworzenie użytkowników...' : 'Utwórz konta testowe i zaloguj jako obsługa' }}
        </button>
      </div>

      <!-- Seed zamówień -->
      <div class="flex flex-col gap-2" style="margin-bottom: 1.5rem;">
        <button class="btn-secondary btn" @click="seedOrders" :disabled="seedingOrders">
          {{ seedingOrders ? 'Tworzenie zamówień...' : 'Utwórz przykładowe zamówienia' }}
        </button>
      </div>

      <!-- Seed extras -->
      <div class="flex flex-col gap-2" style="margin-bottom: 1.5rem;">
        <button class="btn btn-extras" @click="seedExtras" :disabled="seedingExtras">
          {{ seedingExtras ? 'Dodawanie extras...' : '🧂 Wgraj domyślne Extras do bazy' }}
        </button>
        <p style="font-size: 0.82rem; color: #6b7280; margin-top: 0.25rem;">
          Wgrywa jajko, ser, pieczarki itp. do kolekcji <code>extras</code> w Firestore.
          Bezpieczne – pomija istniejące.
        </p>
      </div>

      <button class="btn-outline" @click="goToLogin">← Wróć do logowania</button>

      <pre
          v-if="log"
          style="margin-top: 1.5rem; background: #0f172a; color: #e5e7eb; padding: 0.75rem; border-radius: 0.75rem; font-size: 0.8rem; max-height: 300px; overflow-y: auto;"
      >{{ log }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { auth, db } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import menuJson from '../data/menu.json'

const router = useRouter()
const log = ref('')
const seedingUsers = ref(false)
const seedingOrders = ref(false)
const seedingExtras = ref(false)

const DEFAULT_EXTRAS = [
  // Dania główne
  { name: 'jajko',            price: 3, category: 'main' },
  { name: 'pieczarki',        price: 3, category: 'main' },
  { name: 'cebula',           price: 3, category: 'main' },
  { name: 'ser',              price: 3, category: 'main' },
  { name: 'porcja ryżu',      price: 3, category: 'main' },
  { name: 'bez sosu',         price: 0, category: 'main' },
  { name: 'bez sera',         price: 0, category: 'main' },
  { name: 'bez ananasa',      price: 0, category: 'main' },
  { name: 'w panierce z mąki',price: 0, category: 'main' },
  { name: 'pieczywo',         price: 1, category: 'main' },
  { name: 'bez ziela',        price: 0, category: 'main' },
  // Zupy
  { name: 'porcja uszek',     price: 6, category: 'soups' },
  { name: 'porcja makaronu',  price: 3, category: 'soups' },
  { name: 'porcja ryżu',      price: 3, category: 'soups' },
  { name: 'bez kiełbasy',     price: 0, category: 'soups' },
  { name: 'pieczywo',         price: 1, category: 'soups' },
  { name: 'bez ziela',        price: 0, category: 'soups' },
  // Dodatki / surówki
  { name: 'z sosem',          price: 0, category: 'sides' },
  { name: 'ubite',            price: 0, category: 'sides' },
  { name: 'bez ziela',        price: 0, category: 'sides' },
]

const seedExtras = async () => {
  log.value = ''
  seedingExtras.value = true
  try {
    if (!auth.currentUser) {
      log.value += '❌ Musisz być zalogowany jako admin, żeby wgrać extras.\n'
      log.value += 'Kliknij najpierw "Utwórz konta testowe" lub zaloguj się jako admin@example.com.\n'
      return
    }

    const snapshot = await getDocs(collection(db, 'extras'))
    const existing = new Set(
      snapshot.docs.map(d => `${d.data().name}__${d.data().category}`)
    )

    let added = 0, skipped = 0
    for (const extra of DEFAULT_EXTRAS) {
      const key = `${extra.name}__${extra.category}`
      if (existing.has(key)) {
        log.value += `⏭️ Pominięto (już istnieje): ${extra.name} [${extra.category}]\n`
        skipped++
      } else {
        await addDoc(collection(db, 'extras'), extra)
        log.value += `✅ Dodano: ${extra.name} [${extra.category}]\n`
        added++
      }
    }
    log.value += `\nGotowe! Dodano: ${added}, pominięto: ${skipped}\n`
  } catch (e) {
    log.value += `❌ Błąd: ${e.message}\n`
  } finally {
    seedingExtras.value = false
  }
}

// zdefiniuj użytkowników + role
const users = [
  { email: 'obsluga@example.com', password: 'test1234', role: 'obsluga' },
  { email: 'kuchnia@example.com', password: 'test1234', role: 'kuchnia' },
  { email: 'admin@example.com', password: 'test1234', role: 'admin' }
]

// 🔑 tworzy konta, zapisuje rolę, loguje jako obsluga
const seedUsers = async () => {
  log.value = ''
  seedingUsers.value = true

  for (const u of users) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password)
      // zapis roli do Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: u.email,
        role: u.role,
        createdAt: serverTimestamp()
      })
      log.value += `✅ Utworzono użytkownika ${u.email} (rola: ${u.role})\n`
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        log.value += `ℹ️ Użytkownik ${u.email} już istnieje – nadpisuję rolę\n`
        // znajdź UID i zaktualizuj Firestore, jeśli user istnieje
        try {
          // zaloguj się na to konto i nadpisz jego dokument users/{uid}
          const login = await signInWithEmailAndPassword(auth, u.email, u.password)
          await setDoc(doc(db, 'users', login.user.uid), {
            email: u.email,
            role: u.role,
            updatedAt: serverTimestamp()
          })
        } catch (e2) {
          log.value += `⚠️ Nie udało się zaktualizować roli: ${e2.code || e2.message}\n`
        }
      } else {
        log.value += `❌ Błąd ${u.email}: ${e.code || e.message}\n`
      }
    }
  }

  // automatyczne logowanie jako obsługa@example.com
  try {
    const cred = await signInWithEmailAndPassword(
        auth,
        'obsluga@example.com',
        'test1234'
    )
    log.value += `\n✅ Zalogowano jako ${cred.user.email}. Przekierowanie do panelu obsługi...\n`
    await router.replace('/obsluga')
  } catch (e) {
    log.value += `\n❌ Nie udało się zalogować jako obsluga@example.com: ${e.code || e.message}\n`
  }

  seedingUsers.value = false
}

// 📦 tworzy przykładowe zamówienia (upewnia się, że zalogowany)
const seedOrders = async () => {
  log.value = ''
  seedingOrders.value = true

  try {
    if (!auth.currentUser) {
      await signInWithEmailAndPassword(auth, 'obsluga@example.com', 'test1234')
      log.value += 'ℹ️ Brak zalogowanego użytkownika – zalogowano jako obsluga@example.com\n'
    }
  } catch (e) {
    log.value += `❌ Nie udało się zalogować przed seedowaniem zamówień: ${e.code || e.message}\n`
    seedingOrders.value = false
    return
  }

  const menuEntries = Object.entries(menuJson)

  const sampleOrders = [
    {
      waiter: 'jan',
      items: [
        { name: menuEntries[0]?.[0] || 'Schabowy', quantity: 2, price: menuEntries[0]?.[1] || 20 },
        { name: menuEntries[1]?.[0] || 'Barszcz', quantity: 1, price: menuEntries[1]?.[1] || 12 }
      ],
      status: 'w_toku'
    },
    {
      waiter: 'olek',
      items: [
        { name: menuEntries[2]?.[0] || 'Pierogi ruskie', quantity: 3, price: menuEntries[2]?.[1] || 18 }
      ],
      status: 'w_toku'
    },
    {
      waiter: 'staszek',
      items: [
        { name: menuEntries[3]?.[0] || 'Zupa pomidorowa', quantity: 2, price: menuEntries[3]?.[1] || 10 }
      ],
      status: 'gotowe'
    }
  ]

  try {
    for (const o of sampleOrders) {
      await addDoc(collection(db, 'orders'), {
        number: Date.now() + Math.floor(Math.random() * 1000),
        waiter: o.waiter,
        items: o.items,
        status: o.status,
        createdAt: serverTimestamp()
      })
    }
    log.value += `✅ Dodano przykładowe zamówienia.\n`
  } catch (e) {
    log.value += `❌ Błąd przy seedowaniu zamówień: ${e.code || e.message}\n`
  } finally {
    seedingOrders.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.btn {
  border-radius: 9999px;
  border: none;
  padding: 0.55rem 1.35rem;
  font-weight: 600;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.95rem;
  transition: box-shadow 0.08s ease, transform 0.08s ease, background 0.1s ease;
}
.btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}
.btn-secondary {
  background: #4b5563;
  color: #f9fafb;
}
.btn-outline {
  background: #ffffff;
  color: #111827;
  border: 1px solid #d1d5db;
}
.btn-extras {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  color: #ffffff;
}
</style>
