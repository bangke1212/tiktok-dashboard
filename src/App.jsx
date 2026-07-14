import { useState, useEffect, useRef, useCallback } from "react"
import { Zap, TrendingUp, Eye, CheckCircle, XCircle, Activity, Clock, Target, BarChart3, Gauge, Settings, Wifi, WifiOff, Play, Square, RefreshCw, Trash2, Send } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const API = "/api/stats"
const RUN = "/api/run"

function useStats() {
  const [s, setS] = useState({ success: 0, failed: 0, total: 0, speed: 0, running: false, history: [], url: "", videoId: "", startTime: null, viewsPerRun: 100 })
  useEffect(() => { const p = async () => { try { const r = await fetch(API); if (r.ok) setS(await r.json()) } catch {} }; p(); const t = setInterval(p, 1500); return () => clearInterval(t) }, [])
  return [s, setS]
}

function Card({ icon: I, label, val, suf, color, bg, lg }) {
  return <div className={"glass rounded-2xl p-4 sm:p-5 glass-hover animate-slide-in "+(lg?"col-span-2":"")}>
    <div className="flex items-center gap-2 mb-2"><div className={"w-8 h-8 rounded-lg flex items-center justify-center "+bg}><I size={16} className={color}/></div><span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span></div>
    <div className={(lg?"text-4xl sm:text-5xl":"text-2xl sm:text-3xl")+" font-black tracking-tighter "+color+" tabular-nums animate-count-up"}>{typeof val==="number"?val.toLocaleString():val}{suf&&<span className="text-sm text-slate-500 ml-1 font-medium">{suf}</span>}</div>
  </div>
}

function SpeedGauge({ speed, running }) {
  const p = Math.min((speed/200)*100,100)
  const c = speed>80?"text-emerald-400":speed>30?"text-amber-400":"text-slate-400"
  const bc = speed>80?"from-emerald-500 to-emerald-400":speed>30?"from-amber-500 to-amber-400":"from-slate-500 to-slate-400"
  return <div className="glass rounded-2xl p-4 sm:p-5 animate-slide-in">
    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Gauge size={16} className="text-cyan-400"/></div><span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Speed</span>{running&&<span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>LIVE</span>}</div>
    <div className={"text-3xl sm:text-4xl font-black "+c+" tabular-nums"}>{running?speed.toFixed(0):"--"}<span className="text-sm text-slate-500 ml-1 font-medium">/min</span></div>
    <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden"><div className={"h-full bg-gradient-to-r "+bc+" rounded-full transition-all duration-700 animate-bar-glow"} style={{width:p+"%"}}/></div>
  </div>
}

function Chart({ history }) {
  if (!history?.length) return <div className="glass rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center h-64 text-slate-600"><BarChart3 size={40}/><p className="text-sm mt-2">Waiting for data...</p></div>
  return <div className="glass rounded-2xl p-4 sm:p-5 animate-slide-in">
    <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center"><Activity size={16} className="text-violet-400"/></div><span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Views History</span><span className="ml-auto text-[10px] text-slate-600">{history.length} pts</span></div>
    <ResponsiveContainer width="100%" height={200}><AreaChart data={history}><defs><linearGradient id="cv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00c8ff" stopOpacity={0.3}/><stop offset="100%" stopColor="#00c8ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="time" tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#1a1a2e",border:"1px solid #334155",borderRadius:12,fontSize:12,color:"#e2e8f0"}}/><Area type="monotone" dataKey="total" stroke="#00c8ff" strokeWidth={2} fill="url(#cv)" dot={false}/></AreaChart></ResponsiveContainer>
  </div>
}

function extractVideoId(url) {
  // Pure numeric ID
  let m = url.match(/^\s*(\d{15,20})\s*$/); if (m) return m[1]
  // /video/ID
  m = url.match(/\/video[\/]?(\d{15,20})/); if (m) return m[1]
  // /v/ID (short)
  m = url.match(/\/v[\/]?(\d{15,20})/); if (m) return m[1]
  // /photo/ID
  m = url.match(/\/photo[\/]?(\d{15,20})/); if (m) return m[1]
  // Any 15-20 digit number
  m = url.match(/(\d{15,20})/); return m ? m[1] : null
}

