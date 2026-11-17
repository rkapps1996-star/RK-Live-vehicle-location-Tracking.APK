/* RK LIVE VEHICLE TRACKING — no-login, device-local tracking */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const USER_SCOPE = 'guest';
const STORE = `rk-live-vehicles-v5-${USER_SCOPE}`;
const GPS_MODE_KEY = `rk-live-gps-mode-v1-${USER_SCOPE}`;
const GPS_DEVICE_KEY = `rk-live-gps-device-v1-${USER_SCOPE}`;
const REPORTS_KEY = `rk-live-hourly-reports-v1-${USER_SCOPE}`;
const REPORT_INTERVAL_MS = 60 * 60 * 1000;
const SUPABASE_URL = 'https://olucoxvhiatgxtymaolg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TY0c2hjU5vpCHLpfPAbKXg_piEil8Hs';
let liveShareId = null;
let liveSyncBusy = false;
const LIVE_VIEWER_URL = 'https://livetrackingrk.netlify.app/viewer.html';

let hourlyReports = readReports();
let lastReportAt = Number(localStorage.getItem(REPORTS_KEY + '-last-report-at') || 0);
let vehicles = readVehicles();
let watchId = null;
let currentPosition = null;
let lastMapUrl = '';
let lastGeocodeAt = 0;

