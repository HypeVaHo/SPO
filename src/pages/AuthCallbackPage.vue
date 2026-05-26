<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const error = ref(null)
const processing = ref(true)

onMounted(async () => {
  const token = route.query.token
  const errorParam = route.query.error
  
  if (errorParam) {
    error.value = decodeURIComponent(errorParam)
    processing.value = false
    return
  }
  
  if (!token) {
    error.value = 'Токен не найден'
    processing.value = false
    return
  }
  
  try {
    auth.handleAuthCallback(token)
    await auth.init()
    
    // Redirect based on role
    if (auth.state.user?.role === 'admin') {
      router.replace('/admin')
    } else if (auth.state.user?.role === 'baker') {
      router.replace('/baker')
    } else {
      router.replace('/account')
    }
  } catch (err) {
    error.value = err.message || 'Ошибка авторизации'
    processing.value = false
  }
})
</script>

<template>
  <div class="page-shell">
    <div class="section auth-callback">
      <div v-if="processing" class="auth-loading">
        <div class="spinner"></div>
        <p>Авторизация...</p>
      </div>
      
      <div v-else-if="error" class="auth-error">
        <h2>Ошибка авторизации</h2>
        <p>{{ error }}</p>
        <RouterLink to="/login" class="button button--primary">
          Попробовать снова
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.auth-loading,
.auth-error {
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--color-accent, #d4894b);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-error h2 {
  color: #c53030;
  margin-bottom: 0.5rem;
}

.auth-error p {
  margin-bottom: 1.5rem;
  color: var(--color-text-secondary);
}
</style>
