import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'

const SESSIONS_DIR = 'game-sessions'
const isDevScript = process.env.npm_lifecycle_event === 'dev'
const enableRetryControl = isDevScript && process.env.npm_config_r === 'true'
const enableSkipControl =
  isDevScript && process.env.npm_config_loglevel === 'silent'

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
}

async function readJsonBody(request: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_ENABLE_GAME_RETRY':
      JSON.stringify(enableRetryControl),
    'import.meta.env.VITE_ENABLE_GAME_SKIP':
      JSON.stringify(enableSkipControl),
  },
  plugins: [
    react(),
    {
      name: 'game-session-writer',
      configureServer(server) {
        server.middlewares.use('/api/game-session', async (request, response) => {
          if (request.method !== 'POST') {
            response.statusCode = 405
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          try {
            const payload = await readJsonBody(request)
            const sessionId =
              typeof payload === 'object' &&
              payload !== null &&
              'sessionId' in payload &&
              typeof payload.sessionId === 'string'
                ? payload.sessionId
                : null

            if (!sessionId) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify({ error: 'sessionId is required' }))
              return
            }

            const sessionsDir = path.resolve(server.config.root, SESSIONS_DIR)
            await fs.mkdir(sessionsDir, { recursive: true })
            await fs.writeFile(
              path.join(sessionsDir, `${sanitizeFileName(sessionId)}.json`),
              `${JSON.stringify(payload, null, 2)}\n`,
              'utf8',
            )

            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ ok: true }))
          } catch (error) {
            server.config.logger.error(
              `Failed to save game session: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
            response.statusCode = 500
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'Failed to save game session' }))
          }
        })
      },
    },
  ],
})
