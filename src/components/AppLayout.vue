<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBakeryStore } from '../stores/bakeryStore'

const route = useRoute()
const navOpen = ref(false)

const store = useBakeryStore()
onMounted(() => {
  store.init()
})

const links = computed(() => {
  const key = route.path
  if (key === '/admin' || key === '/baker') {
    return [
      { path: '/', label: 'Главная' },
      { path: '/menu', label: 'Меню' },
      { path: '/cart', label: 'Корзина' },
      { path: '/account', label: 'Войти' },
      { path: '/admin', label: 'Админ' }
    ]
  }

  return [
    { path: '/', label: 'Главная' },
    { path: '/menu', label: 'Меню' },
    { path: '/contacts', label: 'Контакты' },
    { path: '/account', label: 'Войти' }
  ]
})

function isActive(path) {
  return route.path === path
}

function toggleNav() {
  navOpen.value = !navOpen.value
}

const cartCount = computed(() => store.cartCount())
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="Студенческое кафе">
        <span class="brand-mark" aria-hidden="true">
          <img
            :src="store.state.products.length ? store.state.products[0]?.image : '/assets/logo.png'"
            alt=""
          />
        </span>

        <span class="brand-copy">
          <strong>Студенческое кафе «СтудFood»</strong>
          <small>вкусно, быстро, рядом</small>
        </span>
      </a>

      <button class="burger" type="button" @click="toggleNav" aria-label="Открыть меню">
        ☰
      </button>

      <nav class="site-nav" :class="{ 'is-open': navOpen }">
        <RouterLink
          v-for="l in links"
          :key="l.path"
          class="nav-link"
          :class="{ 'is-active': isActive(l.path) }"
          :to="l.path"
        >
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <RouterLink class="cart-link" to="/cart" aria-label="Корзина">
          <span>🛒</span>
          <span>Корзина</span>
          <b class="cart-badge">{{ cartCount }}</b>
        </RouterLink>
      </div>
    </header>

    <main class="page-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div>
        <h3>Студенческое кафе «СтудFood»</h3>
        <p>Корпус №1, 1 этаж</p>
        <p>Пн–Пт 8:00–17:00</p>
      </div>

      <div>
        <h4>Контакты</h4>
        <p>+7 (900) 123-45-67</p>
        <a
          class="text-link"
          href="https://vk.com/"
          target="_blank"
          rel="noreferrer"
        >
          Ссылка на VK-бот
        </a>
      </div>

      <div>
        <h4>Уведомления</h4>
        <p>Получайте уведомления о готовности заказа в VK</p>
        <a
          class="button button--ghost"
          href="https://vk.com/"
          target="_blank"
          rel="noreferrer"
        >
          Открыть VK-бот
        </a>
      </div>
    </footer>
  </div>
</template>
