import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import OverviewPage from './pages/OverviewPage.vue'
import PlantsPage from './pages/PlantsPage.vue'
import ManagePage from './pages/ManagePage.vue'
import AIGardenerPage from './pages/AIGardenerPage.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/overview' },
    { path: '/overview', name: 'overview', component: OverviewPage },
    { path: '/plants', name: 'plants', component: PlantsPage },
    { path: '/manage', name: 'manage', component: ManagePage },
    { path: '/ai', name: 'ai', component: AIGardenerPage },
  ],
})

createApp(App).use(router).mount('#app')
