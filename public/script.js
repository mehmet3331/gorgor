console.log("V12.3 FIX3 - SADIK KALINDI + 3 FIX");
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
const defaultSelfDestructRange = document.getElementById("defaultSelfDestructRange");
const defaultExpireLabel = document.getElementById("defaultExpireLabel");
const phoneModeBtn = document.getElementById("phoneModeBtn");
const phoneCallUI = document.getElementById("phoneCallUI");
const candleContainer = document.getElementById("candleContainer");
const msnEffectLayer = document.getElementById("msnEffectLayer");
const panicBtn = document.getElementById("panicBtn");
const userListBox = document.getElementById("userListBox");
const fakeUsersList = document.getElementById("fakeUsersList");
const fakeRoomsList = document.getElementById("fakeRoomsList");
const fakeRoomsHint = document.getElementById("fakeRoomsHint");
const currentUserBox = document.getElementById("currentUserBox");
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
let micEnabled = false; let camEnabled = false;
let currentQuality = 720; let currentFacingMode = "user"; let pingTimer = null; let currentMediaData = null;
let typingTimer; let isTyping = false; let messageIdCounter = 0;
const sentMessages = new Map();
let defaultExpire = parseInt(localStorage.getItem("gorgor_default_expire") || "14400");
let activeTimers = new Map();
let isPhoneMode = false;
let isPickingFile = false;
let _photoPicking = false;
const MAX_SEC = 86400;

const REAL_ROOM = "oda1";
const FAKE_ROOMS = ["oda","oda2","oda3","oda4","oda5","oda6","oda7","oda8","oda9"];
const REAL_USERS = ["varım","yokum"];
const FAKE_USERS = ["buradayım","geldim","bekliyorum","hazırım","uyuyorum","meşgulüm","çevrimiçiyim","çevrimdışıyım","yoldayım","müsaitim","dinleniyorum","çalışıyorum"];

function normalize(s){ return (s||"").toString().trim().toLowerCase(); }
function renderFakeLists(){
  if(fakeUsersList){
    fakeUsersList.innerHTML="";
    const allUsers = [...REAL_USERS,...FAKE_USERS].sort(() => Math.random() - 0.5);
    allUsers.forEach(u=>{
      const sp=document.createElement("span"); sp.className="userTag"; sp.textContent=u;
      sp.onclick=()=>{ userName.value=u; };
      fakeUsersList.appendChild(sp);
    });
  }
  if(fakeRoomsList){
    fakeRoomsList.innerHTML="";
    const allRooms = [REAL_ROOM,...FAKE_ROOMS].sort(() => Math.random() - 0.5);
    allRooms.forEach(r=>{
      const sp=document.createElement("span"); sp.className="userTag"; sp.textContent=r;
      sp.onclick=()=>{ roomName.value=r; roomName.dispatchEvent(new Event('input')); };
      fakeRoomsList.appendChild(sp);
    });
  }
}
renderFakeLists();
roomName.addEventListener("input",()=>{
  const v=normalize(roomName.value);
  if(v.length>0){ if(fakeRoomsHint) fakeRoomsHint.style.display="block"; }else{ if(fakeRoomsHint) fakeRoomsHint.style.display="none"; }
  if(v===REAL_ROOM || v.length>=2){ userName.style.display="block"; userListBox.style.display="block"; }else{ userName.style.display="none"; userListBox.style.display="none"; }
});

async function deriveKey(password){
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return await crypto.subtle.importKey('raw', hash, { name:'AES-GCM' }, false, ['encrypt','decrypt']);
}
function bufToB64(buf){
  const bytes = new Uint8Array(buf); let binary = ""; const chunk = 8192;
  for(let i=0;i<bytes.length;i+=chunk){ binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk)); }
  return btoa(binary);
}
function b64ToBuf(b64){
  const binary = atob(b64); const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes;
}
async function encryptText(text,password){
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(text));
  const combined = new Uint8Array(iv.length + ct.byteLength); combined.set(iv,0); combined.set(new Uint8Array(ct), iv.length);
  return bufToB64(combined);
}
async function decryptText(b64,password){
  try{
    const key = await deriveKey(password);
    const combined = b64ToBuf(b64);
    const iv = combined.slice(0,12); const ct = combined.slice(12);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  }catch(e){ console.log("decrypt fail",e); return null; }
}

