/* GORGOR V20 - 25 TEMMUZ STABIL - Kurukafa tam yok et + Flip blur + Sonen mum - Temel kurallar: fakeCalc 0000, oda1, varim/yokum korunuyor */
console.log("V20 25TEMMUZ STABIL - V20 - Kurukafa + Flip Panik - Temel kurallar korunuyor - V19.0 FINAL - TUM OZELLIKLER - PBKDF2 + sesli + reaksiyon + screenshot + panic2 + fakeNotif + blur + otoReconnect + cizim ortak");
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
const socket = io({ timeout: 60000, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 10 });

const myVideo = document.getElementById("myVideo");
const remoteVideo = document.getElementById("remoteVideo");
const roomScreen = document.getElementById("roomScreen");
const mainScreen = document.getElementById("mainScreen");
const joinBtn = document.getElementById("joinBtn");
const roomName = document.getElementById("roomName");
const userName = document.getElementById("userName");
const roomPassword = document.getElementById("roomPassword");
const chatToggle = document.getElementById("chatToggle");
const chatPanel = document.getElementById("chatPanel");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");
const soundBtn = document.getElementById("soundBtn");
const volumeSlider = document.getElementById("volumeSlider");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const qualitySelect = document.getElementById("qualitySelect");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const pingValue = document.getElementById("pingValue");
const connectionQuality = document.getElementById("connectionQuality");
const settingsBtn = document.getElementById("settingsBtn");
const settingsContainer = document.getElementById("settingsContainer");
const myVideoContainer = document.getElementById("myVideoContainer");
const mediaBtn = document.getElementById("mediaBtn");
const mediaInput = document.getElementById("mediaInput");
const mediaPreview = document.getElementById("mediaPreview");
const previewImg = document.getElementById("previewImg");
const previewVideo = document.getElementById("previewVideo");
const closePreview = document.getElementById("closePreview");
const downloadMediaBtn = document.getElementById("downloadMediaBtn");
const nudgeBtn = document.getElementById("nudgeBtn");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");
const lightModeBtn = document.getElementById("lightModeBtn");
const locationBtn = document.getElementById("locationBtn");
const addCustomEmoji = document.getElementById("addCustomEmoji");
const perMessageTimerSelect = document.getElementById("perMessageTimerSelect");
const perMessagePersistSelect = document.getElementById("perMessagePersistSelect");
const defaultSelfDestructSelect = document.getElementById("defaultSelfDestructSelect");
const phoneModeBtn = document.getElementById("phoneModeBtn");
const phoneCallUI = document.getElementById("phoneCallUI");
const candleContainer = document.getElementById("candleContainer");
const msnEffectLayer = document.getElementById("msnEffectLayer");
const panicBtn = document.getElementById("panicBtn");
const skullPanicBtn = document.getElementById("skullPanicBtn");
const userListBox = document.getElementById("userListBox");
const fakeUsersList = document.getElementById("fakeUsersList");
const fakeRoomsList = document.getElementById("fakeRoomsList");
const fakeRoomsHint = document.getElementById("fakeRoomsHint");
const currentUserBox = document.getElementById("currentUserBox");
const opponentNameDisplay = document.getElementById("opponentNameDisplay");
const opponentDot = document.getElementById("opponentDot");
const opponentStatusText = document.getElementById("opponentStatusText");
const drawBtn = document.getElementById("drawBtn");
const drawOverlay = document.getElementById("drawOverlay");
const drawCanvas = document.getElementById("drawCanvas");
const drawClear = document.getElementById("drawClear");
const drawSend = document.getElementById("drawSend");
const drawClose = document.getElementById("drawClose");
const attachMenuBtn = document.getElementById("attachMenuBtn");
const attachMenu = document.getElementById("attachMenu");
const cameraBtn = document.getElementById("cameraBtn");
const cameraInput = document.getElementById("cameraInput");

let peer = null; let localStream = null; let currentRoom = ""; let currentPassword = ""; let myUsername = ""; let myRealUsername = "";
let micEnabled = true; let camEnabled = true;
let currentQuality = 720; let currentFacingMode = "user"; let pingTimer = null; let currentMediaData = null;
let typingTimer; let isTyping = false; let messageIdCounter = 0;
const sentMessages = new Map();
let defaultExpire = parseInt(localStorage.getItem("gorgor_default_expire") || "43200");
let activeTimers = new Map();
let offlineTimer = null;
const FOURTEEN_MIN = 14*60*1000;

function startExpireTimer(msgId, deleteAt, expireSec){
  const remaining = deleteAt - Date.now();
  if(remaining <= 0){
    const el = document.getElementById(msgId);
    if(el) el.remove();
    return;
  }
  if(activeTimers.has(msgId)){
    const old = activeTimers.get(msgId);
    if(old.timeout) clearTimeout(old.timeout);
    if(old.interval) clearInterval(old.interval);
  }
  const timer = setTimeout(()=>{
    const el = document.getElementById(msgId);
    if(el){
      el.style.opacity="0";
      setTimeout(()=>{ el.remove(); }, 300);
    }
    activeTimers.delete(msgId);
  }, remaining);
  activeTimers.set(msgId, {timeout: timer, expireAt: deleteAt});
}

let isPhoneMode = false;
let isPickingFile = false;
let _photoPicking = false;
const MAX_SEC = 86400;

const REAL_ROOM = "oda1";
const FAKE_ROOMS = ["oda","oda2","oda3","oda4","oda5","oda6","oda7","oda8","oda9"];
const REAL_USERS = ["varım","yokum"];
const FAKE_USERS = ["buradayım","geldim","bekliyorum","hazırım","uyuyorum","meşgulüm","çevrimiçiyim","çevrimdışıyım","yoldayım","müsaitim","dinleniyorum","çalışıyorum"];

function normalize(s){ return (s||"").toString().trim().toLowerCase(); }
function formatClock(d=new Date()){ const hh=String(d.getHours()).padStart(2,'0'); const mm=String(d.getMinutes()).padStart(2,'0'); return `${hh}:${mm}`; }

let securityMode = localStorage.getItem("gorgor_security_mode") || "private";
function doSecurityReset(reason){
  if(isPickingFile || _photoPicking){ console.log("FOTO IPTAL", reason); return; }
  if(securityMode === "general"){
    console.log("GENEL MOD - kamera ve ses iki tarafta kapaniyor - mum", reason);
    try{
      if(localStream){
        localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} });
        localStream.getVideoTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} });
      }
      micEnabled=false; camEnabled=false;
      if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
      if(camBtn){ camBtn.classList.add("offIcon"); }
      if(remoteVideo){ try{remoteVideo.pause();}catch(e){} remoteVideo.muted=true; try{remoteVideo.volume=0;}catch(e){} remoteVideo.style.display="none"; try{remoteVideo.srcObject=null;}catch(e){} try{remoteVideo.removeAttribute("src");}catch(e){} try{remoteVideo.load();}catch(e){} }
      if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; }
      isPhoneMode=false;
      document.body.classList.remove("phone-mode");
      if(phoneCallUI) phoneCallUI.style.display="none";
      if(socket && currentRoom){
        socket.emit("paused");
        socket.emit("general-pause");
        socket.emit("phone-mode", false);
      }
    }catch(e){ console.log(e); }
    return;
  }
  console.log("OZEL MOD KAPANIS", reason);
  try{
    if(peer){ try{peer.destroy();}catch(e){} peer=null; }
    if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); localStream=null; }
    if(pingTimer){ clearInterval(pingTimer); pingTimer=null; }
    if(socket && currentRoom){ socket.emit("leave-room", currentRoom); }
    currentRoom=""; currentPassword=""; myUsername=""; myRealUsername="";
    micEnabled=false; camEnabled=false; isPhoneMode=false; opponentUsername=""; opponentStatus="offline";
    messageIdCounter=0;
    if(messages) messages.innerHTML="";
    sentMessages.clear();
    activeTimers.forEach(t=>{ if(t.interval) clearInterval(t.interval); if(t.timeout) clearTimeout(t.timeout); }); activeTimers.clear();
    if(roomName) roomName.value="";
    if(roomPassword) roomPassword.value="";
    if(userName) userName.value="";
    if(mainScreen) mainScreen.style.display="none";
    if(roomScreen) roomScreen.style.display="none";
    const fakeCalcEl = document.getElementById("fakeCalc");
    if(fakeCalcEl) fakeCalcEl.style.display="flex";
    if(typeof calcBuf!=="undefined"){ calcBuf=""; const cd=document.getElementById("calcDisplay"); if(cd) cd.value=""; }
    document.body.classList.remove("phone-mode");
    document.body.classList.remove("chat-open");
    if(phoneCallUI) phoneCallUI.style.display="none";
    if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
    if(remoteVideo){ try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.removeAttribute("src"); remoteVideo.style.display="none"; }
    if(myVideoContainer) myVideoContainer.style.display="none";
  }catch(e){ console.log(e); }
}
document.addEventListener("visibilitychange", ()=>{ if(document.hidden){ if(isPickingFile || _photoPicking) return; doSecurityReset("visibility hidden"); } });
window.addEventListener("pagehide", ()=>{ doSecurityReset("pagehide"); });
window.addEventListener("blur", ()=>{ setTimeout(()=>{ if(isPickingFile || _photoPicking) return; if(document.hidden){ doSecurityReset("blur+hidden"); } }, 1000); });
document.addEventListener("freeze", ()=>{ doSecurityReset("freeze"); });

function renderFakeLists(){
    if(fakeUsersList){ fakeUsersList.innerHTML=""; const allUsers=[...REAL_USERS,...FAKE_USERS].sort(()=>Math.random()-0.5); allUsers.forEach(u=>{ const sp=document.createElement("span"); sp.className="userTag"; sp.textContent=u; sp.onclick=()=>{ userName.value=u; }; fakeUsersList.appendChild(sp); }); }
    if(fakeRoomsList){ fakeRoomsList.innerHTML=""; const allRooms=[REAL_ROOM,...FAKE_ROOMS].sort(()=>Math.random()-0.5); allRooms.forEach(r=>{ const sp=document.createElement("span"); sp.className="userTag"; sp.textContent=r; sp.onclick=()=>{ roomName.value=r; roomName.dispatchEvent(new Event('input')); }; fakeRoomsList.appendChild(sp); }); }
}
renderFakeLists();
let opponentUsername=""; let opponentStatus="offline";
let lastSeenTimes = {};
// V19 NEW FEATURES GLOBALS
let isBlurEnabled = false;
let autoReconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimer = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecordingVoice = false;
let voiceRecordStartTime = 0;
let messageReactions = new Map();
let readReceipts = new Map();
let isCollaborativeDrawing = false;
let collaborativeDrawColor = "#00ff88";
let fakeNotifEnabled = true;
let screenshotProtectionEnabled = true;
function formatLastSeen(ts){
  if(!ts) return "";
  const diff = Math.floor((Date.now()-ts)/1000);
  if(diff<10) return "az önce";
  if(diff<60) return `${diff}sn önce`;
  if(diff<3600) return `${Math.floor(diff/60)}dk önce`;
  if(diff<86400) return `bugün ${formatClock(new Date(ts))}`;
  return `${formatClock(new Date(ts))}`;
}

function updateOpponentDisplay(name,status){ 
  // Guard: kendi adınsa karşı taraf değil, güncelleme yapma
  if(name && (name === myRealUsername || name === myUsername)) return;
  if(!name && opponentUsername && (opponentUsername === myRealUsername || opponentUsername === myUsername)) return;
  opponentUsername=name||opponentUsername; 
  // Ekstra guard: opponentUsername kendi adın olmuşsa temizle
  if(opponentUsername === myRealUsername || opponentUsername === myUsername){
    opponentUsername = "";
    return;
  }
  opponentStatus=status||opponentStatus; 
  if(opponentNameDisplay){ 
    // Sadece karşı tarafın adı, kendi adın değil
    if(opponentUsername && opponentUsername !== myRealUsername && opponentUsername !== myUsername){
      opponentNameDisplay.textContent=opponentUsername; 
    }
  } 
  if(opponentDot){ opponentDot.className="onlineDot "+(opponentStatus==="varım"||opponentStatus==="online"?"online":"offline"); } 
  if(opponentStatusText){ 
    if(opponentStatus==="varım"||opponentStatus==="online"){ 
      opponentStatusText.textContent="içerde"; 
      opponentStatusText.style.color="#00ff88"; 
      opponentStatusText.classList.remove("waiting");
      if(typeof stopWaitingDots==="function") stopWaitingDots();
    } else { 
      const ts = lastSeenTimes[opponentUsername] || lastSeenTimes[name] || null;
      if(ts){
        // Son görülme saatini gerçek saat olarak göster: 22:42 gibi
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2,'0');
        const mm = String(d.getMinutes()).padStart(2,'0');
        const clock = `${hh}:${mm}`;
        const rel = formatLastSeen(ts);
        // Eğer az önce ise "son görülme az önce" değil "son görülme 22:42" + relative
        if(rel === "az önce"){
          opponentStatusText.textContent=`son görülme ${clock}`;
        } else {
          opponentStatusText.textContent=`son görülme ${clock} • ${rel}`;
        }
      } else {
        opponentStatusText.textContent="son görülme -";
      }
      opponentStatusText.style.color="#888"; 
      if(typeof stopWaitingDots==="function") stopWaitingDots();
    } 
  } 
  const phoneNameDisplay=document.getElementById("phoneNameDisplay"); 
  if(phoneNameDisplay && opponentUsername && opponentUsername !== myRealUsername){ phoneNameDisplay.textContent=opponentUsername; } 
}
roomName.addEventListener("input",()=>{ const v=normalize(roomName.value); if(v.length>0){ if(fakeRoomsHint) fakeRoomsHint.style.display="block"; } else { if(fakeRoomsHint) fakeRoomsHint.style.display="none"; } if(v===REAL_ROOM || v.length>=2){ userName.style.display="block"; userListBox.style.display="block"; } else { userName.style.display="none"; userListBox.style.display="none"; } });

// V19 PBKDF2 + backward compatibility
async function deriveKeyLegacy(password){ const enc=new TextEncoder(); const hash=await crypto.subtle.digest('SHA-256', enc.encode(password)); return await crypto.subtle.importKey('raw', hash, { name:'AES-GCM' }, false, ['encrypt','decrypt']); }
async function deriveKeyPBKDF2(password, saltStr){
  const enc=new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveKey']);
  const salt = enc.encode(saltStr || (currentRoom + currentPassword + 'gorgor-v19-salt'));
  return await crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function deriveKey(password){
  try{
    const salt = (currentRoom||'') + (currentPassword||'') + 'gorgor-v19-salt';
    return await deriveKeyPBKDF2(password, salt);
  }catch(e){
    console.log('PBKDF2 fallback to legacy', e);
    return await deriveKeyLegacy(password);
  }
}
function bufToB64(buf){ const bytes=new Uint8Array(buf); let binary=""; const chunk=8192; for(let i=0;i<bytes.length;i+=chunk){ binary+=String.fromCharCode.apply(null, bytes.subarray(i,i+chunk)); } return btoa(binary); }
function b64ToBuf(b64){ const binary=atob(b64); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes; }
async function encryptText(text,password){ const key=await deriveKey(password); const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)); const combined=new Uint8Array(iv.length+ct.byteLength); combined.set(iv,0); combined.set(new Uint8Array(ct),iv.length); return bufToB64(combined); }
async function decryptText(b64,password){ try{ const key=await deriveKey(password); const combined=b64ToBuf(b64); const iv=combined.slice(0,12); const ct=combined.slice(12); const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct); return new TextDecoder().decode(pt); }catch(e){ return null; } }
if(defaultSelfDestructSelect) defaultSelfDestructSelect.value="43200";
if(micBtn) micBtn.textContent="🎤"; if(camBtn) camBtn.textContent="📹";
async function startCamera(height=720, facingMode=currentFacingMode){
  const prevMicEnabled = (typeof micEnabled !== 'undefined') ? micEnabled : false;
  const prevCamEnabled = (typeof camEnabled !== 'undefined') ? camEnabled : false;
  const hadStream = !!localStream;
  try{
    if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); }
    localStream=await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:{ideal:facingMode}, width:{ideal:height===1080?1920:height===720?1280:854}, height:{ideal:height}, frameRate:{ideal:30}},
      audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}
    });
    myVideo.srcObject=localStream;
    myVideo.style.transform=facingMode==="user"?"scaleX(-1)":"scaleX(1)";
    if(!hadStream){
      localStream.getVideoTracks().forEach(t=>t.enabled=false);
      localStream.getAudioTracks().forEach(t=>t.enabled=false);
      micEnabled=false; camEnabled=false;
      if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
      if(camBtn){ camBtn.classList.add("offIcon"); }
    } else {
      localStream.getVideoTracks().forEach(t=>t.enabled=prevCamEnabled);
      localStream.getAudioTracks().forEach(t=>t.enabled=prevMicEnabled);
      micEnabled=prevMicEnabled; camEnabled=prevCamEnabled;
      if(micBtn){ if(micEnabled){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; } else { micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; } }
      if(camBtn){ if(camEnabled){ camBtn.classList.remove("offIcon"); } else { camBtn.classList.add("offIcon"); } }
      if(typeof peer !== 'undefined' && peer && peer._pc){
        try{
          const videoTrack = localStream.getVideoTracks()[0];
          const audioTrack = localStream.getAudioTracks()[0];
          const senders = peer._pc.getSenders();
          if(videoTrack){ const vSender = senders.find(s=>s.track && s.track.kind==='video'); if(vSender) vSender.replaceTrack(videoTrack); }
          if(audioTrack){ const aSender = senders.find(s=>s.track && s.track.kind==='audio'); if(aSender) aSender.replaceTrack(audioTrack); }
        }catch(e){ console.log("replaceTrack hata", e); }
      }
    }
    return true;
  }catch(err){ console.log("kamera hata",err); return false; }
}
function startPingMonitor(){ if(pingTimer) clearInterval(pingTimer); pingTimer=setInterval(()=>socket.emit("ping-check",Date.now()),3000); }
socket.on("pong-check", ts=>{ const ping=Date.now()-ts; if(pingValue) pingValue.textContent=ping+" ms"; if(!connectionQuality) return; if(ping<100){ connectionQuality.textContent="Mükemmel"; connectionQuality.className="good"; } else if(ping<200){ connectionQuality.textContent="İyi"; connectionQuality.className="medium"; } else { connectionQuality.textContent="Zayıf"; connectionQuality.className="bad"; } });

