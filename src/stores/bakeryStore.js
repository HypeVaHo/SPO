import { reactive } from 'vue'

const KEYS = {
  products: 'bakery_products',
  cart: 'bakery_cart',
  menuCategory: 'bakery_menu_category'
}

const CATEGORY_LABELS = ['Все', 'Пирожки', 'Слойки', 'Булочки', 'Пирожные', 'Напитки']

function safe(value) {
  return value === null || value === undefined ? '' : String(value)
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase()
}

function buildSeedProducts() {
  return [
    { id: 'pr-1', name: 'Круассан классический', category: 'Слойки', price: 85, subtitle: 'Воздушный и хрустящий', description: 'Нежный слоёный круассан с ароматом сливочного масла.', icon: '🥐', image: null, popular: true, inStock: true },
    { id: 'pr-2', name: 'Пирожок с картошкой', category: 'Пирожки', price: 65, subtitle: 'Сытный и домашний', description: 'Румяный пирожок с картофельной начинкой.', icon: '🥟', image: null, popular: true, inStock: true },
    { id: 'pr-3', name: 'Слойка с яблоком', category: 'Слойки', price: 90, subtitle: 'Сладкая и сочная', description: 'Слойка с яблоком, корицей и карамельной ноткой.', icon: '🍎', image: null, popular: true, inStock: true },
    { id: 'pr-4', name: 'Булочка с корицей', category: 'Булочки', price: 75, subtitle: 'Тёплая и ароматная', description: 'Пышная булочка с корицей и сахарной глазурью.', icon: '🥯', image: null, popular: true, inStock: true },
    { id: 'pr-5', name: 'Эклер ванильный', category: 'Пирожные', price: 110, subtitle: 'Нежный крем внутри', description: 'Лёгкое пирожное с ванильным кремом и глазурью.', icon: '🍰', image: null, popular: true, inStock: true },
    { id: 'pr-6', name: 'Морс клюквенный', category: 'Напитки', price: 60, subtitle: 'Освежающий напиток', description: 'Домашний клюквенный морс без лишней сладости.', icon: '🧃', image: null, popular: false, inStock: true },
    { id: 'pr-7', name: 'Плюшка сахарная', category: 'Булочки', price: 70, subtitle: 'Мягкая и воздушная', description: 'Пышная плюшка с сахаром и сливочным ароматом.', icon: '🍞', image: null, popular: false, inStock: true },
    { id: 'pr-8', name: 'Сочник с творогом', category: 'Пирожные', price: 95, subtitle: 'С нежной начинкой', description: 'Нежный сочник с творожной начинкой и рассыпчатым тестом.', icon: '🥧', image: null, popular: true, inStock: true },
    { id: 'pr-9', name: 'Чай чёрный', category: 'Напитки', price: 45, subtitle: 'Классический горячий чай', description: 'Крепкий чёрный чай к любой позиции меню.', icon: '☕', image: null, popular: true, inStock: true },
    { id: 'pr-10', name: 'Пирожок с капустой', category: 'Пирожки', price: 65, subtitle: 'С хрустящей корочкой', description: 'Сытный пирожок с капустой и пряностями.', icon: '🥟', image: null, popular: false, inStock: true }
  ].map((p) => ({
    ...p,
    image: p.image || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
        <rect width="600" height="450" rx="28" fill="#fff8f0"/>
        <rect x="40" y="40" width="520" height="370" rx="22" fill="rgba(212,137,75,0.12)" stroke="rgba(61,43,31,0.18)" stroke-width="6"/>
        <text x="300" y="250" text-anchor="middle" font-size="120" font-family="Arial, sans-serif">${safe(p.icon)}</text>
      </svg>
    `)}`
  }))
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

const state = reactive({
  products: [],
  cart: [],
  menuCategory: 'Все'
})

let isInited = false

function normalizeProduct(raw) {
  return {
    id: safe(raw.id) || generateId('PROD'),
    name: safe(raw.name),
    category: safe(raw.category),
    price: Number(raw.price) || 0,
    subtitle: safe(raw.subtitle),
    description: safe(raw.description || raw.subtitle || raw.name),
    icon: safe(raw.icon || '🥐'),
    image: raw.image || null,
    popular: Boolean(raw.popular),
    inStock: raw.inStock !== false
  }
}

function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart)) return []
  return rawCart
    .map((item) => ({
      productId: safe(item.productId),
      qty: Math.max(1, Number(item.qty) || 1)
    }))
    .filter((item) => item.productId)
}

function save() {
  saveJSON(KEYS.products, state.products.map((p) => ({ ...p })))
  saveJSON(KEYS.cart, state.cart.map((i) => ({ ...i })))
  saveJSON(KEYS.menuCategory, state.menuCategory)
}

function init() {
  if (isInited) return
  isInited = true

  const storedProducts = loadJSON(KEYS.products, null)
  const storedCart = loadJSON(KEYS.cart, [])
  const storedMenuCategory = loadJSON(KEYS.menuCategory, 'Все')

  state.products = Array.isArray(storedProducts) && storedProducts.length
    ? storedProducts.map(normalizeProduct)
    : buildSeedProducts()

  state.cart = normalizeCart(storedCart)
  state.menuCategory = storedMenuCategory || 'Все'

  state.products = state.products.map((p) => ({
    ...p,
    image: p.image || buildSeedProducts().find((x) => x.id === p.id)?.image
  }))

  save()
}

function setCategory(category) {
  state.menuCategory = category || 'Все'
  save()
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0)
}

function findProduct(id) {
  return state.products.find((p) => p.id === id) || null
}

function cartItem(productId) {
  return state.cart.find((i) => i.productId === productId) || null
}

function addToCart(productId, delta = 1) {
  const product = findProduct(productId)
  if (!product || !product.inStock) return

  const existing = cartItem(productId)
  const nextQty = existing ? existing.qty + delta : Math.max(1, delta)

  if (nextQty <= 0) {
    state.cart = state.cart.filter((x) => x.productId !== productId)
    save()
    return
  }

  if (existing) {
    state.cart = state.cart.map((x) => (x.productId === productId ? { ...x, qty: nextQty } : x))
  } else {
    state.cart = [...state.cart, { productId, qty: nextQty }]
  }

  save()
}

function filteredMenuProducts() {
  return state.menuCategory === 'Все'
    ? state.products
    : state.products.filter((p) => p.category === state.menuCategory)
}

export function useBakeryStore() {
  return {
    state,
    init,
    CATEGORY_LABELS,
    cartCount,
    setCategory,
    addToCart,
    filteredMenuProducts
  }
}
