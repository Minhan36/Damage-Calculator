import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { inject } from '@vercel/analytics';
import router from './router'  

const app = createApp(App)
app.use(router)                
app.mount('#app')
inject(); 