joinBtn.onclick=async()=>{
    const room=roomName.value.trim(); const password=roomPassword.value.trim(); const uname=userName.value.trim();
    if(!room){ alert("Oda adı gir"); return; }
    if(!uname){ alert("Kullanıcı adı gir"); return; }
    if(!password){ alert("Şifre gerekli"); return; }
    currentPassword=password; myUsername=normalize(uname); myRealUsername=uname;
    currentRoom=room;
    if(myVideoContainer){ myVideoContainer.style.display="block"; myVideoContainer.style.visibility="visible"; }
    try{ await startCamera(currentQuality); }catch(e){}
    socket.emit("join-room",{room,password,username:uname});
};
socket.on("room-error", msg=>alert(msg));
socket.on("joined-room", data=>{ roomScreen.style.display="none"; mainScreen.style.display="block"; if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; } if(remoteVideo) remoteVideo.style.display="block"; if(myVideoContainer){ myVideoContainer.style.display="block"; myVideoContainer.style.visibility="visible"; } if(currentUserBox) currentUserBox.textContent=`Ben: ${data.username}`; myRealUsername=data.username; myUsername=normalize(data.username); startPingMonitor(); if(!localStream){ startCamera(currentQuality, currentFacingMode).then(()=>{ if(myVideoContainer) myVideoContainer.style.display="block"; }); } if(data.count===2) createPeer(true); });
socket.on("user-connected",(d)=>{ if(!peer) createPeer(false); const oppName=d.username||d.realUsername||"Bilinmeyen"; updateOpponentDisplay(oppName,"varım"); if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; } clearOfflineTimer(); });
function createPeer(initiator){ peer=new SimplePeer({initiator,trickle:false,stream:localStream,config:{iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}]}}); peer.on("signal",signal=>socket.emit("signal",{room:currentRoom,signal})); peer.on("stream",stream=>{ remoteVideo.srcObject=stream; remoteVideo.play().catch(()=>{}); if(candleContainer) candleContainer.classList.remove("show"); if(isPhoneMode){ remoteVideo.style.display="none"; } else { remoteVideo.style.display="block"; } }); peer.on("close",()=>{ if(remoteVideo){ remoteVideo.pause(); try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.load(); remoteVideo.style.display="none"; } if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; } }); }
socket.on("signal",signal=>{ if(!peer) createPeer(false); peer.signal(signal); });
socket.on("user-status",(data)=>{ const {user,status,online}=data; if(user===myRealUsername) return; const isOnline=status==="varım"||online; updateOpponentDisplay(user,isOnline?"varım":"yokum"); if(isOnline) clearOfflineTimer(); else startOfflineCountdown(); });
socket.on("user-last-seen",(data)=>{
  const {user, ts, online} = data;
  if(user===myRealUsername) return;
  if(ts) lastSeenTimes[user]=ts;
  if(online===false || online===undefined){
    if(user===opponentUsername || !opponentUsername){
      updateOpponentDisplay(user,"yokum");
    }
  }
});
socket.on("last-seen-list",(list)=>{
  if(!list) return;
  Object.assign(lastSeenTimes, list);
  if(opponentUsername && lastSeenTimes[opponentUsername] && opponentStatus!=="varım"){
    updateOpponentDisplay(opponentUsername,"yokum");
  }
});
socket.on("user-disconnected",()=>{ if(remoteVideo){ remoteVideo.pause(); try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.removeAttribute("src"); remoteVideo.load(); remoteVideo.style.display="none"; } if(peer){ try{peer.destroy();}catch(e){} peer=null; } if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; } updateOpponentDisplay(opponentUsername||"Bilinmeyen","yokum"); startOfflineCountdown(); });
qualitySelect.onchange=async()=>{ const wasCamOn=camEnabled; const wasMicOn=micEnabled; currentQuality=parseInt(qualitySelect.value); socket.emit("quality-change", currentQuality); await startCamera(currentQuality, currentFacingMode); if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn); localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn); camEnabled=wasCamOn; micEnabled=wasMicOn; if(!wasCamOn) camBtn.classList.add("offIcon"); else camBtn.classList.remove("offIcon"); } if(peer&&localStream){ const sender=peer._pc.getSenders().find(s=>s.track&&s.track.kind==="video"); if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]); } };
socket.on("quality-change", async(q)=>{ currentQuality=parseInt(q); if(qualitySelect) qualitySelect.value=currentQuality.toString(); const wasCamOn=camEnabled; const wasMicOn=micEnabled; await startCamera(currentQuality, currentFacingMode); if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn); localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn); } if(peer&&localStream){ const sender=peer._pc.getSenders().find(s=>s.track&&s.track.kind==="video"); if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]); } });

settingsBtn.onclick=()=>settingsContainer.classList.toggle("menu-open");
if(fullscreenBtn){ fullscreenBtn.onclick=()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }
function formatTime(sec){ if(sec<60) return `${sec} sn`; const m=Math.floor(sec/60); const s=sec%60; if(m<60) return `${m} dk ${s} sn`; const h=Math.floor(m/60); const mm=m%60; if(h<24) return `${h}sa ${mm}dk`; const d=Math.floor(h/24); const hh=h%24; return `${d}g ${hh}sa ${mm}dk`; }
function formatTimeShort(sec){ if(sec<60) return `${sec}sn`; const m=Math.floor(sec/60); if(m<60) return `${m}dk`; const h=Math.floor(m/60); if(h<24) return `${h}sa`; return `${Math.floor(h/24)}g`; }
function startSelfDestruct(div,msgId,expireSec,deleteAt){ expireSec=Math.min(expireSec,MAX_SEC); if(activeTimers.has(msgId)){ const old=activeTimers.get(msgId); if(old.interval) clearInterval(old.interval); if(old.timeout) clearTimeout(old.timeout); } const expireAt=deleteAt||(Date.now()+expireSec*1000); const clock=div._clock||formatClock(new Date(expireAt-expireSec*1000)); const infoEl=div.querySelector(".expireInfo"); const interval=setInterval(()=>{ const remaining=Math.max(0,Math.floor((expireAt-Date.now())/1000)); if(infoEl){ infoEl.textContent=`${clock} • ⏰ ${formatTimeShort(remaining)}`; if(remaining<60) infoEl.style.color="#ff4444"; } if(remaining<=0) clearInterval(interval); },1000); const timeout=setTimeout(()=>{ div.innerHTML="💨 Bu mesaj kendini imha etti"; div.className="selfDestructed"; setTimeout(()=>div.remove(),2000); clearInterval(interval); activeTimers.delete(msgId); },expireAt-Date.now()); activeTimers.set(msgId,{interval,timeout,expireAt}); }

async function addMyMessage(text,expireSec,realName){ const now=Date.now(); const msgId=`msg-${now}-${messageIdCounter++}`; const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; expireSec=Math.min(expireSec,MAX_SEC); const linked=text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>'); const initial=(realName||"Y").trim().charAt(0).toUpperCase()||"Y"; const clock=formatClock(new Date(now)); div._clock=clock; div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(expireSec)}</span><div class="msgText">${linked}</div><span class="ticks single"> ✓</span></div>`; div._sentAt=now; div._deleteAt=now+expireSec*1000; messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; },10); sentMessages.set(msgId,div); div._expireSec=expireSec; startSelfDestruct(div,msgId,expireSec,div._deleteAt); startExpireTimer(msgId, div._deleteAt, expireSec); return msgId; }
async function addMyMediaMessage(dataUrl,mediaType,expireSec,fileName){ const now=Date.now(); const msgId=`media-${now}-${messageIdCounter++}`; const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; div._expireSec=expireSec; div._sentAt=now; div._deleteAt=now+expireSec*1000; const initial=(myRealUsername||"Y").trim().charAt(0).toUpperCase()||"Y"; const clock=formatClock(new Date(now)); div._clock=clock; div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(expireSec)}</span></div>`; const bubble=div.querySelector(".msgBubble"); if(mediaType==="image"){ const im=document.createElement("img"); im.src=dataUrl; im.className="mediaMessage"; im.onclick=(ev)=>{ ev.stopPropagation(); openPreview({type:"image",data:dataUrl,name:fileName}); }; bubble.appendChild(im); } else if(mediaType==="video"){ const v=document.createElement("video"); v.src=dataUrl; v.className="mediaMessage"; v.controls=true; bubble.appendChild(v); } const tick=document.createElement("span"); tick.className="ticks single"; tick.textContent=" ✓"; bubble.appendChild(tick); messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; },10); sentMessages.set(msgId,div); startSelfDestruct(div,msgId,expireSec,div._deleteAt); startExpireTimer(msgId, div._deleteAt, expireSec); return msgId; }
async function addLockedMessage(msgId,expireSec,enc,mediaType,senderReal,sentAt){ if(document.getElementById(msgId)) return; expireSec=Math.min(expireSec||defaultExpire,MAX_SEC); const sent=sentAt||Date.now(); const deleteAt=sent+expireSec*1000; try{ const plain=await decryptText(enc,currentPassword); if(!plain) return; const div=document.createElement("div"); div.className="otherMessage"; div.id=msgId; div._expireSec=expireSec; div._sentAt=sent; div._deleteAt=deleteAt; const remaining=Math.max(1,Math.floor((deleteAt-Date.now())/1000)); const initial=(senderReal||"V").trim().charAt(0).toUpperCase()||"V"; const clock=formatClock(new Date(sent)); div._clock=clock; if(mediaType==="text"||!mediaType){ const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>'); div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(remaining)}</span><div class="msgText">${linked}</div><span class="ticks double"> ✓✓</span></div>`; }else{ div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(remaining)}</span></div>`; const bubble=div.querySelector(".msgBubble"); if(mediaType==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; bubble.appendChild(img); } else if(mediaType==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; bubble.appendChild(v); } const tick=document.createElement("span"); tick.className="ticks double"; tick.textContent=" ✓✓"; bubble.appendChild(tick); } messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; },10); startSelfDestruct(div,msgId,remaining,deleteAt); startExpireTimer(msgId, deleteAt, expireSec); socket.emit("message-opened",{msgId}); socket.emit("message-read",{msgId,reader:myRealUsername}); if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink"); } return; }catch(e){ console.log(e); } }

function getExpireFromSelect(){ let val=perMessageTimerSelect.value; if(val==="default") return defaultExpire; if(val==="custom"){ let custom=prompt(`Manuel süre saniye:`); if(!custom) return defaultExpire; let num=parseInt(custom.replace(/[^0-9]/g,'')); if(isNaN(num)||num<=0) return defaultExpire; if(num>MAX_SEC) num=MAX_SEC; return num; } return Math.min(parseInt(val),MAX_SEC); }
sendBtn.onclick=async()=>{ const text=input.value.trim(); if(!text) return; let expire=getExpireFromSelect(); const persistMode=perMessagePersistSelect?perMessagePersistSelect.value:"once"; if(persistMode==="persist"){ defaultExpire=expire; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); } const msgId=await addMyMessage(text,expire,myRealUsername); const enc=await encryptText(text,currentPassword); const sentAt=Date.now(); socket.emit("chat-message",{msgId,enc,expireSec:expire,sentAt,deleteAt:Date.now()+expire*1000}); input.value=""; socket.emit('typing',false); isTyping=false; };
input.addEventListener("keydown",e=>{ if(e.key==="Enter") sendBtn.click(); });
socket.on("chat-message", data=>{
  addLockedMessage(data.msgId,data.expireSec,data.enc,"text",data.realUsername||data.username,data.sentAt);
  const isMine = (data.realUsername||data.username) === myRealUsername || data.username === myUsername;
  if(!isMine && !document.body.classList.contains("chat-open")){ if(typeof triggerNewMessageBlink==='function') triggerNewMessageBlink(); }
});
socket.on("chat-media", data=>{
  addLockedMessage(data.msgId,data.expireSec,data.enc,data.mediaType||"image",data.realUsername||data.username,data.sentAt);
  const isMine = (data.realUsername||data.username) === myRealUsername || data.username === myUsername;
  if(!isMine && !document.body.classList.contains("chat-open")){ if(typeof triggerNewMessageBlink==='function') triggerNewMessageBlink(); }
});
socket.on("pending-messages", async(list)=>{ for(const m of list){ const plain=await decryptText(m.enc,currentPassword); if(!plain) continue; const isMine=m.username===myUsername; const sent=m.expireAt?(m.expireAt-m.expireSec*1000):Date.now(); const clock=formatClock(new Date(sent)); if(m.opened&&m.deleteAt){ const remaining=Math.max(1,Math.floor((m.deleteAt-Date.now())/1000)); if(remaining<=0) continue; const div=document.createElement("div"); div.className=isMine?"myMessage":"otherMessage"; div.id=m.msgId; div._clock=clock; div._expireSec=m.expireSec; const initial=(m.realUsername||"V").trim().charAt(0).toUpperCase(); const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>'); if(m.type==="text"){ div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(remaining)}</span><div class="msgText">${linked}</div><span class="ticks double"> ✓✓</span></div>`; }else{ div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(remaining)}</span></div>`; const bubble=div.querySelector(".msgBubble"); if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; bubble.appendChild(img); } else if(m.type==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; bubble.appendChild(v); } const tick=document.createElement("span"); tick.className="ticks double"; tick.textContent=" ✓✓"; bubble.appendChild(tick); } messages.appendChild(div); startSelfDestruct(div,m.msgId,remaining,m.deleteAt); startExpireTimer(m.msgId, m.deleteAt, m.expireSec); if(isMine) sentMessages.set(m.msgId,div); }else{ if(isMine){ const div=document.createElement("div"); div.className="myMessage"; div.id=m.msgId; div._expireSec=m.expireSec; div._clock=clock; const initial=(m.realUsername||"Y").charAt(0).toUpperCase(); if(m.type==="text"){ const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>'); div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(m.expireSec)}</span><div class="msgText">${linked}</div><span class="ticks single"> ✓</span></div>`; }else{ div.innerHTML=`<div class="msgAvatar">${initial}</div><div class="msgBubble"><span class="expireInfo">${clock} • ⏰ ${formatTimeShort(m.expireSec)}</span></div>`; const bubble=div.querySelector(".msgBubble"); if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; bubble.appendChild(img); } const tick=document.createElement("span"); tick.className="ticks single"; tick.textContent=" ✓"; bubble.appendChild(tick); } messages.appendChild(div); sentMessages.set(m.msgId,div); startSelfDestruct(div,m.msgId,m.expireSec,Date.now()+m.expireSec*1000); startExpireTimer(m.msgId, Date.now()+m.expireSec*1000, m.expireSec); }else{ addLockedMessage(m.msgId,m.expireSec,m.enc,m.type,m.realUsername,sent); } } } messages.scrollTop=messages.scrollHeight; });

socket.on("message-opened",({msgId,deleteAt,expireSec})=>{ const div=document.getElementById(msgId)||sentMessages.get(msgId); if(!div) return; if(sentMessages.has(msgId)){ const info=div.querySelector(".expireInfo"); const clock=div._clock||formatClock(new Date()); if(info){ info.textContent=`${clock} • ⏰ ${formatTimeShort(expireSec)}`; info.style.color="#00ff88"; } const ticks=div.querySelector(".ticks"); if(ticks){ ticks.textContent=" ✓✓"; ticks.style.color="#00ff88"; ticks.className="ticks double read"; } } });

chatToggle.onclick=()=>{ if(chatPanel.style.display==="flex"){ chatPanel.style.display="none"; document.body.classList.remove("chat-open"); chatToggle.textContent="💬"; } else{ chatPanel.style.display="flex"; document.body.classList.add("chat-open"); chatToggle.classList.remove("newMessageBlink"); chatToggle.textContent="✖"; const goBottom=()=>{ if(messages){ messages.scrollTop=messages.scrollHeight; } }; goBottom(); setTimeout(goBottom,50); setTimeout(goBottom,200); setTimeout(goBottom,600); socket.emit("messages-read-all"); } };
const hideChatBtn = document.getElementById("hideChatBtn");
if(hideChatBtn){
  hideChatBtn.onclick = ()=>{
    if(typeof isHiddenMode!=="undefined" && typeof enterHiddenMode==="function"){
      enterHiddenMode();
    }else{
      if(chatPanel.style.display==="flex"){ chatPanel.style.display="none"; document.body.classList.remove("chat-open"); }
      else { chatPanel.style.display="flex"; document.body.classList.add("chat-open"); }
      if(typeof showToast==="function") showToast("🕵️ Görüşme gizlendi");
    }
  };
}

