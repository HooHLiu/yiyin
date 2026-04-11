import App from './app.svelte'
import '../app.scss'

import '@ggchivalrous/db-ui/components/theme/index.css'

const app = new App({
  target: document.getElementById('app'),
})

export default app