function readVehicles(){ try { const v=JSON.parse(localStorage.getItem(STORE)||'[]'); return Array.isArray(v)?v:[]; } catch { return []; } }
function saveVehicles(){ localStorage.setItem(STORE, JSON.stringify(vehicles)); }
function readReports(){try{const r=JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');return Array.isArray(r)?r:[];}catch{return [];}}
function saveReports(){localStorage.setItem(REPORTS_KEY,JSON.stringify(hourlyReports));}
function saveHourlyReport(manual=false){
  if(!currentPosition)return toast('ముందుగా GPS లొకేషన్ పొందండి.');
  const now=Date.now();
  if(!manual && lastReportAt && now-lastReportAt<REPORT_INTERVAL_MS)return;
  const c=currentPosition.coords;
  const vehicle=$('#trackingVehicle').selectedOptions[0]?.textContent||'నా వాహనం';
  hourlyReports.unshift({id:now,vehicle,time:new Date(currentPosition.timestamp||now).toISOString(),latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,mapUrl:`https://www.google.com/maps?q=${c.latitude},${c.longitude}`});
  hourlyReports=hourlyReports.slice(0,1000); saveReports(); lastReportAt=now; localStorage.setItem(REPORTS_KEY+'-last-report-at',String(now)); renderReports();
  if(manual)toast('రిపోర్ట్ ఈ ఫోన్‌లో సేవ్ అయింది.');
}
function syncNativeReports(){
  try{
    if(!window.Android || !Android.getHourlyReports)return;
    const nativeRows=JSON.parse(Android.getHourlyReports()||'[]');
    if(!Array.isArray(nativeRows))return;
    const merged=new Map();
    [...hourlyReports,...nativeRows].forEach(r=>merged.set(String(r.id),r));
    hourlyReports=[...merged.values()].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,1000);
    saveReports(); renderReports();
  }catch(e){console.warn('Native report sync failed',e);}
}
function renderReports(){
  const el=$('#hourlyReportList'); if(!el)return;
  $('#reportCount').textContent=hourlyReports.length;
  el.innerHTML=hourlyReports.length?hourlyReports.slice(0,20).map(r=>`<div class="status"><b>${escapeHtml(r.vehicle)}</b><br>${new Date(r.time).toLocaleString('te-IN')}<br>${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)} • ±${Math.round(r.accuracy||0)} మీ. <a href="${r.mapUrl}" target="_blank" rel="noopener">మ్యాప్</a></div>`).join(''):'<div class="status">ఇంకా రిపోర్టులు సేవ్ కాలేదు. GPS నడుస్తున్నప్పుడు ప్రతి గంటకు ఆటోమేటిక్‌గా సేవ్ అవుతాయి.</div>';
}
function exportReports(){
  if(!hourlyReports.length)return toast('ఎగుమతి చేయడానికి రిపోర్టులు లేవు.');
  const rows=[['Vehicle','DateTime','Latitude','Longitude','Accuracy_m','Map_URL'],...hourlyReports.map(r=>[r.vehicle,r.time,r.latitude,r.longitude,r.accuracy,r.mapUrl])];
  const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='RK-hourly-vehicle-reports.csv';a.click();URL.revokeObjectURL(url);
}

function toast(message){ const el=$('#toast'); if(!el)return; el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),3200); }
function escapeHtml(v){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function go(id){ $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id)); $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id)); window.scrollTo({top:0,behavior:'smooth'}); }
function getGpsMode(){return localStorage.getItem(GPS_MODE_KEY)||'mobile';}
function applyGpsMode(){
  const mode=getGpsMode();
  const radio=$(`input[name="gpsMode"][value="${mode}"]`); if(radio)radio.checked=true;
  const deviceOn=mode==='device'||mode==='both';
  const mobileOn=mode==='mobile'||mode==='both';
  $('#deviceGpsSettings').hidden=!deviceOn;
  $('#mobileGpsControls').hidden=!mobileOn;
  if(!mobileOn&&watchId!==null)stopTracking(false);
  const saved=readDeviceGps();
  $('#gpsDeviceModel').value=saved.model||''; $('#gpsDeviceId').value=saved.deviceId||''; $('#gpsDeviceServer').value=saved.server||'';
}
function readDeviceGps(){try{return JSON.parse(localStorage.getItem(GPS_DEVICE_KEY)||'{}')||{};}catch{return {};}}
$$('input[name="gpsMode"]').forEach(r=>r.addEventListener('change',()=>{localStorage.setItem(GPS_MODE_KEY,r.value);applyGpsMode();toast(r.value==='mobile'?'Mobile GPS ఎంపికైంది.':r.value==='device'?'Vehicle GPS Device ఎంపికైంది.':'రెండు GPS విధానాలు ఎంపికయ్యాయి.');}));
$('#saveDeviceGpsBtn').addEventListener('click',()=>{
  const model=$('#gpsDeviceModel').value.trim(),deviceId=$('#gpsDeviceId').value.trim(),server=$('#gpsDeviceServer').value.trim();
  if(!model&&!deviceId)return toast('Device Model లేదా Device ID నమోదు చేయండి.');
  localStorage.setItem(GPS_DEVICE_KEY,JSON.stringify({model,deviceId,server}));
  toast('Device వివరాలు ఈ ఫోన్‌లో సేవ్ అయ్యాయి. Live connection కోసం provider API అవసరం.');
});
$$('.tab').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
function renderVehicles(){
  $('#vehicleCount').textContent=vehicles.length;
  $('#activeCount').textContent=watchId===null?'0':'1';
  $('#vehicleList').innerHTML=vehicles.length?vehicles.map(v=>`<article class="vehicle"><div><b>${escapeHtml(v.registration_number)}</b><small>${escapeHtml(v.vehicle_type)}</small></div><button class="remove" data-remove="${v.id}">తొలగించు</button></article>`).join(''):'<div class="card muted">ఇంకా వాహనాలు జోడించలేదు.</div>';
  $('#trackingVehicle').innerHTML=vehicles.length?vehicles.map(v=>`<option value="${v.id}">${escapeHtml(v.registration_number)} — ${escapeHtml(v.vehicle_type)}</option>`).join(''):'<option value="">ముందుగా వాహనం జోడించండి</option>';
  $('#startTrackingBtn').disabled=!vehicles.length || watchId!==null || !(getGpsMode()==='mobile'||getGpsMode()==='both');
}
$('#vehicleForm').addEventListener('submit',e=>{
  e.preventDefault(); const registration_number=$('#reg').value.toUpperCase().replace(/\s+/g,'');
  if(!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(registration_number)) return toast('రిజిస్ట్రేషన్ నంబర్ సరిచూడండి.');
  if(vehicles.some(v=>v.registration_number===registration_number)) return toast('ఈ వాహనం ఇప్పటికే జోడించారు.');
  vehicles.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),registration_number,vehicle_type:$('#kind').value});
  saveVehicles(); $('#reg').value=''; renderVehicles(); toast('వాహనం జోడించబడింది.');
});
$('#vehicleList').addEventListener('click',e=>{
  const b=e.target.closest('[data-remove]'); if(!b)return;
  if(!confirm('ఈ వాహనాన్ని తొలగించాలా?'))return;
  vehicles=vehicles.filter(v=>v.id!==b.dataset.remove); saveVehicles(); renderVehicles(); toast('వాహనం తొలగించబడింది.');
});
async function syncLiveLocation(pos, active=true){
  if(!liveShareId || liveSyncBusy) return;
  liveSyncBusy=true;
  try {
    const c=pos.coords;
    const response=await fetch(`${SUPABASE_URL}/rest/v1/live_locations?on_conflict=share_id`,{
      method:'POST', headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({share_id:liveShareId,vehicle:$('#trackingVehicle').selectedOptions[0]?.textContent||'నా వాహనం',latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,updated_at:new Date(pos.timestamp||Date.now()).toISOString(),active})
    });
    if(!response.ok) throw new Error(await response.text());
    $('#ownerTrackingStatus').textContent='GPS ON • Live Mapకు లొకేషన్ అప్‌డేట్ అవుతోంది.';
  } catch(e) { console.warn('Live sync failed',e); $('#ownerTrackingStatus').textContent='GPS ON • Cloud Sync సమస్య: '+e.message; }
  finally { liveSyncBusy=false; }
}
function updateLocation(pos){
  currentPosition=pos; const {latitude,longitude,accuracy}=pos.coords;
  lastMapUrl=`https://www.google.com/maps?q=${latitude},${longitude}`;
  $('#viewerVehicleName').textContent=$('#trackingVehicle').selectedOptions[0]?.textContent||'నా ఫోన్ లొకేషన్';
  $('#viewerLocation').textContent=`${latitude.toFixed(5)}, ${longitude.toFixed(5)} • ఖచ్చితత్వం ${Math.round(accuracy)} మీ. • ప్రాంతం పేరు వెతుకుతోంది…`;
  $('#whatsappShareBtn').disabled=false;
  resolveLocationName(latitude,longitude);
  if(watchId!==null){saveHourlyReport(false); syncLiveLocation(pos,true);}
  $('#lastUpdate').textContent='చివరి అప్‌డేట్: '+new Date(pos.timestamp).toLocaleTimeString('te-IN');
  $('#openViewerMapBtn').disabled=false;
  $('#viewerList').innerHTML='<div class="status">GPS లొకేషన్ ఈ ఫోన్‌లో మాత్రమే చూపబడుతోంది.</div>';
}
async function resolveLocationName(lat,lon){
  const now=Date.now(); if(now-lastGeocodeAt<15000)return; lastGeocodeAt=now;
  try{
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=16&addressdetails=1`;
    const res=await fetch(url,{headers:{'Accept':'application/json'}}); if(!res.ok)throw new Error('geocode');
    const data=await res.json(); const a=data.address||{};
    const parts=[a.suburb||a.neighbourhood||a.village||a.town||a.city_district,a.city||a.town||a.city_district||a.county,a.state].filter((v,i,arr)=>v&&arr.indexOf(v)===i);
    if(parts.length)$('#viewerLocation').textContent=`${parts.join(', ')} • ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }catch(e){$('#viewerLocation').textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)} • ప్రాంతం పేరు పొందలేకపోయాం`; }
}
$('#whatsappShareBtn').addEventListener('click',()=>{
  if(!liveShareId)return toast('ముందుగా Live Tracking ప్రారంభించండి.');
  const vehicle=$('#trackingVehicle').selectedOptions[0]?.textContent||'నా వాహనం';
  const liveUrl=`${LIVE_VIEWER_URL}?id=${encodeURIComponent(liveShareId)}`;
  const message=`${vehicle} Live Tracking\nఈ లింక్ ఓపెన్ చేస్తే వాహనం తాజా లొకేషన్ కనిపిస్తుంది.\n${liveUrl}\nనేను Stop Tracking నొక్కేవరకు అప్‌డేట్ అవుతుంది.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
});
$('#startTrackingBtn').addEventListener('click',()=>{
  if(!vehicles.length)return toast('ముందుగా వాహనం జోడించండి.');
  if(!navigator.geolocation)return toast('ఈ బ్రౌజర్ GPSకు మద్దతు ఇవ్వదు.');
  if(!confirm('మీ ఫోన్ GPS లొకేషన్‌ను ఎంచుకున్న వాహనంతో లింక్ చేసి Live Mapలో షేర్ చేయడానికి అంగీకరిస్తున్నారా?'))return;
  liveShareId=crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);});
  $('#ownerTrackingStatus').textContent='GPS అనుమతి కోసం వేచి ఉంది…';
  if(window.Android && Android.startTracking){const vehicle=$('#trackingVehicle').selectedOptions[0]?.textContent||'నా వాహనం';Android.startTracking(vehicle,liveShareId);}
  watchId=navigator.geolocation.watchPosition(pos=>{updateLocation(pos);$('#ownerTrackingStatus').textContent='GPS ON • లొకేషన్ ఈ ఫోన్‌లో మాత్రమే సేవ్ / చూపబడుతుంది.';$('#stopTrackingBtn').disabled=false;renderVehicles();},err=>{watchId=null;$('#ownerTrackingStatus').textContent='GPS సమస్య: '+err.message;renderVehicles();toast('ఫోన్ సెట్టింగ్స్‌లో Location ON చేసి అనుమతి ఇవ్వండి.');},{enableHighAccuracy:true,maximumAge:3000,timeout:20000});
});
function stopTracking(show=true){ if(liveShareId){fetch(`${SUPABASE_URL}/rest/v1/live_locations?share_id=eq.${encodeURIComponent(liveShareId)}`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({active:false,updated_at:new Date().toISOString()})}).catch(console.warn);} if(window.Android && Android.stopTracking)Android.stopTracking(); if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId); watchId=null; $('#whatsappShareBtn').disabled=true; $('#stopTrackingBtn').disabled=true; $('#startTrackingBtn').disabled=!vehicles.length; $('#ownerTrackingStatus').textContent='షేరింగ్ ఆఫ్‌లో ఉంది.'; liveShareId=null; renderVehicles(); if(show)toast('GPS ట్రాకింగ్ ఆపబడింది.'); }
$('#stopTrackingBtn').addEventListener('click',()=>stopTracking(true));
$('#saveReportBtn')?.addEventListener('click',()=>saveHourlyReport(true));
$('#exportReportsBtn')?.addEventListener('click',exportReports);
$('#copyCodeBtn').addEventListener('click',async()=>{
  if(!lastMapUrl)return toast('ముందుగా GPS ప్రారంభించండి.');
  try{await navigator.clipboard.writeText(lastMapUrl);toast('ప్రస్తుత మ్యాప్ లింక్ కాపీ అయింది.');}catch{toast(lastMapUrl);}
});
$('#openViewerMapBtn').addEventListener('click',()=>{if(lastMapUrl)window.open(lastMapUrl,'_blank','noopener,noreferrer');});
$('#clearBtn')?.addEventListener('click',()=>{if(!confirm('ఈ ఫోన్‌లో సేవ్ చేసిన అన్ని వాహన వివరాలను తొలగించాలా?'))return;stopTracking(false);vehicles=[];saveVehicles();renderVehicles();toast('ఈ ఫోన్‌లోని డేటా తొలగించబడింది.');});
renderVehicles();
renderReports();
syncNativeReports();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNativeReports();});
setInterval(()=>{if(watchId!==null&&currentPosition)saveHourlyReport(false);},60000);
applyGpsMode();
if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=9').catch(console.warn));

// No-login mode: open the app directly. All data stays in this phone's browser.
const appPanel = $('#appPanel');
if (appPanel) appPanel.hidden = false;