input.addEventListener('input',()=>{ if(!isTyping&&input.value.trim()){ socket.emit('typing',true); isTyping=true; } clearTimeout(typingTimer); typingTimer=setTimeout(()=>{ socket.emit('typing',false); isTyping=false; },1000); });
socket.on('typing',(data)=>{ let td=document.getElementById('typingIndicator'); if(!td){ td=document.createElement('div'); td.id='typingIndicator'; td.className='otherMessage'; messages.appendChild(td); } td.textContent=data.typing?`${data.username} yazıyor...`:''; td.style.display=data.typing?'block':'none'; });
if(nudgeBtn){ nudgeBtn.onclick=(e)=>{ e.stopPropagation(); socket.emit("nudge"); triggerNudge(true); }; }
function triggerNudge(){ document.body.classList.add("screen-shake"); setTimeout(()=>document.body.classList.remove("screen-shake"),800); if(navigator.vibrate) navigator.vibrate([200,100,200]); if(messages){ messages.classList.add("shake"); setTimeout(()=>messages.classList.remove("shake"),600); } }
socket.on("nudge",()=>{ triggerNudge(false); });
if(emojiBtn) emojiBtn.onclick=(e)=>{ e.stopPropagation(); emojiPanel.classList.toggle("show"); };
document.querySelectorAll('.flyEmoji').forEach(emoji=>{ if(emoji.id==='addCustomEmoji') return; emoji.onclick=(e)=>{ e.stopPropagation(); const emojiText=emoji.textContent; const effect=emoji.dataset.effect; socket.emit('fly-emoji',{emoji:emojiText,effect}); createFlyingEmoji(emojiText,effect,true); emojiPanel.classList.remove("show"); }; });
socket.on('fly-emoji',(data)=>createFlyingEmoji(data.emoji,data.effect,false));
function createFlyingEmoji(emoji,effect,isMine){ const startX=isMine?window.innerWidth-120:80; const baseY=140; if(effect==='big-kiss'){ const big=document.createElement('div'); big.className='big-kiss-mark'; big.textContent='💋'; big.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:120px;z-index:9999;animation:explodeBoom 1s forwards;'; document.body.appendChild(big); setTimeout(()=>big.remove(),1000); return; } if(effect==='water'){ for(let i=0;i<10;i++){ setTimeout(()=>{ const d=document.createElement('div'); d.className='flying-emoji water'; d.textContent='💧'; d.style.left=(window.innerWidth/2+Math.random()*200-100)+'px'; d.style.bottom='50%'; d.style.fontSize='40px'; d.style.animation='fireRainFall 1.5s forwards'; document.body.appendChild(d); setTimeout(()=>d.remove(),1500); }, i*60); } return; } let count=1; let animClass=effect||'heart'; if(effect==='heart'||effect==='kiss') count=8; else if(['kiss-rain','heart-rain','money-rain','star-rain','fire-rain','laugh-rain','angry-rain','emoji-rain'].includes(effect)) count=14; else if(['flower','sparkle','star'].includes(effect)) count=6; else if(['fire','explode'].includes(effect)) count=3; else if(['party','confetti'].includes(effect)) count=20; else if(['money','thumbs','wow','skull','heart-burst'].includes(effect)) count=1; for(let i=0;i<count;i++){ setTimeout(()=>{ const fly=document.createElement('div'); fly.className='flying-emoji '+animClass; fly.textContent=emoji; fly.style.left=(startX+Math.random()*180-90+i*12)+'px'; fly.style.bottom=(baseY+Math.random()*60)+'px'; fly.style.fontSize=(effect==='explode'||effect==='heart-burst')?'90px':(effect==='fire'?'72px':(52+Math.random()*28)+'px'); document.body.appendChild(fly); setTimeout(()=>fly.remove(),3500); }, i*80); } if(['fire','explode','party','confetti','rocket','rocket-fly'].includes(effect)){ document.body.classList.add('mega-shake'); setTimeout(()=>document.body.classList.remove('mega-shake'),700); } }
micBtn.onclick=async()=>{ if(!localStream) return; micEnabled=!micEnabled; localStream.getAudioTracks().forEach(t=>t.enabled=micEnabled); micBtn.classList.toggle("offIcon",!micEnabled); micBtn.textContent=micEnabled?"🎤":"🔇"; try{ if(peer&&peer._pc&&localStream){ const at=localStream.getAudioTracks()[0]; if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ await s.replaceTrack(at); } } } }catch(e){} };
camBtn.onclick=async()=>{
  if(!localStream){ try{ await startCamera(currentQuality,currentFacingMode); }catch(e){ return; } }
  if(!camEnabled){
    const sesliAc=confirm("Kamerayı sesli olarak açmak ister misiniz?\\n\\nTamam = Mikrofon da açılsın\\nİptal = Sadece kamera açılsın\\n\\nKarşı tarafa teklif gidecek, kabul ederse iki tarafta da açılacak");
    camEnabled=true;
    localStream.getVideoTracks().forEach(t=>t.enabled=true);
    camBtn.classList.remove("offIcon");
    if(sesliAc){
      localStream.getAudioTracks().forEach(t=>t.enabled=true);
      micEnabled=true; micBtn.classList.remove("offIcon"); micBtn.textContent="🎤";
    } else {
      localStream.getAudioTracks().forEach(t=>t.enabled=false);
      micEnabled=false; micBtn.classList.add("offIcon"); micBtn.textContent="🔇";
    }
    try{
      if(peer&&peer._pc&&localStream){
        const vt=localStream.getVideoTracks()[0]; const at=localStream.getAudioTracks()[0];
        if(vt){ const senders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="video"); for(const s of senders){ await s.replaceTrack(vt); } }
        if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ await s.replaceTrack(at); } }
      }
    }catch(e){}
    socket.emit("video-call-request", {from: myRealUsername, withMic: sesliAc});
    if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
    if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block";
  } else {
    camEnabled=false;
    localStream.getVideoTracks().forEach(t=>t.enabled=false);
    camBtn.classList.add("offIcon");
    socket.emit("video-call-end", {from: myRealUsername});
  }
};
if(switchCameraBtn){ switchCameraBtn.onclick=async()=>{ try{ const wasCamOn=camEnabled; const wasMicOn=micEnabled; currentFacingMode=currentFacingMode==="user"?"environment":"user"; await startCamera(currentQuality,currentFacingMode); if(localStream){ localStream.getVideoTracks().forEach(t=>{ t.enabled=wasCamOn; }); localStream.getAudioTracks().forEach(t=>{ t.enabled=wasMicOn; }); myVideo.srcObject=localStream; myVideo.play().catch(()=>{}); myVideo.style.transform=currentFacingMode==="user"?"scaleX(-1)":"scaleX(1)"; } camEnabled=wasCamOn; micEnabled=wasMicOn; if(camEnabled) camBtn.classList.remove("offIcon"); else camBtn.classList.add("offIcon"); if(micEnabled){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; } else { micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; } if(peer&&peer._pc&&localStream){ const vt=localStream.getVideoTracks()[0]; const at=localStream.getAudioTracks()[0]; if(vt){ const senders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="video"); for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} } } if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} } } } }catch(err){ alert("Ikinci kamera yok"); currentFacingMode="user"; try{ await startCamera(currentQuality,"user"); }catch(e){} } }; }
remoteVideo.muted=false; remoteVideo.volume=0.1; volumeSlider.value=0.1;
volumeSlider.oninput=()=>{ const v=parseFloat(volumeSlider.value); remoteVideo.volume=v; remoteVideo.muted=v<=0; soundBtn.textContent=v<=0?"🔇":"🔊"; };
soundBtn.onclick=()=>{ remoteVideo.muted=!remoteVideo.muted; if(!remoteVideo.muted&&parseFloat(volumeSlider.value)===0){ volumeSlider.value=0.5; remoteVideo.volume=0.5; } soundBtn.textContent=remoteVideo.muted?"🔇":"🔊"; };
changePasswordBtn.onclick=()=>{ const p=prompt("Yeni sifre"); if(!p) return; currentPassword=p; socket.emit("change-password",p); };
let isDragging=false,sx,sy,sl,st;
myVideoContainer.addEventListener("touchstart",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1){ isDragging=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; sl=myVideoContainer.offsetLeft; st=myVideoContainer.offsetTop; } });
myVideoContainer.addEventListener("touchmove",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1&&isDragging){ e.preventDefault(); myVideoContainer.style.left=sl+(e.touches[0].clientX-sx)+"px"; myVideoContainer.style.top=st+(e.touches[0].clientY-sy)+"px"; myVideoContainer.style.right="auto"; } });
myVideoContainer.addEventListener("touchend",()=>isDragging=false);
if(attachMenuBtn){ attachMenuBtn.onclick=(e)=>{ e.stopPropagation(); attachMenu.classList.toggle("show"); }; }
mediaBtn.onclick=(e)=>{ e.preventDefault(); isPickingFile=true; _photoPicking=true; attachMenu.classList.remove("show"); setTimeout(()=>{ mediaInput.click(); }, 100); };
drawBtn.onclick=()=>{ attachMenu.classList.remove("show"); drawOverlay.style.display="flex"; const dpr=window.devicePixelRatio||1; drawCanvas.width=window.innerWidth*dpr; drawCanvas.height=(window.innerHeight-80)*dpr; drawCanvas.style.width=window.innerWidth+"px"; drawCanvas.style.height=(window.innerHeight-80)+"px"; const ctx2=drawCanvas.getContext("2d"); ctx2.scale(dpr,dpr); ctx2.strokeStyle="#00ff88"; ctx2.lineWidth=4; ctx2.lineCap="round"; ctx2.fillStyle="#000"; ctx2.fillRect(0,0,window.innerWidth,window.innerHeight); window._drawCtx=ctx2; };
locationBtn.onclick=async()=>{ attachMenu.classList.remove("show"); if(!navigator.geolocation){ alert("Konum yok"); return; } navigator.geolocation.getCurrentPosition(async pos=>{ const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; let expire=getExpireFromSelect(); const msgId=await addMyMessage("📍 Konumum: "+url,expire,myRealUsername); const enc=await encryptText("📍 Konumum: "+url,currentPassword); const sentAt=Date.now(); socket.emit("chat-message",{msgId,enc,expireSec:expire,sentAt}); }); };
if(cameraBtn){ cameraBtn.onclick=(e)=>{ e.preventDefault(); isPickingFile=true; _photoPicking=true; attachMenu.classList.remove("show"); setTimeout(()=>{ cameraInput.click(); }, 100); }; }
cameraInput.onchange=async()=>{ isPickingFile=true; _photoPicking=true; try{ const file=cameraInput.files[0]; if(!file){ isPickingFile=false; _photoPicking=false; return; } if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; _photoPicking=false; return; } let expire=getExpireFromSelect(); let dataUrl=""; try{ const img=await createImageBitmap(file); const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; } canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h); const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.75)); dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); }); }catch(e){ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); } const enc=await encryptText(dataUrl,currentPassword); const sentAt=Date.now(); const msgId=await addMyMediaMessage(dataUrl,"image",expire,"kamera.jpg"); socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType:"image",sentAt,deleteAt:Date.now()+expire*1000}); cameraInput.value=""; }catch(err){} setTimeout(()=>{ isPickingFile=false; _photoPicking=false; },1500); };
mediaInput.onchange=async()=>{ isPickingFile=true; _photoPicking=true; try{ const file=mediaInput.files[0]; if(!file){ isPickingFile=false; _photoPicking=false; return; } if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; _photoPicking=false; return; } let expire=getExpireFromSelect(); let dataUrl=""; if(file.type.startsWith('image/')){ try{ const img=await createImageBitmap(file); const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; } canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h); const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.7)); dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); }); }catch(e){ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); } }else{ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); } const enc=await encryptText(dataUrl,currentPassword); const mediaType=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':'file'; const sentAt=Date.now(); const msgId=await addMyMediaMessage(dataUrl,mediaType,expire,file.name); socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType,sentAt,deleteAt:Date.now()+expire*1000}); mediaInput.value=""; }catch(e){} setTimeout(()=>{ isPickingFile=false; _photoPicking=false; },1500); };
function openPreview(data){ currentMediaData=data; mediaPreview.style.display="flex"; if(data.type==="image"){ previewImg.src=data.data; previewImg.style.display="block"; previewVideo.style.display="none"; }else if(data.type==="video"){ previewVideo.src=data.data; previewVideo.style.display="block"; previewImg.style.display="none"; } }
closePreview.onclick=()=>{ mediaPreview.style.display="none"; previewVideo.pause(); };
downloadMediaBtn.onclick=()=>{ const pass=prompt("İndirmek için şifre:"); if(!pass||pass!==currentPassword){ alert("Şifre yanlış."); return; } const a=document.createElement("a"); a.href=currentMediaData.data; a.download=currentMediaData.name||"gizli"; a.click(); };
if(lightModeBtn){ lightModeBtn.onclick=()=>{ const isLampOn=remoteVideo.classList.contains("lamp-on"); if(isLampOn){ remoteVideo.classList.remove("lamp-on"); remoteVideo.classList.remove("light-mode"); lightModeBtn.classList.remove("active"); } else { remoteVideo.classList.add("lamp-on"); remoteVideo.classList.add("light-mode"); lightModeBtn.classList.add("active"); remoteVideo.style.filter="brightness(1.3) contrast(1.1)"; setTimeout(()=>{ if(remoteVideo.classList.contains("lamp-on")) remoteVideo.style.filter="brightness(1.15)"; }, 300); } }; }
let _phoneWasCamOn=false; let _phoneWasMicOn=false;
let _phoneCallOutgoing = false;
if(phoneModeBtn){
  phoneModeBtn.onclick = async ()=>{
    if(_phoneCallOutgoing){ _phoneCallOutgoing = false; if(phoneModeBtn) phoneModeBtn.textContent = "📞"; socket.emit("phone-call-cancel", {from: myRealUsername, room: currentRoom}); showToast("📞 İptal"); return; }
    if(isPhoneMode){
      isPhoneMode=false;
      document.body.classList.remove("phone-mode");
      if(phoneCallUI) phoneCallUI.style.display="none";
      if(phoneModeBtn) phoneModeBtn.classList.remove("active");
      if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); }
      micEnabled=false;
      if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
      socket.emit("phone-call-end", {from: myRealUsername});
      socket.emit("phone-mode", false);
      return;
    }
    _phoneCallOutgoing = true;
    const origText = phoneModeBtn.textContent;
    phoneModeBtn.textContent="⏳";
    socket.emit("phone-call-request", {from: myRealUsername, room: currentRoom});
    setTimeout(()=>{ _phoneCallOutgoing=false; if(phoneModeBtn) phoneModeBtn.textContent=origText||"📞"; }, 10000);
  };
}
socket.on("phone-mode",(enabled)=>{
  isPhoneMode=enabled;
  document.body.classList.toggle("phone-mode",enabled);
  phoneModeBtn.classList.toggle("active",enabled);
  if(enabled){
    phoneCallUI.style.display="flex";
    if(remoteVideo) remoteVideo.style.display="none";
    if(candleContainer) candleContainer.classList.remove("show");
    volumeSlider.value=0.15; remoteVideo.volume=0.15; remoteVideo.muted=false;
    if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=true;}catch(e){} }); }
    micEnabled=true;
    if(micBtn){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; }
  } else {
    phoneCallUI.style.display="none";
    if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); }
    micEnabled=false;
    if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
    if(remoteVideo&&remoteVideo.srcObject) remoteVideo.style.display="block";
    if(myVideoContainer) myVideoContainer.style.display="block";
  }
});
socket.on("phone-call-end", ()=>{
  isPhoneMode=false;
  document.body.classList.remove("phone-mode");
  if(phoneModeBtn) phoneModeBtn.classList.remove("active");
  phoneCallUI.style.display="none";
  if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); }
  micEnabled=false;
  if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
  if(remoteVideo&&remoteVideo.srcObject) remoteVideo.style.display="block";
  if(myVideoContainer) myVideoContainer.style.display="block";
});
socket.on("general-pause", ()=>{ if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); localStream.getVideoTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); } micEnabled=false; camEnabled=false; if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; } if(camBtn){ camBtn.classList.add("offIcon"); } if(remoteVideo){ try{remoteVideo.pause();}catch(e){} remoteVideo.muted=true; remoteVideo.style.display="none"; } if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; } });
socket.on("peer-paused", ()=>{ if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); localStream.getVideoTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); } micEnabled=false; camEnabled=false; if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; } if(camBtn){ camBtn.classList.add("offIcon"); } if(remoteVideo){ try{remoteVideo.pause();}catch(e){} remoteVideo.muted=true; remoteVideo.style.display="none"; } if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; } });

// V18.19 - 14dk offline oto Google kilit + geri tus korumasi
function clearOfflineTimer(){ if(offlineTimer){ clearTimeout(offlineTimer); offlineTimer=null; } }
function autoLockToGoogle(reason){
  console.log("14DK OFFLINE KILIT", reason);
  clearOfflineTimer();
  try{ if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); } if(peer){ try{peer.destroy();}catch(e){} peer=null; } }catch(e){}
  if(mainScreen) mainScreen.style.display="none";
  if(roomScreen) roomScreen.style.display="none";
  if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
  if(phoneCallUI) phoneCallUI.style.display="none";
  if(myVideoContainer) myVideoContainer.style.display="none";
  const fakeCalcEl = document.getElementById("fakeCalc");
  if(fakeCalcEl) fakeCalcEl.style.display="flex";
  document.title = "Google";
  try{ history.pushState(null, "", location.href); history.replaceState(null, "", location.href); localStorage.removeItem("gorgor_current_room"); sessionStorage.clear(); }catch(e){}
  try{ socket.emit("leave-room", currentRoom); }catch(e){}
  currentRoom=""; isPhoneMode=false; document.body.classList.remove("phone-mode");
}
function startOfflineCountdown(){ clearOfflineTimer(); offlineTimer = setTimeout(()=>{ autoLockToGoogle("14dk offline"); }, FOURTEEN_MIN); }
window.addEventListener('popstate', ()=>{
  const fakeCalcEl = document.getElementById("fakeCalc");
  if(fakeCalcEl && fakeCalcEl.style.display!=="none"){
    if(mainScreen) mainScreen.style.display="none";
    if(roomScreen) roomScreen.style.display="none";
    history.pushState(null, "", location.href);
  }
});
history.pushState(null, "", location.href);

const wheelOverlay=document.getElementById("wheelOverlay");
const wheelHour=document.getElementById("wheelHour");
const wheelMinute=document.getElementById("wheelMinute");
const wheelOk=document.getElementById("wheelOk");
const wheelCancel=document.getElementById("wheelCancel");
const openWheelBtn=document.getElementById("openWheelBtn");
function openWheel(){ if(!wheelOverlay) return; const total=defaultExpire; const h=Math.floor(total/3600); const m=Math.floor((total%3600)/60); if(wheelHour) wheelHour.value=h; if(wheelMinute) wheelMinute.value=m; wheelOverlay.classList.add("show"); }
function closeWheel(){ if(wheelOverlay) wheelOverlay.classList.remove("show"); }
function wheelStep(type,dir){ if(type==='hour'&&wheelHour){ let v=parseInt(wheelHour.value)||0; v+=dir; if(v<0) v=23; if(v>23) v=0; wheelHour.value=v; } if(type==='minute'&&wheelMinute){ let v=parseInt(wheelMinute.value)||0; v+=dir; if(v<0) v=59; if(v>59) v=0; wheelMinute.value=v; } }
function setWheelQuick(sec){ if(wheelHour&&wheelMinute){ wheelHour.value=Math.floor(sec/3600); wheelMinute.value=Math.floor((sec%3600)/60); } }
if(openWheelBtn){ openWheelBtn.onclick=()=>{ openWheel(); }; }
if(defaultSelfDestructSelect){ defaultSelfDestructSelect.onchange=()=>{ if(defaultSelfDestructSelect.value==="custom"){ openWheel(); return; } let val=parseInt(defaultSelfDestructSelect.value); if(val>MAX_SEC) val=MAX_SEC; defaultExpire=val; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); }; }
if(wheelOk){ wheelOk.onclick=()=>{ const h=parseInt(wheelHour.value)||0; const m=parseInt(wheelMinute.value)||0; let sec=h*3600+m*60; if(sec<300) sec=300; if(sec>86400) sec=86400; defaultExpire=sec; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect){ let customOpt=defaultSelfDestructSelect.querySelector('option[value="custom_display"]'); if(!customOpt){ customOpt=document.createElement("option"); customOpt.value="custom_display"; defaultSelfDestructSelect.appendChild(customOpt); } customOpt.textContent=formatTime(defaultExpire)+" (wheel)"; customOpt.selected=true; } closeWheel(); }; }
if(wheelCancel){ wheelCancel.onclick=()=>closeWheel(); }
if(wheelOverlay){ wheelOverlay.addEventListener("click",(e)=>{ if(e.target===wheelOverlay) closeWheel(); }); }
function doPanic(){
  if(!confirm("🚨 PANİK: Tüm mesajlar silinsin mi?")) return;
  try{
    if(peer){ try{peer.destroy();}catch(e){} peer=null; }
    if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); localStream=null; }
    if(remoteVideo){ try{remoteVideo.pause();}catch(e){} try{remoteVideo.srcObject=null;}catch(e){} try{remoteVideo.removeAttribute("src");}catch(e){} try{remoteVideo.load();}catch(e){} remoteVideo.style.display="none"; }
    if(myVideo){ try{myVideo.pause();}catch(e){} try{myVideo.srcObject=null;}catch(e){} myVideo.style.display="none"; }
    if(myVideoContainer) myVideoContainer.style.display="none";
    if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
    if(phoneCallUI) phoneCallUI.style.display="none";
    if(mainScreen) mainScreen.style.display="none";
    if(roomScreen) roomScreen.style.display="none";
  }catch(e){}
  messages.innerHTML=""; sentMessages.clear();
  activeTimers.forEach(t=>{ if(t.interval) clearInterval(t.interval); if(t.timeout) clearTimeout(t.timeout); }); activeTimers.clear();
  socket.emit("panic");
  window.open("https://www.google.com","_blank");
  document.body.innerHTML='<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:white;color:black;font-family:Arial;"><div style="text-align:center;"><h1 style="font-size:80px;">G</h1><input style="width:400px;height:40px;border:1px solid #ddd;border-radius:20px;padding:10px;" placeholder="Google\'da ara"><p style="margin-top:20px;opacity:0.5;">Geçmiş silindi</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;">Geri Dön</button></div></div>';
}
if(panicBtn) panicBtn.onclick=doPanic;
socket.on("panic",()=>{
  try{
    if(peer){ try{peer.destroy();}catch(e){} peer=null; }
    if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); localStream=null; }
    if(remoteVideo){ try{remoteVideo.pause();}catch(e){} try{remoteVideo.srcObject=null;}catch(e){} try{remoteVideo.removeAttribute("src");}catch(e){} try{remoteVideo.load();}catch(e){} remoteVideo.style.display="none"; }
    if(myVideo){ try{myVideo.pause();}catch(e){} try{myVideo.srcObject=null;}catch(e){} myVideo.style.display="none"; }
    if(myVideoContainer) myVideoContainer.style.display="none";
    if(candleContainer){ candleContainer.style.display="none"; }
    if(phoneCallUI) phoneCallUI.style.display="none";
  }catch(e){}
  messages.innerHTML=""; sentMessages.clear();
  activeTimers.forEach(t=>{ if(t.interval) clearInterval(t.interval); if(t.timeout) clearTimeout(t.timeout); }); activeTimers.clear();
  document.body.innerHTML='<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:white;color:black;font-family:Arial;"><div style="text-align:center;"><h1 style="font-size:80px;">G</h1><input style="width:400px;height:40px;border:1px solid #ddd;border-radius:20px;padding:10px;" placeholder="Google\'da ara"><p style="margin-top:20px;opacity:0.5;">Karşı taraf panik attı - program kapandı</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;">Geri Dön</button></div></div>';
});
let drawing=false;
drawCanvas.addEventListener("mousedown", e=>{ drawing=true; const ctx=window._drawCtx; if(!ctx) return; ctx.beginPath(); ctx.moveTo(e.clientX,e.clientY); });
drawCanvas.addEventListener("touchstart", e=>{ drawing=true; const ctx=window._drawCtx; if(!ctx) return; const t=e.touches[0]; ctx.beginPath(); ctx.moveTo(t.clientX,t.clientY); });
drawCanvas.addEventListener("mousemove", e=>{ if(!drawing) return; const ctx=window._drawCtx; if(!ctx) return; ctx.lineTo(e.clientX,e.clientY); ctx.stroke(); });
drawCanvas.addEventListener("touchmove", e=>{ if(!drawing) return; e.preventDefault(); const ctx=window._drawCtx; if(!ctx) return; const t=e.touches[0]; ctx.lineTo(t.clientX,t.clientY); ctx.stroke(); }, {passive:false});
drawCanvas.addEventListener("mouseup", ()=>drawing=false);
drawCanvas.addEventListener("touchend", ()=>drawing=false);
drawClear.onclick=()=>{ const ctx=window._drawCtx; if(ctx){ ctx.fillStyle="#000"; ctx.fillRect(0,0,window.innerWidth,window.innerHeight); } };
drawClose.onclick=()=>{ drawOverlay.style.display="none"; };
drawSend.onclick=async()=>{ const dataUrl=drawCanvas.toDataURL("image/jpeg",0.7); let expire=getExpireFromSelect(); const enc=await encryptText(dataUrl,currentPassword); const msgId=await addMyMediaMessage(dataUrl,"image",expire,"cizim.jpg"); socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType:"image",sentAt:Date.now(),deleteAt:Date.now()+expire*1000}); drawOverlay.style.display="none"; };
window.addEventListener("beforeunload",()=>{ if(peer) try{peer.destroy();}catch(e){} if(localStream) try{localStream.getTracks().forEach(t=>t.stop());}catch(e){} });
let lastScale=1, currentScale=1;
if(remoteVideo){ remoteVideo.style.transition="transform 0.1s"; remoteVideo.addEventListener('touchstart', e=>{ if(e.touches.length===2&&!document.fullscreenElement&&!isPhoneMode){ e.preventDefault(); const dist=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); lastScale=dist; } }, {passive:false}); remoteVideo.addEventListener('touchmove', e=>{ if(e.touches.length===2&&!document.fullscreenElement&&!isPhoneMode){ e.preventDefault(); const dist=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); currentScale=Math.min(Math.max(1,currentScale*(dist/lastScale)),4); remoteVideo.style.transform=`scale(${currentScale})`; lastScale=dist; } }, {passive:false}); remoteVideo.addEventListener('touchend', ()=>{ if(currentScale<1.1){ remoteVideo.style.transform="scale(1)"; currentScale=1; } }); }
window.wheelStep=wheelStep; window.setWheelQuick=setWheelQuick; window.openWheel=openWheel; window.closeWheel=closeWheel;

