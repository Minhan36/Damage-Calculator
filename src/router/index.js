import { createRouter, createWebHistory } from 'vue-router'

// Example pages
import DmgCalculatorView from '../views/DmgCalculator.vue'

const routes = [
  { path: '/', 
    name: 'DmgCalculator', 
    component: DmgCalculatorView 
},
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