// FIX 1: KAYDIRMALI VARSAYILAN SURE
function formatTime(sec){
  if(sec<60) return `${sec} sn`;
  const m=Math.floor(sec/60); const s=sec%60;
  if(m<60) return `${m} dk ${s} sn`;
  const h=Math.floor(m/60); const mm=m%60;
  if(h<24) return `${h}sa ${mm}dk`;
  const d=Math.floor(h/24); const hh=h%24;
  return `${d}g ${hh}sa ${mm}dk`;
}
if(defaultSelfDestructRange){
  defaultSelfDestructRange.value = defaultExpire.toString();
  if(defaultExpireLabel) defaultExpireLabel.textContent = `⏳ ${formatTime(defaultExpire)}`;
  if(defaultSelfDestructSelect) defaultSelfDestructSelect.value = defaultExpire.toString();
  defaultSelfDestructRange.oninput = ()=>{
    let val = parseInt(defaultSelfDestructRange.value);
    defaultExpire = val;
    try{ localStorage.setItem("gorgor_default_expire", defaultExpire.toString()); }catch(e){}
    if(defaultExpireLabel) defaultExpireLabel.textContent = `⏳ ${formatTime(val)}`;
    if(defaultSelfDestructSelect) defaultSelfDestructSelect.value = val.toString();
    console.log("varsayilan sure kaydirildi:", val);
  };
}
if(defaultSelfDestructSelect){
  defaultSelfDestructSelect.onchange = ()=>{
    let val = parseInt(defaultSelfDestructSelect.value);
    defaultExpire = val;
    try{ localStorage.setItem("gorgor_default_expire", val.toString()); }catch(e){}
    if(defaultSelfDestructRange) defaultSelfDestructRange.value = val.toString();
    if(defaultExpireLabel) defaultExpireLabel.textContent = `⏳ ${formatTime(val)}`;
  };
}

micBtn.textContent = "🎤"; camBtn.textContent = "📷";

async function startCamera(height=720, facingMode=currentFacingMode){
  try{
    if(localStream){ localStream.getVideoTracks().forEach(t=> t.stop()); }
    localStream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:{ ideal:facingMode }, width:{ ideal: height===1080?1920:height===720?1280:854 }, height:{ ideal:height }, frameRate:{ ideal:30 } },
      audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true }
    });
    myVideo.srcObject = localStream;
    myVideo.style.transform = facingMode==="user"?"scaleX(-1)":"scaleX(1)";
    // GIRISTE KAPALI KALSIN - AYNI KALIYOR
    localStream.getVideoTracks().forEach(t=>t.enabled=false);
    localStream.getAudioTracks().forEach(t=>t.enabled=false);
    micEnabled=false; camEnabled=false;
    micBtn.classList.add("offIcon"); camBtn.classList.add("offIcon");
    micBtn.textContent="🔇";
    return true;
  }catch(err){ console.log("kamera hata",err); return false; }
}
function startPingMonitor(){ if(pingTimer) clearInterval(pingTimer); pingTimer=setInterval(()=> socket.emit("ping-check", Date.now()), 3000); }
socket.on("pong-check", ts=>{
  const ping = Date.now()-ts;
  if(pingValue) pingValue.textContent = ping+" ms";
  if(!connectionQuality) return;
  if(ping<100){ connectionQuality.textContent="Mükemmel"; connectionQuality.className="good"; }
  else if(ping<200){ connectionQuality.textContent="İyi"; connectionQuality.className="medium"; }
  else { connectionQuality.textContent="Zayıf"; connectionQuality.className="bad"; }
});

joinBtn.onclick = async()=>{
  const room = roomName.value.trim(); const password = roomPassword.value.trim(); const uname = userName.value.trim();
  if(!room){ alert("Oda adı gir"); return; }
  if(!uname){ alert("Kullanıcı adı gir"); return; }
  if(!password){ alert("Şifre gerekli"); return; }
  currentPassword=password;
  myUsername=normalize(uname);
  myRealUsername=uname;
  await startCamera(currentQuality);
  currentRoom=room;
  socket.emit("join-room",{ room, password, username: uname });
};