let waitingDotsInterval = null;
let waitingDotsCount = 0;
function startWaitingDots(){
  const el = document.getElementById("opponentStatusText");
  if(!el) return;
  stopWaitingDots();
  el.classList.add("waiting");
  waitingDotsCount = 0;
  el.textContent = ".";
  waitingDotsInterval = setInterval(()=>{
    waitingDotsCount = (waitingDotsCount + 1) % 3;
    el.textContent = [".", "..", "..."][waitingDotsCount];
  }, 400);
}
function stopWaitingDots(){
  if(waitingDotsInterval){ clearInterval(waitingDotsInterval); waitingDotsInterval = null; }
  const el = document.getElementById("opponentStatusText");
  if(el) el.classList.remove("waiting");
}
document.addEventListener("DOMContentLoaded", ()=>{
  const el = document.getElementById("opponentStatusText");
  if(!el) return;
  if(el.textContent.toLowerCase().includes("bekleniyor")) startWaitingDots();
});

let _videoRequestPending = false;
let _phoneRequestPending = false;
socket.on("phone-call-request", async (data)=>{
  if(_phoneRequestPending) return;
  _phoneRequestPending = true;
  const from = data.from || "Karşı taraf";
  const kabul = confirm(`${from} sesli arama başlattı. Kabul ediyor musun?\\n\\nTamam = Kabul et, mikrofonun açılsın\\nİptal = Reddet`);
  if(kabul){
    try{
      if(!localStream){ try{ await startCamera(currentQuality, currentFacingMode); }catch(e){} }
      if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=true;}catch(e){} }); }
      micEnabled=true; if(micBtn){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; }
      volumeSlider.value=0.15; remoteVideo.volume=0.15; remoteVideo.muted=false;
      isPhoneMode=true; document.body.classList.add("phone-mode"); if(phoneModeBtn) phoneModeBtn.classList.add("active");
      if(phoneCallUI) phoneCallUI.style.display="flex";
      if(remoteVideo) remoteVideo.style.display="none";
      if(candleContainer){ candleContainer.classList.remove("show"); }
      socket.emit("phone-call-accept", {from: myRealUsername});
    }catch(e){ socket.emit("phone-call-decline", {from: myRealUsername}); }
  } else {
    socket.emit("phone-call-decline", {from: myRealUsername});
  }
  _phoneRequestPending = false;
});
socket.on("phone-call-accept", (data)=>{
  if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=true;}catch(e){} }); }
  micEnabled=true; if(micBtn){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; }
  volumeSlider.value=0.15; remoteVideo.volume=0.15; remoteVideo.muted=false;
  isPhoneMode=true; document.body.classList.add("phone-mode"); if(phoneModeBtn) phoneModeBtn.classList.add("active");
  if(phoneCallUI) phoneCallUI.style.display="flex";
  if(remoteVideo) remoteVideo.style.display="none";
});
socket.on("phone-call-decline", (data)=>{
  alert(`${data.from||"Karşı taraf"} sesli aramayı reddetti`);
  isPhoneMode=false; document.body.classList.remove("phone-mode"); if(phoneModeBtn) phoneModeBtn.classList.remove("active");
  if(phoneCallUI) phoneCallUI.style.display="none";
  if(localStream){ localStream.getAudioTracks().forEach(t=>{ try{t.enabled=false;}catch(e){} }); }
  micEnabled=false; if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
  if(remoteVideo&&remoteVideo.srcObject) remoteVideo.style.display="block";
  if(myVideoContainer) myVideoContainer.style.display="block";
});
socket.on("video-call-request", async (data)=>{
    if(_videoRequestPending) return;
    _videoRequestPending = true;
    const from = data.from || "Karşı taraf";
    const withMic = data.withMic;
    const kabul = confirm(`${from} kameralı arama başlattı${withMic?" (sesli)":""}. Kabul edip sen de kameranı açmak ister misin?\\nTamam = Kabul et`);
    if(kabul){
      try{
        if(!localStream){ await startCamera(currentQuality, currentFacingMode); }
        localStream.getVideoTracks().forEach(t=>t.enabled=true);
        camEnabled=true; if(camBtn) camBtn.classList.remove("offIcon");
        if(withMic){ localStream.getAudioTracks().forEach(t=>t.enabled=true); micEnabled=true; if(micBtn){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; } }
        if(peer&&peer._pc&&localStream){
          const vt=localStream.getVideoTracks()[0]; const at=localStream.getAudioTracks()[0];
          if(vt){ const senders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="video"); for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} } }
          if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} } }
        }
        if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
        if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block";
        socket.emit("video-call-accept", {from: myRealUsername});
      }catch(e){ socket.emit("video-call-decline", {from: myRealUsername}); }
    } else {
      socket.emit("video-call-decline", {from: myRealUsername});
    }
    _videoRequestPending = false;
  });
socket.on("video-call-accept", (data)=>{
    if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=true); localStream.getAudioTracks().forEach(t=>t.enabled=true); }
    camEnabled=true; micEnabled=true;
    if(camBtn) camBtn.classList.remove("offIcon");
    if(micBtn){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; }
    if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
    if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block";
  });
socket.on("video-call-decline", (data)=>{
    alert(`${data.from||"Karşı taraf"} kamera isteğini reddetti`);
    if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=false); }
    camEnabled=false; if(camBtn) camBtn.classList.add("offIcon");
  });
socket.on("video-call-end", ()=>{
    if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=false); localStream.getAudioTracks().forEach(t=>t.enabled=false); }
    camEnabled=false; micEnabled=false;
    if(camBtn) camBtn.classList.add("offIcon");
    if(micBtn){ micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
  });


// ================= V19 TUM OZELLIKLER =================
// 1. SCREENSHOT KORUMASI
function initScreenshotProtection(){
  if(!screenshotProtectionEnabled) return;
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'PrintScreen' || e.keyCode === 44 || (e.ctrlKey && e.shiftKey && e.key === 'I')){
      handleScreenshotDetected('keys');
    }
  });
  document.addEventListener('keyup', (e)=>{
    if(e.key === 'PrintScreen' || e.keyCode === 44){
      handleScreenshotDetected('PrintScreen');
    }
  });
  window.addEventListener('blur', ()=>{
    if(document.visibilityState === 'hidden' && screenshotProtectionEnabled){
      // hafif blur, tam ekran goruntusu degil ama odak kaybi
      if(messages) messages.classList.add('screenshot-blur-active');
      setTimeout(()=>{ if(messages) messages.classList.remove('screenshot-blur-active'); }, 2000);
    }
  });
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden && screenshotProtectionEnabled){
      if(messages) messages.classList.add('screenshot-blur-active');
      setTimeout(()=>{ if(messages) messages.classList.remove('screenshot-blur-active'); }, 3000);
    } else {
      if(messages) messages.classList.remove('screenshot-blur-active');
    }
  });
}
function handleScreenshotDetected(source){
  if(!currentRoom) return;
  console.log('SCREENSHOT DETECTED', source);
  // kendi ekrani blurla
  if(messages){
    messages.classList.add('screenshot-blur-active');
    setTimeout(()=>messages.classList.remove('screenshot-blur-active'), 3000);
  }
  // karsi tarafa bildir
  socket.emit('screenshot-detected', {source, time: Date.now()});
  // local toast
  showToast('📸 Ekran görüntüsü koruması aktif - mesajlar bulanıklaştırıldı');
}
socket.on('screenshot-alert', (data)=>{
  const from = data.from || 'Karşı taraf';
  showToast(`📸 ${from} ekran görüntüsü aldı! ${formatClock(new Date(data.time))}`);
  if(messages){
    messages.classList.add('screenshot-blur-active');
    setTimeout(()=>messages.classList.remove('screenshot-blur-active'), 4000);
  }
});

// 2. PANIK 2.0 - clipboard temizle + localStorage temizle + fake arama ekrani
function enhancedPanic(){
  try{
    // clipboard temizle
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText('').catch(()=>{});
    }
    // localStorage'dan oda bilgilerini sil (guvenlik modu hariç)
    localStorage.removeItem('gorgor_last_room');
    localStorage.removeItem('gorgor_last_user');
    sessionStorage.clear();
    // medya trackleri durdur
    if(localStream){
      localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} });
    }
    if(peer){
      try{ peer.destroy(); }catch(e){}
      peer = null;
    }
    // fake arama ekrani goster sonra Google'a at
    const fakeCallDiv = document.createElement('div');
    fakeCallDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:system-ui;';
    fakeCallDiv.innerHTML = '<div style="font-size:80px;margin-bottom:20px;">📞</div><div style="font-size:22px;margin-bottom:8px;">Anne arıyor...</div><div style="font-size:14px;opacity:0.6;">kaydırmalı cevapla</div><div style="margin-top:40px;display:flex;gap:60px;"><div style="width:60px;height:60px;border-radius:50%;background:#ff3b30;display:flex;align-items:center;justify-content:center;font-size:30px;">📵</div><div style="width:60px;height:60px;border-radius:50%;background:#4cd964;display:flex;align-items:center;justify-content:center;font-size:30px;">📞</div></div>';
    document.body.appendChild(fakeCallDiv);
    setTimeout(()=>{
      document.body.innerHTML = '';
      window.location.href = 'https://www.google.com';
    }, 1200);
  }catch(e){
    window.location.href = 'https://www.google.com';
  }
}
// panicBtn'i gelistirilmis panik ile degistir
document.addEventListener('DOMContentLoaded', ()=>{
  const pm=document.getElementById("panicConfirmModal"); if(pm){pm.style.display="none"; pm.classList.remove("show");}
  const sp=document.getElementById("securitySettingsPanel"); if(sp){sp.style.display="none"; sp.classList.remove("show");}
  const wpm=document.getElementById("wheelPersistModal"); if(wpm){wpm.style.display="none"; wpm.classList.remove("show");}
  if(panicBtn){
    panicBtn.removeEventListener('click', panicBtn._oldListener||(()=>{}));
    panicBtn.onclick = function(){
      const cfg = (typeof loadSecurityConfig === 'function') ? loadSecurityConfig() : {confirmRed:false};
      if(cfg.confirmRed && typeof showPanicConfirm === 'function'){ showPanicConfirm("Kırmızı panik?", ()=>{ enhancedPanic(); }); } else { enhancedPanic(); }
    };
  }
  if(skullPanicBtn){
    skullPanicBtn.onclick = function(){
      const cfg = (typeof loadSecurityConfig === 'function') ? loadSecurityConfig() : {confirmSkull:true, skullAction:'full'};
      const doSkull = ()=>{ if(cfg.skullAction === 'escape') enhancedPanic(); else skullPanicFullDelete(); };
      if(cfg.confirmSkull && typeof showPanicConfirm === 'function'){ showPanicConfirm("Kurukafa - silinecek?", doSkull); } else { doSkull(); }
    };
  }
  initFlipPanicSensor();
  if(typeof initSecuritySettings === 'function') initSecuritySettings();
  if(typeof initWheelPersistFeature === 'function') initWheelPersistFeature();
  const ct=document.getElementById("chatToggle"); if(ct){ ct.addEventListener('click', ()=>{ ct.classList.remove("hasNewMessage"); const fp=document.getElementById("floatingPill"); if(fp) fp.classList.remove("hasNewMessage"); }); }
});

// 3. FAKE BILDIRIM - Hesap Makinesi bildirimi

// ================= V20 - KURUKAFA TAM YOK ET + MUM SONME + GOOGLE KACIS =================
function skullPanicFullDelete(){
  console.log("💀 SKULL PANIC - TAM YOK ET BASLADI");
  try{
    if(messages){ messages.innerHTML = ""; }
    sentMessages.clear();
    activeTimers.forEach(t=>{ if(t.interval) clearInterval(t.interval); if(t.timeout) clearTimeout(t.timeout); });
    activeTimers.clear();
    if(socket && currentRoom){ socket.emit("panic"); }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText('').catch(()=>{}); }
    try{
      localStorage.removeItem("gorgor_last_room");
      localStorage.removeItem("gorgor_last_user");
      localStorage.removeItem("gorgor_current_room");
      sessionStorage.clear();
    }catch(e){}
    try{
      if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); localStream=null; }
      if(peer){ try{peer.destroy();}catch(e){} peer=null; }
      if(remoteVideo){ try{remoteVideo.pause();}catch(e){} try{remoteVideo.srcObject=null;}catch(e){} }
      if(myVideo){ try{myVideo.pause();}catch(e){} try{myVideo.srcObject=null;}catch(e){} }
    }catch(e){}
    if(candleContainer){
      candleContainer.classList.add("show");
      candleContainer.style.display = "flex";
      candleContainer.classList.add("candle-extinguish");
      const flame = candleContainer.querySelector(".flame");
      if(flame){
        const smoke = document.createElement("div");
        smoke.className = "candle-smoke";
        candleContainer.querySelector(".candle")?.appendChild(smoke);
        setTimeout(()=>{ try{smoke.remove();}catch(e){} }, 2000);
      }
    }
    setTimeout(()=>{
      const fakeCallDiv = document.createElement('div');
      fakeCallDiv.className = "skull-panic-overlay";
      fakeCallDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:system-ui;';
      fakeCallDiv.innerHTML = '<div style="font-size:80px;margin-bottom:20px;">📞</div><div style="font-size:22px;margin-bottom:8px;">Anne arıyor...</div><div style="font-size:14px;opacity:0.6;">kaydırmalı cevapla</div><div style="margin-top:40px;display:flex;gap:60px;"><div style="width:60px;height:60px;border-radius:50%;background:#ff3b30;display:flex;align-items:center;justify-content:center;font-size:30px;">📵</div><div style="width:60px;height:60px;border-radius:50%;background:#4cd964;display:flex;align-items:center;justify-content:center;font-size:30px;">📞</div></div><div style="margin-top:20px;font-size:10px;opacity:0.4;">💀 Geçmiş silindi - Gizlice kaçış</div>';
      document.body.appendChild(fakeCallDiv);
      setTimeout(()=>{
        try{ document.body.innerHTML = ''; window.location.href = 'https://www.google.com'; }catch(e){ window.location.href = 'https://www.google.com'; }
      }, 1200);
    }, 800);
  }catch(e){ console.log("skull panic error", e); window.location.href = 'https://www.google.com'; }
}

// ================= V20 - TERS CEVIRINCE OTOMATIK FULL BLUR + PANIK =================
let flipPanicEnabled = false;
let flipPanicArmed = false;
let lastFlipTrigger = 0;
let flipOrientationHandler = null;
let flipDebounceTimer = null;

function initFlipPanicSensor(){
  const toggle = document.getElementById("flipPanicToggle");
  if(!toggle) return;
  flipPanicEnabled = localStorage.getItem("gorgor_flip_panic") === "1";
  toggle.checked = flipPanicEnabled;
  toggle.addEventListener("change", ()=>{
    flipPanicEnabled = toggle.checked;
    localStorage.setItem("gorgor_flip_panic", flipPanicEnabled ? "1" : "0");
    if(flipPanicEnabled){
      armFlipSensor();
      showToast("📱 Ters çevirince panik AKTİF - program açıkken çalışır");
      if(typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"){
        DeviceOrientationEvent.requestPermission().then(state=>{ if(state === "granted"){ armFlipSensor(); } }).catch(()=>{});
      }
    } else {
      disarmFlipSensor();
      showToast("📱 Ters çevirince panik KAPALI");
    }
  });
  if(flipPanicEnabled){
    const checkMain = setInterval(()=>{
      if(mainScreen && mainScreen.style.display !== "none" && mainScreen.style.display !== ""){
        armFlipSensor();
        clearInterval(checkMain);
      }
    }, 1000);
  }
}

function armFlipSensor(){
  if(flipPanicArmed) return;
  if(!flipPanicEnabled) return;
  if(!mainScreen || mainScreen.style.display === "none") return;
  flipPanicArmed = true;
  console.log("📱 Flip sensor ARMED - FULL BLUR");
  flipOrientationHandler = (e)=>{
    if(!flipPanicEnabled || !flipPanicArmed) return;
    if(!mainScreen || mainScreen.style.display === "none") return;
    if(document.hidden) return;
    const beta = e.beta;
    const gamma = e.gamma;
    if(beta === null) return;
    const isFaceDown = Math.abs(beta) > 150;
    const isUpsideDown = Math.abs(beta) > 140 && Math.abs(gamma) > 60;
    if(isFaceDown || isUpsideDown){
      if(Date.now() - lastFlipTrigger < 10000) return;
      if(flipDebounceTimer) clearTimeout(flipDebounceTimer);
      flipDebounceTimer = setTimeout(()=>{
        if(!flipPanicEnabled) return;
        if(Date.now() - lastFlipTrigger < 10000) return;
        triggerFlipPanic();
      }, 600);
    } else {
      if(flipDebounceTimer){ clearTimeout(flipDebounceTimer); flipDebounceTimer = null; }
    }
  };
  window.addEventListener("deviceorientation", flipOrientationHandler, true);
}

function disarmFlipSensor(){
  flipPanicArmed = false;
  if(flipOrientationHandler){
    window.removeEventListener("deviceorientation", flipOrientationHandler, true);
    flipOrientationHandler = null;
  }
  if(flipDebounceTimer){ clearTimeout(flipDebounceTimer); flipDebounceTimer = null; }
  document.body.classList.remove("flip-blur-active");
}

function triggerFlipPanic(){
  if(!flipPanicEnabled) return;
  const cfg = (typeof loadSecurityConfig === 'function') ? loadSecurityConfig() : {flipAction:'red', confirmFlip:false, triggers:{flip:true}};
  if(cfg.triggers && cfg.triggers.flip === false) return;
  if(Date.now() - lastFlipTrigger < 10000) return;
  lastFlipTrigger = Date.now();
  document.body.classList.add("flip-blur-active");
  showToast("📱 Ters çevrildi - buğulandi");
  try{ if(navigator.vibrate) navigator.vibrate([100,50,100]); }catch(e){}
  setTimeout(()=>{
    document.body.classList.remove("flip-blur-active");
    const flipAction = cfg.flipAction || 'red';
    const needConfirm = cfg.confirmFlip;
    const doFlip = ()=>{ if(flipAction === 'skull'){ skullPanicFullDelete(); } else if(flipAction === 'blur'){ showToast("🌫 Buğulu"); document.body.classList.add("flip-blur-active"); setTimeout(()=>document.body.classList.remove("flip-blur-active"),3000); } else if(flipAction === 'off'){ return; } else { enhancedPanic(); } };
    if(needConfirm && typeof showPanicConfirm === 'function'){ showPanicConfirm("Ters çevirme panik?", doFlip); } else { doFlip(); }
  }, 1200);
}


