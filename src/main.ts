import './game/storageGuard'
import { registerSW } from 'virtual:pwa-register'
import { createApp } from 'vue'
import App from './App.vue'
import { createUpdateState } from './pwa/updateState'
import './style.css'

// Service worker en production seulement, et si le navigateur le prend en charge.
const updates = createUpdateState(import.meta.env.PROD && 'serviceWorker' in navigator ? registerSW : undefined)

createApp(App, { updates }).mount('#app')
