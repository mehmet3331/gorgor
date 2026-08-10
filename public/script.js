
console.log("V13 FINAL - emoji efekt + hibrit RAM/kalıcı + zoom serbest");
const socket = io({ timeout:60000, reconnection:true, reconnectionDelay:1000, reconnectionAttempts:10 });

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
const perMessageTimerSelect = document.getElementById("perMessageTimerSelect");
const defaultSelfDestructSelect = document.getElementById("defaultSelfDestructSelect");
const phoneModeBtn = document.getElementById("phoneModeBtn");
const phoneCallUI = document.getElementById("phoneCallUI");
const msnEffectLayer = document.getElementById("msnEffectLayer");
const remoteZoomHint = document.getElementById("remoteZoomHint");
const fakeUsersList = document.getElementById("fakeUsersList");
const fakeRoomsList = document.getElementById("fakeRoomsList");

let peer=null, localStream=null, currentRoom="", currentPassword="", myUsername="", currentQuality=720, currentFacingMode="user", pingTimer=null, currentMediaData=null;
let messageIdCounter=0; const sentMessages=new Map(); let defaultExpire=parseInt(localStorage.getItem("gorgor_default_expire")||"86400"); let activeTimers=new Map(); let isPhoneMode=false;
const MAX_SEC=604800;
if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString();
if(defaultSelfDestructSelect) defaultSelfDestructSelect.onchange=()=>{ defaultExpire=parseInt(defaultSelfDestructSelect.value); localStorage.setItem("gorgor_default_expire", defaultExpire); };

const REAL_ROOM="oda1"; const FAKE_ROOMS=["oda","oda2","oda3","oda4","oda5","oda6","oda7","oda8","oda9","oda10"]; const REAL_USERS=["varım","yokum"]; const FAKE_USERS=["buradayım","geldim","bekliyorum","hazırım","uyuyorum","meşgulüm","çevrimiçiyim","çevrimdışıyım","yoldayım","müsaitim","dinleniyorum","çalışıyorum"];
function normalize(s){ return (s||"").toString().trim().toLowerCase(); }
function renderFakeLists(){
 if(fakeUsersList){ fakeUsersList.innerHTML=""; [...REAL_USERS,...FAKE_USERS].sort(()=>Math.random()-0.5).forEach(u=>{ const sp=document.createElement("span"); sp.className="userTag"; sp.textContent=u; sp.onclick=()=>{ userName.value=u; }; fakeUsersList.appendChild(sp); }); }
 if(fakeRoomsList){ fakeRoomsList.innerHTML=""; [REAL_ROOM,...FAKE_ROOMS].sort(()=>Math.random()-0.5).forEach(r=>{ const sp=document.createElement("span"); sp.className="userTag"; sp.textContent=r; sp.onclick=()=>{ roomName.value=r; roomName.dispatchEvent(new Event('input')); }; fakeRoomsList.appendChild(sp); }); }
}
renderFakeLists();

async function deriveKey(password){ const enc=new TextEncoder(); const hash=await crypto.subtle.digest('SHA-256', enc.encode(password)); return await crypto.subtle.importKey('raw', hash, {name:'AES-GCM'}, false, ['encrypt','decrypt']); }
function bufToB64(buf){ const bytes=new Uint8Array(buf); let binary=""; const chunk=8192; for(let i=0;i<bytes.length;i+=chunk){ binary+=String.fromCharCode.apply(null, bytes.subarray(i,i+chunk)); } return btoa(binary); }
function b64ToBuf(b64){ const binary=atob(b64); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes; }
async function encryptText(text,password){ const key=await deriveKey(password); const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(text)); const combined=new Uint8Array(iv.length+ct.byteLength); combined.set(iv,0); combined.set(new Uint8Array(ct), iv.length); return bufToB64(combined); }
async function decryptText(b64,password){ try{ const key=await deriveKey(password); const combined=b64ToBuf(b64); const iv=combined.slice(0,12); const ct=combined.slice(12); const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct); return new TextDecoder().decode(pt); }catch(e){ return null; } }