let securityConfigCache = null;
function defaultSecurityConfig(){ return {skullAction:'full',redAction:'escape',flipAction:'red',confirmSkull:true,confirmRed:false,confirmFlip:false,triggers:{flip:true,shake:false,volDown3:false,volUp3:false,power2:false,volBoth:false,threeFinger:false,pocket:false}}; }
function loadSecurityConfig(){ try{const saved=localStorage.getItem("gorgor_security_config"); if(saved){const parsed=JSON.parse(saved); return{...defaultSecurityConfig(),...parsed,triggers:{...defaultSecurityConfig().triggers,...(parsed.triggers||{})}};}}catch(e){} return defaultSecurityConfig(); }
function saveSecurityConfig(cfg){ try{localStorage.setItem("gorgor_security_config",JSON.stringify(cfg)); securityConfigCache=cfg;}catch(e){} }
function initSecuritySettings(){
  const panel=document.getElementById("securitySettingsPanel"); const btn=document.getElementById("securitySettingsBtn"); const closeBtn=document.getElementById("closeSecurityPanel"); const saveBtn=document.getElementById("saveSecuritySettings");
  if(btn&&panel){btn.onclick=()=>{showSecurityPanel();};}
  if(closeBtn){closeBtn.onclick=()=>{hideSecurityPanel();};}
  if(panel){panel.addEventListener("click",(e)=>{if(e.target===panel) hideSecurityPanel();});}
  if(saveBtn){saveBtn.onclick=()=>{const cfg={skullAction:document.getElementById("skullActionSelect")?.value||'full',redAction:document.getElementById("redActionSelect")?.value||'escape',flipAction:document.getElementById("flipActionSelect")?.value||'red',confirmSkull:!!document.getElementById("confirmSkull")?.checked,confirmRed:!!document.getElementById("confirmRed")?.checked,confirmFlip:!!document.getElementById("confirmFlip")?.checked,triggers:{flip:!!document.getElementById("triggerFlip")?.checked,shake:!!document.getElementById("triggerShake")?.checked,volDown3:!!document.getElementById("triggerVolDown3")?.checked,volUp3:!!document.getElementById("triggerVolUp3")?.checked,power2:!!document.getElementById("triggerPower2")?.checked,volBoth:!!document.getElementById("triggerVolBoth")?.checked,threeFinger:!!document.getElementById("triggerThreeFinger")?.checked,pocket:!!document.getElementById("triggerPocket")?.checked}}; saveSecurityConfig(cfg); applySecurityTriggers(cfg); hideSecurityPanel(); showToast("🛡 Kaydedildi");};}
  const perMsgSelect=document.getElementById("perMessageTimerSelect"); if(perMsgSelect){perMsgSelect.addEventListener("change",()=>{if(perMsgSelect.value==="custom_wheel"){if(typeof openWheel==='function') openWheel();}});}
  const cfg=loadSecurityConfig(); applySecuritySettingsToUI(cfg); applySecurityTriggers(cfg);
  setTimeout(()=>{ const m=document.getElementById("panicConfirmModal"); if(m){m.style.display="none"; m.classList.remove("show");} const s=document.getElementById("securitySettingsPanel"); if(s){s.style.display="none"; s.classList.remove("show");} },100);
}
function showSecurityPanel(){const panel=document.getElementById("securitySettingsPanel"); if(!panel) return; const cfg=loadSecurityConfig(); applySecuritySettingsToUI(cfg); panel.style.display="flex"; panel.classList.add("show");}
function hideSecurityPanel(){const panel=document.getElementById("securitySettingsPanel"); if(panel){panel.style.display="none"; panel.classList.remove("show");}}
function applySecuritySettingsToUI(cfg){const setVal=(id,val)=>{const el=document.getElementById(id); if(el) el.value=val;}; const setChk=(id,val)=>{const el=document.getElementById(id); if(el) el.checked=!!val;}; setVal("skullActionSelect",cfg.skullAction); setVal("redActionSelect",cfg.redAction); setVal("flipActionSelect",cfg.flipAction); setChk("confirmSkull",cfg.confirmSkull); setChk("confirmRed",cfg.confirmRed); setChk("confirmFlip",cfg.confirmFlip); setChk("triggerFlip",cfg.triggers.flip); setChk("triggerShake",cfg.triggers.shake); setChk("triggerVolDown3",cfg.triggers.volDown3); setChk("triggerVolUp3",cfg.triggers.volUp3); setChk("triggerPower2",cfg.triggers.power2); setChk("triggerVolBoth",cfg.triggers.volBoth); setChk("triggerThreeFinger",cfg.triggers.threeFinger); setChk("triggerPocket",cfg.triggers.pocket); flipPanicEnabled=!!cfg.triggers.flip; if(flipPanicEnabled) armFlipSensor(); else disarmFlipSensor();}
let securityTriggersArmed=false; let volDownCount=0,volUpCount=0,volDownTimer=null,volUpTimer=null,lastPowerHide=0;
function applySecurityTriggers(cfg){ if(securityTriggersArmed) disarmSecurityTriggers(); securityTriggersArmed=true; if(cfg.triggers.shake){window.addEventListener("devicemotion",handleShakeMotion,true);} if(cfg.triggers.volDown3||cfg.triggers.volUp3||cfg.triggers.volBoth){window.addEventListener("keydown",handleVolumeKeys,true);} if(cfg.triggers.power2){document.addEventListener("visibilitychange",handlePowerDouble,true);} if(cfg.triggers.threeFinger){window.addEventListener("touchstart",handleThreeFinger,{passive:false});} }
function disarmSecurityTriggers(){ window.removeEventListener("devicemotion",handleShakeMotion,true); window.removeEventListener("keydown",handleVolumeKeys,true); document.removeEventListener("visibilitychange",handlePowerDouble,true); window.removeEventListener("touchstart",handleThreeFinger,{passive:false}); securityTriggersArmed=false; }
function handleShakeMotion(e){const acc=e.accelerationIncludingGravity; if(!acc) return; const force=Math.abs(acc.x)+Math.abs(acc.y)+Math.abs(acc.z); if(force>35){triggerSecurityAction("shake");}}
function handleVolumeKeys(e){const cfg=loadSecurityConfig(); if(e.key==="AudioVolumeDown"||e.key==="VolumeDown"||(e.key==="ArrowDown"&&e.ctrlKey)){if(cfg.triggers.volDown3){volDownCount++; clearTimeout(volDownTimer); volDownTimer=setTimeout(()=>{volDownCount=0;},2000); if(volDownCount>=3){volDownCount=0; triggerSecurityAction("volDown3");}}} if(e.key==="AudioVolumeUp"||e.key==="VolumeUp"||(e.key==="ArrowUp"&&e.ctrlKey)){if(cfg.triggers.volUp3){volUpCount++; clearTimeout(volUpTimer); volUpTimer=setTimeout(()=>{volUpCount=0;},2000); if(volUpCount>=3){volUpCount=0; triggerSecurityAction("volUp3");}}} if(cfg.triggers.volBoth){if(e.key==="AudioVolumeDown"||e.key==="VolumeDown"){const now=Date.now(); if(window._lastVolUp&&now-window._lastVolUp<800){triggerSecurityAction("volBoth");}} if(e.key==="AudioVolumeUp"||e.key==="VolumeUp"){window._lastVolUp=Date.now();}}}
function handlePowerDouble(){if(document.hidden){const now=Date.now(); if(now-lastPowerHide<1500){triggerSecurityAction("power2");} lastPowerHide=now;}}
function handleThreeFinger(e){if(e.touches&&e.touches.length>=3){e.preventDefault(); triggerSecurityAction("threeFinger");}}
function triggerSecurityAction(source){const cfg=loadSecurityConfig(); document.body.classList.add("flip-blur-active"); showToast("🛡 "+source+" - buğulandi"); try{if(navigator.vibrate) navigator.vibrate([100,50,100]);}catch(e){} setTimeout(()=>{document.body.classList.remove("flip-blur-active"); const needConfirm=cfg.confirmRed; const doAction=()=>{enhancedPanic();}; if(needConfirm){showPanicConfirm(source+" tetiklendi - panik?",doAction);}else{doAction();}},1200);}
function showPanicConfirm(text,onConfirm){const modal=document.getElementById("panicConfirmModal"); const txt=document.getElementById("panicConfirmText"); const ok=document.getElementById("panicConfirmOk"); const cancel=document.getElementById("panicConfirmCancel"); if(!modal){onConfirm();return;} if(txt) txt.textContent=text; modal.style.display="flex"; modal.classList.add("show"); const cleanup=()=>{modal.style.display="none"; modal.classList.remove("show"); if(ok) ok.onclick=null; if(cancel) cancel.onclick=null; modal.onclick=null;}; if(ok) ok.onclick=()=>{cleanup(); onConfirm();}; if(cancel) cancel.onclick=()=>{cleanup();}; if(modal) modal.onclick=(e)=>{if(e.target===modal) cleanup();};}
function triggerNewMessageBlink(){const ct=document.getElementById("chatToggle"); const fp=document.getElementById("floatingPill"); const left=document.getElementById("floatingPillLeft"); if(ct) ct.classList.add("hasNewMessage"); if(fp) fp.classList.add("hasNewMessage"); if(left) left.classList.add("hasNewMessage"); setTimeout(()=>{ if(ct) ct.classList.remove("hasNewMessage"); if(fp) fp.classList.remove("hasNewMessage"); if(left) left.classList.remove("hasNewMessage"); },8000);}
function initWheelPersistFeature(){
  const modal = document.getElementById("wheelPersistModal");
  const yesBtn = document.getElementById("wheelPersistYes");
  const noBtn = document.getElementById("wheelPersistNo");
  const textEl = document.getElementById("wheelPersistText");
  let pendingSec = null;
  window.showWheelPersistAsk = function(sec){
    pendingSec = sec;
    const label = sec < 3600 ? Math.round(sec/60) + " dakika" : sec < 86400 ? Math.round(sec/3600) + " saat" : "1 gün";
    if(textEl) textEl.textContent = `Bundan sonraki girişlerde de ${label} sürenin sürekli sabit kalmasını istiyor musunuz?`;
    if(modal){ modal.style.display = "flex"; modal.classList.add("show"); }
  };
  if(yesBtn){
    yesBtn.onclick = function(){
      if(pendingSec){
        localStorage.setItem("gorgor_persistent_default", pendingSec.toString());
        localStorage.setItem("gorgor_default_expire", pendingSec.toString());
        showToast(`✅ Kalıcı varsayılan ${Math.round(pendingSec/3600)} saat olarak kaydedildi`);
        const sel = document.getElementById("perMessageTimerSelect");
        if(sel){
          let opt = sel.querySelector('option[value="custom_persist"]');
          if(!opt){ opt = document.createElement("option"); opt.value = "custom_persist"; sel.appendChild(opt); }
          const h = Math.floor(pendingSec/3600); const m = Math.floor((pendingSec%3600)/60);
          opt.textContent = `${h}sa ${m}dk (kalıcı)`;
          opt.selected = true;
        }
      }
      if(modal){ modal.style.display = "none"; modal.classList.remove("show"); }
      pendingSec = null;
    };
  }
  if(noBtn){
    noBtn.onclick = function(){
      if(pendingSec){
        sessionStorage.setItem("gorgor_temp_expire", pendingSec.toString());
        localStorage.setItem("gorgor_default_expire", "43200");
        localStorage.removeItem("gorgor_persistent_default");
        showToast(`⏰ Bu seferlik ${Math.round(pendingSec/3600)} saat, sonrası 12 saat varsayılan`);
        const sel = document.getElementById("perMessageTimerSelect");
        if(sel){
          let opt = sel.querySelector('option[value="custom_temp"]');
          if(!opt){ opt = document.createElement("option"); opt.value = "custom_temp"; sel.appendChild(opt); }
          const h = Math.floor(pendingSec/3600); const m = Math.floor((pendingSec%3600)/60);
          opt.textContent = `${h}sa ${m}dk (bu seferlik)`;
          opt.selected = true;
        }
      }
      if(modal){ modal.style.display = "none"; modal.classList.remove("show"); }
      pendingSec = null;
    };
  }
  if(modal){ modal.addEventListener("click", (e)=>{ if(e.target===modal){ modal.style.display="none"; modal.classList.remove("show"); } }); }
}



function initFakeNotifications(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    Notification.requestPermission().then(p=>{ console.log('Notif permission', p); });
  }
}
function showFakeNotification(realFrom){
  if(!fakeNotifEnabled) return;
  if(document.visibilityState === 'visible') return;
  if(Notification.permission !== 'granted') return;
  try{
    const n = new Notification('Hesap Makinesi', {
      body: 'İşlem tamamlandı - 12 x 8 = 96',
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      tag: 'fake-calc',
      silent: true
    });
    n.onclick = ()=>{ window.focus(); n.close(); };
    setTimeout(()=>n.close(), 4000);
  }catch(e){}
}
document.addEventListener('DOMContentLoaded', initFakeNotifications);

// 4. SESLI MESAJ (yok olan)
function initVoiceMessage(){
  // UI: sendBtn yanina mic basili tut butonu ekle
  const inputArea = document.getElementById('inputArea');
  const bottomRow = document.querySelector('.inputBottomRow');
  if(!bottomRow) return;
  // voice button
  let voiceBtn = document.getElementById('voiceRecordBtn');
  if(!voiceBtn){
    voiceBtn = document.createElement('button');
    voiceBtn.id = 'voiceRecordBtn';
    voiceBtn.textContent = '🎙';
    voiceBtn.title = 'Basılı tut, sesli mesaj kaydet (yok olan)';
    voiceBtn.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#111;border:1px solid #333;color:#00ff88;font-size:18px;cursor:pointer;';
    bottomRow.appendChild(voiceBtn);
  }
  voiceBtn.addEventListener('mousedown', startVoiceRecording);
  voiceBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); startVoiceRecording(); });
  voiceBtn.addEventListener('mouseup', stopVoiceRecording);
  voiceBtn.addEventListener('mouseleave', stopVoiceRecording);
  voiceBtn.addEventListener('touchend', (e)=>{ e.preventDefault(); stopVoiceRecording(); });
}
async function startVoiceRecording(){
  if(isRecordingVoice) return;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e=>{ if(e.data.size>0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async ()=>{
      const duration = Math.floor((Date.now() - voiceRecordStartTime)/1000);
      if(duration < 1){ showToast('Çok kısa, en az 1 saniye konuş'); return; }
      const blob = new Blob(audioChunks, {type:'audio/webm'});
      const reader = new FileReader();
      reader.onload = async ()=>{
        const base64 = reader.result.split(',')[1];
        const enc = await encryptText(base64, currentPassword);
        const msgId = 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
        const expireSec = parseInt(perMessageTimerSelect?.value || defaultExpire || '14400');
        socket.emit('chat-voice', {msgId, enc, expireSec, duration, mediaType:'voice'});
        // kendi ekrana ekle
        addVoiceMessageToUI(msgId, base64, true, duration, expireSec);
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach(t=>t.stop());
    };
    mediaRecorder.start();
    isRecordingVoice = true;
    voiceRecordStartTime = Date.now();
    document.getElementById('voiceRecordBtn').style.background = '#ff3b30';
    document.getElementById('voiceRecordBtn').textContent = '⏹';
    showToast('🎙 Kaydediliyor... bırakınca gönderilecek');
    socket.emit('voice-start', {from: myRealUsername});
  }catch(e){ showToast('Mikrofon izni gerekli'); console.error(e); }
}
function stopVoiceRecording(){
  if(!isRecordingVoice) return;
  isRecordingVoice = false;
  const btn = document.getElementById('voiceRecordBtn');
  if(btn){ btn.style.background = '#111'; btn.textContent = '🎙'; }
  if(mediaRecorder && mediaRecorder.state !== 'inactive'){
    mediaRecorder.stop();
  }
}
function addVoiceMessageToUI(msgId, base64Audio, isMe, duration, expireSec){
  const div = document.createElement('div');
  div.id = msgId;
  div.className = 'message ' + (isMe?'me':'other') + ' voice-message';
  div.innerHTML = `<div class="voice-bubble"><button class="voice-play" onclick="playVoice('${msgId}')">▶</button><div class="voice-wave">${'<span></span>'.repeat(20)}</div><span class="voice-duration">${duration}sn</span></div><div class="msg-meta"><span class="msg-time">${formatClock()}</span><span class="msg-expire">⏳ ${Math.floor(expireSec/60)}dk</span></div><audio id="audio_${msgId}" src="data:audio/webm;base64,${base64Audio}" style="display:none;"></audio>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  startExpireTimer(msgId, Date.now()+expireSec*1000, expireSec);
}
window.playVoice = function(msgId){
  const audio = document.getElementById('audio_'+msgId);
  if(!audio) return;
  if(audio.paused){ audio.play(); } else { audio.pause(); }
};
socket.on('chat-voice', async (data)=>{
  try{
    const decrypted = await decryptText(data.enc, currentPassword);
    const duration = data.duration || 5;
    const expireSec = data.expireSec || 14400;
    addVoiceMessageToUI(data.msgId, decrypted, false, duration, expireSec);
    showFakeNotification(data.realUsername);
  }catch(e){ console.error('voice decrypt fail', e); }
});
socket.on('voice-start', (data)=>{
  if(data.from !== myRealUsername){
    showToast(`🎙 ${data.from} sesli mesaj kaydediyor...`);
  }
});

// 5. MESAJ REAKSIYONU
const REACTION_EMOJIS = ['❤','😂','🔥','😮','😢','👍'];
function initReactions(){
  // mesajlara long press ekle
  messages.addEventListener('contextmenu', (e)=>{
    const msgEl = e.target.closest('.message');
    if(!msgEl) return;
    e.preventDefault();
    showReactionBar(msgEl.id, e.clientX, e.clientY);
  });
}
function showReactionBar(msgId, x, y){
  let bar = document.getElementById('reactionBar');
  if(bar) bar.remove();
  bar = document.createElement('div');
  bar.id = 'reactionBar';
  bar.style.cssText = `position:fixed;left:${Math.min(x, window.innerWidth-200)}px;top:${Math.max(10, y-60)}px;background:#111;border:1px solid #333;border-radius:20px;padding:6px 10px;display:flex;gap:6px;z-index:9999;`;
  REACTION_EMOJIS.forEach(em=>{
    const b = document.createElement('button');
    b.textContent = em;
    b.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;';
    b.onclick = ()=>{ addReaction(msgId, em); bar.remove(); };
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
  setTimeout(()=>{ if(bar) bar.addEventListener('click', ()=>bar.remove()); setTimeout(()=>bar.remove(), 3000); }, 100);
}
function addReaction(msgId, emoji){
  socket.emit('message-reaction', {msgId, emoji});
  applyReactionToUI(msgId, emoji, myRealUsername);
}
function applyReactionToUI(msgId, emoji, user){
  const msgEl = document.getElementById(msgId);
  if(!msgEl) return;
  let reactionsDiv = msgEl.querySelector('.reactions');
  if(!reactionsDiv){
    reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'reactions';
    reactionsDiv.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;';
    msgEl.appendChild(reactionsDiv);
  }
  const item = document.createElement('span');
  item.textContent = emoji;
  item.title = user;
  item.style.cssText = 'background:#222;border:1px solid #333;border-radius:12px;padding:2px 6px;font-size:12px;';
  reactionsDiv.appendChild(item);
  if(!messageReactions.has(msgId)) messageReactions.set(msgId, []);
  messageReactions.get(msgId).push({emoji,user,time:Date.now()});
}
socket.on('message-reaction', (data)=>{
  applyReactionToUI(data.msgId, data.emoji, data.user);
});

// 6. MAVI TIK + OKUNDU SAATI
function initReadReceipts(){
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const msgId = entry.target.id;
        if(msgId && !readReceipts.has(msgId)){
          socket.emit('message-read', {msgId, reader: myRealUsername});
          readReceipts.set(msgId, {time:Date.now()});
        }
      }
    });
  }, {threshold:0.5});
  // mesajlar eklendikce observe et
  const origAppend = messages.appendChild;
  // basit: her yeni mesajda observe
  setInterval(()=>{
    document.querySelectorAll('.message').forEach(m=>{
      if(!m.dataset.observed){
        observer.observe(m);
        m.dataset.observed = '1';
      }
    });
  }, 1000);
}
socket.on('message-read', (data)=>{
  const {msgId, reader, time} = data;
  const el = document.getElementById(msgId);
  if(!el) return;
  let tick = el.querySelector('.read-tick');
  if(!tick){
    tick = document.createElement('span');
    tick.className = 'read-tick';
    tick.style.cssText = 'margin-left:6px;font-size:10px;color:#00aaff;';
    const meta = el.querySelector('.msg-meta');
    if(meta) meta.appendChild(tick);
  }
  tick.textContent = `✓✓ mavi ${formatClock(new Date(time))} ${reader}`;
  tick.style.color = '#00aaff';
});

