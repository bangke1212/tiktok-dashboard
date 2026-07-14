import express from 'express'
import { createServer } from 'http'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

let store = { success: 0, failed: 0, total: 0, speed: 0, running: false, url: '', startTime: null, history: [], lastUpdate: 0 }

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  next()
})

app.get('/api/stats', (_, res) => res.json(store))
app.post('/api/stats', (req, res) => {
  const { success, failed, speed, running, url, startTime } = req.body
  if (typeof success === 'number') store.success = success
  if (typeof failed === 'number') store.failed = failed
  store.total = store.success + store.failed
  if (typeof speed === 'number') store.speed = speed
  if (typeof running === 'boolean') store.running = running
  if (url) store.url = url
  if (startTime) store.startTime = startTime
  store.history.push({ time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), total: store.total, speed: store.speed, success: store.success, failed: store.failed })
  if (store.history.length > 60) store.history = store.history.slice(-60)
  store.lastUpdate = Date.now()
  res.json({ ok: true })
})

app.use(express.static(join(__dirname, 'dist')))
app.get('*', (_, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))

const PORT = process.env.PORT || 3001
createServer(app).listen(PORT, () => console.log('\nDashboard: http://localhost:' + PORT + '\nAPI: http://localhost:' + PORT + '/api/stats\n'))
