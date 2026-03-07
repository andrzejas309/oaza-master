/**
 * Shared logout logic used across all authenticated views.
 */
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import { clearRoleCache } from '@/router'

export function useAuth() {
  const router = useRouter()

  const logout = async () => {
    clearRoleCache()
    await signOut(auth)
    router.replace('/login')
  }

  return { logout }
}