socket.on("room-error", msg=> alert(msg));
socket.on("joined-room", data=>{
  roomScreen.style.display="none"; mainScreen.style.display="block";
  if(candleContainer) candleContainer.classList.remove("show");
  if(remoteVideo) remoteVideo.style.display="block";
  if(currentUserBox) currentUserBox.textContent=`Ben: ${data.username}`;
  myRealUsername=data.username; myUsername=normalize(data.username);
  startPingMonitor();
  if(data.count===2) createPeer(true);
});
socket.on("user-connected",(d)=>{ if(!peer) createPeer(false); });
function createPeer(initiator){
  peer = new SimplePeer({ initiator, trickle:false, stream:localStream, config:{ iceServers:[{ urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"] }] } });
  peer.on("signal", signal=> socket.emit("signal",{ room:currentRoom, signal }));
  peer.on("stream", stream=>{
    remoteVideo.srcObject=stream; remoteVideo.play().catch(()=>{});
    if(candleContainer) candleContainer.classList.remove("show");
    if(isPhoneMode){ remoteVideo.style.display="none"; } else{ remoteVideo.style.display="block"; }
  });
  peer.on("close", ()=>{
    if(remoteVideo){ remoteVideo.pause(); try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.load(); remoteVideo.style.display="none"; }
    if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; }
  });
}
socket.on("signal", signal=>{ if(!peer) createPeer(false); peer.signal(signal); });
socket.on("user-disconnected",()=>{
  if(remoteVideo){
    remoteVideo.pause();
    try{ remoteVideo.srcObject=null; }catch(e){}
    remoteVideo.removeAttribute("src");
    remoteVideo.load();
    remoteVideo.style.display="none";
  }
  if(peer){ try{peer.destroy();}catch(e){} peer=null; }
  if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; }
  if(connectionQuality){ connectionQuality.textContent="Karşı yok - Mum 🕯"; connectionQuality.className="bad"; }
  if(pingTimer){ clearInterval(pingTimer); pingTimer=null; }
});
qualitySelect.onchange = async()=>{
  const wasCamOn = camEnabled;
  const wasMicOn = micEnabled;
  currentQuality=parseInt(qualitySelect.value);
  socket.emit("quality-change", currentQuality);
  await startCamera(currentQuality, currentFacingMode);
  if(localStream){
    localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn);
    localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn);
    camEnabled=wasCamOn; micEnabled=wasMicOn;
    if(!wasCamOn) camBtn.classList.add("offIcon"); else camBtn.classList.remove("offIcon");
    if(!wasMicOn) micBtn.classList.add("offIcon"); else micBtn.classList.remove("offIcon");
    micBtn.textContent=wasMicOn?"🎤":"🔇";
    myVideo.style.opacity=wasCamOn?"1":"0.3";
  }
  if(peer && localStream){ 
    const sender = peer._pc.getSenders().find(s=> s.track && s.track.kind==="video"); 
    if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]); 
  }
};
settingsBtn.onclick = ()=> settingsContainer.classList.toggle("menu-open");
if(fullscreenBtn){ fullscreenBtn.onclick = ()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }

function startSelfDestruct(div, msgId, expireSec, deleteAt){
  expireSec=Math.min(expireSec,MAX_SEC);
  if(activeTimers.has(msgId)){ const old=activeTimers.get(msgId); clearInterval(old.interval); clearTimeout(old.timeout); }
  const expireAt = deleteAt || (Date.now()+expireSec*1000);
  const countdownEl = div.querySelector(".countdown");
  const interval=setInterval(()=>{
    const remaining=Math.max(0, Math.floor((expireAt-Date.now())/1000));
    if(countdownEl){ countdownEl.textContent=`⏳ ${formatTime(remaining)} içinde kaybolacak`; if(remaining<60) countdownEl.style.color="#ff4444"; }
    if(remaining<=0) clearInterval(interval);
  },1000);
  const timeout=setTimeout(()=>{
    div.innerHTML="💨 Bu mesaj kendini imha etti"; div.className="selfDestructed";
    setTimeout(()=>div.remove(),2000);
    clearInterval(interval); activeTimers.delete(msgId);
  },expireAt-Date.now());
  activeTimers.set(msgId,{interval,timeout,expireAt});
}
function addReduceExtendButtons(div,msgId){
  if(div.querySelector(".reduceBtn")) return;
  const reduce=document.createElement("button"); reduce.className="reduceBtn"; reduce.textContent="⏩ Azalt";
  reduce.onclick=(e)=>{ e.stopPropagation(); const timer=activeTimers.get(msgId); let remaining=MAX_SEC; if(timer) remaining=Math.max(0,Math.floor((timer.expireAt-Date.now())/1000)); else remaining=div._expireSec||defaultExpire; const inp=prompt(`Kalan: ${formatTime(remaining)}\nYeni süre saniye?`); if(!inp) return; let newVal=parseInt(inp.replace(/[^0-9]/g,'')); if(isNaN(newVal)||newVal<=0) return; if(newVal>MAX_SEC) newVal=MAX_SEC; socket.emit("reduce-request",{ msgId, newExpireSec:newVal }); };
  const extend=document.createElement("button"); extend.className="extendBtn"; extend.textContent="⏳ Uzat";
  extend.onclick=(e)=>{ e.stopPropagation(); const inp=prompt("Ne kadar uzatayım? saniye"); if(!inp) return; let v=parseInt(inp.replace(/[^0-9]/g,'')); if(isNaN(v)||v<=0) return; socket.emit("extend-request",{ msgId, extraSec:v }); };
  div.appendChild(reduce); div.appendChild(extend);
}
async function addMyMessage(text,expireSec,realName){
  const now = Date.now();
  const msgId=`msg-${now}-${messageIdCounter++}`;
  const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; expireSec=Math.min(expireSec,MAX_SEC);
  const linked=text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
  div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(expireSec)}</span>BEN (${realName}) → ${linked}<span class="ticks single" style="color:#999;"> ✓</span><span class="countdown">⏳ ${formatTime(expireSec)}</span>`;
  div._sentAt=now; div._deleteAt=now+expireSec*1000;
  messages.appendChild(div); 
  setTimeout(()=>{ messages.scrollTop = messages.scrollHeight; }, 10);
  sentMessages.set(msgId,div); div._expireSec=expireSec; 
  startSelfDestruct(div,msgId,expireSec,div._deleteAt);
  addReduceExtendButtons(div,msgId); 
  return msgId;
}
async function addMyMediaMessage(dataUrl,mediaType,expireSec,fileName){
  const now=Date.now();
  const msgId=`media-${now}-${messageIdCounter++}`;
  const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; div._expireSec=expireSec; div._sentAt=now; div._deleteAt=now+expireSec*1000;
  div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(expireSec)}</span>`;
  if(mediaType==="image"){ const img=document.createElement("img"); img.src=dataUrl; img.className="mediaMessage"; div.appendChild(img); }
  else if(mediaType==="video"){ const v=document.createElement("video"); v.src=dataUrl; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
  const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
  messages.appendChild(div); messages.scrollTop=messages.scrollHeight;
  sentMessages.set(msgId,div);
  startSelfDestruct(div,msgId,expireSec,div._deleteAt);
  addReduceExtendButtons(div,msgId);
  return msgId;
}