// 7. ORTAK CIZIM TAHTASI - collaborative
function initCollaborativeDrawing(){
  if(!drawCanvas) return;
  const ctx = drawCanvas.getContext('2d');
  let drawing = false;
  let lastX=0,lastY=0;
  function getPos(e){
    const rect = drawCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {x: (clientX-rect.left)*(drawCanvas.width/rect.width), y: (clientY-rect.top)*(drawCanvas.height/rect.height)};
  }
  drawCanvas.addEventListener('mousedown', (e)=>{ drawing=true; const p=getPos(e); lastX=p.x; lastY=p.y; });
  drawCanvas.addEventListener('mousemove', (e)=>{
    if(!drawing) return;
    const p=getPos(e);
    drawLine(lastX,lastY,p.x,p.y, collaborativeDrawColor, true);
    lastX=p.x; lastY=p.y;
  });
  drawCanvas.addEventListener('mouseup', ()=>drawing=false);
  drawCanvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); drawing=true; const p=getPos(e); lastX=p.x; lastY=p.y; });
  drawCanvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); if(!drawing) return; const p=getPos(e); drawLine(lastX,lastY,p.x,p.y, collaborativeDrawColor, true); lastX=p.x; lastY=p.y; });
  drawCanvas.addEventListener('touchend', ()=>drawing=false);
  function drawLine(x1,y1,x2,y2,color,emit){
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
    if(emit && isCollaborativeDrawing){
      socket.emit('draw-stroke', {x1,y1,x2,y2,color});
    }
  }
  window.drawLine = drawLine;
  // gelen cizimleri ciz
  socket.on('draw-stroke', (data)=>{
    drawLine(data.x1,data.y1,data.x2,data.y2,data.color,false);
  });
  socket.on('draw-clear', ()=>{
    ctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  });
  if(drawClear){
    const oldClear = drawClear.onclick;
    drawClear.onclick = ()=>{
      ctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
      socket.emit('draw-clear');
      if(oldClear) oldClear();
    };
  }
  // isCollaborativeDrawing flagini drawOverlay acilinca true yap
  const origShow = ()=>{ isCollaborativeDrawing = true; };
  if(drawOverlay){
    const observer = new MutationObserver(()=>{
      if(drawOverlay.style.display !== 'none'){
        isCollaborativeDrawing = true;
        // canvas boyutunu ayarla
        drawCanvas.width = drawOverlay.clientWidth;
        drawCanvas.height = drawOverlay.clientHeight - 60;
      } else {
        isCollaborativeDrawing = false;
      }
    });
    observer.observe(drawOverlay, {attributes:true, attributeFilter:['style']});
  }
}

// 8. ARKA PLAN BLUR
function initBackgroundBlur(){
  let blurBtn = document.getElementById('blurToggleBtn');
  if(!blurBtn){
    blurBtn = document.createElement('button');
    blurBtn.id = 'blurToggleBtn';
    blurBtn.textContent = '🌫';
    blurBtn.title = 'Arka planı bulanıklaştır (gizlilik)';
    blurBtn.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#111;border:1px solid #333;color:#ffcc00;font-size:16px;cursor:pointer;margin-left:4px;';
    const right = document.getElementById('floatingPillRight');
    if(right) right.appendChild(blurBtn);
  }
  blurBtn.onclick = ()=>{
    isBlurEnabled = !isBlurEnabled;
    if(isBlurEnabled){
      myVideo.style.filter = 'blur(12px)';
      myVideoContainer.style.filter = 'blur(12px)';
      blurBtn.style.background = '#00ff88';
      blurBtn.style.color = '#000';
      socket.emit('background-blur', {enabled:true, from: myRealUsername});
      showToast('🌫 Arka plan bulanık - gizlilik modu');
    } else {
      myVideo.style.filter = '';
      myVideoContainer.style.filter = '';
      blurBtn.style.background = '#111';
      blurBtn.style.color = '#ffcc00';
      socket.emit('background-blur', {enabled:false, from: myRealUsername});
      showToast('Arka plan net');
    }
  };
  socket.on('background-blur', (data)=>{
    // karsi taraf blur acti bilgisi
    if(data.enabled){
      showToast(`🌫 ${data.from} arka planını bulanıklaştırdı`);
    }
  });
}

// 9. OTO RECONNECT - mum yanarken oto baglan
function initAutoReconnect(){
  socket.on('user-disconnected', ()=>{
    if(autoReconnectAttempts >= maxReconnectAttempts) return;
    if(reconnectTimer) clearTimeout(reconnectTimer);
    autoReconnectAttempts++;
    let count = 3;
    if(opponentStatusText){
      opponentStatusText.textContent = `Yeniden bağlanıyor... ${count}`;
      opponentStatusText.style.color = '#ffcc00';
    }
    if(candleContainer){
      candleContainer.classList.add('show');
      candleContainer.style.display = 'flex';
    }
    const interval = setInterval(()=>{
      count--;
      if(opponentStatusText) opponentStatusText.textContent = `Yeniden bağlanıyor... ${count}`;
      if(count<=0){
        clearInterval(interval);
        if(socket && currentRoom){
          socket.emit('join-room', {room: currentRoom, username: myUsername, realUsername: myRealUsername});
          showToast(`🔄 Yeniden bağlanma denemesi ${autoReconnectAttempts}/${maxReconnectAttempts}`);
        }
      }
    }, 1000);
    reconnectTimer = setTimeout(()=>{}, 4000);
  });
  socket.on('user-connected', ()=>{
    autoReconnectAttempts = 0;
    if(reconnectTimer) clearTimeout(reconnectTimer);
    if(opponentStatusText && opponentStatusText.textContent.includes('Yeniden')){
      opponentStatusText.textContent = 'içerde';
      opponentStatusText.style.color = '#00ff88';
    }
  });
}

// 10. TOAST HELPER
function showToast(msg){
  let toast = document.getElementById('gorgorToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'gorgorToast';
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #333;color:#fff;padding:10px 16px;border-radius:20px;font-size:12px;z-index:99999;max-width:80%;text-align:center;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(()=>{ toast.style.opacity='0'; setTimeout(()=>toast.style.display='none', 300); }, 3000);
}

// V19 INIT
document.addEventListener('DOMContentLoaded', ()=>{
  initScreenshotProtection();
  initReactions();
  initReadReceipts();
  initCollaborativeDrawing();
  initBackgroundBlur();
  initAutoReconnect();
  setTimeout(initVoiceMessage, 1000);
});


document.addEventListener("DOMContentLoaded", ()=>{ const privacySelect=document.getElementById("privacyModeSelect"); if(privacySelect){ privacySelect.value=localStorage.getItem("gorgor_security_mode")||"private"; securityMode=privacySelect.value; privacySelect.addEventListener("change", ()=>{ securityMode=privacySelect.value; localStorage.setItem("gorgor_security_mode", securityMode); if(securityMode==="general"){ alert("🔓 Genel mod: Sekme değiştirince sadece kamera ve ses kapanacak, program açık kalacak, iki tarafta"); } else { alert("🔒 Özel mod: Sekme değiştirince program tamamen kapanıp hesap makinesine dönecek"); } }); } });

// V19 CSS injection
(function(){ const style=document.createElement('style'); style.textContent=` .screenshot-blur-active { filter: blur(12px) !important; pointer-events:none; } .voice-message .voice-bubble{display:flex;align-items:center;gap:10px;background:#111;border:1px solid #333;border-radius:16px;padding:8px 12px;} .voice-wave span{display:inline-block;width:3px;height:12px;background:#00ff88;margin:0 1px;border-radius:2px;animation:wave 1s infinite;} @keyframes wave{0%,100%{height:8px}50%{height:20px}} .reactions{animation:fadeIn 0.3s} #reactionBar{animation:pop 0.2s} @keyframes pop{0%{transform:scale(0.5)}100%{transform:scale(1)}} `; document.head.appendChild(style); })();

socket.on("opponent-info", data=>{
  if(data && data.username && data.username !== myRealUsername){
    updateOpponentDisplay(data.username, data.status || "çevrimiçi");
  }
});

/* ===== V22 HARMAN EK - ASAGI YAPISTIRILDI ===== */
/* GORGOR V22 HARMAN - Dünya chat özelliklerini koruyarak ekle
   Temel kurallar korunuyor: fakeCalc 0000, oda1, varım/yokum, panic, 300 satır
   Bu dosya script.js'den SONRA yüklenir, mevcut fonksiyonları sarmalar
*/
console.log("V22 HARMAN YUKLENDI - Dunya chat harmani aktif");

let replyToData = null;
let editingMsgId = null;
let editingOriginalText = "";
let pinnedMessage = null;
let starredMessages = new Map(); // msgId -> data
let viewOnceEnabled = false;
let searchResults = [];
let currentSearchIdx = -1;
let pollsData = new Map(); // msgId -> poll
let checklistData = new Map();

// LocalStorage load starred
try{
  const saved = JSON.parse(localStorage.getItem("gorgor_starred")||"[]");
  saved.forEach(s=>starredMessages.set(s.id, s));
}catch(e){}

let originalAddMyMessage = window.addMyMessage || null;
let originalAddLocked = null;

// We'll wait for DOM and original functions
document.addEventListener("DOMContentLoaded", ()=>{
  originalAddMyMessage = window.addMyMessage || addMyMessage;
  originalAddLocked = window.addLockedMessage || addLockedMessage;
  initHarmanUI();
  wrapMessageFunctions();
  initSocketHarman();
});

function initHarmanUI(){
  const replyBar = document.getElementById("replyPreviewBar");
  const replyCancel = document.getElementById("replyCancel");
  if(replyCancel) replyCancel.onclick = ()=>{ replyToData=null; hideReplyBar(); };

  const editBanner = document.getElementById("editBanner");
  const editCancel = document.getElementById("editCancel");
  const editSave = document.getElementById("editSave");
  if(editCancel) editCancel.onclick = cancelEdit;
  if(editSave) editSave.onclick = saveEdit;

  const pinBar = document.getElementById("pinBar");
  const pinClose = document.getElementById("pinClose");
  const pinGoto = document.getElementById("pinGoto");
  if(pinClose) pinClose.onclick = ()=>{ pinnedMessage=null; hidePinBar(); try{ socket.emit("pin-message", {action:"unpin"}); }catch(e){} };
  if(pinGoto && pinBar) pinGoto.onclick = ()=>{
    if(pinnedMessage && pinnedMessage.msgId){
      const el = document.getElementById(pinnedMessage.msgId);
      if(el){ el.scrollIntoView({behavior:"smooth", block:"center"}); el.style.outline="2px solid #00c853"; setTimeout(()=>el.style.outline="", 2000); }
    }
  };

  const searchToggle = document.getElementById("searchToggleBtn");
  const searchBar = document.getElementById("searchBar");
  const searchClose = document.getElementById("searchClose");
  const searchInput = document.getElementById("searchInput");
  const searchUp = document.getElementById("searchUp");
  const searchDown = document.getElementById("searchDown");
  if(searchToggle) searchToggle.onclick = ()=>{ searchBar.style.display = searchBar.style.display==="none"||!searchBar.style.display?"flex":"none"; if(searchBar.style.display!=="none") searchInput.focus(); };
  if(searchClose) searchClose.onclick = ()=>{ searchBar.style.display="none"; clearSearch(); };
  if(searchInput){
    searchInput.addEventListener("input", ()=>{ performSearch(searchInput.value); });
    searchInput.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ if(e.shiftKey) navigateSearch(-1); else navigateSearch(1);} });
  }
  if(searchUp) searchUp.onclick = ()=>navigateSearch(-1);
  if(searchDown) searchDown.onclick = ()=>navigateSearch(1);

  const starredToggle = document.getElementById("starredToggleBtn");
  const starredPanel = document.getElementById("starredPanel");
  const starredClose = document.getElementById("starredClose");
  if(starredToggle) starredToggle.onclick = ()=>{ renderStarredPanel(); starredPanel.style.display="flex"; };
  if(starredClose) starredClose.onclick = ()=>{ starredPanel.style.display="none"; };

  const viewOnceBtn = document.getElementById("viewOnceToggleBtn");
  if(viewOnceBtn){
    viewOnceBtn.onclick = ()=>{
      viewOnceEnabled = !viewOnceEnabled;
      viewOnceBtn.textContent = viewOnceEnabled ? "👁️ Bir Kez Gör (Açık)" : "👁️ Bir Kez Gör (Kapalı)";
      viewOnceBtn.style.background = viewOnceEnabled ? "#ff4444" : "#1a1a1a";
      viewOnceBtn.style.color = viewOnceEnabled ? "#fff" : "#aaa";
      if(viewOnceEnabled) showToast("👁️ Bir Kez Gör açık - sonraki medya tek seferlik olacak");
    };
  }

  const pollBtn = document.getElementById("pollBtn");
  const checklistBtn = document.getElementById("checklistBtn");
  const pollModal = document.getElementById("pollModal");
  const pollModalClose = document.getElementById("pollModalClose");
  const pollAddOption = document.getElementById("pollAddOption");
  const pollCreate = document.getElementById("pollCreate");
  if(pollBtn) pollBtn.onclick = ()=>{ openPollModal("poll"); };
  if(checklistBtn) checklistBtn.onclick = ()=>{ openPollModal("checklist"); };
  if(pollModalClose) pollModalClose.onclick = closePollModal;
  if(pollModal) pollModal.addEventListener("click", (e)=>{ if(e.target===pollModal) closePollModal(); });
  if(pollAddOption) pollAddOption.onclick = ()=>{
    const container = document.getElementById("pollOptionsContainer");
    if(container.children.length >= 6){ showToast("Max 6 seçenek"); return; }
    const inp = document.createElement("input");
    inp.className = "pollOptionInput";
    inp.placeholder = `Seçenek ${container.children.length+1}`;
    inp.style.cssText = "width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;";
    container.appendChild(inp);
  };
  if(pollCreate) pollCreate.onclick = createPollOrChecklist;

  const liveLocationBtn = document.getElementById("liveLocationBtn");
  if(liveLocationBtn) liveLocationBtn.onclick = startLiveLocation;

  const translatePopup = document.getElementById("translatePopup");
  const translateClose = document.getElementById("translateClose");
  if(translateClose) translateClose.onclick = ()=>{ translatePopup.style.display="none"; };

  // Quick react bar
  const quickReactBar = document.getElementById("quickReactBar");
  if(quickReactBar){
    quickReactBar.querySelectorAll("span").forEach(s=>{
      s.onclick = ()=>{
        if(window._lastReactTarget){
          const emoji = s.dataset.react;
          // use existing fly-emoji or reaction
          try{ socket.emit('fly-emoji',{emoji, effect:'heart'}); }catch(e){}
          if(typeof createFlyingEmoji==="function") createFlyingEmoji(emoji,'heart',true);
          quickReactBar.style.display="none";
        }
      };
    });
  }

  // Close menus on click outside
  document.addEventListener("click", (e)=>{
    const menu = document.getElementById("msgActionMenu");
    if(menu && menu.style.display!=="none" && !menu.contains(e.target)){
      // check if click is not on message
      if(!e.target.closest(".myMessage") && !e.target.closest(".otherMessage")){
        menu.style.display="none";
      }
    }
  });
}

function openPollModal(type){
  const modal = document.getElementById("pollModal");
  const title = document.getElementById("pollModalTitle");
  if(title) title.textContent = type==="checklist" ? "✅ Checklist Oluştur" : "📊 Anket Oluştur";
  modal.dataset.type = type;
  modal.style.display="flex";
  document.getElementById("pollQuestion").value="";
  const container = document.getElementById("pollOptionsContainer");
  container.innerHTML="";
  const ph1 = type==="checklist" ? "Madde 1" : "Seçenek 1";
  const ph2 = type==="checklist" ? "Madde 2" : "Seçenek 2";
  container.innerHTML = `<input class="pollOptionInput" placeholder="${ph1}" style="width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;" />
                         <input class="pollOptionInput" placeholder="${ph2}" style="width:100%; height:38px; background:#1a1a1a; border:1px solid #333; border-radius:10px; color:#fff; padding:0 10px;" />`;
}
function closePollModal(){ document.getElementById("pollModal").style.display="none"; }