async function startCamera(h=720, facing=currentFacingMode){
 try{ if(localStream) localStream.getVideoTracks().forEach(t=>t.stop()); localStream=await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ideal:facing}, width:{ideal:h===1080?1920:h===720?1280:854}, height:{ideal:h}, frameRate:{ideal:30}}, audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true } }); myVideo.srcObject=localStream; myVideo.style.transform=facing==="user"?"scaleX(-1)":"scaleX(1)"; return true; }catch{ return false; }
}
function startPingMonitor(){ if(pingTimer) clearInterval(pingTimer); pingTimer=setInterval(()=>socket.emit("ping-check", Date.now()), 3000); }
socket.on("pong-check", ts=>{ const ping=Date.now()-ts; if(pingValue) pingValue.textContent=ping+" ms"; if(!connectionQuality) return; if(ping<100){ connectionQuality.textContent="Mükemmel"; connectionQuality.className="good"; } else if(ping<200){ connectionQuality.textContent="İyi"; connectionQuality.className="medium"; } else { connectionQuality.textContent="Zayıf"; connectionQuality.className="bad"; } });

// ZOOM - remoteVideo için eski sevdiğin serbest zoom
let remoteScale=1, lastDist=0, startScale=1;
remoteVideo.addEventListener("touchstart", (e)=>{
 if(document.fullscreenElement) return; // tam ekranda sabit
 if(e.touches.length===2){ lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); startScale=remoteScale; remoteZoomHint.classList.add("show"); }
});
remoteVideo.addEventListener("touchmove", (e)=>{
 if(document.fullscreenElement) return;
 if(e.touches.length===2){
  e.preventDefault();
  const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
  const scaleFactor=dist/lastDist;
  remoteScale=Math.min(Math.max(startScale*scaleFactor, 1), 4);
  remoteVideo.style.transform=`scale(${remoteScale})`;
  if(remoteScale>1) remoteVideo.classList.add("zoomed"); else remoteVideo.classList.remove("zoomed");
 }
}, {passive:false});
remoteVideo.addEventListener("touchend", ()=>{
 remoteZoomHint.classList.remove("show");
 if(remoteScale===1) remoteVideo.style.transform="";
});
remoteVideo.addEventListener("dblclick", ()=>{ remoteScale=1; remoteVideo.style.transform=""; remoteVideo.classList.remove("zoomed"); });

if(fullscreenBtn){
 fullscreenBtn.onclick=()=>{
  if(!document.fullscreenElement){
   document.documentElement.requestFullscreen().then(()=>{
     document.body.classList.add("fullscreen-mode");
     remoteScale=1; remoteVideo.style.transform=""; // tam ekranda sabit
   });
  } else {
   document.exitFullscreen().then(()=>{ document.body.classList.remove("fullscreen-mode"); });
  }
 };
}
document.addEventListener("fullscreenchange", ()=>{
 if(!document.fullscreenElement) document.body.classList.remove("fullscreen-mode");
});

