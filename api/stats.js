export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  let store = global._tkStats || { success: 0, failed: 0, total: 0, speed: 0, running: false, url: '', videoId: '', startTime: null, history: [], lastUpdate: 0, viewsPerRun: 100 }

  if (req.method === 'GET') return res.json(store)

  if (req.method === 'POST') {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (typeof b.success === 'number') store.success = b.success
    if (typeof b.failed === 'number') store.failed = b.failed
    store.total = store.success + store.failed
    if (typeof b.speed === 'number') store.speed = b.speed
    if (typeof b.running === 'boolean') store.running = b.running
    if (b.url) store.url = b.url
    if (b.videoId) store.videoId = b.videoId
    if (b.startTime) store.startTime = b.startTime
    if (b.viewsPerRun) store.viewsPerRun = b.viewsPerRun
    // Start command
    if (b.action === 'start') {
      store.running = true
      store.url = b.url || store.url
      store.videoId = b.videoId || store.videoId
      store.startTime = Date.now()
      store.viewsPerRun = b.viewsPerRun || 100
    }
    // Stop command
    if (b.action === 'stop') {
      store.running = false
    }
    // Reset
    if (b.action === 'reset') {
      store.success = 0; store.failed = 0; store.total = 0; store.speed = 0
      store.history = []; store.startTime = null; store.lastUpdate = 0
    }
    store.history.push({ time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), total: store.total, speed: store.speed, success: store.success, failed: store.failed })
    if (store.history.length > 120) store.history = store.history.slice(-120)
    store.lastUpdate = Date.now()
    global._tkStats = store
    return res.json({ ok: true, stored: store.total })
  }

  if (req.method === 'DELETE') { store = { success: 0, failed: 0, total: 0, speed: 0, running: false, url: '', videoId: '', startTime: null, history: [], lastUpdate: 0, viewsPerRun: 100 }; global._tkStats = store; return res.json({ ok: true }) }
  return res.status(405).json({ error: 'Method not allowed' })
}
