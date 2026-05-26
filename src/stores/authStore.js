import { reactive, computed } from 'vue'
import { api } from '../api/client.js'

const TOKEN_KEY = 'auth_token'

const state = reactive({
  user: null,
  loading: true,
  error: null
})

export function useAuthStore() {
  const isAuthenticated = computed(() => !!state.user)
  const isAdmin = computed(() => state.user?.role === 'admin')
  const isBaker = computed(() => state.user?.role === 'baker' || state.user?.role === 'admin')
  const isCustomer = computed(() => !!state.user)
  
  async function init() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      state.loading = false
      return
    }
    
    try {
      state.user = await api.getCurrentUser()
    } catch (error) {
      console.error('Auth init error:', error)
      localStorage.removeItem(TOKEN_KEY)
      state.user = null
    } finally {
      state.loading = false
    }
  }
  
  async function loginWithVk() {
    try {
      const { url } = await api.getVkAuthUrl()
      window.location.href = url
    } catch (error) {
      state.error = error.message
      throw error
    }
  }
  
  function handleAuthCallback(token) {
    if (!token) return false
    
    localStorage.setItem(TOKEN_KEY, token)
    return true
  }
  
  async function logout() {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      state.user = null
    }
  }
  
  function hasRole(...roles) {
    if (!state.user) return false
    return roles.includes(state.user.role)
  }
  
  return {
    state,
    isAuthenticated,
    isAdmin,
    isBaker,
    isCustomer,
    init,
    loginWithVk,
    handleAuthCallback,
    logout,
    hasRole
  }
}
