(() => {
  const KEYS = {
    products: 'bakery_products',
    cart: 'bakery_cart',
    orders: 'bakery_orders',
    users: 'bakery_users',
    currentUserId: 'bakery_current_user_id',
    adminAuth: 'bakery_admin_auth',
    bakerAuth: 'bakery_baker_auth',
    lastOrderId: 'bakery_last_order_id',
    menuCategory: 'bakery_menu_category',
    adminSection: 'bakery_admin_section',
    adminDate: 'bakery_admin_date',
    adminStatus: 'bakery_admin_status',
    bakerDate: 'bakery_baker_date',
    settings: 'bakery_settings'
  };

  const DEFAULT_SETTINGS = {
    cafeName: 'Студенческое кафе «СтудFood»',
    address: 'Корпус №1, 1 этаж',
    hours: 'Пн–Пт 8:00–17:00',
    description: 'На территории колледжа, рядом с главным входом и буфетом. Идите по указателям «Студенческое кафе».',
    contactPhone: '+7 (900) 123-45-67',
    vkBotLink: 'https://vk.com/',
    vkBotName: 'VK-бот',
    vkBotHint: 'Получайте уведомления о готовности заказа в VK'
  };

  const PAGE_TITLES = {
    home: 'Свежая выпечка к твоей паре',
    menu: 'Меню — студенческое кафе',
    contacts: 'Контакты — студенческое кафе',
    cart: 'Корзина — студенческое кафе',
    checkout: 'Оформление заказа',
    account: 'Личный кабинет',
    admin: 'Админ-панель',
    baker: 'Панель пекаря',
    success: 'Заказ оформлен'
  };

  const CATEGORY_LABELS = ['Все', 'Пирожки', 'Слойки', 'Булочки', 'Пирожные', 'Напитки'];

  const ORDER_STATUS = {
    new: { label: 'Новый', className: 'status--new' },
    paid: { label: 'Оплачен', className: 'status--paid' },
    cooking: { label: 'Готовится', className: 'status--cooking' },
    ready: { label: 'Готов', className: 'status--ready' },
    issued: { label: 'Выдан', className: 'status--issued' },
    cancelled: { label: 'Отменён', className: 'status--cancelled' }
  };

  const ORDER_FLOW = {
    new: ['paid', 'cancelled'],
    paid: ['cooking', 'cancelled'],
    cooking: ['ready'],
    ready: ['issued'],
    issued: [],
    cancelled: []
  };

  const DEMO_CREDENTIALS = {
    admin: { login: 'admin', password: 'admin123' },
    baker: { login: 'baker', password: 'baker123' }
  };

  const state = {
    products: [],
    cart: [],
    orders: [],
    users: [],
    currentUserId: null,
    adminAuth: false,
    bakerAuth: false,
    lastOrderId: null,
    menuCategory: 'Все',
    adminSection: 'dashboard',
    adminDate: toInputDate(),
    adminStatus: 'all',
    bakerDate: toInputDate(),
    settings: { ...DEFAULT_SETTINGS },
    navOpen: false
  };

  const appRoot = document.getElementById('app');
  const page = document.body?.dataset?.page || 'home';
  const money = new Intl.NumberFormat('ru-RU');

  function safe(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  const HTML_ENTITIES = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#39'
  };

  function encodeHtml(value) {
    return safe(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] || char);
  }

  const escapeHtml = encodeHtml;

  function toInputDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const text = String(value);
    if (text.includes('-')) {
      const [year, month, day] = text.split('-');
      if (year && month && day) return `${day}.${month}.${year}`;
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toLocaleDateString('ru-RU');
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return safe(value);
    return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function formatCurrency(value) {
    return `${money.format(Math.round(Number(value) || 0))} ₽`;
  }

  function digitsOnly(value) {
    return safe(value).replace(/\D/g, '');
  }

  function formatPhone(value) {
    const digits = digitsOnly(value);
    if (!digits) return safe(value);

    let normalized = digits;
    if (normalized.length === 11 && normalized.startsWith('8')) normalized = `7${normalized.slice(1)}`;
    if (normalized.length === 10) normalized = `7${normalized}`;
    normalized = normalized.slice(0, 11);

    const local = normalized.slice(1);
    const p1 = local.slice(0, 3);
    const p2 = local.slice(3, 6);
    const p3 = local.slice(6, 8);
    const p4 = local.slice(8, 10);

    let result = '+7';
    if (p1) result += ` (${p1}`;
    if (p2) result += `) ${p2}`;
    if (p3) result += `-${p3}`;
    if (p4) result += `-${p4}`;
    return result;
  }

  function phoneKey(value) {
    const digits = digitsOnly(value);
    if (!digits) return '';
    return digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits.length === 10 ? `7${digits}` : digits;
  }

  function generateId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore in demo mode
    }
  }

  function svgDataUri(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function makeImage(title, subtitle, icon, colorA, colorB) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorA}"/>
            <stop offset="100%" stop-color="${colorB}"/>
          </linearGradient>
        </defs>
        <rect width="900" height="700" rx="40" fill="url(#g)"/>
        <rect x="88" y="92" width="724" height="516" rx="36" fill="rgba(255,248,240,0.92)"/>
        <text x="450" y="294" text-anchor="middle" font-size="124" font-family="Arial, sans-serif">${escapeHtml(icon)}</text>
        <text x="450" y="396" text-anchor="middle" font-size="42" font-weight="700" font-family="Arial, sans-serif" fill="#3D2B1F">${escapeHtml(title)}</text>
        <text x="450" y="446" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#6F5B4F">${escapeHtml(subtitle)}</text>
      </svg>
    `;
    return svgDataUri(svg);
  }

  function makeQrImage(label) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 560">
        <rect width="560" height="560" rx="42" fill="#fff"/>
        <rect x="20" y="20" width="520" height="520" rx="30" fill="#FFF8F0" stroke="#D4894B" stroke-width="8"/>
        <rect x="122" y="122" width="120" height="120" rx="18" fill="#FFF8F0" stroke="#3D2B1F" stroke-width="18"/>
        <rect x="318" y="122" width="120" height="120" rx="18" fill="#FFF8F0" stroke="#3D2B1F" stroke-width="18"/>
        <rect x="122" y="318" width="120" height="120" rx="18" fill="#FFF8F0" stroke="#3D2B1F" stroke-width="18"/>
        <g fill="#3D2B1F" opacity="0.95">
          <rect x="248" y="86" width="22" height="22" rx="5"/>
          <rect x="280" y="86" width="22" height="22" rx="5"/>
          <rect x="312" y="86" width="22" height="22" rx="5"/>
          <rect x="248" y="152" width="22" height="22" rx="5"/>
          <rect x="280" y="152" width="22" height="22" rx="5"/>
          <rect x="312" y="152" width="22" height="22" rx="5"/>
          <rect x="248" y="218" width="22" height="22" rx="5"/>
          <rect x="280" y="218" width="22" height="22" rx="5"/>
          <rect x="312" y="218" width="22" height="22" rx="5"/>
          <rect x="248" y="284" width="22" height="22" rx="5"/>
          <rect x="280" y="284" width="22" height="22" rx="5"/>
          <rect x="312" y="284" width="22" height="22" rx="5"/>
          <rect x="248" y="350" width="22" height="22" rx="5"/>
          <rect x="280" y="350" width="22" height="22" rx="5"/>
          <rect x="312" y="350" width="22" height="22" rx="5"/>
        </g>
        <text x="280" y="314" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="#D4894B">${escapeHtml(label)}</text>
      </svg>
    `;
    return svgDataUri(svg);
  }

  function findProduct(id) {
    return state.products.find((product) => product.id === id) || null;
  }

  function normalizeProduct(raw) {
    return {
      id: safe(raw.id) || generateId('PROD'),
      name: safe(raw.name),
      category: safe(raw.category),
      price: Number(raw.price) || 0,
      subtitle: safe(raw.subtitle),
      description: safe(raw.description || raw.subtitle || raw.name),
      icon: safe(raw.icon || '🥐'),
      image: raw.image || makeImage(safe(raw.name), safe(raw.subtitle || raw.category), safe(raw.icon || '🥐'), '#F6E0C3', '#D4894B'),
      popular: Boolean(raw.popular),
      inStock: raw.inStock !== false
    };
  }

  function normalizeUser(raw) {
    return {
      id: safe(raw.id) || generateId('USER'),
      name: safe(raw.name),
      phone: formatPhone(raw.phone),
      blocked: Boolean(raw.blocked),
      orders: Array.isArray(raw.orders) ? raw.orders.map(safe) : []
    };
  }

  function normalizeOrder(raw) {
    const items = Array.isArray(raw.items)
      ? raw.items.map((item) => ({
          productId: safe(item.productId),
          name: safe(item.name),
          price: Number(item.price) || 0,
          qty: Math.max(1, Number(item.qty) || 1),
          image: safe(item.image)
        }))
      : [];
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return {
      id: safe(raw.id) || generateId('ORD'),
      userId: safe(raw.userId),
      userName: safe(raw.userName),
      phone: formatPhone(raw.phone),
      items,
      pickupDate: safe(raw.pickupDate),
      pickupTime: safe(raw.pickupTime),
      comment: safe(raw.comment),
      status: ORDER_STATUS[raw.status] ? raw.status : 'new',
      payment: safe(raw.payment || 'online'),
      source: safe(raw.source || 'web'),
      createdAt: safe(raw.createdAt) || new Date().toISOString(),
      updatedAt: safe(raw.updatedAt) || new Date().toISOString(),
      total
    };
  }

  function buildSeedProducts() {
    return [
      { id: 'pr-1', name: 'Круассан классический', category: 'Слойки', price: 85, subtitle: 'Воздушный и хрустящий', description: 'Нежный слоёный круассан с ароматом сливочного масла.', icon: '🥐', image: makeImage('Круассан', 'Воздушный и хрустящий', '🥐', '#F6D6A8', '#D4894B'), popular: true, inStock: true },
      { id: 'pr-2', name: 'Пирожок с картошкой', category: 'Пирожки', price: 65, subtitle: 'Сытный и домашний', description: 'Румяный пирожок с картофельной начинкой.', icon: '🥟', image: makeImage('Пирожок', 'Сытный и домашний', '🥟', '#EBC28F', '#B46B32'), popular: true, inStock: true },
      { id: 'pr-3', name: 'Слойка с яблоком', category: 'Слойки', price: 90, subtitle: 'Сладкая и сочная', description: 'Слойка с яблоком, корицей и карамельной ноткой.', icon: '🍎', image: makeImage('Слойка', 'Сладкая и сочная', '🍎', '#F7C6A8', '#D4894B'), popular: true, inStock: true },
      { id: 'pr-4', name: 'Булочка с корицей', category: 'Булочки', price: 75, subtitle: 'Тёплая и ароматная', description: 'Пышная булочка с корицей и сахарной глазурью.', icon: '🥯', image: makeImage('Булочка', 'Тёплая и ароматная', '🥯', '#F6E0B6', '#C97D43'), popular: true, inStock: true },
      { id: 'pr-5', name: 'Эклер ванильный', category: 'Пирожные', price: 110, subtitle: 'Нежный крем внутри', description: 'Лёгкое пирожное с ванильным кремом и глазурью.', icon: '🍰', image: makeImage('Эклер', 'Нежный крем внутри', '🍰', '#F9E3C6', '#D4894B'), popular: true, inStock: true },
      { id: 'pr-6', name: 'Морс клюквенный', category: 'Напитки', price: 60, subtitle: 'Освежающий напиток', description: 'Домашний клюквенный морс без лишней сладости.', icon: '🧃', image: makeImage('Морс', 'Освежающий напиток', '🧃', '#F2D0C8', '#C65D4B'), popular: false, inStock: true },
      { id: 'pr-7', name: 'Плюшка сахарная', category: 'Булочки', price: 70, subtitle: 'Мягкая и воздушная', description: 'Пышная плюшка с сахаром и сливочным ароматом.', icon: '🍞', image: makeImage('Плюшка', 'Мягкая и воздушная', '🍞', '#F7E1BC', '#D79B54'), popular: false, inStock: true },
      { id: 'pr-8', name: 'Сочник с творогом', category: 'Пирожные', price: 95, subtitle: 'С нежной начинкой', description: 'Нежный сочник с творожной начинкой и рассыпчатым тестом.', icon: '🥧', image: makeImage('Сочник', 'С нежной начинкой', '🥧', '#F2D8C2', '#D4894B'), popular: true, inStock: true },
      { id: 'pr-9', name: 'Чай чёрный', category: 'Напитки', price: 45, subtitle: 'Классический горячий чай', description: 'Крепкий чёрный чай к любой позиции меню.', icon: '☕', image: makeImage('Чай', 'Классический горячий', '☕', '#E8C99D', '#A86A36'), popular: true, inStock: true },
      { id: 'pr-10', name: 'Пирожок с капустой', category: 'Пирожки', price: 65, subtitle: 'С хрустящей корочкой', description: 'Сытный пирожок с капустой и пряностями.', icon: '🥟', image: makeImage('Пирожок', 'С хрустящей корочкой', '🥟', '#EFD2AA', '#C98C4A'), popular: false, inStock: true }
    ];
  }

  function buildSeedUsers() {
    return [
      { id: 'user-1', name: 'Анна Иванова', phone: '+7 (900) 111-22-33', blocked: false, orders: [] },
      { id: 'user-2', name: 'Данил Петров', phone: '+7 (901) 222-33-44', blocked: false, orders: [] },
      { id: 'user-3', name: 'Мария Соколова', phone: '+7 (902) 333-44-55', blocked: false, orders: [] }
    ];
  }

  function buildSeedOrders() {
    return [
      {
        id: 'ORD-DEMO-1',
        userId: 'user-1',
        userName: 'Анна Иванова',
        phone: '+7 (900) 111-22-33',
        items: [
          { productId: 'pr-1', name: 'Круассан классический', price: 85, qty: 2, image: makeImage('Круассан', 'Воздушный и хрустящий', '🥐', '#F6D6A8', '#D4894B') },
          { productId: 'pr-9', name: 'Чай чёрный', price: 45, qty: 1, image: makeImage('Чай', 'Классический горячий', '☕', '#E8C99D', '#A86A36') }
        ],
        pickupDate: toInputDate(),
        pickupTime: '10:30',
        comment: 'Упаковать отдельно',
        status: 'ready',
        payment: 'cash',
        source: 'seed',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        total: 0
      }
    ].map(normalizeOrder);
  }

  function buildSnapshot(product, qty) {
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      image: product.image
    };
  }

  function normalizeData() {
    const storedProducts = loadJSON(KEYS.products, null);
    const storedCart = loadJSON(KEYS.cart, []);
    const storedOrders = loadJSON(KEYS.orders, null);
    const storedUsers = loadJSON(KEYS.users, null);

    state.products = Array.isArray(storedProducts) && storedProducts.length ? storedProducts.map(normalizeProduct) : buildSeedProducts();
    state.users = Array.isArray(storedUsers) && storedUsers.length ? storedUsers.map(normalizeUser) : buildSeedUsers();
    state.orders = Array.isArray(storedOrders) && storedOrders.length ? storedOrders.map(normalizeOrder) : buildSeedOrders();
    state.cart = Array.isArray(storedCart)
      ? storedCart
          .map((item) => ({ productId: safe(item.productId), qty: Math.max(1, Number(item.qty) || 1) }))
          .filter((item) => Boolean(findProduct(item.productId)))
      : [];

    state.currentUserId = loadJSON(KEYS.currentUserId, null);
    state.adminAuth = Boolean(loadJSON(KEYS.adminAuth, false));
    state.bakerAuth = Boolean(loadJSON(KEYS.bakerAuth, false));
    state.lastOrderId = loadJSON(KEYS.lastOrderId, null);
    state.menuCategory = loadJSON(KEYS.menuCategory, 'Все');
    state.adminSection = loadJSON(KEYS.adminSection, 'dashboard');
    state.adminDate = loadJSON(KEYS.adminDate, toInputDate());
    state.adminStatus = loadJSON(KEYS.adminStatus, 'all');
    state.bakerDate = loadJSON(KEYS.bakerDate, toInputDate());
    state.settings = { ...DEFAULT_SETTINGS, ...(loadJSON(KEYS.settings, {}) || {}) };

    syncUsersWithOrders();
    recalcOrderTotals();
    saveState();
  }

  function syncUsersWithOrders() {
    const map = new Map(state.users.map((user) => [user.id, { ...user, orders: Array.isArray(user.orders) ? [...user.orders] : [] }]));
    state.orders.forEach((order) => {
      if (!map.has(order.userId)) {
        map.set(order.userId, { id: order.userId, name: order.userName, phone: order.phone, blocked: false, orders: [] });
      }
      const user = map.get(order.userId);
      user.orders = Array.from(new Set([...(user.orders || []), order.id]));
    });
    state.users = Array.from(map.values());
  }

  function recalcOrderTotals() {
    state.orders = state.orders.map((order) => ({
      ...order,
      total: order.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    }));
  }

  function saveState() {
    saveJSON(KEYS.products, state.products);
    saveJSON(KEYS.cart, state.cart);
    saveJSON(KEYS.orders, state.orders);
    saveJSON(KEYS.users, state.users);
    saveJSON(KEYS.currentUserId, state.currentUserId);
    saveJSON(KEYS.adminAuth, state.adminAuth);
    saveJSON(KEYS.bakerAuth, state.bakerAuth);
    saveJSON(KEYS.lastOrderId, state.lastOrderId);
    saveJSON(KEYS.menuCategory, state.menuCategory);
    saveJSON(KEYS.adminSection, state.adminSection);
    saveJSON(KEYS.adminDate, state.adminDate);
    saveJSON(KEYS.adminStatus, state.adminStatus);
    saveJSON(KEYS.bakerDate, state.bakerDate);
    saveJSON(KEYS.settings, state.settings);
  }

  function currentUser() {
    return state.users.find((user) => user.id === state.currentUserId) || null;
  }

  function getUserByPhone(phone) {
    const key = phoneKey(phone);
    if (!key) return null;
    return state.users.find((user) => phoneKey(user.phone) === key) || null;
  }

  function ensureUser(name, phone) {
    const existing = getUserByPhone(phone);
    if (existing) {
      if (name && name.trim() && existing.name !== name.trim()) existing.name = name.trim();
      existing.phone = formatPhone(phone);
      return existing;
    }
    const user = {
      id: generateId('USER'),
      name: safe(name).trim() || 'Покупатель',
      phone: formatPhone(phone),
      blocked: false,
      orders: []
    };
    state.users.unshift(user);
    return user;
  }

  function cartItem(productId) {
    return state.cart.find((item) => item.productId === productId) || null;
  }

  function cartDetailed() {
    return state.cart
      .map((item) => {
        const product = findProduct(item.productId);
        if (!product) return null;
        return { ...item, product, lineTotal: product.price * item.qty };
      })
      .filter(Boolean);
  }

  function cartCount() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function cartTotal() {
    return cartDetailed().reduce((sum, item) => sum + item.lineTotal, 0);
  }

  function popularProducts() {
    return state.products.filter((product) => product.popular).slice(0, 6);
  }

  function filteredMenuProducts() {
    return state.menuCategory === 'Все'
      ? state.products
      : state.products.filter((product) => product.category === state.menuCategory);
  }

  function userOrders() {
    const user = currentUser();
    if (!user) return [];
    return state.orders.filter((order) => order.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function activeOrder() {
    return userOrders().find((order) => !['issued', 'cancelled'].includes(order.status)) || null;
  }

  function recentOrders(limit = 6) {
    return [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  function ordersForDate(date) {
    return [...state.orders]
      .filter((order) => order.pickupDate === date)
      .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));
  }

  function ordersForAdmin() {
    let orders = [...state.orders];
    if (state.adminDate) orders = orders.filter((order) => order.pickupDate === state.adminDate);
    if (state.adminStatus !== 'all') orders = orders.filter((order) => order.status === state.adminStatus);
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function ordersForBaker() {
    return ordersForDate(state.bakerDate).filter((order) => order.status !== 'issued' && order.status !== 'cancelled');
  }

  function statusMeta(status) {
    return ORDER_STATUS[status] || ORDER_STATUS.new;
  }

  function allowedTransitions(status) {
    return ORDER_FLOW[status] || [];
  }

  function todayStats() {
    const today = toInputDate();
    const todayOrders = state.orders.filter((order) => order.pickupDate === today && order.status !== 'cancelled');
    const revenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    return {
      ordersToday: todayOrders.length,
      revenueToday: revenue,
      activeToday: state.orders.filter((order) => order.pickupDate === today && !['issued', 'cancelled'].includes(order.status)).length,
      users: state.users.length
    };
  }

  function setTitle(key) {
    document.title = PAGE_TITLES[key] || DEFAULT_SETTINGS.cafeName;
  }

  function setBodyMode(key) {
    document.body.classList.remove('mode-public', 'mode-workspace', 'mode-auth');
    document.body.classList.add(['admin', 'baker'].includes(key) ? 'mode-workspace' : 'mode-public');
    if (key === 'account' || key === 'checkout') document.body.classList.add('mode-auth');
    document.body.classList.toggle('nav-open', state.navOpen);
  }

  function navLinks(key) {
    if (key === 'admin' || key === 'baker') {
      return [
        ['home', 'index.html', 'Главная'],
        ['menu', 'menu.html', 'Меню'],
        ['cart', 'cart.html', 'Корзина'],
        ['account', 'account.html', 'Войти'],
        [key, `${key}.html`, key === 'admin' ? 'Админ' : 'Пекарь']
      ];
    }
    return [
      ['home', 'index.html', 'Главная'],
      ['menu', 'menu.html', 'Меню'],
      ['contacts', 'contacts.html', 'Контакты'],
      ['account', 'account.html', 'Войти']
    ];
  }

  function header(key) {
    const links = navLinks(key);
    const logout = key === 'admin' && state.adminAuth
      ? `<button class="button button--ghost header-action" type="button" data-action="logout-admin">Выйти</button>`
      : key === 'baker' && state.bakerAuth
        ? `<button class="button button--ghost header-action" type="button" data-action="logout-baker">Выйти</button>`
        : '';
    return `
      <header class="site-header">
        <a class="brand" href="index.html" aria-label="${escapeHtml(state.settings.cafeName)}">
          <span class="brand-mark" aria-hidden="true"><img src="assets/logo.png" alt="" /></span>
          <span class="brand-copy">
            <strong>${escapeHtml(state.settings.cafeName)}</strong>
            <small>вкусно, быстро, рядом</small>
          </span>
        </a>
        <button class="burger" type="button" data-action="toggle-nav" aria-label="Открыть меню">☰</button>
        <nav class="site-nav ${state.navOpen ? 'is-open' : ''}">
          ${links.map(([pageKey, href, label]) => `<a class="nav-link ${key === pageKey ? 'is-active' : ''}" href="${href}">${escapeHtml(label)}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <a class="cart-link" href="cart.html" aria-label="Корзина">
            <span>🛒</span>
            <span>Корзина</span>
            <b class="cart-badge">${cartCount()}</b>
          </a>
          ${logout}
        </div>
      </header>
    `;
  }

  function footer() {
    return `
      <footer class="site-footer">
        <div>
          <h3>${escapeHtml(state.settings.cafeName)}</h3>
          <p>${escapeHtml(state.settings.address)}</p>
          <p>${escapeHtml(state.settings.hours)}</p>
        </div>
        <div>
          <h4>Контакты</h4>
          <p>${escapeHtml(state.settings.contactPhone)}</p>
          <a class="text-link" href="${escapeHtml(state.settings.vkBotLink)}" target="_blank" rel="noreferrer">Ссылка на ${escapeHtml(state.settings.vkBotName)}</a>
        </div>
        <div>
          <h4>Уведомления</h4>
          <p>${escapeHtml(state.settings.vkBotHint)}</p>
          <a class="button button--ghost" href="${escapeHtml(state.settings.vkBotLink)}" target="_blank" rel="noreferrer">Открыть VK-бот</a>
        </div>
      </footer>
    `;
  }

  function shell(content, key) {
    return `
      <div class="page-shell">
        ${header(key)}
        <main class="page-main">
          ${content}
        </main>
        ${footer()}
      </div>
    `;
  }

  function sectionHeading(title, subtitle = '', actions = '') {
    return `
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${actions ? `<div class="section-heading__actions">${actions}</div>` : ''}
      </div>
    `;
  }

  function statusBadge(status) {
    const meta = statusMeta(status);
    return `<span class="status ${meta.className}">${escapeHtml(meta.label)}</span>`;
  }

  function productCard(product, showControls = true) {
    const item = cartItem(product.id);
    const qty = item ? item.qty : 0;
    const disabled = !product.inStock;
    const controls = qty > 0 && showControls
      ? `
        <div class="qty-controls">
          <button class="icon-button" type="button" data-action="decrease-qty" data-product-id="${escapeHtml(product.id)}" ${disabled ? 'disabled' : ''}>−</button>
          <span>${qty}</span>
          <button class="icon-button" type="button" data-action="increase-qty" data-product-id="${escapeHtml(product.id)}" ${disabled ? 'disabled' : ''}>+</button>
        </div>
      `
      : showControls
        ? `<button class="button button--primary" type="button" data-action="add-to-cart" data-product-id="${escapeHtml(product.id)}" ${disabled ? 'disabled' : ''}>${disabled ? 'Нет в наличии' : 'В корзину'}</button>`
        : '';

    return `
      <article class="product-card ${disabled ? 'is-out-of-stock' : ''}">
        <div class="product-card__image-wrap">
          <img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
          ${product.popular ? '<span class="product-card__flag">Популярно</span>' : ''}
          ${disabled ? '<span class="product-card__flag product-card__flag--muted">Нет в наличии</span>' : ''}
        </div>
        <div class="product-card__body">
          <div class="product-card__meta">
            <span class="product-card__category">${escapeHtml(product.category)}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.subtitle)}</p>
          </div>
          <div class="product-card__footer">
            <strong>${formatCurrency(product.price)}</strong>
            ${controls}
          </div>
        </div>
      </article>
    `;
  }

  function orderCard(order, role = 'user') {
    const transitions = allowedTransitions(order.status);
    const actions = role === 'user'
      ? ''
      : transitions.map((nextStatus) => `<button class="button button--ghost button--small" type="button" data-action="update-order-status" data-order-id="${escapeHtml(order.id)}" data-next-status="${escapeHtml(nextStatus)}">${escapeHtml(statusMeta(nextStatus).label)}</button>`).join('');

    return `
      <article class="order-card">
        <div class="order-card__head">
          <div>
            <strong>${escapeHtml(order.id)}</strong>
            <p>${escapeHtml(order.userName)} • ${escapeHtml(order.phone)}</p>
          </div>
          ${statusBadge(order.status)}
        </div>
        <div class="order-card__body">
          <p>${formatDate(order.pickupDate)} • ${escapeHtml(order.pickupTime)}</p>
          <p>${order.items.map((item) => `${escapeHtml(item.name)} × ${item.qty}`).join(', ')}</p>
          ${order.comment ? `<p>${escapeHtml(order.comment)}</p>` : ''}
          <strong>${formatCurrency(order.total)}</strong>
        </div>
        ${actions ? `<div class="order-card__actions">${actions}</div>` : ''}
      </article>
    `;
  }

  function statCard(label, value, tone = 'default') {
    return `
      <article class="stat-card stat-card--${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function hero() {
    const img = state.products[0]?.image || makeImage('Свежая выпечка', 'Круассаны, булочки, пирожки', '🥐', '#F8DDBA', '#D4894B');
    return `
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">Студенческое кафе рядом с корпусом</p>
          <h1>Свежая выпечка к твоей паре</h1>
          <p class="hero__text">Закажи онлайн и забери в студенческом кафе без очереди и лишнего ожидания.</p>
          <div class="hero__actions">
            <a class="button button--primary" href="menu.html">🥐 Смотреть меню</a>
            <a class="button button--ghost" href="contacts.html">Контакты и схема проезда</a>
          </div>
          <ul class="hero__badges">
            <li>Удобно</li>
            <li>Вкусно</li>
            <li>Быстро</li>
          </ul>
        </div>
        <div class="hero__visual">
          <img src="${escapeHtml(img)}" alt="Свежая выпечка">
          <div class="hero__note">
            <strong>Сегодня</strong>
            <span>Популярные позиции уже готовы к заказу</span>
          </div>
        </div>
      </section>
    `;
  }

  function benefits() {
    const cards = [
      ['🔹 Удобно', 'Заказывай с сайта или VK-бота'],
      ['🔹 Вкусно', 'Домашняя выпечка каждый день'],
      ['🔹 Быстро', 'Забери на перемене без очереди']
    ];
    return `
      <section class="benefits-grid">
        ${cards.map(([title, text]) => `
          <article class="feature-card">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(text)}</p>
          </article>
        `).join('')}
      </section>
    `;
  }

  function homePage() {
    return shell(`
      ${hero()}
      ${benefits()}
      <section class="section">
        ${sectionHeading('Популярное сегодня', 'Позиции, которые чаще всего берут студенты')}
        <div class="products-grid products-grid--home">
          ${popularProducts().map((product) => productCard(product, false)).join('')}
        </div>
      </section>
    `, 'home');
  }

  function menuPage() {
    const chips = CATEGORY_LABELS.map((category) => `<button class="chip ${state.menuCategory === category ? 'is-active' : ''}" type="button" data-action="set-category" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
    return shell(`
      <section class="section">
        ${sectionHeading('Меню', 'Выбирай любимую выпечку, добавляй в корзину и оформляй заказ за минуту.', `<a class="button button--ghost" href="cart.html">Перейти в корзину</a>`)}
        <div class="chip-row">${chips}</div>
        <div class="products-grid">
          ${filteredMenuProducts().map((product) => productCard(product, true)).join('')}
        </div>
      </section>
    `, 'menu');
  }

  function contactsPage() {
    const qr = makeQrImage('VK');
    return shell(`
      <section class="section contacts-layout">
        <div class="contacts-card">
          ${sectionHeading('Контакты', 'Как нас найти и как связаться с кафе')}
          <div class="info-stack">
            <article class="info-item"><strong>Адрес</strong><p>${escapeHtml(state.settings.cafeName)}, ${escapeHtml(state.settings.address)}</p></article>
            <article class="info-item"><strong>Режим работы</strong><p>${escapeHtml(state.settings.hours)}</p></article>
            <article class="info-item"><strong>Схема проезда</strong><p>${escapeHtml(state.settings.description)}</p></article>
            <article class="info-item"><strong>Телефон</strong><p>${escapeHtml(state.settings.contactPhone)}</p></article>
            <article class="info-item">
              <strong>VK-бот</strong>
              <p>${escapeHtml(state.settings.vkBotHint)}</p>
              <a class="button button--primary" href="${escapeHtml(state.settings.vkBotLink)}" target="_blank" rel="noreferrer">Открыть VK-бота</a>
            </article>
          </div>
        </div>
        <div class="contacts-card contacts-card--qr">
          <h2>Сканируй QR-код</h2>
          <p>Переходи в VK-бот для уведомлений о готовности заказа.</p>
          <img class="qr-image" src="${escapeHtml(qr)}" alt="QR-код на VK-бот">
        </div>
      </section>
    `, 'contacts');
  }

  function cartSummary() {
    return `
      <aside class="summary-card">
        <h3>Итого</h3>
        <dl class="summary-list">
          <div><dt>Товаров</dt><dd>${cartCount()}</dd></div>
          <div><dt>Сумма</dt><dd>${formatCurrency(cartTotal())}</dd></div>
        </dl>
        <a class="button button--primary button--wide" href="checkout.html" ${cartCount() ? '' : 'aria-disabled="true" tabindex="-1"'}>Оформить заказ</a>
        <a class="button button--ghost button--wide" href="menu.html">Продолжить покупки</a>
      </aside>
    `;
  }

  function cartPage() {
    const items = cartDetailed();
    if (!items.length) {
      return shell(`
        <section class="empty-state">
          <h1>Корзина пуста</h1>
          <p>Добавь позиции из меню, чтобы оформить заказ.</p>
          <a class="button button--primary" href="menu.html">Перейти в меню</a>
        </section>
      `, 'cart');
    }

    return shell(`
      <section class="section cart-layout">
        <div>
          ${sectionHeading('Корзина', 'Проверь позиции, измени количество и переходи к оформлению.')}
          <div class="cart-list">
            ${items.map((item) => `
              <article class="cart-item">
                <img class="cart-item__image" src="${escapeHtml(item.product.image)}" alt="${escapeHtml(item.product.name)}">
                <div class="cart-item__content">
                  <h3>${escapeHtml(item.product.name)}</h3>
                  <p>${escapeHtml(item.product.category)}</p>
                  <div class="cart-item__meta">
                    <span>${formatCurrency(item.product.price)} за шт.</span>
                    <strong>${formatCurrency(item.lineTotal)}</strong>
                  </div>
                </div>
                <div class="qty-controls qty-controls--card">
                  <button class="icon-button" type="button" data-action="decrease-qty" data-product-id="${escapeHtml(item.product.id)}">−</button>
                  <span>${item.qty}</span>
                  <button class="icon-button" type="button" data-action="increase-qty" data-product-id="${escapeHtml(item.product.id)}">+</button>
                </div>
                <button class="trash-button" type="button" data-action="remove-from-cart" data-product-id="${escapeHtml(item.product.id)}" aria-label="Удалить">✕</button>
              </article>
            `).join('')}
          </div>
        </div>
        ${cartSummary()}
      </section>
    `, 'cart');
  }

  function getPrefillCustomer() {
    const user = currentUser();
    if (user) return { name: user.name, phone: user.phone };
    const last = state.orders.find((order) => order.id === state.lastOrderId) || recentOrders(1)[0];
    if (last) return { name: last.userName, phone: last.phone };
    return { name: '', phone: '' };
  }

  function timeOptions(selected = '10:00') {
    const options = [];
    for (let hour = 8; hour <= 16; hour += 1) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push(`<option value="${time}" ${time === selected ? 'selected' : ''}>${time}</option>`);
      }
    }
    return options.join('');
  }

  function checkoutPage() {
    const items = cartDetailed();
    if (!items.length) {
      return shell(`
        <section class="empty-state">
          <h1>Нечего оформлять</h1>
          <p>Сначала добавь товары в корзину.</p>
          <a class="button button--primary" href="menu.html">Открыть меню</a>
        </section>
      `, 'checkout');
    }

    const customer = getPrefillCustomer();
    const total = cartTotal();

    return shell(`
      <section class="section checkout-layout">
        <div class="checkout-form-panel">
          ${sectionHeading('Оформление заказа', 'Заполни данные, выбери дату и время получения, затем подтверди заказ.')}
          <form class="checkout-form" data-form="checkout-form">
            <div class="checkout-step">
              <h3>Шаг 1 — Данные пользователя</h3>
              <label>
                <span>ФИО</span>
                <input type="text" name="customerName" placeholder="Иван Иванов" value="${escapeHtml(customer.name)}" required>
              </label>
              <label>
                <span>Номер телефона</span>
                <input type="tel" name="customerPhone" placeholder="+7 (___) ___-__-__" value="${escapeHtml(customer.phone)}" data-phone-input required>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" name="vkNotify">
                <span>Получать уведомления в VK</span>
              </label>
            </div>

            <div class="checkout-step">
              <h3>Шаг 2 — Дата и время получения</h3>
              <div class="split-grid">
                <label>
                  <span>Дата</span>
                  <select name="pickupDate" required>
                    <option value="${toInputDate()}" selected>Сегодня</option>
                    <option value="${toInputDate(1)}">Завтра</option>
                    <option value="${toInputDate(2)}">Послезавтра</option>
                  </select>
                </label>
                <label>
                  <span>Время</span>
                  <select name="pickupTime" required>
                    ${timeOptions('10:00')}
                  </select>
                </label>
              </div>
              <label>
                <span>Комментарий к заказу</span>
                <textarea name="comment" rows="4" placeholder="Например: без сахара в напитке, упаковать отдельно"></textarea>
              </label>
            </div>

            <div class="checkout-step">
              <h3>Шаг 3 — Подтверждение</h3>
              <div class="order-preview">
                ${items.map((item) => `
                  <div class="order-preview__row">
                    <span>${escapeHtml(item.product.name)} × ${item.qty}</span>
                    <strong>${formatCurrency(item.lineTotal)}</strong>
                  </div>
                `).join('')}
                <div class="order-preview__row order-preview__row--total">
                  <span>Итого</span>
                  <strong>${formatCurrency(total)}</strong>
                </div>
              </div>
              <button class="button button--primary button--wide" type="submit">Подтвердить заказ</button>
              <p class="hint">Реального платёжного шлюза нет — это демо-оформление для локального режима.</p>
            </div>
          </form>
        </div>

        <aside class="summary-card summary-card--checkout">
          <h3>Состав заказа</h3>
          <div class="summary-items">
            ${items.map((item) => `
              <div class="summary-item">
                <img src="${escapeHtml(item.product.image)}" alt="${escapeHtml(item.product.name)}">
                <div>
                  <strong>${escapeHtml(item.product.name)}</strong>
                  <span>${item.qty} × ${formatCurrency(item.product.price)}</span>
                </div>
                <b>${formatCurrency(item.lineTotal)}</b>
              </div>
            `).join('')}
          </div>
          <div class="summary-total">
            <span>К оплате</span>
            <strong>${formatCurrency(total)}</strong>
          </div>
          <a class="button button--ghost button--wide" href="${escapeHtml(state.settings.vkBotLink)}" target="_blank" rel="noreferrer">Получить уведомления в VK</a>
        </aside>
      </section>
    `, 'checkout');
  }

  function accountLoginPage() {
    return `
      <section class="auth-panel">
        <div class="auth-panel__hero">
          <p class="eyebrow">Личный доступ</p>
          <h1>Войти в личный кабинет</h1>
          <p>Если номер уже есть в базе — откроется твой кабинет. Если нет, система создаст новый профиль.</p>
        </div>
        <div class="auth-panel__card">
          <form class="auth-form" data-form="account-login-form">
            <label>
              <span>Номер телефона</span>
              <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" data-phone-input required>
            </label>
            <label>
              <span>ФИО, если входишь впервые</span>
              <input type="text" name="name" placeholder="Иван Иванов">
            </label>
            <button class="button button--primary button--wide" type="submit">Войти</button>
            <p class="hint">Демо-логика без backend. Можно вводить любой номер.</p>
          </form>
        </div>
      </section>
    `;
  }

  function accountPage() {
    const user = currentUser();
    if (!user) {
      return shell(accountLoginPage(), 'account');
    }

    const orders = userOrders();
    const active = activeOrder();
    const past = orders.filter((order) => ['issued', 'cancelled'].includes(order.status));

    return shell(`
      <section class="section account-layout">
        <div class="account-card">
          ${sectionHeading('Личный кабинет', `Привет, ${escapeHtml(user.name)}. У тебя ${orders.length} заказ(ов) в истории.`)}
          <div class="account-grid">
            <article class="panel">
              <h3>Текущий заказ</h3>
              ${active ? `
                <div class="current-order">
                  <div class="current-order__head">
                    <strong>${escapeHtml(active.id)}</strong>
                    ${statusBadge(active.status)}
                  </div>
                  <p>${formatDate(active.pickupDate)} • ${escapeHtml(active.pickupTime)}</p>
                  <p>${active.items.map((item) => `${escapeHtml(item.name)} × ${item.qty}`).join(', ')}</p>
                  <strong>${formatCurrency(active.total)}</strong>
                </div>
              ` : `
                <div class="empty-inline">
                  <p>Активных заказов сейчас нет.</p>
                  <a class="button button--primary" href="menu.html">Заказать ещё</a>
                </div>
              `}
            </article>

            <article class="panel">
              <h3>Данные профиля</h3>
              <dl class="profile-list">
                <div><dt>ФИО</dt><dd>${escapeHtml(user.name)}</dd></div>
                <div><dt>Телефон</dt><dd>${escapeHtml(user.phone)}</dd></div>
                <div><dt>Статус</dt><dd>${user.blocked ? 'Заблокирован' : 'Активен'}</dd></div>
              </dl>
              <button class="button button--ghost" type="button" data-action="logout-user">Выйти из кабинета</button>
            </article>
          </div>
        </div>

        <div class="section">
          ${sectionHeading('История заказов', 'Последние завершённые покупки')}
          <div class="orders-list">
            ${past.length ? past.map((order) => orderCard(order, 'user')).join('') : '<p class="empty-inline">История заказов пока пуста.</p>'}
          </div>
        </div>
      </section>
    `, 'account');
  }

  function adminLoginPage() {
    return `
      <section class="auth-panel">
        <div class="auth-panel__hero">
          <p class="eyebrow">Рабочая зона</p>
          <h1>Вход в админ-панель</h1>
          <p>Демо-доступ: <strong>admin / admin123</strong></p>
        </div>
        <div class="auth-panel__card">
          <form class="auth-form" data-form="admin-login-form">
            <label>
              <span>Логин</span>
              <input type="text" name="login" placeholder="admin" required>
            </label>
            <label>
              <span>Пароль</span>
              <input type="password" name="password" placeholder="admin123" required>
            </label>
            <button class="button button--primary button--wide" type="submit">Войти</button>
          </form>
        </div>
      </section>
    `;
  }

  function adminSectionButtons() {
    const items = [
      ['dashboard', 'Обзор'],
      ['orders', 'Заказы'],
      ['products', 'Товары'],
      ['users', 'Пользователи']
    ];
    return `<div class="chip-row">${items.map(([id, label]) => `<button class="chip ${state.adminSection === id ? 'is-active' : ''}" type="button" data-action="set-admin-section" data-section="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join('')}</div>`;
  }

  function adminDashboardSection() {
    const stats = todayStats();
    return `
      ${sectionHeading('Обзор', 'Главные показатели на сегодня')}
      <div class="stats-grid">
        ${statCard('Заказов сегодня', String(stats.ordersToday), 'accent')}
        ${statCard('Выручка сегодня', formatCurrency(stats.revenueToday), 'success')}
        ${statCard('Активных заказов', String(stats.activeToday), 'warning')}
        ${statCard('Пользователей', String(stats.users), 'default')}
      </div>
      <div class="panel">
        <h3>Последние заказы</h3>
        <div class="orders-list">
          ${recentOrders(4).map((order) => orderCard(order, 'admin')).join('')}
        </div>
      </div>
    `;
  }

  function adminOrdersSection() {
    const orders = ordersForAdmin();
    return `
      ${sectionHeading('Заказы', 'Фильтруй и управляй статусами заказов')}
      <form class="filters-row" data-form="admin-filters-form">
        <label>
          <span>Дата</span>
          <input type="date" name="adminDate" value="${escapeHtml(state.adminDate)}">
        </label>
        <label>
          <span>Статус</span>
          <select name="adminStatus">
            <option value="all" ${state.adminStatus === 'all' ? 'selected' : ''}>Все</option>
            ${Object.keys(ORDER_STATUS).map((status) => `<option value="${status}" ${state.adminStatus === status ? 'selected' : ''}>${escapeHtml(statusMeta(status).label)}</option>`).join('')}
          </select>
        </label>
      </form>
      <div class="orders-list">
        ${orders.length ? orders.map((order) => orderCard(order, 'admin')).join('') : '<p class="empty-inline">Заказов по выбранному фильтру нет.</p>'}
      </div>
    `;
  }

  function adminProductsSection() {
    return `
      ${sectionHeading('Товары', 'Добавляй товары или меняй наличие')}
      <div class="panel">
        <form class="settings-form" data-form="product-create-form">
          <div class="split-grid">
            <label><span>Название</span><input type="text" name="name" placeholder="Новая булочка" required></label>
            <label><span>Категория</span><select name="category">${CATEGORY_LABELS.filter((item) => item !== 'Все').map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}</select></label>
          </div>
          <div class="split-grid">
            <label><span>Цена</span><input type="number" name="price" min="1" value="100" required></label>
            <label><span>Иконка</span><input type="text" name="icon" value="🥐" maxlength="2"></label>
          </div>
          <label><span>Подпись</span><input type="text" name="subtitle" placeholder="Краткое описание"></label>
          <label><span>Описание</span><textarea name="description" rows="3" placeholder="Полное описание"></textarea></label>
          <button class="button button--primary" type="submit">Добавить товар</button>
        </form>
      </div>
      <div class="products-grid">
        ${state.products.map((product) => `
          <article class="product-card">
            <div class="product-card__image-wrap">
              <img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
            </div>
            <div class="product-card__body">
              <div class="product-card__meta">
                <span class="product-card__category">${escapeHtml(product.category)}</span>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.subtitle)}</p>
              </div>
              <div class="product-card__footer">
                <strong>${formatCurrency(product.price)}</strong>
                <button class="button button--ghost button--small" type="button" data-action="toggle-product-stock" data-product-id="${escapeHtml(product.id)}">${product.inStock ? 'Скрыть' : 'Показать'}</button>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function adminUsersSection() {
    return `
      ${sectionHeading('Пользователи', 'Блокировка и обзор истории')}
      <div class="users-list">
        ${state.users.map((user) => `
          <article class="user-card">
            <div>
              <strong>${escapeHtml(user.name)}</strong>
              <p>${escapeHtml(user.phone)}</p>
              <p>${user.blocked ? 'Заблокирован' : 'Активен'} • заказов: ${user.orders.length}</p>
            </div>
            <button class="button button--ghost button--small" type="button" data-action="toggle-user-block" data-user-id="${escapeHtml(user.id)}">${user.blocked ? 'Разблокировать' : 'Заблокировать'}</button>
          </article>
        `).join('')}
      </div>
    `;
  }

  function adminSettingsSection() {
    return `
      ${sectionHeading('Настройки кафе', 'Изменяй контактные данные и ссылки')}
      <form class="settings-form" data-form="settings-form">
        <label><span>Название</span><input type="text" name="cafeName" value="${escapeHtml(state.settings.cafeName)}" required></label>
        <label><span>Адрес</span><input type="text" name="address" value="${escapeHtml(state.settings.address)}" required></label>
        <label><span>График</span><input type="text" name="hours" value="${escapeHtml(state.settings.hours)}" required></label>
        <label><span>Телефон</span><input type="text" name="contactPhone" value="${escapeHtml(state.settings.contactPhone)}" required></label>
        <label><span>VK-ссылка</span><input type="url" name="vkBotLink" value="${escapeHtml(state.settings.vkBotLink)}" required></label>
        <label><span>Подсказка</span><textarea name="vkBotHint" rows="3">${escapeHtml(state.settings.vkBotHint)}</textarea></label>
        <label><span>Описание проезда</span><textarea name="description" rows="3">${escapeHtml(state.settings.description)}</textarea></label>
        <button class="button button--primary" type="submit">Сохранить</button>
      </form>
    `;
  }

  function adminPage() {
    if (!state.adminAuth) {
      return shell(adminLoginPage(), 'admin');
    }

    let content = `
      <section class="section">
        ${sectionHeading('Админ-панель', 'Управление заказами, товарами и пользователями')}
        ${adminSectionButtons()}
      </section>
    `;

    if (state.adminSection === 'dashboard') content += `<section class="section">${adminDashboardSection()}</section>`;
    if (state.adminSection === 'orders') content += `<section class="section">${adminOrdersSection()}</section>`;
    if (state.adminSection === 'products') content += `<section class="section">${adminProductsSection()}</section>`;
    if (state.adminSection === 'users') content += `<section class="section">${adminUsersSection()}</section>`;
    content += `<section class="section">${adminSettingsSection()}</section>`;

    return shell(content, 'admin');
  }

  function bakerLoginPage() {
    return `
      <section class="auth-panel">
        <div class="auth-panel__hero">
          <p class="eyebrow">Рабочая зона</p>
          <h1>Вход в панель пекаря</h1>
          <p>Демо-доступ: <strong>baker / baker123</strong></p>
        </div>
        <div class="auth-panel__card">
          <form class="auth-form" data-form="baker-login-form">
            <label>
              <span>Логин</span>
              <input type="text" name="login" placeholder="baker" required>
            </label>
            <label>
              <span>Пароль</span>
              <input type="password" name="password" placeholder="baker123" required>
            </label>
            <button class="button button--primary button--wide" type="submit">Войти</button>
          </form>
        </div>
      </section>
    `;
  }

  function bakerPage() {
    if (!state.bakerAuth) {
      return shell(bakerLoginPage(), 'baker');
    }

    const orders = ordersForBaker();
    return shell(`
      <section class="section">
        ${sectionHeading('Панель пекаря', 'Заказы на выдачу и производство')}
        <form class="filters-row" data-form="baker-filters-form">
          <label>
            <span>Дата</span>
            <input type="date" name="bakerDate" value="${escapeHtml(state.bakerDate)}">
          </label>
        </form>
        <div class="stats-grid">
          ${statCard('Заказов на дату', String(orders.length), 'accent')}
          ${statCard('Готовятся', String(orders.filter((order) => order.status === 'cooking').length), 'warning')}
          ${statCard('Готовы', String(orders.filter((order) => order.status === 'ready').length), 'success')}
        </div>
        <div class="orders-list">
          ${orders.length ? orders.map((order) => orderCard(order, 'baker')).join('') : '<p class="empty-inline">На выбранную дату активных заказов нет.</p>'}
        </div>
      </section>
    `, 'baker');
  }

  function successPage() {
    const order = state.orders.find((item) => item.id === state.lastOrderId) || recentOrders(1)[0] || null;
    if (!order) {
      return shell(`
        <section class="empty-state">
          <h1>Заказ оформлен</h1>
          <p>Сейчас нет данных о последнем заказе.</p>
          <a class="button button--primary" href="menu.html">Вернуться в меню</a>
        </section>
      `, 'success');
    }

    return shell(`
      <section class="success-layout">
        <div class="success-card">
          <p class="eyebrow">Готово</p>
          <h1>Заказ оформлен</h1>
          <p>Номер заказа: <strong>${escapeHtml(order.id)}</strong></p>
          <p>Дата и время получения: <strong>${formatDate(order.pickupDate)} • ${escapeHtml(order.pickupTime)}</strong></p>
          <div class="summary-items">
            ${order.items.map((item) => `
              <div class="summary-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                <div>
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${item.qty} × ${formatCurrency(item.price)}</span>
                </div>
                <b>${formatCurrency(item.price * item.qty)}</b>
              </div>
            `).join('')}
          </div>
          <div class="summary-total">
            <span>Итого</span>
            <strong>${formatCurrency(order.total)}</strong>
          </div>
          <div class="hero__actions">
            <a class="button button--primary" href="menu.html">Вернуться в меню</a>
            <a class="button button--ghost" href="account.html">Открыть кабинет</a>
          </div>
        </div>
      </section>
    `, 'success');
  }

  function renderPage() {
    setTitle(page);
    setBodyMode(page);

    const render = {
      home: homePage,
      menu: menuPage,
      contacts: contactsPage,
      cart: cartPage,
      checkout: checkoutPage,
      account: accountPage,
      admin: adminPage,
      baker: bakerPage,
      success: successPage
    }[page] || homePage;

    if (appRoot) appRoot.innerHTML = render();
  }

  function updateCart(productId, delta) {
    const item = cartItem(productId);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        state.cart = state.cart.filter((entry) => entry.productId !== productId);
      }
    } else if (delta > 0) {
      state.cart.push({ productId, qty: delta });
    }
  }

  function addToCart(productId, delta = 1) {
    const product = findProduct(productId);
    if (!product || !product.inStock) return;
    updateCart(productId, delta);
    saveState();
    renderPage();
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.productId !== productId);
    saveState();
    renderPage();
  }

  function setCategory(category) {
    state.menuCategory = category;
    saveState();
    renderPage();
  }

  function setAdminSection(section) {
    state.adminSection = section;
    saveState();
    renderPage();
  }

  function setAdminFilters(date, status) {
    state.adminDate = date || state.adminDate;
    state.adminStatus = status || state.adminStatus;
    saveState();
    renderPage();
  }

  function setBakerDate(date) {
    state.bakerDate = date || state.bakerDate;
    saveState();
    renderPage();
  }

  function updateOrderStatus(orderId, nextStatus) {
    const order = state.orders.find((entry) => entry.id === orderId);
    if (!order || !ORDER_STATUS[nextStatus]) return;
    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    saveState();
    renderPage();
  }

  function toggleUserBlock(userId) {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    user.blocked = !user.blocked;
    saveState();
    renderPage();
  }

  function toggleProductStock(productId) {
    const product = findProduct(productId);
    if (!product) return;
    product.inStock = !product.inStock;
    saveState();
    renderPage();
  }

  function createProduct(form) {
    const data = new FormData(form);
    const name = safe(data.get('name')).trim();
    if (!name) return;

    const category = safe(data.get('category')).trim();
    const price = Number(data.get('price')) || 0;
    const icon = safe(data.get('icon')).trim() || '🥐';
    const subtitle = safe(data.get('subtitle')).trim() || 'Новинка';
    const description = safe(data.get('description')).trim() || subtitle;
    const product = {
      id: generateId('PROD'),
      name,
      category,
      price,
      subtitle,
      description,
      icon,
      image: makeImage(name, subtitle, icon, '#F6E0C3', '#D4894B'),
      popular: false,
      inStock: true
    };
    state.products.unshift(product);
    form.reset();
    saveState();
    renderPage();
  }

  function saveSettings(form) {
    const data = new FormData(form);
    state.settings = {
      cafeName: safe(data.get('cafeName')).trim() || DEFAULT_SETTINGS.cafeName,
      address: safe(data.get('address')).trim() || DEFAULT_SETTINGS.address,
      hours: safe(data.get('hours')).trim() || DEFAULT_SETTINGS.hours,
      contactPhone: formatPhone(data.get('contactPhone')),
      vkBotLink: safe(data.get('vkBotLink')).trim() || DEFAULT_SETTINGS.vkBotLink,
      vkBotHint: safe(data.get('vkBotHint')).trim() || DEFAULT_SETTINGS.vkBotHint,
      description: safe(data.get('description')).trim() || DEFAULT_SETTINGS.description,
      vkBotName: DEFAULT_SETTINGS.vkBotName
    };
    saveState();
    renderPage();
  }

  function loginAccount(form) {
    const data = new FormData(form);
    const phone = safe(data.get('phone')).trim();
    if (!phone) return;
    const name = safe(data.get('name')).trim();
    const user = ensureUser(name, phone);
    state.currentUserId = user.id;
    user.phone = formatPhone(phone);
    if (name) user.name = name;
    saveState();
    renderPage();
  }

  function loginAdmin(form) {
    const data = new FormData(form);
    const login = safe(data.get('login')).trim();
    const password = safe(data.get('password')).trim();
    if (login === DEMO_CREDENTIALS.admin.login && password === DEMO_CREDENTIALS.admin.password) {
      state.adminAuth = true;
      saveState();
      renderPage();
    }
  }

  function loginBaker(form) {
    const data = new FormData(form);
    const login = safe(data.get('login')).trim();
    const password = safe(data.get('password')).trim();
    if (login === DEMO_CREDENTIALS.baker.login && password === DEMO_CREDENTIALS.baker.password) {
      state.bakerAuth = true;
      saveState();
      renderPage();
    }
  }

  function submitCheckout(form) {
    const items = cartDetailed();
    if (!items.length) return;

    const data = new FormData(form);
    const phone = safe(data.get('customerPhone')).trim();
    const name = safe(data.get('customerName')).trim() || 'Покупатель';
    const user = ensureUser(name, phone);
    state.currentUserId = user.id;
    user.name = name;
    user.phone = formatPhone(phone);

    const order = {
      id: generateId('ORD'),
      userId: user.id,
      userName: user.name,
      phone: user.phone,
      items: items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        qty: item.qty,
        image: item.product.image
      })),
      pickupDate: safe(data.get('pickupDate')),
      pickupTime: safe(data.get('pickupTime')),
      comment: safe(data.get('comment')).trim(),
      status: 'new',
      payment: 'cash',
      source: 'web',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: cartTotal()
    };

    state.orders.unshift(normalizeOrder(order));
    state.lastOrderId = order.id;
    state.cart = [];
    if (data.get('vkNotify')) state.settings.vkBotHint = 'Пользователь согласился получать уведомления в VK';
    syncUsersWithOrders();
    saveState();
    window.location.href = 'success.html';
  }

  function logoutUser() {
    state.currentUserId = null;
    saveState();
    renderPage();
  }

  function logoutAdmin() {
    state.adminAuth = false;
    saveState();
    renderPage();
  }

  function logoutBaker() {
    state.bakerAuth = false;
    saveState();
    renderPage();
  }

  function actionFromButton(action, target) {
    switch (action) {
      case 'toggle-nav':
        state.navOpen = !state.navOpen;
        renderPage();
        break;
      case 'add-to-cart':
        addToCart(target.dataset.productId, 1);
        break;
      case 'increase-qty':
        addToCart(target.dataset.productId, 1);
        break;
      case 'decrease-qty':
        updateCart(target.dataset.productId, -1);
        saveState();
        renderPage();
        break;
      case 'remove-from-cart':
        removeFromCart(target.dataset.productId);
        break;
      case 'set-category':
        setCategory(target.dataset.category || 'Все');
        break;
      case 'set-admin-section':
        setAdminSection(target.dataset.section || 'dashboard');
        break;
      case 'update-order-status':
        updateOrderStatus(target.dataset.orderId, target.dataset.nextStatus);
        break;
      case 'toggle-user-block':
        toggleUserBlock(target.dataset.userId);
        break;
      case 'toggle-product-stock':
        toggleProductStock(target.dataset.productId);
        break;
      case 'logout-user':
        logoutUser();
        break;
      case 'logout-admin':
        logoutAdmin();
        break;
      case 'logout-baker':
        logoutBaker();
        break;
      default:
        break;
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (!action) return;
      event.preventDefault();
      actionFromButton(action, target);
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();

      if (form.matches('[data-form="checkout-form"]')) submitCheckout(form);
      if (form.matches('[data-form="account-login-form"]')) loginAccount(form);
      if (form.matches('[data-form="admin-login-form"]')) loginAdmin(form);
      if (form.matches('[data-form="baker-login-form"]')) loginBaker(form);
      if (form.matches('[data-form="product-create-form"]')) createProduct(form);
      if (form.matches('[data-form="settings-form"]')) saveSettings(form);
      if (form.matches('[data-form="admin-filters-form"]')) {
        const data = new FormData(form);
        setAdminFilters(safe(data.get('adminDate')).trim(), safe(data.get('adminStatus')).trim());
      }
      if (form.matches('[data-form="baker-filters-form"]')) {
        const data = new FormData(form);
        setBakerDate(safe(data.get('bakerDate')).trim());
      }
    });

    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (target.matches('input[name="adminDate"]') || target.matches('select[name="adminStatus"]')) {
        const form = target.closest('form');
        if (form) {
          const data = new FormData(form);
          setAdminFilters(safe(data.get('adminDate')).trim(), safe(data.get('adminStatus')).trim());
        }
      }
      if (target.matches('input[name="bakerDate"]')) {
        setBakerDate(target.value);
      }
    });
  }

  function initPhoneFormatting() {
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.hasAttribute('data-phone-input')) return;
      const cursorAtEnd = target.selectionStart === target.value.length;
      target.value = formatPhone(target.value);
      if (cursorAtEnd) {
        const len = target.value.length;
        target.setSelectionRange(len, len);
      }
    });
  }

  function init() {
    normalizeData();
    renderPage();
    bindEvents();
    initPhoneFormatting();
  }

  init();
})();