async function createPollOrChecklist(){
  const modal = document.getElementById("pollModal");
  const type = modal.dataset.type || "poll";
  const q = document.getElementById("pollQuestion").value.trim();
  const opts = Array.from(document.querySelectorAll(".pollOptionInput")).map(i=>i.value.trim()).filter(v=>v);
  if(!q){ showToast("Soru yaz"); return; }
  if(opts.length<2){ showToast("En az 2 seçenek/madde"); return; }
  const expire = typeof getExpireFromSelect==="function" ? getExpireFromSelect() : 43200;
  const payload = {
    type,
    question: q,
    options: opts,
    votes: type==="poll" ? opts.map(()=>0) : null,
    checks: type==="checklist" ? opts.map(()=>false) : null,
    voters: {}
  };
  const text = `__GORGOR_${type.toUpperCase()}__`+JSON.stringify(payload);
  const enc = await encryptText(text, currentPassword);
  const msgId = `poll-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const sentAt = Date.now();
  // local add
  await addPollMessage(msgId, payload, true, sentAt);
  try{ socket.emit("chat-message", {msgId, enc, expireSec: expire, sentAt, deleteAt: Date.now()+expire*1000, realUsername: myRealUsername}); }catch(e){}
  closePollModal();
  const attachMenu = document.getElementById("attachMenu");
  if(attachMenu) attachMenu.classList.remove("show");
}

function wrapMessageFunctions(){
  // Wrap addMyMessage
  const _origAddMy = window.addMyMessage || addMyMessage;
  window.addMyMessage = async function(text, expireSec, realName){
    // check if reply or viewOnce
    let payload = {t:text};
    if(replyToData) payload.r = replyToData;
    if(viewOnceEnabled) payload.vo = true;
    // if editing, this is not add but edit
    const jsonText = JSON.stringify(payload);
    const isRich = replyToData || viewOnceEnabled;
    const finalText = isRich ? `__GORGOR_JSON__${jsonText}` : text;
    const msgId = await _origAddMy.call(this, finalText, expireSec, realName);
    // enhance DOM
    setTimeout(()=>enhanceMessageDOM(msgId, payload, true), 50);
    // clear reply
    if(replyToData){ replyToData=null; hideReplyBar(); }
    if(viewOnceEnabled){
      // auto off after one use
      viewOnceEnabled=false;
      const btn = document.getElementById("viewOnceToggleBtn");
      if(btn){ btn.textContent="👁️ Bir Kez Gör (Kapalı)"; btn.style.background="#1a1a1a"; btn.style.color="#aaa"; }
    }
    return msgId;
  };

  const _origAddLocked = window.addLockedMessage || addLockedMessage;
  window.addLockedMessage = async function(msgId, expireSec, enc, mediaType, senderReal, sentAt){
    // decrypt first to check json
    let plain = null;
    try{ plain = await decryptText(enc, currentPassword); }catch(e){}
    if(plain && plain.startsWith("__GORGOR_JSON__")){
      try{
        const inner = plain.replace("__GORGOR_JSON__","");
        const data = JSON.parse(inner);
        // it's rich text message
        const text = data.t || "";
        // create element via original but with text, then enhance
        const res = await _origAddLocked.call(this, msgId, expireSec, await encryptText(text, currentPassword), mediaType, senderReal, sentAt);
        // enhance after
        setTimeout(()=>enhanceMessageDOM(msgId, data, false), 100);
        return res;
      }catch(e){
        // fallback
      }
    }else if(plain && plain.startsWith("__GORGOR_POLL__")){
      try{
        const inner = plain.replace("__GORGOR_POLL__","");
        const poll = JSON.parse(inner);
        await addPollMessage(msgId, poll, false, sentAt);
        return;
      }catch(e){}
    }else if(plain && plain.startsWith("__GORGOR_CHECKLIST__")){
      try{
        const inner = plain.replace("__GORGOR_CHECKLIST__","");
        const cl = JSON.parse(inner);
        cl.type="checklist";
        await addPollMessage(msgId, cl, false, sentAt);
        return;
      }catch(e){}
    }else if(plain && (plain.startsWith('__GORGOR_JSON__')===false)){
      // check if it's poll json inside __GORGOR_POLL__
      if(plain.includes("__GORGOR_POLL__") || plain.includes("__GORGOR_CHECKLIST__")){
        // already handled
      }
    }
    // For poll detection via prefix __GORGOR_POLL__ etc inside original decrypt path, we need to handle after original
    const res = await _origAddLocked.call(this, msgId, expireSec, enc, mediaType, senderReal, sentAt);
    // after, try enhance
    setTimeout(async ()=>{
      try{
        const p = await decryptText(enc, currentPassword);
        if(p && p.startsWith('__GORGOR_')){
          // poll
          if(p.startsWith('__GORGOR_POLL__') || p.startsWith('__GORGOR_CHECKLIST__')){
            let jsonStr = p.replace('__GORGOR_POLL__','').replace('__GORGOR_CHECKLIST__','');
            let data = JSON.parse(jsonStr);
            if(p.includes('CHECKLIST')) data.type='checklist';
            // remove the auto-created text bubble and replace with poll
            const el = document.getElementById(msgId);
            if(el) el.remove();
            await addPollMessage(msgId, data, false, sentAt);
          }else if(p.startsWith('__GORGOR_JSON__')){
            const inner = p.replace('__GORGOR_JSON__','');
            const data = JSON.parse(inner);
            enhanceMessageDOM(msgId, data, false);
          }
        }else if(p){
          // normal message, but might still have reply data stored differently? check if message element exists, enhance for actions
          const el = document.getElementById(msgId);
          if(el && !el.querySelector(".msgActions")){
            addActionButtonsToMessage(el, msgId, false, p);
          }
        }
      }catch(e){}
    }, 150);
    return res;
  };

  // Also override poll messages creation to go through same flow
  window.addMyMessage = window.addMyMessage; // keep
}

function enhanceMessageDOM(msgId, data, isMine){
  const el = document.getElementById(msgId);
  if(!el) return;
  const bubble = el.querySelector(".msgBubble");
  if(!bubble) return;

  // Reply quote
  if(data.r){
    if(!bubble.querySelector(".replyQuote")){
      const rq = document.createElement("div");
      rq.className = "replyQuote";
      const snippet = (data.r.snippet||data.r.text||"").substring(0,60);
      const sender = data.r.sender||"Bilinmeyen";
      rq.innerHTML = `<span class="rqName">${escapeHtml(sender)}</span><span class="rqText">${escapeHtml(snippet)}</span>`;
      rq.onclick = ()=>{
        if(data.r.msgId){
          const target = document.getElementById(data.r.msgId);
          if(target){ target.scrollIntoView({behavior:"smooth", block:"center"}); target.style.outline="2px solid #00c853"; setTimeout(()=>target.style.outline="",2000); }
        }
      };
      bubble.insertBefore(rq, bubble.firstChild);
    }
  }

  // View Once
  if(data.vo){
    bubble.classList.add("viewOncePending");
    if(!bubble.querySelector(".viewOnceBadge")){
      const badge = document.createElement("span");
      badge.className = "viewOnceBadge";
      badge.textContent = "👁️ Bir kez";
      const expireInfo = bubble.querySelector(".expireInfo");
      if(expireInfo) expireInfo.appendChild(badge);
    }
    // add overlay for other side
    if(!isMine && !bubble.querySelector(".viewOnceOverlay")){
      const overlay = document.createElement("div");
      overlay.className = "viewOnceOverlay";
      overlay.innerHTML = `<div style="font-size:24px;">👁️</div><div>Bir kez gör</div><div style="font-size:10px; opacity:0.7;">Dokun ve basılı tut</div>`;
      overlay.onclick = ()=>{
        bubble.classList.remove("viewOnceBlur");
        overlay.style.display="none";
        // after 5 sec, delete
        setTimeout(()=>{
          const el2 = document.getElementById(msgId);
          if(el2){ el2.style.opacity="0"; setTimeout(()=>el2.remove(), 300); }
          showToast("👁️ Bir kez görüldü ve silindi");
          try{ socket.emit("view-once-opened", {msgId}); }catch(e){}
        }, 5000);
        // mark as opened
        try{ socket.emit("message-opened", {msgId, deleteAt: Date.now()+5000, expireSec:5}); }catch(e){}
      };
      bubble.style.position="relative";
      bubble.appendChild(overlay);
      // blur content
      const msgText = bubble.querySelector(".msgText");
      if(msgText) msgText.classList.add("viewOnceBlur");
      const media = bubble.querySelector(".mediaMessage");
      if(media) media.classList.add("viewOnceBlur");
    }
  }

  // Edited label
  if(data.edited){
    if(!bubble.querySelector(".editedLabel")){
      const ed = document.createElement("span");
      ed.className = "editedLabel";
      ed.textContent = "(düzenlendi)";
      const ticks = bubble.querySelector(".ticks");
      if(ticks) ticks.parentNode.insertBefore(ed, ticks);
      else bubble.appendChild(ed);
    }
  }

  addActionButtonsToMessage(el, msgId, isMine, data.t||"");
}

function addActionButtonsToMessage(msgEl, msgId, isMine, textContent){
  if(msgEl.querySelector(".msgActions")) return;
  const actions = document.createElement("div");
  actions.className = "msgActions";
  // buttons
  const btns = [
    {icon:"↩️", title:"Alıntıla", act:"reply"},
    {icon:"📌", title:"Sabitle", act:"pin"},
    {icon:"⭐", title:"Yıldızla", act:"star"},
    {icon:"↪️", title:"İlet", act:"forward"},
    {icon:"🌐", title:"Çevir", act:"translate"},
  ];
  if(isMine){
    btns.unshift({icon:"✏️", title:"Düzenle", act:"edit"});
  }
  btns.push({icon:"⋯", title:"Daha fazla", act:"more"});

  btns.forEach(b=>{
    const btn = document.createElement("button");
    btn.textContent = b.icon;
    btn.title = b.title;
    btn.dataset.act = b.act;
    btn.onclick = (e)=>{
      e.stopPropagation();
      handleMessageAction(b.act, msgId, isMine, textContent, msgEl);
    };
    actions.appendChild(btn);
  });
  msgEl.appendChild(actions);

  // long press to open menu
  let pressTimer=null;
  const startPress = (e)=>{
    pressTimer = setTimeout(()=>{ openActionMenu(msgId, isMine, textContent, msgEl, e); }, 600);
  };
  const cancelPress = ()=>{ if(pressTimer) clearTimeout(pressTimer); };
  msgEl.addEventListener("touchstart", startPress, {passive:true});
  msgEl.addEventListener("touchend", cancelPress);
  msgEl.addEventListener("mousedown", startPress);
  msgEl.addEventListener("mouseup", cancelPress);
  msgEl.addEventListener("mouseleave", cancelPress);

  // double click quick reply
  msgEl.addEventListener("dblclick", (e)=>{
    e.preventDefault();
    handleMessageAction("reply", msgId, isMine, textContent, msgEl);
  });
}

function handleMessageAction(act, msgId, isMine, text, msgEl){
  const menu = document.getElementById("msgActionMenu");
  if(menu) menu.style.display="none";
  switch(act){
    case "reply":
      replyToData = {
        msgId,
        snippet: text.substring(0,80),
        text: text,
        sender: isMine ? (myRealUsername||"Ben") : (msgEl.querySelector(".msgAvatar")?.textContent||"Karşı")
      };
      showReplyBar(replyToData);
      document.getElementById("messageInput").focus();
      break;
    case "edit":
      if(!isMine){ showToast("Sadece kendi mesajını düzenleyebilirsin"); return; }
      const age = Date.now() - (msgEl._sentAt||0);
      if(age > 15*60*1000){ showToast("Düzenleme süresi doldu (15dk)"); return; }
      editingMsgId = msgId;
      editingOriginalText = text;
      showEditBanner(text);
      break;
    case "pin":
      pinMessage(msgId, text, isMine);
      break;
    case "star":
      toggleStar(msgId, text, isMine, msgEl);
      break;
    case "forward":
      forwardMessage(text);
      break;
    case "translate":
      translateText(text);
      break;
    case "more":
      openActionMenu(msgId, isMine, text, msgEl, null);
      break;
    case "copy":
      navigator.clipboard.writeText(text).then(()=>showToast("Kopyalandı"));
      break;
    case "delete":
      if(isMine){
        const el = document.getElementById(msgId);
        if(el){ el.style.opacity="0"; setTimeout(()=>el.remove(),300); }
        try{ socket.emit("delete-message", {msgId}); }catch(e){}
        showToast("Silindi");
      }
      break;
  }
}

function openActionMenu(msgId, isMine, text, msgEl, ev){
  const menu = document.getElementById("msgActionMenu");
  if(!menu) return;
  menu.innerHTML="";
  const actions = [
    {icon:"↩️", label:"Alıntıla", act:"reply"},
    {icon:"📌", label:"Sabitle", act:"pin"},
    {icon:"⭐", label: starredMessages.has(msgId) ? "Yıldızı kaldır" : "Yıldızla", act:"star"},
    {icon:"↪️", label:"İlet", act:"forward"},
    {icon:"🌐", label:"Çevir", act:"translate"},
    {icon:"📋", label:"Kopyala", act:"copy"},
  ];
  if(isMine){
    actions.unshift({icon:"✏️", label:"Düzenle", act:"edit"});
    actions.push({icon:"🗑️", label:"Sil", act:"delete"});
  }
  actions.forEach(a=>{
    const btn = document.createElement("button");
    btn.innerHTML = `<span class="icon">${a.icon}</span> ${a.label}`;
    btn.onclick = ()=>{ menu.style.display="none"; handleMessageAction(a.act, msgId, isMine, text, msgEl); };
    menu.appendChild(btn);
  });
  // position
  let x=20, y=100;
  if(ev && ev.touches && ev.touches[0]){ x=ev.touches[0].clientX; y=ev.touches[0].clientY; }
  else if(ev && ev.clientX){ x=ev.clientX; y=ev.clientY; }
  else {
    const rect = msgEl.getBoundingClientRect();
    x = rect.left + 20;
    y = rect.top + 20;
  }
  menu.style.left = Math.min(x, window.innerWidth-200)+"px";
  menu.style.top = Math.min(y, window.innerHeight-200)+"px";
  menu.style.display="block";
}

function showReplyBar(data){
  const bar = document.getElementById("replyPreviewBar");
  if(!bar) return;
  document.getElementById("replyToName").textContent = data.sender;
  document.getElementById("replyToSnippet").textContent = data.snippet;
  bar.style.display="flex";
}
function hideReplyBar(){ const bar=document.getElementById("replyPreviewBar"); if(bar) bar.style.display="none"; }

function showEditBanner(text){
  const bar=document.getElementById("editBanner");
  if(!bar) return;
  document.getElementById("editOriginal").textContent = text.substring(0,60);
  bar.style.display="flex";
  const input=document.getElementById("messageInput");
  if(input){ input.value=text; input.focus(); }
  // hide reply
  hideReplyBar();
}
function cancelEdit(){
  editingMsgId=null;
  editingOriginalText="";
  const bar=document.getElementById("editBanner");
  if(bar) bar.style.display="none";
  const input=document.getElementById("messageInput");
  if(input) input.value="";
}
async function saveEdit(){
  const input=document.getElementById("messageInput");
  const newText = input.value.trim();
  if(!newText || !editingMsgId){ cancelEdit(); return; }
  const el = document.getElementById(editingMsgId);
  if(!el){ cancelEdit(); return; }
  const bubble = el.querySelector(".msgBubble");
  const msgText = bubble.querySelector(".msgText");
  if(msgText){
    const linked = newText.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    msgText.innerHTML = linked;
    // add edited label
    if(!bubble.querySelector(".editedLabel")){
      const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)";
      bubble.appendChild(ed);
    }
  }
  // encrypt and emit edit
  try{
    const payload = {t:newText, edited:true, r: null};
    // try preserve reply if exists
    const rq = bubble.querySelector(".replyQuote");
    if(rq){
      // keep existing replyToData? we lost it, but keep
    }
    const enc = await encryptText(`__GORGOR_JSON__${JSON.stringify({t:newText, edited:true})}`, currentPassword);
    socket.emit("chat-edit", {msgId: editingMsgId, enc, newText, edited:true});
    socket.emit("message-edit", {msgId: editingMsgId, enc}); // try both event names
  }catch(e){}
  showToast("Düzenlendi ✏️");
  cancelEdit();
}

function pinMessage(msgId, text, isMine){
  pinnedMessage = {msgId, text, sender: isMine ? "Ben" : "Karşı", time: Date.now()};
  showPinBar(pinnedMessage);
  try{ socket.emit("pin-message", {msgId, text, sender: myRealUsername, action:"pin"}); }catch(e){}
  showToast("📌 Sabitlendi");
}
function showPinBar(data){
  const bar=document.getElementById("pinBar");
  if(!bar) return;
  document.getElementById("pinSender").textContent = data.sender;
  document.getElementById("pinSnippet").textContent = data.text.substring(0,60);
  bar.style.display="block";
  bar.dataset.msgId = data.msgId;
}
function hidePinBar(){ const bar=document.getElementById("pinBar"); if(bar) bar.style.display="none"; }

function toggleStar(msgId, text, isMine, msgEl){
  if(starredMessages.has(msgId)){
    starredMessages.delete(msgId);
    msgEl.querySelector(".starIcon")?.remove();
    showToast("⭐ Yıldız kaldırıldı");
  }else{
    const data = {id:msgId, text, sender: isMine ? "Ben" : "Karşı", time: Date.now(), isMine};
    starredMessages.set(msgId, data);
    const bubble = msgEl.querySelector(".msgBubble");
    if(bubble && !bubble.querySelector(".starIcon")){
      const star=document.createElement("span"); star.className="starIcon"; star.textContent="⭐";
      bubble.appendChild(star);
    }
    showToast("⭐ Yıldızlandı");
  }
  saveStarred();
}
function saveStarred(){
  try{
    const arr = Array.from(starredMessages.values());
    localStorage.setItem("gorgor_starred", JSON.stringify(arr));
  }catch(e){}
}
function renderStarredPanel(){
  const list=document.getElementById("starredList");
  if(!list) return;
  list.innerHTML="";
  if(starredMessages.size===0){
    list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#666;">Henüz yıldızlı mesaj yok<br/><span style="font-size:12px;">Mesajlara ⭐ basarak kaydedebilirsin</span></div>`;
    return;
  }
  starredMessages.forEach((data, id)=>{
    const div=document.createElement("div");
    div.style.cssText="background:#111; border:1px solid #333; border-radius:12px; padding:10px; cursor:pointer;";
    div.innerHTML = `<div style="font-size:11px; color:#00ff88; margin-bottom:4px;">${escapeHtml(data.sender)} • ${new Date(data.time).toLocaleTimeString()}</div><div style="font-size:13px; color:#fff;">${escapeHtml(data.text.substring(0,120))}</div>`;
    div.onclick = ()=>{
      document.getElementById("starredPanel").style.display="none";
      const target=document.getElementById(id);
      if(target){ target.scrollIntoView({behavior:"smooth", block:"center"}); target.style.outline="2px solid #ffcc00"; setTimeout(()=>target.style.outline="",2000); }
    };
    list.appendChild(div);
  });
}

function forwardMessage(text){
  const fwd = prompt("İletilecek mesaj (düzenleyebilirsin):", text);
  if(fwd===null) return;
  const input=document.getElementById("messageInput");
  if(input){ input.value=fwd; input.focus(); }
  showToast("↪️ İletmeye hazır - Gönder'e bas");
}

