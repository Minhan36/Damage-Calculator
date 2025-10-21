import { createRouter, createWebHistory } from 'vue-router'

// Example pages
import DmgCalculatorView from '../views/DmgCalculator.vue'
import CreatureLoadouts from '../views/CreatureLoadouts.vue'
import TypeChart from '../views/TypeChart.vue'

const routes = [
  { path: '/', 
    name: 'DmgCalculator', 
    component: DmgCalculatorView 
},
{
  path: '/loadouts',
  name: 'CreatureLoadouts',
  component: CreatureLoadouts
},
{
  path: '/type-chart',
  name: 'TypeChart',
  component: TypeChart
},
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
