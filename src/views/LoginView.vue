<template>
  <div class="view-container flex flex-col items-center justify-center" style="min-height: 100vh;">
    <div class="card" style="width: 100%; max-width: 420px;">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem; text-align: center;">Gastro Panel – logowanie</h1>

      <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
        <div>
          <label class="block mb-1">E-mail</label>
          <input
              v-model="email"
              type="email"
              required
              class="w-full"
              style="padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #d1d5db; width: 100%;"
          />
        </div>
        <div>
          <label class="block mb-1">Hasło</label>
          <input
              v-model="password"
              type="password"
              required
              class="w-full"
              style="padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #d1d5db; width: 100%;"
          />
        </div>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? 'Logowanie...' : 'Zaloguj' }}
        </button>

        <p v-if="error" style="color: #b91c1c; font-size: 0.9rem;">{{ error }}</p>
<!--        <p style="font-size: 0.8rem; color: #6b7280;">-->
<!--          Testowo możesz np. założyć konta:-->
<!--          <br>-->
<!--          obsluga@example.com, kuchnia@example.com, admin@example.com-->
<!--        </p>-->
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * AI: Vue component should contain only presentation logic.
 * Move business logic to composables.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'
import { getRoleForEmail } from '@/router'

const router = useRouter()

// ==================== Form State ====================
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// ==================== Auth ====================
const onSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
    const user = cred.user

    const role = await getRoleForEmail(user.email).catch((roleError) => {
      console.error('Role fetch error:', roleError)
      throw new Error('Brak dostępu do roli. Sprawdź reguły Firestore.')
    })

    const roleRoutes = {
      'obsluga': '/obsluga',
      'kuchnia': '/kuchnia',
      'admin': '/admin'
    }

    if (roleRoutes[role]) {
      await router.replace(roleRoutes[role])
    } else {
      error.value = 'Brak przypisanej roli do tego konta.'
    }
  } catch (e) {
    console.error(e)
    error.value = e.message === 'Brak dostępu do roli. Sprawdź reguły Firestore.'
      ? e.message
      : 'Niepoprawny login lub hasło.'
  } finally {
    loading.value = false
  }
}
</script>
