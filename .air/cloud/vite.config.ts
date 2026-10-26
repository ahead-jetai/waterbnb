// Air cloud overlay for the Vite dev/preview server.
// Used only by .air/cloud/startup.sh (`vite --config .air/cloud/vite.config.ts`).
// The app is reached through Air's HTTPS proxy, which forwards its own public
// hostname as the Host header, so the server must listen on all interfaces and
// accept any host. Local development keeps using the root vite.config.ts.
import { mergeConfig, type UserConfig } from 'vite'
import baseConfig from '../../vite.config'

const port = Number(process.env.AIR_DEV_PORT ?? 5173)
const exposedUrl = process.env[`JBCENTRAL_EXPOSED_PORT_URL_${port}`]

// When the proxy URL is known, point the HMR websocket at the HTTPS origin the
// browser actually uses instead of ws://<host>:5173.
const hmr = exposedUrl ? { protocol: 'wss', clientPort: 443 } : undefined

const overlay: UserConfig = {
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts: true,
    ...(hmr ? { hmr } : {}),
  },
  preview: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts: true,
  },
}

export default mergeConfig(baseConfig, overlay)
