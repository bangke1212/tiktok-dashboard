// Vercel serverless — TikTok view sender
const ENDPOINTS = [
  'https://api16-core-c-alisg.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-core-c-useast1a.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-core-c.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-va.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-va-alisg.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-core.tiktokv.com/aweme/v1/aweme/stats/',
]
const BRANDS = ['Google','Samsung','Xiaomi','Oppo','OnePlus','Realme','Vivo','Huawei','Honor','Motorola','Nokia','Sony','Asus','Tecno','Infinix','Redmi','Poco','Lenovo']
const REGIONS = ['ID','VN','US','SG','MY','TH','PH','TW','JP','KR','GB','DE','FR','ES','BR']
const LANGS = ['id','en','zh','th','vi','ms','ja','ko']
const { randomInt, createHash } = require('crypto')

function r(n) { return randomInt(n) }
function pick(a) { return a[r(a.length)] }
function md5(s) { return createHash('md5').update(s).digest('hex') }

function genDevice() {
  const b = pick(BRANDS), v = pick(['11','12','13']), a = {'11':30,'12':31,'13':33}[v]
  return { brand:b, model:b+' Phone', version:v, api:a, did:600000000000000+r(400000000000000), iid:7000000000000000000+r(1000000000000000000), region:pick(REGIONS), lang:pick(LANGS) }
}

function genSig(paramsStr) {
  const ts = Math.floor(Date.now()/1000)
  return { 'X-Gorgon': '840280416000'+md5(paramsStr+ts).slice(0,16), 'X-Khronos': String(ts) }
}

// Extract video ID from ANY TikTok/TikTok Lite URL format
function extractId(url) {
  // Direct ID match (19 digits)
  let m = url.match(/^\s*(\d{15,20})\s*$/)
  if (m) return m[1]
  
  // /video/ID pattern (standard & lite)
  m = url.match(/\/video[\/]?(\d{15,20})/)
  if (m) return m[1]
  
  // /v/ID short pattern
  m = url.match(/\/v[\/]?(\d{15,20})/)
  if (m) return m[1]
  
  // photo mode /photo/ID
  m = url.match(/\/photo[\/]?(\d{15,20})/)
  if (m) return m[1]
  
  // Any 15-20 digit number in URL
  m = url.match(/(\d{15,20})/)
  if (m) return m[1]
  
  // Short link? Follow redirect to get real URL
  return null
}

// Resolve short links (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/ etc)
async function resolveShortLink(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'manual' })
    const loc = r.headers.get('location') || ''
    // Extract ID from the redirect URL
    let m = loc.match(/\/video[\/]?(\d{15,20})/)
    if (m) return m[1]
    m = loc.match(/(\d{15,20})/)
    if (m) return m[1]
    return null
  } catch { return null }
}

async function sendView(videoId) {
  const d = genDevice()
  const ep = pick(ENDPOINTS)
  const ps = `channel=googleplay&aid=1233&version_code=400304&device_id=${d.did}&iid=${d.iid}&os_api=${d.api}&os_version=${d.version}&device_brand=${d.brand}&device_type=Phone&app_language=${d.lang}&region=${d.region}&tz_name=Asia%2FJakarta`
  const sig = genSig(ps)
  const body = new URLSearchParams({ item_id: videoId, play_delta: String(pick([1,1,1,2])), play_time: String(8+r(52)) })
  try {
    const r = await fetch(ep+'?'+ps, {
      method:'POST', headers:{...sig,'Content-Type':'application/x-www-form-urlencoded','User-Agent':'com.ss.android.ugc.trill/400304'}, body, signal: AbortSignal.timeout(3000)
    })
    return r.status === 200
  } catch { return false }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { videoId, url } = req.body || {}
  let vid = videoId
  
  // If URL provided (not just ID), extract ID from it
  if (!vid && url) {
    vid = extractId(url)
    // If still null, try resolving short link
    if (!vid) vid = await resolveShortLink(url)
  }
  
  if (!vid) return res.status(400).json({ error: 'Could not extract video ID from URL. Try pasting the full TikTok link.' })

  const budget = 8000, start = Date.now()
  let success = 0, failed = 0

  const tasks = []
  for (let i = 0; i < 50; i++) {
    tasks.push((async () => {
      while (Date.now() - start < budget) {
        const ok = await sendView(vid)
        if (ok) success++; else failed++
      }
    })())
  }
  await Promise.all(tasks)

  return res.json({ success, failed, total: success+failed, elapsed: Date.now()-start, videoId: vid })
}