// FIX 3: MESAJ OKUNMA BEKLEMEDEN SAYAC BASLASIN - DOGUUDAN COZULMUS GOSTER
async function addLockedMessage(msgId, expireSec, enc, mediaType, senderReal, sentAt){
  try{
    if(document.getElementById(msgId)) return;
    // DOGDUDAN COZ VE GOSTER, KILITLI BEKLEME YOK
    const plain = await decryptText(enc, currentPassword);
    if(!plain){ console.log("decrypt fail",msgId); return; }
    const div=document.createElement("div"); div.className="otherMessage"; div.id=msgId;
    expireSec=Math.min(expireSec||defaultExpire,MAX_SEC);
    const deleteAt = sentAt ? (sentAt + expireSec*1000) : (Date.now()+expireSec*1000);
    const remaining = Math.max(1, Math.floor((deleteAt - Date.now())/1000));
    if(remaining<=0) return;
    if(mediaType==="text" || !mediaType){
      const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
      div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} - ${senderReal}</span>${senderReal} → ${linked}<span class="countdown">⏳ ${formatTime(remaining)}</span>`;
    }else{
      div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} - ${senderReal}</span>`;
      if(mediaType==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; img.onclick=(ev)=>{ ev.stopPropagation(); openPreview({type:"image",data:plain,name:"gizli.jpg"}); }; div.appendChild(img); }
      else if(mediaType==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
      const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
    }
    messages.appendChild(div); 
    setTimeout(()=>{ messages.scrollTop = messages.scrollHeight; }, 10);
    // SAYAC ATILDIKTAN SONRA BASLASIN - OKUNMA BEKLEME YOK
    startSelfDestruct(div,msgId,remaining,deleteAt);
    addReduceExtendButtons(div,msgId);
    // okundu bilgisi gonder ama sayaci bekletme
    socket.emit("message-opened",{msgId});
    socket.emit("message-read",{msgId,reader:myRealUsername});
    if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink"); }
  }catch(e){ console.log("addLockedMessage err", e); }
}

