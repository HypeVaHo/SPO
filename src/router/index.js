import { createRouter, createWebHistory } from 'vue-router'

import HomePage from '../pages/HomePage.vue'
import MenuPage from '../pages/MenuPage.vue'
import CartPage from '../pages/CartPage.vue'
import CheckoutPage from '../pages/CheckoutPage.vue'
import AdminPage from '../pages/AdminPage.vue'
import ContactsPage from '../pages/ContactsPage.vue'
import AccountPage from '../pages/AccountPage.vue'
import BakerPage from '../pages/BakerPage.vue'
import SuccessPage from '../pages/SuccessPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/menu', name: 'menu', component: MenuPage },
    { path: '/cart', name: 'cart', component: CartPage },
    { path: '/checkout', name: 'checkout', component: CheckoutPage },
    { path: '/contacts', name: 'contacts', component: ContactsPage },
    { path: '/account', name: 'account', component: AccountPage },
    { path: '/admin', name: 'admin', component: AdminPage },
    { path: '/baker', name: 'baker', component: BakerPage },
    { path: '/success', name: 'success', component: SuccessPage }
  ]
})