joinBtn.onclick=async()=>{
 const room=roomName.value.trim(); const pass=roomPassword.value.trim(); const uname=userName.value.trim();
 if(!room||!pass){ alert("Oda ve şifre gerekli"); return; }
 await startCamera(currentQuality);
 currentRoom=room; currentPassword=pass; myUsername=uname;
 socket.emit("join-room", { room, password:pass, username:uname });
};
socket.on("room-error", m=> alert(m));
socket.on("joined-room", d=>{
 roomScreen.style.display="none"; mainScreen.style.display="block"; startPingMonitor();
 if(d.count===2) createPeer(true);
});
socket.on("user-connected", ()=>{ if(!peer) createPeer(false); });
function createPeer(initiator){
 peer=new SimplePeer({ initiator, trickle:false, stream:localStream, config:{ iceServers:[{ urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"] }] } });
 peer.on("signal", s=> socket.emit("signal",{ room:currentRoom, signal:s }));
 peer.on("stream", stream=>{ remoteVideo.srcObject=stream; remoteVideo.play().catch(()=>{}); });
}
socket.on("signal", s=>{ if(!peer) createPeer(false); peer.signal(s); });
socket.on("user-disconnected", ()=>{ remoteVideo.srcObject=null; if(peer){ peer.destroy(); peer=null; } });

function formatTime(sec){ if(sec<60) return `${sec} sn`; const m=Math.floor(sec/60); const s=sec%60; if(m>=60){ const h=Math.floor(m/60); const mm=m%60; if(h>=24){ const d=Math.floor(h/24); const hh=h%24; return `${d}g ${hh}sa`; } return `${h}sa ${mm}dk`; } return `${m} dk ${s} sn`; }
function startSelfDestruct(div, msgId, expireSec, deleteAt){
 expireSec=Math.min(expireSec, MAX_SEC);
 if(activeTimers.has(msgId)){ const old=activeTimers.get(msgId); clearInterval(old.interval); clearTimeout(old.timeout); }
 const expireAt=deleteAt||(Date.now()+expireSec*1000);
 const countdownEl=div.querySelector(".countdown");
 const update=()=>{
  const remain=Math.max(0, Math.floor((expireAt-Date.now())/1000));
  if(countdownEl) countdownEl.textContent=`⏳ ${formatTime(remain)} • ${expireSec<=900?'RAM':'Kalıcı'}`;
  if(remain<=0){ div.style.opacity="0.3"; div.innerHTML+="<br><small>🗑️ Silindi</small>"; }
 };
 const interval=setInterval(update,1000); update();
 const timeout=setTimeout(()=>{ div.remove(); activeTimers.delete(msgId); }, expireAt-Date.now()+1000);
 activeTimers.set(msgId, {interval, timeout});
}

async function addMyMessage(text, expireSec){
 const msgId=`msg-${Date.now()}-${messageIdCounter++}`;
 const div=document.createElement("div"); div.className="myMessage"; div.id=msgId;
 const linked=text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
 div.innerHTML=`BEN → ${linked}<span class="message-tick">✓</span><div class="countdown"></div>`;
 // süre değiştirme için tıklama
 div.onclick=()=>{
  const newVal=prompt("Süreyi değiştir (sn): 300=5dk, 900=15dk, 14400=4s, 86400=24s, 604800=7gün");
  if(newVal){ socket.emit("update-expire",{ msgId, newExpireSec: parseInt(newVal) }); startSelfDestruct(div, msgId, parseInt(newVal)); }
 };
 messages.appendChild(div); messages.scrollTop=messages.scrollHeight;
 sentMessages.set(msgId, div);
 startSelfDestruct(div, msgId, expireSec);
 return msgId;
}
async function addOtherMessage(encrypted, msgId, expireSec, deleteAt){
 const text=await decryptText(encrypted, currentPassword);
 if(!text) return;
 const div=document.createElement("div"); div.className="otherMessage"; div.id=msgId;
 const linked=text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
 div.innerHTML=`SEN → ${linked}<div class="countdown"></div>`;
 messages.appendChild(div); messages.scrollTop=messages.scrollHeight;
 startSelfDestruct(div, msgId, expireSec, deleteAt);
 if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink","shake"); setTimeout(()=>chatToggle.classList.remove("shake"),600); }
 socket.emit("message-opened", { msgId, expireSec });
}

sendBtn.onclick=async()=>{
 const text=input.value.trim(); if(!text) return;
 let expire=perMessageTimerSelect.value==="default"? defaultExpire : parseInt(perMessageTimerSelect.value);
 const msgId=await addMyMessage(text, expire);
 const enc=await encryptText(text, currentPassword);
 socket.emit("chat-message", { encryptedText:enc, expireSec:expire, msgId, username:myUsername });
 input.value="";
};
input.addEventListener("keydown", e=>{ if(e.key==="Enter") sendBtn.click(); });

socket.on("chat-message", async data=>{
 await addOtherMessage(data.encryptedText, data.msgId, data.expireSec);
});
socket.on("message-opened", ({msgId, deleteAt})=>{
 const el=document.getElementById(msgId);
 if(el){ const remain=deleteAt-Date.now(); if(remain>0){ const cur=activeTimers.get(msgId); if(cur){ clearInterval(cur.interval); clearTimeout(cur.timeout); } startSelfDestruct(el, msgId, Math.floor(remain/1000), deleteAt); } }
});
socket.on("expire-updated", ({msgId, newExpireSec})=>{
 const el=document.getElementById(msgId);
 if(el){ startSelfDestruct(el, msgId, newExpireSec); }
});

// Emoji efektleri - SENİN İSTEDİKLERİN
function createFlyingEmoji(emoji, effect, isMine){
 if(effect==="heartRain" || emoji==="❤"){
  for(let i=0;i<3;i++){
   setTimeout(()=>{
    const el=document.createElement("div"); el.className="flying-emoji heart-rain"; el.textContent="❤";
    el.style.left=(Math.random()*60+20)+"vw"; el.style.top="-50px"; el.style.color=["#ff0000","#ff4d6d","#ff8fa3"][i];
    document.body.appendChild(el); setTimeout(()=>el.remove(),3000);
   }, i*300);
  }
  return;
 }
 if(effect==="kissJump" || emoji==="😘"){
  const el=document.createElement("div"); el.className="flying-emoji kiss-jump"; el.textContent="😘";
  el.style.left=(isMine? "70%":"30%"); el.style.bottom="120px"; el.style.fontSize="50px";
  document.body.appendChild(el); setTimeout(()=>el.remove(),1800); return;
 }
 if(effect==="fireFlash" || emoji==="🔥"){
  const el=document.createElement("div"); el.className="flying-emoji fire-tremble"; el.textContent="🔥"; el.style.left="50%"; el.style.bottom="50%"; el.style.fontSize="60px"; el.style.transform="translateX(-50%)";
  document.body.appendChild(el);
  const flash=document.createElement("div"); flash.className="flash-overlay"; document.body.appendChild(flash);
  setTimeout(()=>{ el.remove(); flash.remove(); }, 900); return;
 }
 if(effect==="shake10" || emoji==="👉"){
  document.body.classList.add("screen-shake10");
  if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
  msnEffectLayer.textContent="👉"; msnEffectLayer.style.display="flex"; msnEffectLayer.style.alignItems="center"; msnEffectLayer.style.justifyContent="center"; msnEffectLayer.style.fontSize="80px";
  setTimeout(()=>{ document.body.classList.remove("screen-shake10"); msnEffectLayer.textContent=""; }, 900);
  return;
 }
 // diğer emojiler basit uçma
 const el=document.createElement("div"); el.className="flying-emoji"; el.textContent=emoji; el.style.left=(isMine? "70%":"30%"); el.style.bottom="100px"; el.style.animation="heartRain 2s linear forwards"; document.body.appendChild(el); setTimeout(()=>el.remove(),2000);
}

document.querySelectorAll('.flyEmoji').forEach(e=>{
 if(e.id==='addCustomEmoji') return;
 e.onclick=(ev)=>{
  ev.stopPropagation();
  const effect=e.dataset.effect; const txt=e.textContent;
  socket.emit('fly-emoji',{ emoji:txt, effect }); createFlyingEmoji(txt, effect, true);
  emojiPanel.classList.remove("show");
 };
});
socket.on('fly-emoji', d=> createFlyingEmoji(d.emoji, d.effect, false));

if(emojiBtn) emojiBtn.onclick=()=> emojiPanel.classList.toggle("show");
if(nudgeBtn) nudgeBtn.onclick=()=>{ socket.emit("nudge"); document.body.classList.add("screen-shake10"); setTimeout(()=>document.body.classList.remove("screen-shake10"),900); createFlyingEmoji("👉","shake10",true); };

socket.on("nudge", ()=>{
 document.body.classList.add("screen-shake10");
 if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
 setTimeout(()=>document.body.classList.remove("screen-shake10"),900);
});

// Diğer butonlar
settingsBtn.onclick=()=> settingsContainer.classList.toggle("menu-open");
micBtn.textContent="🎤"; camBtn.textContent="📷";
micBtn.onclick=()=>{ if(!localStream) return; micBtn.classList.toggle("offIcon"); localStream.getAudioTracks().forEach(t=> t.enabled=!t.enabled); };
camBtn.onclick=()=>{ if(!localStream) return; camBtn.classList.toggle("offIcon"); localStream.getVideoTracks().forEach(t=> t.enabled=!t.enabled); };
chatToggle.onclick=()=>{
 if(chatPanel.style.display==="flex"){ chatPanel.style.display="none"; chatToggle.textContent="💬"; }
 else { chatPanel.style.display="flex"; chatToggle.textContent="✖"; chatToggle.classList.remove("newMessageBlink"); socket.emit("messages-read-all"); }
};