function getExpireFromSelect(){
  let val = perMessageTimerSelect.value;
  if(val==="default") return defaultExpire;
  return Math.min(parseInt(val),MAX_SEC);
}
sendBtn.onclick=async()=>{
  const text=input.value.trim(); if(!text) return;
  let expire=getExpireFromSelect();
  const persistMode=perMessagePersistSelect?perMessagePersistSelect.value:"once";
  if(persistMode==="persist"){ defaultExpire=expire; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); if(defaultSelfDestructRange){ defaultSelfDestructRange.value=defaultExpire.toString(); if(defaultExpireLabel) defaultExpireLabel.textContent=`⏳ ${formatTime(defaultExpire)}`; } }
  const msgId=await addMyMessage(text,expire,myRealUsername);
  const enc=await encryptText(text,currentPassword);
  const sentAt=Date.now();
  socket.emit("chat-message",{ msgId, enc, expireSec:expire, sentAt, realUsername:myRealUsername, username:myUsername });
  input.value=""; socket.emit('typing',false); isTyping=false;
};
input.addEventListener("keydown",e=>{ if(e.key==="Enter") sendBtn.click(); });
socket.on("chat-message", data=>{ addLockedMessage(data.msgId, data.expireSec, data.enc, "text", data.realUsername||data.username, data.sentAt); });
socket.on("chat-media", data=>{ addLockedMessage(data.msgId, data.expireSec, data.enc, data.mediaType||"image", data.realUsername||data.username, data.sentAt); });

