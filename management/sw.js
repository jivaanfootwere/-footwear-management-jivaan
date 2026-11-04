const CACHE='jivaan-footwear-v2';
const CORE=['./','./index.html','./manifest.webmanifest'];
const QR='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const url of CORE){try{await cache.add(url)}catch(e){}}
  try{const req=new Request(QR,{mode:'no-cors'});const res=await fetch(req);await cache.put(req,res)}catch(e){}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('jivaan-footwear-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);if(cached)return cached;
    try{const response=await fetch(event.request);const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy).catch(()=>{}));return response}
    catch(e){return (await caches.match('./index.html'))||Response.error()}
  })());
});