async function translateText(text){
  const popup=document.getElementById("translatePopup");
  if(!popup) return;
  document.getElementById("translateOriginal").textContent = text.substring(0,100);
  document.getElementById("translateResult").textContent = "";
  document.getElementById("translateLoading").style.display="block";
  popup.style.display="block";
  try{
    // Use MyMemory free translate API
    const lang = /[ığüşöçİĞÜŞÖÇ]/.test(text) ? "tr|en" : "en|tr";
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${lang}`);
    const data = await res.json();
    const translated = data.responseData?.translatedText || "Çeviri bulunamadı";
    document.getElementById("translateResult").textContent = translated;
  }catch(e){
    // fallback simple
    document.getElementById("translateResult").textContent = "Çeviri hatası, internet kontrol et";
  }
  document.getElementById("translateLoading").style.display="none";
}

async function addPollMessage(msgId, payload, isMine, sentAt){
  const messagesEl = document.getElementById("messages");
  if(!messagesEl) return;
  if(document.getElementById(msgId)) return;
  const div=document.createElement("div");
  div.className = isMine ? "myMessage" : "otherMessage";
  div.id = msgId;
  div._sentAt = sentAt||Date.now();
  div._expireSec = 43200;
  const initial = (isMine ? (myRealUsername||"B") : "K").trim().charAt(0).toUpperCase();
  const clock = formatClock(new Date(div._sentAt));
  div._clock = clock;
  const isChecklist = payload.type==="checklist";
  const bubbleClass = isChecklist ? "msgBubble checklistBubble" : "msgBubble pollBubble";
  let html = `<div class="msgAvatar">${initial}</div><div class="${bubbleClass}"><span class="expireInfo">${clock} • ${isChecklist ? "✅ Checklist" : "📊 Anket"}</span>`;
  html += `<div class="pollQuestion">${escapeHtml(payload.question)}</div>`;
  payload.options.forEach((opt, idx)=>{
    if(isChecklist){
      const checked = payload.checks && payload.checks[idx] ? "checked" : "";
      html += `<div class="checklistItem"><input type="checkbox" data-idx="${idx}" ${checked} /> <span>${escapeHtml(opt)}</span></div>`;
    }else{
      const votes = payload.votes ? payload.votes[idx] : 0;
      const total = payload.votes ? payload.votes.reduce((a,b)=>a+b,0) : 0;
      const perc = total>0 ? Math.round(votes/total*100) : 0;
      html += `<div class="pollOption" data-idx="${idx}"><div class="pollOptionBar" style="width:${perc}%"></div><div class="pollOptionText"><span>${escapeHtml(opt)}</span><span class="pollVotes">${votes} oy • ${perc}%</span></div></div>`;
    }
  });
  html += `<span class="ticks ${isMine ? "single" : "double"}"> ${isMine ? "✓" : "✓✓"}</span></div>`;
  div.innerHTML = html;
  messagesEl.appendChild(div);
  setTimeout(()=>{ messagesEl.scrollTop=messagesEl.scrollHeight; },10);

  // store
  pollsData.set(msgId, payload);

  // add listeners
  if(isChecklist){
    div.querySelectorAll("input[type=checkbox]").forEach(chk=>{
      chk.addEventListener("change", ()=>{
        const idx = parseInt(chk.dataset.idx);
        payload.checks[idx] = chk.checked;
        pollsData.set(msgId, payload);
        try{ socket.emit("checklist-toggle", {msgId, idx, checked: chk.checked}); }catch(e){}
      });
    });
  }else{
    div.querySelectorAll(".pollOption").forEach(opt=>{
      opt.addEventListener("click", ()=>{
        const idx = parseInt(opt.dataset.idx);
        // simple vote logic - one vote per user per poll stored in voters map
        const voterKey = myRealUsername||"anon";
        const prev = payload.voters ? payload.voters[voterKey] : undefined;
        if(prev!==undefined){
          if(payload.votes[prev]>0) payload.votes[prev]--;
        }
        payload.votes[idx] = (payload.votes[idx]||0)+1;
        if(!payload.voters) payload.voters={};
        payload.voters[voterKey]=idx;
        // update UI
        const total = payload.votes.reduce((a,b)=>a+b,0);
        div.querySelectorAll(".pollOption").forEach((o,i)=>{
          const perc = total>0 ? Math.round(payload.votes[i]/total*100) : 0;
          o.querySelector(".pollOptionBar").style.width = perc+"%";
          o.querySelector(".pollVotes").textContent = `${payload.votes[i]} oy • ${perc}%`;
        });
        try{ socket.emit("poll-vote", {msgId, idx, voter: voterKey}); }catch(e){}
      });
    });
  }
  addActionButtonsToMessage(div, msgId, isMine, payload.question);
  return msgId;
}

// Search
function performSearch(q){
  clearHighlights();
  searchResults=[];
  currentSearchIdx=-1;
  if(!q || q.trim().length<2){ updateSearchCount(); return; }
  const lower = q.toLowerCase();
  const allMsgs = document.querySelectorAll(".myMessage, .otherMessage");
  allMsgs.forEach(el=>{
    const textEl = el.querySelector(".msgText");
    if(!textEl) return;
    const txt = textEl.textContent.toLowerCase();
    if(txt.includes(lower)){
      searchResults.push(el);
      // highlight
      highlightText(textEl, lower);
    }
  });
  if(searchResults.length>0){
    currentSearchIdx=0;
    focusSearchResult(0);
  }
  updateSearchCount();
}
function highlightText(el, lower){
  const original = el.textContent;
  const regex = new RegExp(`(${escapeRegExp(lower)})`, "gi");
  el.innerHTML = escapeHtml(original).replace(regex, '<span class="searchHighlight">$1</span>');
}
function clearHighlights(){
  document.querySelectorAll(".searchHighlight, .searchCurrent").forEach(s=>{
    const parent = s.parentNode;
    parent.replaceChild(document.createTextNode(s.textContent), s);
    parent.normalize();
  });
}
function clearSearch(){ clearHighlights(); searchResults=[]; currentSearchIdx=-1; updateSearchCount(); }
function navigateSearch(dir){
  if(searchResults.length===0) return;
  currentSearchIdx = (currentSearchIdx + dir + searchResults.length) % searchResults.length;
  focusSearchResult(currentSearchIdx);
  updateSearchCount();
}
function focusSearchResult(idx){
  clearCurrentMark();
  const el = searchResults[idx];
  if(!el) return;
  el.scrollIntoView({behavior:"smooth", block:"center"});
  const hl = el.querySelector(".searchHighlight");
  if(hl){
    hl.classList.remove("searchHighlight");
    hl.classList.add("searchCurrent");
  }
}
function clearCurrentMark(){
  document.querySelectorAll(".searchCurrent").forEach(s=>{ s.classList.remove("searchCurrent"); s.classList.add("searchHighlight"); });
}
function updateSearchCount(){
  const cnt = document.getElementById("searchCount");
  if(!cnt) return;
  if(searchResults.length===0) cnt.textContent="0/0";
  else cnt.textContent = `${currentSearchIdx+1}/${searchResults.length}`;
}

// Live location
function startLiveLocation(){
  const attachMenu = document.getElementById("attachMenu");
  if(attachMenu) attachMenu.classList.remove("show");
  if(!navigator.geolocation){ showToast("Konum desteklenmiyor"); return; }
  showToast("🗺️ Canlı konum 5dk paylaşılıyor...");
  let watchId=null;
  let count=0;
  const maxUpdates=10; // 5dk, 30sn aralık
  const sendLocation = (pos)=>{
    const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
    const text=`🗺️ Canlı Konum (${count+1}/${maxUpdates}): ${url}`;
    const input=document.getElementById("messageInput");
    // directly send
    (async ()=>{
      const expire = typeof getExpireFromSelect==="function" ? getExpireFromSelect() : 43200;
      const msgId = await addMyMessage(text, expire, myRealUsername);
      const enc = await encryptText(text, currentPassword);
      try{ socket.emit("chat-message", {msgId, enc, expireSec: expire, sentAt: Date.now(), deleteAt: Date.now()+expire*1000, realUsername: myRealUsername}); }catch(e){}
    })();
  };
  navigator.geolocation.getCurrentPosition(pos=>{ sendLocation(pos); count++; watchId = navigator.geolocation.watchPosition(pos2=>{
    count++;
    if(count>=maxUpdates){
      if(watchId) navigator.geolocation.clearWatch(watchId);
      showToast("Canlı konum bitti");
      return;
    }
    sendLocation(pos2);
  }, null, {enableHighAccuracy:true}); }, null, {enableHighAccuracy:true});
  // auto stop after 5 min
  setTimeout(()=>{ if(watchId) navigator.geolocation.clearWatch(watchId); showToast("Canlı konum sona erdi"); }, 5*60*1000);
}

// Socket harman events
function initSocketHarman(){
  try{
    socket.on("chat-edit", async (data)=>{
      const el = document.getElementById(data.msgId);
      if(!el) return;
      try{
        const plain = await decryptText(data.enc, currentPassword);
        let txt = plain;
        if(plain.startsWith("__GORGOR_JSON__")){
          const j = JSON.parse(plain.replace("__GORGOR_JSON__",""));
          txt = j.t;
        }
        const bubble = el.querySelector(".msgBubble");
        const msgText = bubble.querySelector(".msgText");
        if(msgText){
          const linked = txt.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
          msgText.innerHTML = linked;
          if(!bubble.querySelector(".editedLabel")){
            const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)";
            bubble.appendChild(ed);
          }
        }
      }catch(e){}
    });
    socket.on("message-edit", async (data)=>{
      // alias
      const el = document.getElementById(data.msgId);
      if(!el) return;
      try{
        const plain = await decryptText(data.enc, currentPassword);
        let txt = plain;
        if(plain.startsWith("__GORGOR_JSON__")){
          const j = JSON.parse(plain.replace("__GORGOR_JSON__",""));
          txt = j.t;
        }
        const bubble = el.querySelector(".msgBubble");
        const msgText = bubble.querySelector(".msgText");
        if(msgText){
          msgText.textContent = txt;
          if(!bubble.querySelector(".editedLabel")){
            const ed=document.createElement("span"); ed.className="editedLabel"; ed.textContent="(düzenlendi)";
            bubble.appendChild(ed);
          }
        }
      }catch(e){}
    });
    socket.on("pin-message", (data)=>{
      if(data.action==="unpin"){
        pinnedMessage=null;
        hidePinBar();
        return;
      }
      if(data.msgId){
        pinnedMessage = {msgId: data.msgId, text: data.text||"Sabit mesaj", sender: data.sender||"Karşı"};
        showPinBar(pinnedMessage);
      }
    });
    socket.on("poll-vote", (data)=>{
      const poll = pollsData.get(data.msgId);
      if(!poll || poll.type==="checklist") return;
      // apply vote
      const prev = poll.voters ? poll.voters[data.voter] : undefined;
      if(prev!==undefined && poll.votes[prev]>0) poll.votes[prev]--;
      poll.votes[data.idx] = (poll.votes[data.idx]||0)+1;
      if(!poll.voters) poll.voters={};
      poll.voters[data.voter]=data.idx;
      const div = document.getElementById(data.msgId);
      if(!div) return;
      const total = poll.votes.reduce((a,b)=>a+b,0);
      div.querySelectorAll(".pollOption").forEach((o,i)=>{
        const perc = total>0 ? Math.round(poll.votes[i]/total*100) : 0;
        o.querySelector(".pollOptionBar").style.width = perc+"%";
        o.querySelector(".pollVotes").textContent = `${poll.votes[i]} oy • ${perc}%`;
      });
    });
    socket.on("checklist-toggle", (data)=>{
      const poll = pollsData.get(data.msgId);
      if(!poll) return;
      poll.checks[data.idx]=data.checked;
      const div = document.getElementById(data.msgId);
      if(!div) return;
      const chk = div.querySelectorAll("input[type=checkbox]")[data.idx];
      if(chk) chk.checked = data.checked;
    });
    socket.on("view-once-opened", (data)=>{
      const el = document.getElementById(data.msgId);
      if(el){
        showToast("👁️ Karşı taraf bir kez görülen mesajı açtı");
        el.style.opacity="0.5";
        setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>el.remove(),300); }, 3000);
      }
    });
    socket.on("delete-message", (data)=>{
      const el=document.getElementById(data.msgId);
      if(el){ el.style.opacity="0"; setTimeout(()=>el.remove(),300); }
    });
  }catch(e){ console.log("harman socket init hata", e); }
}

// Helpers
function escapeHtml(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Override sendBtn to handle edit mode
const _origSendOnclick = null;
document.addEventListener("DOMContentLoaded", ()=>{
  const sendBtn = document.getElementById("sendBtn");
  if(sendBtn){
    const orig = sendBtn.onclick;
    sendBtn.addEventListener("click", (e)=>{
      // if editing, handled by editSave, not send
      if(editingMsgId){
        e.stopPropagation();
        e.preventDefault();
        saveEdit();
        return false;
      }
    }, true);
  }
  const input = document.getElementById("messageInput");
  if(input){
    input.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" && editingMsgId){
        e.preventDefault();
        saveEdit();
      }
    });
  }
});

// Show toast if not defined
if(typeof showToast!=="function"){
  window.showToast = function(msg){
    let t=document.getElementById("gorgorToast");
    if(!t){ t=document.createElement("div"); t.id="gorgorToast"; t.style.cssText="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #333;color:#fff;padding:10px 16px;border-radius:20px;font-size:12px;z-index:99999;max-width:80%;text-align:center;"; document.body.appendChild(t); }
    t.textContent=msg; t.style.display="block"; t.style.opacity="1"; setTimeout(()=>{ t.style.opacity="0"; setTimeout(()=>t.style.display="none",300); },3000);
  };
}

console.log("V22 HARMAN - tum ozellikler yuklendi: reply, edit 15dk, pin, star, search, forward, viewOnce, translate, poll/checklist, live location, quick react");


// V29
let isHiddenMode = false;
let hasNewMessageWhileHidden = false;
let hiddenCalcBuf = "";
let keepAliveInterval = null;
let wakeLock = null;
let blinkInterval = null;
let lastConnectionCheck = Date.now();
let connectionLost = false;

function hiddenCalcPress(v){
  if(['SHIFT','ALPHA','REPLAY','MODE','EXP','DEL'].includes(v)){
    const disp = document.getElementById("hiddenCalcDisplay");
    if(disp){ disp.value=v; setTimeout(()=>disp.value=hiddenCalcBuf,600); }
    return;
  }
  hiddenCalcBuf+=v;
  const d = document.getElementById("hiddenCalcDisplay");
  if(d) d.value=hiddenCalcBuf;
}
function hiddenCalcClear(){ hiddenCalcBuf=""; const d=document.getElementById("hiddenCalcDisplay"); if(d) d.value=""; }
function hiddenCalcEqual(){
  const d=document.getElementById("hiddenCalcDisplay");
  if(hiddenCalcBuf==="0000"){ exitHiddenMode(); hiddenCalcBuf=""; if(d) d.value=""; return; }
  try{ let r=eval(hiddenCalcBuf); if(d) d.value=r; hiddenCalcBuf=r.toString(); }catch(e){ if(d) d.value="Hata"; hiddenCalcBuf=""; }
}
function enterHiddenMode(){
  isHiddenMode=true; hasNewMessageWhileHidden=false; connectionLost=false;
  try{
    const mainEl = document.getElementById("mainScreen");
    if(mainEl) mainEl.style.display="none";
    const hiddenEl = document.getElementById("hiddenCalc");
    if(hiddenEl) hiddenEl.style.display="flex";
    else { console.error("hiddenCalc bulunamadi!"); alert("Gizli hesap makinesi bulunamadi, sayfayi yenileyin"); return; }
    const ind = document.getElementById("hiddenNewMsgIndicator");
    if(ind) ind.style.display="none";
    const lostModal = document.getElementById("connectionLostModal");
    if(lostModal) lostModal.style.display="none";
    stopBlinking();
    startKeepAlive();
    try{ if('wakeLock' in navigator){ navigator.wakeLock.request('screen').then(l=>{wakeLock=l;}).catch(()=>{}); } }catch(e){}
    if(typeof showToast==="function") showToast("🕵️ Gizli mod - 25sn ping aktif");
    console.log("GIZLI MOD GIRDI - keepalive 25sn");
  }catch(e){ console.error("enterHiddenMode hata", e); }
}
function exitHiddenMode(){
  isHiddenMode=false;
  try{
    const hiddenEl = document.getElementById("hiddenCalc");
    if(hiddenEl) hiddenEl.style.display="none";
    const mainEl = document.getElementById("mainScreen");
    if(mainEl) mainEl.style.display="block";
    stopBlinking(); hasNewMessageWhileHidden=false;
    const ind = document.getElementById("hiddenNewMsgIndicator");
    if(ind) ind.style.display="none";
    if(typeof messages!=="undefined" && messages) messages.scrollTop=messages.scrollHeight;
    checkConnectionAndWarn();
    try{
      if(typeof socket!=="undefined"){
        if(!socket.connected){
          console.log("Cikis: socket kopuk, yeniden baglaniyor");
          showConnectionLostModal();
          socket.connect();
          setTimeout(()=>{
            if(currentRoom && myUsername){
              socket.emit('join-room', {room: currentRoom, username: myUsername, realUsername: myRealUsername});
              hideConnectionLostModal();
              if(typeof showToast==="function") showToast("🔄 Bağlantı yenilendi");
            }
          }, 800);
        }else{
          if(currentRoom){
            socket.emit('join-room', {room: currentRoom, username: myUsername, realUsername: myRealUsername});
          }
          const pingStart = Date.now();
          socket.emit("ping-check", pingStart);
          setTimeout(()=>{
            if(Date.now() - pingStart > 5000 && !socket.connected){
              showConnectionLostModal();
            }
          }, 5000);
        }
      }
    }catch(e){ console.log("exitHiddenMode rejoin hata", e); showConnectionLostModal(); }
    if(typeof showToast==="function") showToast("🔓 Geri döndün");
    console.log("GIZLI MOD CIKIS - reconnect kontrol edildi");
  }catch(e){ console.error("exitHiddenMode hata", e); }
}
function showConnectionLostModal(){
  const modal = document.getElementById("connectionLostModal");
  if(modal){ modal.style.display="flex"; connectionLost=true; }
}
function hideConnectionLostModal(){
  const modal = document.getElementById("connectionLostModal");
  if(modal){ modal.style.display="none"; connectionLost=false; }
}
function checkConnectionAndWarn(){
  try{
    if(typeof socket!=="undefined" && !socket.connected){
      console.log("Baglanti kopuk - uyari goster");
      showConnectionLostModal();
      return false;
    }
    return true;
  }catch(e){ return false; }
}
function startBlinking2580(){
  ["hc_2","hc_5","hc_8","hc_0"].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add("hc-blink"); });
  const ind=document.getElementById("hiddenNewMsgIndicator"); if(ind) ind.style.display="block";
  let blink=false;
  if(blinkInterval) clearInterval(blinkInterval);
  blinkInterval=setInterval(()=>{ if(!isHiddenMode){clearInterval(blinkInterval); return;} document.title=blink?"💬 Yeni Mesaj":"HESAPLAMA"; blink=!blink; },1000);
}
function stopBlinking(){
  ["hc_2","hc_5","hc_8","hc_0"].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove("hc-blink"); });
  if(blinkInterval){ clearInterval(blinkInterval); blinkInterval=null; }
  document.title="HESAPLAMA";
}
function startKeepAlive(){
  if(keepAliveInterval) clearInterval(keepAliveInterval);
  doKeepAlivePing();
  keepAliveInterval=setInterval(()=>{ doKeepAlivePing(); }, 25*1000);
  setInterval(()=>{ try{ fetch('/health', {keepalive:true}).catch(()=>{}); fetch('/keepalive', {keepalive:true}).catch(()=>{}); fetch('/ping', {keepalive:true}).catch(()=>{}); }catch(e){} }, 5*60*1000);
}
function doKeepAlivePing(){
  try{
    if(typeof socket!=="undefined"){
      if(!socket.connected){
        console.log("Socket bagli degil, yeniden baglaniyor...");
        try{ socket.connect(); }catch(e){}
      }else{
        socket.emit("ping-check", Date.now());
        socket.emit("keepalive-ping", {from: (typeof myRealUsername!=="undefined"?myRealUsername:"gizli"), time: Date.now(), hidden: isHiddenMode});
        socket.emit("keepalive", {room: (typeof currentRoom!=="undefined"?currentRoom:""), user: (typeof myRealUsername!=="undefined"?myRealUsername:"")});
        lastConnectionCheck = Date.now();
      }
    }
    try{ fetch('/health', {keepalive:true}).catch(()=>{}); fetch('/keepalive', {keepalive:true}).catch(()=>{}); }catch(e){}
    if(typeof wakeLock!=="undefined" && wakeLock===null && 'wakeLock' in navigator){
      try{ navigator.wakeLock.request('screen').then(l=>{wakeLock=l;}).catch(()=>{}); }catch(e){}
    }
  }catch(e){ console.log("keepalive hata", e); }
}
// ===== V27 - GELISMIS ONLINE STATUS + GENEL MOD FIX =====
let opponentLastSeen = null;
let myStatus = "online";
let statusCheckInterval = null;

function formatLastSeen(ts){
  if(!ts) return "";
  const now = Date.now();
  const diffMs = now - ts;
  if(diffMs < 0) return "az önce";
  const diffSec = Math.floor(diffMs/1000);
  if(diffSec < 10) return "az önce";
  if(diffSec < 60) return `${diffSec} sn önce`;
  const mins = Math.floor(diffSec/60);
  if(mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins/60);
  if(hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours/24);
  return `${days} gün önce`;
}
function formatClockShort(ts){
  try{
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }catch(e){ return ""; }
}
function updateOpponentDisplay(username, status){
  const nameEl = document.getElementById("opponentNameDisplay");
  const statusEl = document.getElementById("opponentStatusText");
  const dotEl = document.getElementById("opponentDot");
  if(!nameEl || !statusEl || !dotEl) return;
  if(username && typeof myRealUsername!=="undefined" && username===myRealUsername) return;
  if(username){ nameEl.textContent = username; if(typeof opponentUsername!=="undefined") opponentUsername=username; }
  const secMode = localStorage.getItem("gorgor_security_mode")||"private";
  if(status === "online" || status === "çevrimiçi" || status === "varım"){
    statusEl.textContent = "çevrimiçi";
    statusEl.style.color = "#00ff88";
    dotEl.className = "onlineDot online";
    opponentLastSeen = Date.now();
    if(username && typeof lastSeenTimes!=="undefined") lastSeenTimes[username]=Date.now();
  }else if(status === "busy" || status === "meşgul"){
    if(secMode==="general"){
      statusEl.textContent = "çevrimiçi";
      statusEl.style.color = "#00ff88";
      dotEl.className = "onlineDot online";
    }else{
      statusEl.textContent = "meşgul";
      statusEl.style.color = "#ffcc00";
      dotEl.className = "onlineDot busy";
    }
  }else if(status === "offline" || status === "çevrimdışı" || status === "yokum"){
    let ts = opponentLastSeen;
    if(username && typeof lastSeenTimes!=="undefined" && lastSeenTimes[username]) ts = lastSeenTimes[username];
    if(ts){
      const clock = formatClockShort(ts);
      const rel = formatLastSeen(ts);
      if(clock && rel && rel!=="az önce"){
        statusEl.textContent = `son görülme ${clock} • ${rel}`;
      }else if(clock){
        statusEl.textContent = `son görülme ${clock}`;
      }else{
        statusEl.textContent = `son görülme ${rel}`;
      }
    }else{
      statusEl.textContent = "çevrimdışı";
    }
    statusEl.style.color = "#888";
    dotEl.className = "onlineDot offline";
  }else{
    statusEl.textContent = status;
  }
}
function initOnlineStatus(){
  document.addEventListener("visibilitychange", ()=>{
    const secMode = localStorage.getItem("gorgor_security_mode")||"private";
    if(secMode==="general"){
      console.log("GENEL MOD - status degistirilmiyor");
      try{ socket.emit("user-active", {user: myRealUsername}); }catch(e){}
      return;
    }
    if(document.hidden){
      myStatus = "busy";
      try{ socket.emit("user-busy", {user: myRealUsername, busy: true}); }catch(e){}
      console.log("Sekme gizlendi - mesgul (Ozel mod)");
    }else{
      myStatus = "online";
      try{ socket.emit("user-active", {user: myRealUsername}); }catch(e){}
      console.log("Sekme aktif - online");
    }
  });
  window.addEventListener("blur", ()=>{
    const secMode = localStorage.getItem("gorgor_security_mode")||"private";
    if(secMode==="general") return;
    if(!document.hidden){
      myStatus = "busy";
      try{ socket.emit("user-busy", {user: myRealUsername, busy: true}); }catch(e){}
    }
  });
  window.addEventListener("focus", ()=>{
    myStatus = "online";
    try{ socket.emit("user-active", {user: myRealUsername}); }catch(e){}
  });
  if(statusCheckInterval) clearInterval(statusCheckInterval);
  statusCheckInterval = setInterval(()=>{
    if(!document.hidden && myStatus === "online"){
      try{ socket.emit("user-active", {user: myRealUsername}); }catch(e){}
    }
  }, 30000);
}
function closeChatPanelIfOpen(){
  const chatPanel = document.getElementById("chatPanel");
  const body = document.body;
  if(chatPanel && body.classList.contains("chat-open")){
    body.classList.remove("chat-open");
    chatPanel.style.display = "none";
    console.log("Mesaj panosu kapatildi - gorusme basladi");
    if(typeof showToast==="function") showToast("📹 Görüşme başladı, mesaj panosu kapatıldı");
  }
}