socket.on("pending-messages", async(list)=>{
  for(const m of list){
    const plain=await decryptText(m.enc,currentPassword); if(!plain) continue;
    const isMine = m.username===myUsername;
    if(m.opened && m.deleteAt){
      const remaining=Math.max(1, Math.floor((m.deleteAt-Date.now())/1000)); if(remaining<=0) continue;
      const div=document.createElement("div"); div.className=isMine?"myMessage":"otherMessage"; div.id=m.msgId;
      if(m.type==="text"){
        const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
        div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} - ${isMine?`BEN (${m.realUsername})`:m.realUsername}</span>${isMine?`BEN (${m.realUsername}) → `:`${m.realUsername} → `}${linked}<span class="countdown">⏳ ${formatTime(remaining)}</span>`;
      }else{
        div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} - ${m.realUsername}</span>`;
        if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; div.appendChild(img); }
      }
      messages.appendChild(div); startSelfDestruct(div,m.msgId,remaining,m.deleteAt); addReduceExtendButtons(div,m.msgId);
      if(isMine) sentMessages.set(m.msgId,div);
    }else{
      if(isMine){
        const div=document.createElement("div"); div.className="myMessage"; div.id=m.msgId; div._expireSec=m.expireSec;
        div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)}</span>BEN (${m.realUsername}) → ${plain}<span class="countdown">⏳ ${formatTime(m.expireSec)}</span>`;
        messages.appendChild(div); startSelfDestruct(div,m.msgId,m.expireSec); sentMessages.set(m.msgId,div); addReduceExtendButtons(div,m.msgId);
      }else{
        await addLockedMessage(m.msgId,m.expireSec,m.enc,m.type,m.realUsername,m.sentAt);
      }
    }
  }
});

socket.on("message-opened", data=>{
  const div=sentMessages.get(data.msgId);
  if(div){
    const ticks=div.querySelector(".ticks");
    if(ticks){ ticks.textContent=" ✓✓"; ticks.style.color="#00aaff"; }
    if(data.deleteAt){
      const remaining=Math.max(1, Math.floor((data.deleteAt-Date.now())/1000));
      // zaten baslamisti, sadece guncelle
      const cd=div.querySelector(".countdown");
      if(cd) cd.textContent=`⏳ ${formatTime(remaining)} içinde kaybolacak`;
    }
  }
});
socket.on("reduce-request", data=>{
  const div=document.getElementById(data.msgId);
  if(!div) return;
  const timer=activeTimers.get(data.msgId);
  if(!timer) return;
  const newExpireAt=Date.now()+data.newExpireSec*1000;
  clearInterval(timer.interval); clearTimeout(timer.timeout);
  const interval=setInterval(()=>{
    const remaining=Math.max(0, Math.floor((newExpireAt-Date.now())/1000));
    const cd=div.querySelector(".countdown"); if(cd) cd.textContent=`⏳ ${formatTime(remaining)} içinde kaybolacak`;
    if(remaining<=0) clearInterval(interval);
  },1000);
  const timeout=setTimeout(()=>{ div.innerHTML="💨 Bu mesaj kendini imha etti"; div.className="selfDestructed"; setTimeout(()=>div.remove(),2000); clearInterval(interval); activeTimers.delete(data.msgId); }, data.newExpireSec*1000);
  activeTimers.set(data.msgId,{interval,timeout,expireAt:newExpireAt});
});
socket.on("extend-request", data=>{
  const div=document.getElementById(data.msgId);
  if(!div) return;
  const timer=activeTimers.get(data.msgId);
  if(!timer) return;
  const newExpireAt=timer.expireAt+data.extraSec*1000;
  clearInterval(timer.interval); clearTimeout(timer.timeout);
  const interval=setInterval(()=>{
    const remaining=Math.max(0, Math.floor((newExpireAt-Date.now())/1000));
    const cd=div.querySelector(".countdown"); if(cd) cd.textContent=`⏳ ${formatTime(remaining)} içinde kaybolacak`;
    if(remaining<=0) clearInterval(interval);
  },1000);
  const timeout=setTimeout(()=>{ div.innerHTML="💨 Bu mesaj kendini imha etti"; div.className="selfDestructed"; setTimeout(()=>div.remove(),2000); clearInterval(interval); activeTimers.delete(data.msgId); }, newExpireAt-Date.now());
  activeTimers.set(data.msgId,{interval,timeout,expireAt:newExpireAt});
});

// MEDYA - FIX 3 ile uyumlu: ATILIR ATILMAZ SAYAC
mediaBtn.onclick=(e)=>{ e.preventDefault(); attachMenu.classList.remove("show"); isPickingFile=true; setTimeout(()=> mediaInput.click(), 50); setTimeout(()=> isPickingFile=false, 15000); };
mediaInput.onchange=async()=>{
  const file=mediaInput.files[0]; if(!file){ isPickingFile=false; return; }
  if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; return; }
  let expire=getExpireFromSelect();
  const now=Date.now();
  const reader=new FileReader();
  reader.onload=async(e)=>{
    const dataUrl=e.target.result;
    const msgId=await addMyMediaMessage(dataUrl, file.type.startsWith("image/")?"image":"video", expire, file.name);
    const enc=await encryptText(dataUrl, currentPassword);
    socket.emit("chat-media",{ msgId, enc, expireSec:expire, mediaType:file.type.startsWith("image/")?"image":"video", sentAt:now, realUsername:myRealUsername, username:myUsername });
    isPickingFile=false;
  };
  reader.readAsDataURL(file);
  mediaInput.value="";
};

function openPreview(data){ currentMediaData=data; mediaPreview.style.display="flex"; if(data.type==="image"){ previewImg.src=data.data; previewImg.style.display="block"; previewVideo.style.display="none"; }else{ previewVideo.src=data.data; previewVideo.style.display="block"; previewImg.style.display="none"; } }
closePreview.onclick=()=>{ mediaPreview.style.display="none"; previewVideo.pause(); };
downloadMediaBtn.onclick=()=>{ const a=document.createElement("a"); a.href=currentMediaData.data; a.download=currentMediaData.name||"gizli"; a.click(); };

if(lightModeBtn){ lightModeBtn.onclick=()=>{ lampOn=!lampOn; remoteVideo.classList.toggle("lamp-on",lampOn); lightModeBtn.classList.toggle("active",lampOn); document.body.classList.toggle("lamp-active",lampOn); }; }
if(phoneModeBtn){
  phoneModeBtn.onclick=()=>{
    if(!isPhoneMode){ volumeSlider.value=0.1; remoteVideo.volume=0.1; remoteVideo.muted=false; soundBtn.textContent="🔊"; }
    isPhoneMode=!isPhoneMode;
    document.body.classList.toggle("phone-mode",isPhoneMode);
    phoneModeBtn.classList.toggle("active",isPhoneMode);
    if(isPhoneMode){
      if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=false); }
      camEnabled=false; camBtn.classList.add("offIcon");
      phoneCallUI.style.display="flex"; remoteVideo.style.display="none"; myVideoContainer.style.display="none";
      if(candleContainer) candleContainer.classList.remove("show");
      socket.emit("phone-mode",true);
    }else{
      if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=true); }
      camEnabled=true; camBtn.classList.remove("offIcon");
      phoneCallUI.style.display="none"; remoteVideo.style.display=remoteVideo.srcObject?"block":"none"; myVideoContainer.style.display="block";
      socket.emit("phone-mode",false);
    }
  };
}
socket.on("phone-mode",(enabled)=>{
  isPhoneMode=enabled; document.body.classList.toggle("phone-mode",enabled); phoneModeBtn.classList.toggle("active",enabled);
  if(enabled){ phoneCallUI.style.display="flex"; if(remoteVideo) remoteVideo.style.display="none"; if(candleContainer) candleContainer.classList.remove("show"); volumeSlider.value=0.1; remoteVideo.volume=0.1; }
  else{ phoneCallUI.style.display="none"; if(remoteVideo&&remoteVideo.srcObject) remoteVideo.style.display="block"; if(myVideoContainer) myVideoContainer.style.display="block"; }
});

function doPanic(){
  if(!confirm("🚨 PANİK: Tüm mesajlar silinsin mi?")) return;
  messages.innerHTML=""; sentMessages.clear(); activeTimers.forEach(t=>{ clearInterval(t.interval); clearTimeout(t.timeout); }); activeTimers.clear();
  socket.emit("panic");
  window.open("https://www.google.com","_blank");
}
if(panicBtn) panicBtn.onclick=doPanic;
socket.on("panic",()=>{ messages.innerHTML=""; });

if(defaultSelfDestructSelect){}

// FIX 2: ARKA KAMERA KAPANMA FIX - durum koru
if(switchCameraBtn){
  switchCameraBtn.onclick=async()=>{
    try{
      const wasCamOn = camEnabled;
      const wasMicOn = micEnabled;
      currentFacingMode=currentFacingMode==="user"?"environment":"user";
      await startCamera(currentQuality,currentFacingMode);
      // KAMERA KAPALI KALMA HATASI DUZELTMESI - eski durumu geri yukle
      if(localStream){
        localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn);
        localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn);
        camEnabled=wasCamOn; micEnabled=wasMicOn;
        camBtn.classList.toggle("offIcon", !wasCamOn);
        micBtn.classList.toggle("offIcon", !wasMicOn);
        micBtn.textContent=wasMicOn?"🎤":"🔇";
        myVideo.style.opacity=wasCamOn?"1":"0.3";
      }
      if(peer && localStream){
        const s=peer._pc.getSenders().find(x=> x.track && x.track.kind==="video");
        if(s) await s.replaceTrack(localStream.getVideoTracks()[0]);
      }
    }catch(err){
      console.log("arka kamera hata",err);
      alert("İkinci kamera yok veya izin yok");
      currentFacingMode=currentFacingMode==="user"?"environment":"user"; // geri al
    }
  };
}

remoteVideo.muted=false; remoteVideo.volume=0.1; volumeSlider.value=0.1;
volumeSlider.oninput=()=>{ const v=parseFloat(volumeSlider.value); remoteVideo.volume=v; remoteVideo.muted=v<=0; soundBtn.textContent=v<=0?"🔇":"🔊"; };
soundBtn.onclick=()=>{ remoteVideo.muted=!remoteVideo.muted; if(!remoteVideo.muted && parseFloat(volumeSlider.value)===0){ volumeSlider.value=0.5; remoteVideo.volume=0.5; } soundBtn.textContent=remoteVideo.muted?"🔇":"🔊"; };
changePasswordBtn.onclick=()=>{ const p=prompt("Yeni sifre"); if(!p) return; currentPassword=p; socket.emit("change-password",p); };

let isDragging=false,sx,sy,sl,st;
myVideoContainer.addEventListener("touchstart",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1){ isDragging=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; sl=myVideoContainer.offsetLeft; st=myVideoContainer.offsetTop; } });
myVideoContainer.addEventListener("touchmove",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1 && isDragging){ e.preventDefault(); myVideoContainer.style.left=sl+(e.touches[0].clientX-sx)+"px"; myVideoContainer.style.top=st+(e.touches[0].clientY-sy)+"px"; myVideoContainer.style.right="auto"; } });
myVideoContainer.addEventListener("touchend",()=> isDragging=false);
if(attachMenuBtn){ attachMenuBtn.onclick=(e)=>{ e.stopPropagation(); attachMenu.classList.toggle("show"); }; }
cameraBtn.onclick=(e)=>{ e.preventDefault(); attachMenu.classList.remove("show"); isPickingFile=true; setTimeout(()=> cameraInput.click(), 50); setTimeout(()=> isPickingFile=false, 15000); };
cameraInput.onchange=async()=>{
  const file=cameraInput.files[0]; if(!file){ isPickingFile=false; return; }
  const reader=new FileReader();
  reader.onload=async(e)=>{
    const dataUrl=e.target.result;
    const now=Date.now();
    const msgId=await addMyMediaMessage(dataUrl, "image", getExpireFromSelect(), "kamera.jpg");
    const enc=await encryptText(dataUrl, currentPassword);
    socket.emit("chat-media",{ msgId, enc, expireSec:getExpireFromSelect(), mediaType:"image", sentAt:now, realUsername:myRealUsername, username:myUsername });
    isPickingFile=false;
  };
  reader.readAsDataURL(file);
  cameraInput.value="";
};
drawBtn.onclick=()=>{ attachMenu.classList.remove("show"); drawOverlay.style.display="flex"; const dpr=window.devicePixelRatio||1; drawCanvas.width=window.innerWidth*dpr; drawCanvas.height=(window.innerHeight-80)*dpr; drawCanvas.style.width=window.innerWidth+"px"; drawCanvas.style.height=(window.innerHeight-80)+"px"; const ctx2=drawCanvas.getContext("2d"); ctx2.scale(dpr,dpr); ctx2.strokeStyle="#00ff88"; ctx2.lineWidth=4; ctx2.lineCap="round"; ctx2.fillStyle="#000"; ctx2.fillRect(0,0,window.innerWidth,window.innerHeight); window._drawCtx=ctx2; };
locationBtn.onclick=async()=>{ attachMenu.classList.remove("show"); if(!navigator.geolocation){ alert("Konum yok"); return; } navigator.geolocation.getCurrentPosition(async pos=>{ const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; const msgId=await addMyMessage(url, getExpireFromSelect(), myRealUsername); const enc=await encryptText(url, currentPassword); socket.emit("chat-message",{ msgId, enc, expireSec:getExpireFromSelect(), sentAt:Date.now(), realUsername:myRealUsername, username:myUsername }); }); };
let drawing=false;
drawCanvas.addEventListener("mousedown", e=>{ drawing=true; const ctx=window._drawCtx; if(!ctx) return; ctx.beginPath(); ctx.moveTo(e.clientX,e.clientY); });
drawCanvas.addEventListener("mousemove", e=>{ if(!drawing) return; const ctx=window._drawCtx; if(!ctx) return; ctx.lineTo(e.clientX,e.clientY); ctx.stroke(); });
drawCanvas.addEventListener("mouseup", ()=>drawing=false);
drawCanvas.addEventListener("touchstart", e=>{ drawing=true; const ctx=window._drawCtx; if(!ctx) return; const t=e.touches[0]; ctx.beginPath(); ctx.moveTo(t.clientX,t.clientY); });
drawCanvas.addEventListener("touchmove", e=>{ if(!drawing) return; e.preventDefault(); const ctx=window._drawCtx; if(!ctx) return; const t=e.touches[0]; ctx.lineTo(t.clientX,t.clientY); ctx.stroke(); }, {passive:false});
drawCanvas.addEventListener("touchend", ()=>drawing=false);
drawClear.onclick=()=>{ const ctx=window._drawCtx; if(ctx){ ctx.fillStyle="#000"; ctx.fillRect(0,0,window.innerWidth,window.innerHeight); } };
drawClose.onclick=()=>{ drawOverlay.style.display="none"; };
drawSend.onclick=async()=>{
  const dataUrl=drawCanvas.toDataURL("image/jpeg",0.7);
  const msgId=await addMyMediaMessage(dataUrl, "image", getExpireFromSelect(), "cizim.jpg");
  const enc=await encryptText(dataUrl, currentPassword);
  socket.emit("chat-media",{ msgId, enc, expireSec:getExpireFromSelect(), mediaType:"image", sentAt:Date.now(), realUsername:myRealUsername, username:myUsername });
  drawOverlay.style.display="none";
};

if(nudgeBtn){ nudgeBtn.onclick=(e)=>{ e.stopPropagation(); socket.emit("nudge"); document.body.classList.add("screen-shake"); setTimeout(()=>document.body.classList.remove("screen-shake"),800); }; }
socket.on("nudge",()=>{ document.body.classList.add("screen-shake"); setTimeout(()=>document.body.classList.remove("screen-shake"),800); });
if(emojiBtn) emojiBtn.onclick=(e)=>{ e.stopPropagation(); emojiPanel.classList.toggle("show"); };
document.querySelectorAll('.flyEmoji').forEach(emoji=>{
  emoji.onclick=(e)=>{
    e.stopPropagation(); const emojiText=emoji.textContent; const effect=emoji.dataset.effect;
    socket.emit('fly-emoji',{emoji:emojiText,effect}); 
    const el=document.createElement('div'); el.className='flying-emoji'; el.textContent=emojiText; el.style.left=(Math.random()*80+10)+'%'; el.style.top='60%'; document.body.appendChild(el); setTimeout(()=>el.remove(),2000);
    emojiPanel.classList.remove("show");
  };
});
socket.on('fly-emoji',(data)=>{
  const el=document.createElement('div'); el.className='flying-emoji'; el.textContent=data.emoji; el.style.left=(Math.random()*80+10)+'%'; el.style.top='60%'; document.body.appendChild(el); setTimeout(()=>el.remove(),2000);
});
if(settingsBtn) settingsBtn.onclick=()=>settingsContainer.classList.toggle("menu-open");
if(fullscreenBtn){ fullscreenBtn.onclick=()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }
console.log("V12.3 + 3 FIX yüklendi");