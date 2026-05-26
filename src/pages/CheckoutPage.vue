<script setup>
import { computed, onMounted, ref } from 'vue'
import { useBakeryStore } from '../stores/bakeryStore'
import { useRouter } from 'vue-router'

const store = useBakeryStore()
const router = useRouter()

onMounted(() => {
  store.init()
  saveOrderDraft()
})

const money = new Intl.NumberFormat('ru-RU')

function formatCurrency(value) {
  return `${money.format(Math.round(Number(value) || 0))} ₽`
}

const customerName = ref('')
const customerPhone = ref('')
const vkNotify = ref(false)

const pickupDate = ref(new Date().toISOString().slice(0, 10))
const pickupTime = ref('10:00')
const comment = ref('')

const cartDetailed = computed(() => {
  return store.state.cart
    .map((item) => {
      const product = store.state.products.find((p) => p.id === item.productId)
      if (!product) return null
      return {
        product,
        qty: item.qty,
        lineTotal: product.price * item.qty
      }
    })
    .filter(Boolean)
})

const cartCount = computed(() => store.state.cart.reduce((sum, item) => sum + item.qty, 0))
const cartTotal = computed(() => cartDetailed.value.reduce((sum, item) => sum + item.lineTotal, 0))

function buildTimeOptions(selected = '10:00') {
  const options = []
  for (let hour = 8; hour <= 16; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      options.push({ time, selected: time === selected })
    }
  }
  return options
}

function buildTodayPlus(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildOrderPayload() {
  if (!cartDetailed.value.length) return null

  return {
    id: `ORD-${Date.now()}`,
    pickupDate: pickupDate.value,
    pickupTime: pickupTime.value,
    userName: customerName.value || 'Покупатель',
    phone: customerPhone.value || '',
    comment: comment.value || '',
    items: cartDetailed.value.map((x) => ({
      productId: x.product.id,
      name: x.product.name,
      price: x.product.price,
      qty: x.qty,
      image: x.product.image
    })),
    total: cartTotal.value,
    createdAt: new Date().toISOString(),
    payment: 'cash',
    vkNotify: vkNotify.value
  }
}

function saveOrderDraft() {
  const order = buildOrderPayload()
  if (!order) return

  try {
    localStorage.setItem('bakery_last_order', JSON.stringify(order))
  } catch {
    // ignore
  }
}

function submitCheckout(e) {
  e.preventDefault()

  saveOrderDraft()

  if (!cartDetailed.value.length) return

  store.state.cart = []
  try {
    localStorage.setItem('bakery_cart', JSON.stringify([]))
  } catch {
    // ignore
  }

  router.push('/success')
}
</script>

<template>
  <div class="page-shell">
    <section class="section checkout-layout">
      <div class="checkout-form-panel">
        <div class="section-heading">
          <div>
            <h2>Оформление заказа</h2>
            <p>Заполни данные, выбери дату и время получения, затем подтверди заказ.</p>
          </div>
        </div>

        <form class="checkout-form" @submit="submitCheckout">
          <div class="checkout-step">
            <h3>Шаг 1 — Данные пользователя</h3>

            <label>
              <span>ФИО</span>
              <input type="text" v-model="customerName" placeholder="Иван Иванов" />
            </label>

            <label>
              <span>Номер телефона</span>
              <input type="tel" v-model="customerPhone" placeholder="+7 (___) ___-__-__" />
            </label>

            <label class="checkbox-row">
              <input type="checkbox" v-model="vkNotify" />
              <span>Получать уведомления в VK</span>
            </label>
          </div>

          <div class="checkout-step">
            <h3>Шаг 2 — Дата и время получения</h3>

            <div class="split-grid">
              <label>
                <span>Дата</span>
                <select v-model="pickupDate" required>
                  <option :value="buildTodayPlus(0)">Сегодня</option>
                  <option :value="buildTodayPlus(1)">Завтра</option>
                  <option :value="buildTodayPlus(2)">Послезавтра</option>
                </select>
              </label>

              <label>
                <span>Время</span>
                <select v-model="pickupTime" required>
                  <option
                    v-for="opt in buildTimeOptions('10:00')"
                    :key="opt.time"
                    :value="opt.time"
                  >
                    {{ opt.time }}
                  </option>
                </select>
              </label>
            </div>

            <label>
              <span>Комментарий к заказу</span>
              <textarea v-model="comment" rows="4" placeholder="Например: без сахара, упаковать отдельно" />
            </label>
          </div>

          <div class="checkout-step">
            <h3>Шаг 3 — Подтверждение</h3>

            <div class="order-preview" v-if="cartDetailed.length">
              <div class="order-preview__row" v-for="item in cartDetailed" :key="item.product.id">
                <span>{{ item.product.name }} × {{ item.qty }}</span>
                <strong>{{ formatCurrency(item.lineTotal) }}</strong>
              </div>
              <div class="order-preview__row order-preview__row--total">
                <span>Итого</span>
                <strong>{{ formatCurrency(cartTotal) }}</strong>
              </div>
            </div>

            <button
              class="button button--primary button--wide"
              type="submit"
              :disabled="!cartDetailed.length"
            >
              Подтвердить заказ
            </button>

            <p class="hint">Демо-оформление для Vue-версии. Реального платежа нет.</p>
          </div>
        </form>
      </div>

      <aside class="summary-card summary-card--checkout">
        <h3>Состав заказа</h3>

        <div class="summary-items" v-if="cartDetailed.length">
          <div class="summary-item" v-for="item in cartDetailed" :key="item.product.id">
            <img :src="item.product.image" :alt="item.product.name" />
            <div>
              <strong>{{ item.product.name }}</strong>
              <span>{{ item.qty }} × {{ formatCurrency(item.product.price) }}</span>
            </div>
            <b>{{ formatCurrency(item.lineTotal) }}</b>
          </div>
        </div>

        <div class="summary-total" v-if="cartDetailed.length">
          <span>К оплате</span>
          <strong>{{ formatCurrency(cartTotal) }}</strong>
        </div>

        <RouterLink class="button button--ghost button--wide" to="/menu" v-if="!cartDetailed.length">
          Открыть меню
        </RouterLink>

        <a
          v-else
          class="button button--ghost button--wide"
          href="https://vk.com/"
          target="_blank"
          rel="noreferrer"
        >
          Получить уведомления в VK
        </a>
      </aside>
    </section>
  </div>
</template>
