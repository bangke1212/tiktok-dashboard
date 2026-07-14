// Vercel serverless — TikTok view sender (ESM)
import { createHash } from 'crypto'

const ENDPOINTS = [
  'https://api16-core-c-alisg.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-core-c-useast1a.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-core-c.tiktokv.com/aweme/v1/aweme/stats/',
  'https://api16-va.tiktokv.com/aweme/v1/aweme/stats/',
]
const BRANDS = ['Google','Samsung','Xiaomi','Oppo','OnePlus','Realme','Vivo','Huawei','Honor','Motorola','Nokia','Sony','Asus','Tecno','Infinix','Redmi','Poco','Lenovo']
const REGIONS = ['ID','VN','US','SG','MY','TH','PH','TW','JP','KR']
const LANGS = ['id','en','zh','th','vi','ms','ja','ko']

const r = (n) => Math.floor(Math.random() * n)
const pick = (a) => a[r(a.length)]
const md5 = (s) => createHash('md5').update(s).digest('hex')

function genDevice() {
  const b = pick(BRANDS)
  const v = pick(['11','12','13'])
  const a = { '11': 30, '12': 31, '13': 33 }[v]
  return { brand: b, model: b + ' Phone', version: v, api: a, did: 600000000000000 + r(400000000000000), iid: 7000000000000000000 + r(1000000000000000000), region: pick(REGIONS), lang: pick(LANGS) }
}

function genSig(ps) {
  const ts = Math.floor(Date.now() / 1000)
  return { 'X-Gorgon': '840280416000' + md5(ps + ts).slice(0, 16), 'X-Khronos': String(ts) }
}

function extractId(url) {
  let m = url.match(/^\s*(\d{15,20})\s*$/)
  if (m) return m[1]
  m = url.match(/\/video[\/]?(\d{15,20})/)
  if (m) return m[1]
  m = url.match(/\/v[\/]?(\d{15,20})/)
  if (m) return m[1]
  m = url.match(/(\d{15,20})/)
  return m ? m[1] : null
}

async function resolveShort(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' })
    const loc = res.headers.get('location') || ''
    return extractId(loc)
  } catch { return null }
}

async function sendOne(videoId) {
  const d = genDevice()
  const ep = pick(ENDPOINTS)
  const ps = 'channel=googleplay&aid=1233&version_code=400304&device_id=' + d.did + '&iid=' + d.iid + '&os_api=' + d.api + '&os_version=' + d.version + '&device_brand=' + d.brand + '&device_type=Phone&app_language=' + d.lang + '&region=' + d.region + '&tz_name=Asia%2FJakarta'
  const sig = genSig(ps)
  const body = 'item_id=' + videoId + '&play_delta=' + pick([1,1,1,2]) + '&play_time=' + (8 + r(52))
  try {
    const res = await fetch(ep + '?' + ps, {
      method: 'POST',
      headers: { ...sig, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'com.ss.android.ugc.trill/400304' },
      body
    })
    return res.status === 200
  } catch { return false }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { videoId, url } = req.body || {}
    let vid = videoId
    if (!vid && url) { vid = extractId(url); if (!vid) vid = await resolveShort(url) }
    if (!vid) return res.status(400).json({ error: 'Could not extract video ID' })

    const budget = 7000, start = Date.now()
    let success = 0, failed = 0

    const workers = []
    for (let i = 0; i < 20; i++) {
      workers.push((async () => {
        while (Date.now() - start < budget) {
          const ok = await sendOne(vid)
          if (ok) success++; else failed++
        }
      })())
    }
    await Promise.all(workers)

    return res.status(200).json({ success, failed, total: success + failed, elapsed: Date.now() - start, videoId: vid })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