export default function App() {
  const [s] = useStats()
  const [logs, setLogs] = useState([])
  const [cfgUrl, setCfgUrl] = useState("")
  const [cfgSpeed, setCfgSpeed] = useState(100)
  const [cfgThreads, setCfgThreads] = useState(50)
  const [localRunning, setLocalRunning] = useState(false)
  const [sendCount, setSendCount] = useState(0)
  const timerRef = useRef(null)
  const statsRef = useRef(s)
  statsRef.current = s

  // Start the bot from browser
  const startBot = useCallback(async () => {
    if (!cfgUrl.trim()) { alert("Please enter a TikTok URL!"); return }
    
    setLocalRunning(true)
    setSendCount(0)
    
    // Try local extraction, but server will resolve if needed
    const vid = extractVideoId(cfgUrl)
    
    // Tell API we're starting (server resolves short links)
    await fetch(API, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"start", url:cfgUrl, videoId:vid||"", viewsPerRun:cfgThreads }) })
    
    // Add start log
    const t = new Date().toLocaleTimeString("en-US",{hour12:false})
    setLogs(l=>[{time:t,msg:"Bot started — "+cfgUrl.slice(0,50)+"...",tp:"s"},...l].slice(0,100))
    
    // Loop: call /api/run every 3s (server handles URL resolution)
    let count = 0
    const runLoop = async () => {
      try {
        const payload = vid ? { videoId:vid } : { url:cfgUrl }
        const r = await fetch(RUN, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
        const d = await r.json()
        
        if (d.error) { 
          const t2 = new Date().toLocaleTimeString("en-US",{hour12:false})
          setLogs(l=>[{time:t2,msg:"Error: "+d.error, tp:"e"},...l].slice(0,100))
          if (d.error.includes("video ID")) { stopBot(); return }
          return 
        }
        
        count++
        setSendCount(count)
        
        // Update stats in API
        const cur = statsRef.current
        await fetch(API, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ success:cur.success+d.success, failed:cur.failed+d.failed, speed:d.total/(d.elapsed/1000)*60, running:true }) })
        
        // Log every 5 runs
        if (count % 5 === 0) {
          const t2 = new Date().toLocaleTimeString("en-US",{hour12:false})
          setLogs(l=>[{time:t2,msg:"+"+(cur.success+d.success).toLocaleString()+" total views",tp:"s"},...l].slice(0,100))
        }
      } catch (e) {
        const t2 = new Date().toLocaleTimeString("en-US",{hour12:false})
        setLogs(l=>[{time:t2,msg:"Network error: "+e.message, tp:"e"},...l].slice(0,100))
      }
    }
    
    runLoop()
    timerRef.current = setInterval(runLoop, 3000)
  }, [cfgUrl, cfgThreads, stopBot])
  
  // Stop the bot
  const stopBot = useCallback(async () => {
    setLocalRunning(false)
    clearInterval(timerRef.current)
    timerRef.current = null
    
    await fetch(API, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"stop" }) })
    const t = new Date().toLocaleTimeString("en-US",{hour12:false})
    setLogs(l=>[{time:t,msg:"Bot stopped — "+s.total.toLocaleString()+" total views",tp:"s"},...l].slice(0,100))
  }, [s.total])
  
  // Reset stats
  const resetStats = async () => {
    await fetch(API, { method:"DELETE" })
    setLogs([])
    setSendCount(0)
  }
  
  // Cleanup on unmount
  useEffect(() => () => { clearInterval(timerRef.current) }, [])
  
  // Auto-stop when API says running=false (in case bot is stopped externally)
  useEffect(() => {
    if (localRunning && !s.running) {
      setLocalRunning(false)
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [s.running, localRunning])
  
  const tot = s.success + s.failed
  const el = s.startTime ? Math.floor((Date.now()-s.startTime)/1000) : 0
  const es = el>3600?Math.floor(el/3600)+"h "+Math.floor((el%3600)/60)+"m":el>60?Math.floor(el/60)+"m "+el%60+"s":el+"s"
  
  return <div className="min-h-screen bg-[#0a0a0f] text-white">
    <div className="fixed inset-0 pointer-events-none"><div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-[120px]"/><div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/3 rounded-full blur-[100px]"/></div>
    
    <header className="relative z-10 border-b border-slate-800/50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"><Zap size={20} className="text-white"/></div>
          <div><h1 className="text-lg font-bold tracking-tight">TikTok View Bot</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest">Real-time Dashboard</p></div>
        </div>
        <div className="flex items-center gap-3">
          {localRunning
            ? <span className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-pulse"><span className="w-2 h-2 rounded-full bg-emerald-400"/>Running</span>
            : <span className="flex items-center gap-2 text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700"><span className="w-2 h-2 rounded-full bg-slate-600"/>Idle</span>}
          {s.url&&<span className="hidden sm:block text-xs text-slate-500 truncate max-w-[200px]">{s.url}</span>}
          <button onClick={resetStats} className="p-2 rounded-lg hover:bg-slate-800 transition-colors" title="Reset"><Trash2 size={16} className="text-slate-500"/></button>
        </div>
      </div>
    </header>
    
    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Control Panel */}
      <div className="glass rounded-2xl p-5 mb-6 animate-slide-in space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Settings size={16}/>Bot Control Panel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">TikTok Video URL</label>
            <input value={cfgUrl} onChange={e=>setCfgUrl(e.target.value)} disabled={localRunning}
              placeholder="https://www.tiktok.com/@user/video/1234567890123456789"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"/>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Workers</label>
            <select value={cfgThreads} onChange={e=>setCfgThreads(+e.target.value)} disabled={localRunning}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50">
              <option value={25}>25 - Slow</option><option value={50}>50 - Medium</option><option value={75}>75 - Fast</option><option value={100}>100 - Turbo</option>
            </select>
          </div>
          <div className="flex gap-2">
            {!localRunning ? (
              <button onClick={startBot} disabled={!cfgUrl}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm">
                <Play size={16}/>Start Bot
              </button>
            ) : (
              <button onClick={stopBot}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-red-500/20 text-sm animate-pulse">
                <Square size={16}/>Stop Bot
              </button>
            )}
          </div>
        </div>
        {localRunning && <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1.5"><Send size={12} className="text-cyan-400"/>{sendCount} batches sent</span>
          <span className="flex items-center gap-1.5"><RefreshCw size={12} className="text-cyan-400 animate-spin"/>Looping every 3s</span>
          <span className="text-slate-600">| Keep this tab open</span>
        </div>}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card icon={Eye} label="Total Views" val={s.total} color="text-cyan-400" bg="bg-cyan-500/10" lg/>
        <Card icon={CheckCircle} label="Success" val={s.success} color="text-emerald-400" bg="bg-emerald-500/10"/>
        <Card icon={XCircle} label="Failed" val={s.failed} color="text-red-400" bg="bg-red-500/10"/>
        <Card icon={TrendingUp} label="Rate" val={tot>0?(s.success/tot*100).toFixed(1):0} suf="%" color="text-violet-400" bg="bg-violet-500/10"/>
        <SpeedGauge speed={s.speed||0} running={localRunning}/>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 mb-6 text-xs text-slate-500">
        {el>0&&<span className="glass px-3 py-1.5 rounded-full flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/>{es}</span>}
        {s.startTime&&<span className="glass px-3 py-1.5 rounded-full flex items-center gap-1.5"><Target size={12} className="text-slate-400"/>Started {new Date(s.startTime).toLocaleTimeString()}</span>}
        <span className="glass px-3 py-1.5 rounded-full flex items-center gap-1.5">{localRunning?<Wifi size={12} className="text-emerald-400"/>:<WifiOff size={12} className="text-slate-600"/>}{localRunning?"Connected":"Disconnected"}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2"><Chart history={s.history||[]}/></div>
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-4 animate-slide-in">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><BarChart3 size={16} className="text-amber-400"/></div><span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Ratio</span></div>
          <div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-slate-400 flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-400"/>Success</span><span className="text-slate-300 font-semibold tabular-nums">{s.success.toLocaleString()} <span className="text-slate-600">({tot>0?(s.success/tot*100).toFixed(1):0}%)</span></span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700" style={{width:tot>0?(s.success/tot*100).toFixed(1)+"%":"0%"}}/></div></div>
          <div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-slate-400 flex items-center gap-1.5"><XCircle size={12} className="text-red-400"/>Failed</span><span className="text-slate-300 font-semibold tabular-nums">{s.failed.toLocaleString()} <span className="text-slate-600">({tot>0?(s.failed/tot*100).toFixed(1):0}%)</span></span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-700" style={{width:tot>0?(s.failed/tot*100).toFixed(1)+"%":"0%"}}/></div></div>
          <div className="pt-2 border-t border-slate-800"><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Avg/sec</span><span className="text-slate-300 font-semibold tabular-nums">{s.speed?(s.speed/60).toFixed(1):"--"}</span></div><div className="flex justify-between text-xs"><span className="text-slate-500">Est daily</span><span className="text-cyan-400 font-semibold tabular-nums">{s.speed?(s.speed*60*24).toLocaleString():"--"}</span></div></div>
        </div>
      </div>
      
      <div className="glass rounded-2xl p-4 sm:p-5 animate-slide-in">
        <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center"><Activity size={16} className="text-slate-400"/></div><span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Activity Log</span><span className="ml-auto text-[10px] text-slate-600">{logs.length} entries</span></div>
        <div className="max-h-64 overflow-y-auto space-y-0">{logs.length===0?<p className="text-center text-slate-600 py-8 text-sm">Enter URL and click Start Bot</p>:logs.map((l,i)=><div key={i} className="flex items-center gap-2 py-1.5 text-xs border-b border-slate-800/50 last:border-0 animate-slide-in"><span className="text-slate-600 font-mono shrink-0">{l.time}</span><span className={l.tp==="s"?"text-emerald-400":l.tp==="e"?"text-red-400":"text-slate-400"}>{l.tp==="s"?<CheckCircle size={12}/>:l.tp==="e"?<XCircle size={12}/>:<Activity size={12}/>}</span><span className="text-slate-300 truncate">{l.msg}</span></div>)}</div>
      </div>
    </main>
  </div>
}