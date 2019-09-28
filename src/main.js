import Vue from 'vue'
import './plugins/fontawesome'
import App from './App.vue'
import { VueHammer } from 'vue2-hammer'
import vuetify from './plugins/vuetify'
import Store from './Store'

Vue.use(VueHammer)
Vue.config.productionTip = false
Vue.use(Store)

new Vue({
  vuetify,
  render: h => h(App),
}).$mount('#app')
