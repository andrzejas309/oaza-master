<template>
  <div class="login-bg">
    <div class="login-overlay"></div>

    <div class="login-card">
      <div class="login-logo">🍽️</div>
      <h1 class="login-title">Gastro Panel</h1>
      <p class="login-subtitle">Zaloguj się, aby kontynuować</p>

      <form @submit.prevent="onSubmit" class="login-form">
        <div class="input-group">
          <label class="input-label">E-mail</label>
          <input
              v-model="email"
              type="email"
              required
              class="input-field"
              placeholder="twoj@email.com"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Hasło</label>
          <input
              v-model="password"
              type="password"
              required
              class="input-field"
              placeholder="••••••••"
          />
        </div>

        <p v-if="error" class="login-error">⚠️ {{ error }}</p>

        <button class="login-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Logowanie...' : 'Zaloguj się' }}
        </button>
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

    const role = await getRoleForEmail(user.email, user.uid).catch((roleError) => {
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

<style scoped>
.login-bg {
  min-height: 100vh;
  width: 100%;
  background: url('/bcg.png') center center / cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.login-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.login-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.login-logo {
  font-size: 3rem;
  margin-bottom: 0.25rem;
}

.login-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  letter-spacing: 0.02em;
}

.login-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 1.25rem 0;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.input-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.input-field {
  padding: 0.8rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.input-field:focus {
  border-color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.22);
}

.login-error {
  background: rgba(185, 28, 28, 0.35);
  border: 1px solid rgba(185, 28, 28, 0.6);
  color: #fecaca;
  border-radius: 0.6rem;
  padding: 0.6rem 0.9rem;
  font-size: 0.9rem;
  margin: 0;
}

.login-btn {
  margin-top: 0.5rem;
  padding: 0.9rem;
  border-radius: 0.75rem;
  border: none;
  background: #8fbc8f;
  color: #1a3a1a;
  font-size: 1.05rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-btn:hover:not([disabled]) {
  background: #7aad7a;
}

.login-btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(26, 58, 26, 0.3);
  border-top-color: #1a3a1a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .login-card {
    margin: 1rem;
    padding: 2rem 1.25rem;
  }
}
</style>

