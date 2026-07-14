// Vercel serverless — sends TikTok views within 8s budget
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

function r(n) { return Math.floor(Math.random() * n) }
function pick(a) { return a[r(a.length)] }
function md5(s) {
  const crypto = require('crypto')
  return crypto.createHash('md5').update(s).digest('hex')
}

function genDevice() {
  const b = pick(BRANDS), v = pick(['11','12','13']), a = {'11':30,'12':31,'13':33}[v]
  return { brand:b, model:b+' Phone', version:v, api:a, did:600000000000000+r(400000000000000), iid:7000000000000000000+r(1000000000000000000), region:pick(REGIONS), lang:pick(LANGS) }
}

function genSig(paramsStr) {
  const ts = Math.floor(Date.now()/1000)
  return { 'X-Gorgon': '840280416000'+md5(paramsStr+ts).slice(0,16), 'X-Khronos': String(ts) }
}

function extractId(url) {
  let m = url.match(/\/video\/(\d+)/)
  if (m) return m[1]
  m = url.match(/(\d{19})/)
  return m ? m[1] : null
}

async function sendView(videoId) {
  const d = genDevice()
  const ep = pick(ENDPOINTS)
  const ps = `channel=googleplay&aid=1233&version_code=400304&device_id=${d.did}&iid=${d.iid}&os_api=${d.api}&os_version=${d.version}&device_brand=${d.brand}&device_type=Phone&app_language=${d.lang}&region=${d.region}&tz_name=Asia%2FJakarta`
  const sig = genSig(ps)
  const body = new URLSearchParams({ item_id: videoId, play_delta: String(pick([1,1,1,2])), play_time: String(8+r(52)) })
  try {
    const r = await fetch(ep+'?'+ps, {
      method:'POST', headers:{...sig,'Content-Type':'application/x-www-form-urlencoded','User-Agent':'com.ss.android.ugc.trill/400304'}, body
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

  const { videoId } = req.body || {}
  if (!videoId) return res.status(400).json({ error: 'videoId required' })

  const budget = 8000, start = Date.now()
  let success = 0, failed = 0

  // Send as many views as possible in 8s budget
  const tasks = []
  for (let i = 0; i < 50; i++) {
    tasks.push((async () => {
      while (Date.now() - start < budget) {
        const ok = await sendView(videoId)
        if (ok) success++; else failed++
      }
    })())
  }
  await Promise.all(tasks)

  return res.json({ success, failed, total: success+failed, elapsed: Date.now()-start })
}
