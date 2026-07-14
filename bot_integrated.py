#!/usr/bin/env python3
"""TikTok View Bot — pushes real-time stats to dashboard API"""
import asyncio,aiohttp,random,re,time,os,hashlib,sys
from urllib.parse import urlencode

DASHBOARD_URL=os.environ.get('DASHBOARD_URL','http://localhost:3001/api/stats')
TARGET_URL=os.environ.get('TARGET_URL','')
VIEWS_PER_MIN=int(os.environ.get('VIEWS_PER_MIN','200'))
THREADS=int(os.environ.get('THREADS','100'))

VIEW_ENDPOINTS=['https://api16-core-c-alisg.tiktokv.com/aweme/v1/aweme/stats/','https://api16-core-c-useast1a.tiktokv.com/aweme/v1/aweme/stats/','https://api16-core-c.tiktokv.com/aweme/v1/aweme/stats/','https://api16-va.tiktokv.com/aweme/v1/aweme/stats/','https://api16-va-alisg.tiktokv.com/aweme/v1/aweme/stats/','https://api16-core.tiktokv.com/aweme/v1/aweme/stats/']
BRANDS=['Google','Samsung','Xiaomi','Oppo','OnePlus','Realme','Vivo','Huawei','Honor','Motorola','Nokia','Sony','Asus','Tecno','Infinix','Redmi','Poco','Lenovo']
REGIONS=['ID','VN','US','SG','MY','TH','PH','TW','JP','KR','GB','DE','FR','ES','BR']
LANGS=['id','en','zh','th','vi','ms','ja','ko']

class Stats: success=0;failed=0;running=False;start_time=0
stats=Stats()

def gen_device():
    b=random.choice(BRANDS);v=random.choice(['11','12','13']);a={'11':30,'12':31,'13':33}[v]
    return{'brand':b,'model':f'{b} Phone','version':v,'api':a,'device_id':random.randint(600000000000000,999999999999999),'iid':random.randint(7000000000000000000,7999999999999999999),'region':random.choice(REGIONS),'lang':random.choice(LANGS)}

def gen_sig(p):
    ts=int(time.time());s=hashlib.md5(f'{p}{ts}'.encode()).hexdigest()[:16]
    return{'X-Gorgon':f'840280416000{s}','X-Khronos':str(ts)}

def extract_id(url):
    m=re.search(r'/video/(\d+)',url)
    if m:return m.group(1)
    m=re.search(r'(\d{19})',url);return m.group(1)if m else None

async def send_view(s,v_id):
    d=gen_device();ep=random.choice(VIEW_ENDPOINTS)
    ps=f"channel=googleplay&aid=1233&version_code=400304&device_id={d['device_id']}&iid={d['iid']}&os_api={d['api']}&os_version={d['version']}&device_brand={d['brand']}&device_type=Phone&app_language={d['lang']}&region={d['region']}&tz_name=Asia%2FJakarta"
    sig=gen_sig(ps);data={'item_id':v_id,'play_delta':random.choice([1,1,1,2]),'play_time':random.randint(8,60)}
    try:
        async with s.post(f'{ep}?{ps}',data=urlencode(data),headers={**sig,'Content-Type':'application/x-www-form-urlencoded','User-Agent':'com.ss.android.ugc.trill/400304'},ssl=False,timeout=aiohttp.ClientTimeout(total=5))as r:
            if r.status==200:stats.success+=1;return True
            stats.failed+=1;return False
    except:stats.failed+=1;return False

async def worker(s,v_id,delay):
    while stats.running:
        await send_view(s,v_id);await asyncio.sleep(delay+random.uniform(0,delay*.5))

async def push_stats(s):
    while stats.running:
        try:
            e=time.time()-stats.start_time;sp=stats.success/e*60 if e>0 else 0
            p={'success':stats.success,'failed':stats.failed,'speed':round(sp,1),'running':stats.running,'startTime':stats.start_time*1000,'url':TARGET_URL}
            async with s.post(DASHBOARD_URL,json=p,timeout=aiohttp.ClientTimeout(total=3))as r:pass
        except:pass
        await asyncio.sleep(1)

async def main():
    global TARGET_URL
    print('\n'+'='*55);print('  TIKTOK VIEW BOT + Dashboard');print('='*55)
    if not TARGET_URL:TARGET_URL=input('\nTikTok URL: ').strip()
    v_id=extract_id(TARGET_URL)
    if not v_id:print('Invalid URL!');return
    print(f'Video ID: {v_id} | Speed: {VIEWS_PER_MIN}/min | Threads: {THREADS}')
    c=input('\nStart? [Y/n]: ').strip().lower()
    if c and c!='y':return
    stats.running=True;stats.start_time=time.time()
    delay=max(60.0/VIEWS_PER_MIN*THREADS/100,0.01)
    to=aiohttp.ClientTimeout(total=8,connect=2);cn=aiohttp.TCPConnector(limit=1000,ttl_dns_cache=300)
    async with aiohttp.ClientSession(timeout=to,connector=cn)as s:
        pu=asyncio.create_task(push_stats(s))
        ws=[asyncio.create_task(worker(s,v_id,delay))for _ in range(THREADS)]
        print(f'\nRunning {THREADS} workers... Ctrl+C to stop\n')
        try:
            last=0
            while stats.running:
                await asyncio.sleep(2);n=time.time();e=n-stats.start_time
                cur=(stats.success-last)/2*60;last=stats.success
                t=stats.success+stats.failed;rate=(stats.success/t*100)if t else 0
                print(f'\r {stats.success:,} views | {cur:.0f}/min | {rate:.1f}% | {e:.0f}s',end='',flush=True)
        except KeyboardInterrupt:pass
        stats.running=False
        for w in ws:w.cancel()
        pu.cancel();await asyncio.gather(*ws,pu,return_exceptions=True)
    try:
        async with aiohttp.ClientSession()as s:
            p={'success':stats.success,'failed':stats.failed,'speed':0,'running':False,'startTime':stats.start_time*1000,'url':TARGET_URL}
            await s.post(DASHBOARD_URL,json=p)
    except:pass
    e=time.time()-stats.start_time
    print(f'\n\nFinal: {stats.success:,} views in {e:.0f}s ({stats.success/e*60:.0f}/min)\n')

if __name__=='__main__':
    try:asyncio.run(main())
    except KeyboardInterrupt:print('\nDone!')
