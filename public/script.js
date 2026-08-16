console.log("V12.3 FIX3 - gizli bulmaca + 20MB + tel %10 + 3 nokta");
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
const perMessageTimerSelect = document.getElementById("perMessageTimerSelect"); // kaldırıldı - artık yok
const perMessagePersistSelect = document.getElementById("perMessagePersistSelect"); // kaldırıldı
const defaultSelfDestructSelect = document.getElementById("defaultSelfDestructSelect");
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
let defaultExpire = parseInt(localStorage.getItem("gorgor_default_expire") || "14400"); // default 4 saat
if(defaultExpire < 900) defaultExpire = 14400; // min 15dk, default 4 saat
if(defaultExpire > 86400) defaultExpire = 86400;
let activeTimers = new Map();
let isPhoneMode = false;
let isPickingFile = false;
let _photoPicking = false;
const MAX_SEC = 86400; // 24 saat - FIX

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
            const sp=document.createElement("span");
            sp.className="userTag";
            sp.textContent=u;
            sp.onclick=()=>{ userName.value=u; };
            fakeUsersList.appendChild(sp);
        });
    }
    if(fakeRoomsList){
        fakeRoomsList.innerHTML="";
        const allRooms = [REAL_ROOM,...FAKE_ROOMS].sort(() => Math.random() - 0.5);
        allRooms.forEach(r=>{
            const sp=document.createElement("span");
            sp.className="userTag";
            sp.textContent=r;
            sp.onclick=()=>{ roomName.value=r; roomName.dispatchEvent(new Event('input')); };
            fakeRoomsList.appendChild(sp);
        });
    }
}
renderFakeLists();

// === FLOATING PILL - Karşı kişi gösterimi ===
let opponentUsername = "";
let opponentStatus = "offline"; // varım = online (yesil), yokum = offline (gri)

function updateOpponentDisplay(name, status){
  opponentUsername = name || opponentUsername;
  opponentStatus = status || opponentStatus;
  if(opponentNameDisplay){
    opponentNameDisplay.textContent = opponentUsername || "-";
  }
  if(opponentDot){
    opponentDot.className = "onlineDot " + (opponentStatus === "varım" || opponentStatus === "online" ? "online" : "offline");
  }
  if(opponentStatusText){
    if(opponentStatus === "varım" || opponentStatus === "online"){
      opponentStatusText.textContent = "içerde";
      opponentStatusText.style.color = "#00ff88";
    } else {
      opponentStatusText.textContent = "dışarda";
      opponentStatusText.style.color = "rgba(255,255,255,0.5)";
    }
  }
  // Phone UI name de guncelle
  const phoneNameDisplay = document.getElementById("phoneNameDisplay");
  if(phoneNameDisplay && opponentUsername){
    phoneNameDisplay.textContent = opponentUsername;
  }
  console.log("Karşı kişi:", opponentUsername, "Durum:", opponentStatus, opponentStatus === "varım" ? "YEŞİL" : "GRİ");
}



roomName.addEventListener("input",()=>{
    const v=normalize(roomName.value);
    if(v.length>0){
        if(fakeRoomsHint) fakeRoomsHint.style.display="block";
    }else{
        if(fakeRoomsHint) fakeRoomsHint.style.display="none";
    }
    if(v===REAL_ROOM || v.length>=2){
        userName.style.display="block";
        userListBox.style.display="block";
    }else{
        userName.style.display="none";
        userListBox.style.display="none";
    }
});

async function deriveKey(password){
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return await crypto.subtle.importKey('raw', hash, { name:'AES-GCM' }, false, ['encrypt','decrypt']);
}
function bufToB64(buf){
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 8192;
    for(let i=0;i<bytes.length;i+=chunk){
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));
    }
    return btoa(binary);
}
function b64ToBuf(b64){
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return bytes;
}
async function encryptText(text,password){
    const key = await deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(text));
    const combined = new Uint8Array(iv.length + ct.byteLength);
    combined.set(iv,0); combined.set(new Uint8Array(ct), iv.length);
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

if(defaultSelfDestructSelect) defaultSelfDestructSelect.value = defaultExpire.toString();
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
        // GİRİŞTE KAPALI KALSIN
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
socket.on("user-connected",(d)=>{
  if(!peer) createPeer(false);
  // Karşı kişi bağlandı - sol üstte göster, yeşil yap
  const oppName = d.username || d.realUsername || "Bilinmeyen";
  updateOpponentDisplay(oppName, "varım");
  if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
});
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

socket.on("user-status", (data)=>{
  const {user, status, online} = data;
  if(user === myRealUsername) return; // kendi durumum degil
  // Karşı kişinin varım/yokum durumu
  const isOnline = status === "varım" || online;
  updateOpponentDisplay(user, isOnline ? "varım" : "yokum");
  if(connectionQuality){
    if(isOnline){
      connectionQuality.textContent = `${user} içerde`;
      connectionQuality.className = "good";
    } else {
      connectionQuality.textContent = `${user} dışarda`;
      connectionQuality.className = "bad";
    }
  }
});


socket.on("user-disconnected",()=>{
    if(remoteVideo){
        remoteVideo.pause();
        try{remoteVideo.srcObject=null;}catch(e){}
        remoteVideo.removeAttribute("src");
        remoteVideo.load();
        remoteVideo.style.display="none";
    }
    if(peer){ try{peer.destroy();}catch(e){} peer=null; }
    if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; }
    if(connectionQuality){ connectionQuality.textContent="Karşı yok - Mum 🕯"; connectionQuality.className="bad"; }
    if(pingTimer){ clearInterval(pingTimer); pingTimer=null; }
    // Karşı kişi ayrıldı - gri yap, ismi koru ama durumu offline yap
    updateOpponentDisplay(opponentUsername || "Bilinmeyen", "yokum");
});
// Eski handler - yeni aşağıda
    // qualitySelect.onchange (eski) = async()=>{
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
    }
    if(peer && localStream){ 
        const sender = peer._pc.getSenders().find(s=> s.track && s.track.kind==="video"); 
        if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]); 
    }
};

let startX=0, startY=0, startExpire=0, isDraggingExpire=false;
if(defaultSelfDestructSelect){
  defaultSelfDestructSelect.addEventListener('touchstart', (e)=>{
    startX=e.touches[0].clientX; startY=e.touches[0].clientY; startExpire=defaultExpire; isDraggingExpire=false;
  }, {passive:true});
  defaultSelfDestructSelect.addEventListener('touchmove', (e)=>{
    if(!e.touches[0]) return;
    let diffX = e.touches[0].clientX - startX; let diffY = startY - e.touches[0].clientY;
    let diff = Math.abs(diffX) > Math.abs(diffY) ? diffX : diffY;
    if(Math.abs(diff) > 15){
      isDraggingExpire=true; e.preventDefault();
      let steps = Math.floor(diff/12); let newVal = startExpire + steps*60;
      if(newVal < 10) newVal=10; if(newVal > 86400) newVal=86400;
      if(newVal!==defaultExpire){
        defaultExpire=newVal;
        try{ localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); }catch(e){}
        let customOpt = defaultSelfDestructSelect.querySelector('option[value="custom_display"]');
        if(!customOpt){ customOpt=document.createElement("option"); customOpt.value="custom_display"; defaultSelfDestructSelect.appendChild(customOpt); }
        customOpt.textContent=formatTime(defaultExpire)+" (kaydirma)"; customOpt.selected=true;
      }
    }
  }, {passive:false});
  defaultSelfDestructSelect.addEventListener('touchend', ()=>{ if(isDraggingExpire){ setTimeout(()=>{ isDraggingExpire=false; }, 150); } });
}

settingsBtn.onclick = ()=> settingsContainer.classList.toggle("menu-open");
if(fullscreenBtn){ fullscreenBtn.onclick = ()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }

function formatTime(sec){
    if(sec<60) return `${sec} sn`;
    const m=Math.floor(sec/60); const s=sec%60;
    if(m<60) return `${m} dk ${s} sn`;
    const h=Math.floor(m/60); const mm=m%60;
    if(h<24) return `${h}sa ${mm}dk`;
    const d=Math.floor(h/24); const hh=h%24;
    return `${d}g ${hh}sa ${mm}dk`;
}
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
        setTimeout(()=> div.remove(),2000);
        clearInterval(interval); activeTimers.delete(msgId);
    }, expireAt-Date.now());
    activeTimers.set(msgId,{ interval, timeout, expireAt });
}
function addReduceExtendButtons(div, msgId){
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
    if(mediaType==="image"){ const im=document.createElement("img"); im.src=dataUrl; im.className="mediaMessage"; im.onclick=(ev)=>{ ev.stopPropagation(); openPreview({type:"image",data:dataUrl,name:fileName}); }; div.appendChild(im); setupLongPress(im, msgId); }
    else if(mediaType==="video"){ const v=document.createElement("video"); v.src=dataUrl; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
    const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
    messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; }, 10); sentMessages.set(msgId,div); 
    startSelfDestruct(div,msgId,expireSec,div._deleteAt);
    addReduceExtendButtons(div,msgId); return msgId;
}
function setupLongPress(img, msgId){ 
  let timer; 
  img.addEventListener("touchstart", (e)=>{ timer=setTimeout(()=>{ const inp=prompt("Foto süresi değiştir (sn, max 86400):"); if(!inp) return; let v=parseInt(inp); if(v>0 && v<=86400){ const div=document.getElementById(msgId); if(div){ const newDelete=Date.now()+v*1000; div._deleteAt=newDelete; startSelfDestruct(div,msgId,v,newDelete); } } }, 800); }, {passive:true}); 
  img.addEventListener("touchend", ()=>clearTimeout(timer)); 
  img.addEventListener("mousedown", (e)=>{ timer=setTimeout(()=>{ const inp=prompt("Foto süresi değiştir (sn, max 86400):"); if(!inp) return; let v=parseInt(inp); if(v>0 && v<=86400){ const div=document.getElementById(msgId); if(div){ const newDelete=Date.now()+v*1000; div._deleteAt=newDelete; startSelfDestruct(div,msgId,v,newDelete); } } }, 800); });
  img.addEventListener("mouseup", ()=>clearTimeout(timer));
}
async function addLockedMessage(msgId,expireSec,enc,mediaType,senderReal, sentAt){
    if(document.getElementById(msgId)) return;
    expireSec=Math.min(expireSec||defaultExpire,MAX_SEC);
    const sent = sentAt || Date.now();
    const deleteAt = sent + expireSec*1000;
    try{
        const plain = await decryptText(enc, currentPassword);
        if(!plain){ console.log("decrypt fail", msgId); return; }
        const div=document.createElement("div");
        div.className="otherMessage";
        div.id=msgId;
        div._expireSec=expireSec;
        div._sentAt=sent;
        div._deleteAt=deleteAt;
        const remaining = Math.max(1, Math.floor((deleteAt-Date.now())/1000));
        if(mediaType==="text"||!mediaType){
            const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
            div.innerHTML=`<span class="senderName">${senderReal}</span> → ${linked}<span class="ticks single" style="color:#999;"> ✓</span><span class="countdown">⏳ ${formatTime(remaining)}</span>`;
        }else{
            div.innerHTML=`<span class="senderName">${senderReal}</span> - ⏰ ${formatTime(remaining)}`;
            if(mediaType==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; div.appendChild(img); setupLongPress(img, msgId); }
            else if(mediaType==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
            const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
        }
        messages.appendChild(div); 
        setTimeout(()=>{ messages.scrollTop = messages.scrollHeight; }, 10);
        startSelfDestruct(div,msgId,remaining,deleteAt);
        addReduceExtendButtons(div,msgId);
        socket.emit("message-opened",{msgId});
        socket.emit("message-read",{msgId,reader:myRealUsername});
        if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink"); }
        return;
    }catch(e){ console.log("addLockedMessage err", e); }
}

function getExpireFromSelect(){
    // Yeni mantık: sadece genel kaybolma süresi (defaultExpire) kullan
    // 15dk, 1 saat, 4 saat, 24 saat veya manuel
    return Math.min(defaultExpire, MAX_SEC);
}

function updateExpireDisplay(){
    const display = document.getElementById("currentExpireDisplay");
    const customWheel = document.getElementById("customExpireWheel");
    const customInput = document.getElementById("customExpireInput");
    const customValue = document.getElementById("customExpireValue");
    if(display){
        display.textContent = formatTime(defaultExpire);
    }
    // Custom wheel göster/gizle
    if(defaultSelfDestructSelect && defaultSelfDestructSelect.value === "custom"){
        if(customWheel) customWheel.style.display = "block";
    } else {
        if(customWheel) customWheel.style.display = "none";
    }
    if(customInput && customValue){
        customValue.textContent = `${customInput.value} dk (${formatTime(parseInt(customInput.value)*60)})`;
    }
}

sendBtn.onclick=async()=>{
    const text=input.value.trim(); if(!text) return;
    let expire=getExpireFromSelect();
    // Timer hemen başlasın - sentAt ile birlikte
    const msgId=await addMyMessage(text,expire,myRealUsername);
    const enc=await encryptText(text,currentPassword);
    const sentAt=Date.now();
    socket.emit("chat-message",{ msgId, enc, expireSec:expire, sentAt });
    input.value=""; socket.emit('typing',false); isTyping=false;
    console.log("Mesaj gönderildi, sayaç hemen başladı:", formatTime(expire));
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
                if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; img.onclick=(ev)=>{ ev.stopPropagation(); openPreview({ type:"image", data:plain, name:"gizli.jpg" }); }; div.appendChild(img); }
                else if(m.type==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
                const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
            }
            messages.appendChild(div); startSelfDestruct(div,m.msgId,remaining,m.deleteAt); addReduceExtendButtons(div,m.msgId);
            if(isMine) sentMessages.set(m.msgId,div);
        }else{
            if(isMine){
                // FIX: Sayaç atıldığı anda başlasın, karşı tarafın açmasını bekleme
                const sent = m.sentAt || m.expireAt - m.expireSec*1000 || Date.now();
                const deleteAt = sent + m.expireSec*1000;
                const remaining = Math.max(1, Math.floor((deleteAt - Date.now())/1000));
                if(remaining <= 0) continue; // süresi dolmuş atla
                const div=document.createElement("div"); div.className="myMessage"; div.id=m.msgId; div._expireSec=m.expireSec; div._sentAt=sent; div._deleteAt=deleteAt;
                if(m.type==="text"){
                    div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)} - ${formatTime(remaining)} kaldı</span>BEN (${m.realUsername}) → ${plain}<span class="countdown">⏳ ${formatTime(remaining)}</span>`;
                }else{
                    div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)} - ${formatTime(remaining)} kaldı</span>`;
                    if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; div.appendChild(img); }
                    const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
                }
                messages.appendChild(div); sentMessages.set(m.msgId,div); 
                startSelfDestruct(div,m.msgId,remaining,deleteAt);
                addReduceExtendButtons(div,m.msgId);
            }else{
                addLockedMessage(m.msgId, m.expireSec, m.enc, m.type, m.realUsername);
            }
        }
    }
    messages.scrollTop=messages.scrollHeight;
});
socket.on("message-opened",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId)||sentMessages.get(msgId); if(!div) return;
    if(sentMessages.has(msgId)){
        const cd=div.querySelector(".countdown"); 
        if(cd) { cd.textContent=`✓ Karşı açtı - ${cd.textContent}`; cd.style.color="#00ff88"; }
    }
});
socket.on("message-opened-ack",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId); if(!div) return;
});
socket.on("reduce-accepted",({msgId,newExpireSec,newDeleteAt})=>{
    const div=document.getElementById(msgId); if(!div) return;
    if(newDeleteAt) startSelfDestruct(div,msgId,newExpireSec,newDeleteAt);
});
socket.on("extend-accepted",({msgId,newDeleteAt,extraSec})=>{
    const div=document.getElementById(msgId); if(!div) return;
    const remaining = Math.max(0, Math.floor((newDeleteAt - Date.now())/1000));
    startSelfDestruct(div,msgId,remaining,newDeleteAt);
});
chatToggle.onclick=()=>{
    if(chatPanel.style.display==="flex"){ 
        chatPanel.style.display="none"; 
        document.body.classList.remove("chat-open"); 
        chatToggle.textContent="\uD83D\uDCAC"; 
    }
    else{ 
        chatPanel.style.display="flex"; 
        document.body.classList.add("chat-open"); 
        chatToggle.classList.remove("newMessageBlink"); 
        chatToggle.textContent="\u2716"; 
        const goBottom = ()=>{ if(messages){ messages.scrollTop = messages.scrollHeight; } };
        goBottom();
        setTimeout(goBottom, 50);
        setTimeout(goBottom, 200);
        setTimeout(goBottom, 600);
        socket.emit("messages-read-all"); 
    }
};

input.addEventListener('input',()=>{ if(!isTyping && input.value.trim()){ socket.emit('typing',true); isTyping=true; } clearTimeout(typingTimer); typingTimer=setTimeout(()=>{ socket.emit('typing',false); isTyping=false; },1000); });
socket.on('typing',(data)=>{
    let td=document.getElementById('typingIndicator');
    if(!td){ td=document.createElement('div'); td.id='typingIndicator'; td.className='otherMessage'; messages.appendChild(td); }
    td.textContent=data.typing?`${data.username} yazıyor...`:''; td.style.display=data.typing?'block':'none';
});
// TITRESIM FIX - ESKI GUZEL VERSIYON
// ... üst kısımlar aynı kalsın, SADECE en alttaki kısmı değiştir:

// TITRESIM FIX - ESKI GUZEL VERSIYON
if(nudgeBtn){
    nudgeBtn.onclick=(e)=>{
        e.stopPropagation();
        socket.emit("nudge");
        triggerNudge(true);
    };
}
function triggerNudge(isMine){
    document.body.classList.add("screen-shake");
    setTimeout(()=> document.body.classList.remove("screen-shake"),800);
    if(navigator.vibrate) navigator.vibrate([200,100,200]);
    if(messages) { messages.classList.add("shake"); setTimeout(()=> messages.classList.remove("shake"),600); }
}
socket.on("nudge",()=>{ triggerNudge(false); });

// EMOJI + MSN WINK FINAL - TEK FONKSIYON
if(emojiBtn) emojiBtn.onclick=(e)=>{ e.stopPropagation(); emojiPanel.classList.toggle("show"); };
document.querySelectorAll('.flyEmoji').forEach(emoji=>{
    if(emoji.id==='addCustomEmoji') return;
    emoji.onclick=(e)=>{
        e.stopPropagation();
        const emojiText=emoji.textContent; const effect=emoji.dataset.effect;
        socket.emit('fly-emoji',{ emoji:emojiText, effect });
        createFlyingEmoji(emojiText,effect,true);
        emojiPanel.classList.remove("show");
    };
});
socket.on('fly-emoji',(data)=> createFlyingEmoji(data.emoji,data.effect,false));

// TEK VE DOGRU createFlyingEmoji - OPÜCÜK + WATER BALLOON
function createFlyingEmoji(emoji,effect,isMine){
    const startX = isMine? window.innerWidth-120 : 80;
    const baseY = 140;

    if(effect==='big-kiss'){
        const big=document.createElement('div');
        big.className='big-kiss-mark'; big.textContent='💋';
        document.body.appendChild(big);
        setTimeout(()=>big.remove(),2500);
        if(navigator.vibrate) navigator.vibrate([100,50,100]);
        return;
    }
    if(effect==='water'){
        const splash=document.createElement('div'); splash.className='water-drop';
        document.body.appendChild(splash);
        setTimeout(()=>splash.remove(),1200);
        for(let i=0;i<8;i++){
            setTimeout(()=>{
                const d=document.createElement('div');
                d.className='flying-emoji'; d.textContent='💧';
                d.style.left=(window.innerWidth/2 + Math.random()*200-100)+'px';
                d.style.bottom='50%'; d.style.fontSize='40px';
                d.style.animation='kissRain 1.5s forwards';
                document.body.appendChild(d);
                setTimeout(()=>d.remove(),1500);
            }, i*80);
        }
        return;
    }

    let count=1;
    if(effect==='heart'||effect==='love'||effect==='kiss') count=8;
    else if(effect==='kiss-rain') count=12;
    else if(effect==='flower') count=5;
    else if(effect==='fire') count=3;

    for(let i=0;i<count;i++){
        setTimeout(()=>{
            const fly=document.createElement('div');
            fly.className='flying-emoji '+(effect||'custom');
            if(effect==='kiss'||effect==='kiss-rain') fly.classList.add('kiss-rain');
            fly.textContent=emoji;
            fly.style.left=(startX+Math.random()*180-90 + i*15)+'px';
            fly.style.bottom=(baseY+Math.random()*40)+'px';
            fly.style.fontSize=(effect==='fire'||effect==='wow')? '72px' : (58 + Math.random()*24)+'px';
            document.body.appendChild(fly);
            setTimeout(()=>fly.remove(), 3500);
        }, i*90);
    }

    if(effect==='fire' || effect==='wow' || effect==='thumbs'){
        document.body.classList.add('mega-shake');
        setTimeout(()=> document.body.classList.remove('mega-shake'),700);
        if(msnEffectLayer){
            msnEffectLayer.style.background = effect==='fire'? 'radial-gradient(circle at 50% 70%, rgba(255,80,0,0.25), transparent 65%)' : 'radial-gradient(circle at 50% 50%, rgba(255,255,0,0.2), transparent 60%)';
            msnEffectLayer.style.display='block';
            setTimeout(()=> msnEffectLayer.style.display='none', 600);
        }
        if(navigator.vibrate) navigator.vibrate([80,40,80]);
    } else if(effect==='heart'||effect==='kiss'||effect==='kiss-rain'||effect==='love'){
        if(navigator.vibrate) navigator.vibrate([50,30,50]);
    }
}
micBtn.onclick=async()=>{ 
  if(!localStream) return; 
  micEnabled=!micEnabled; 
  localStream.getAudioTracks().forEach(t=> t.enabled=micEnabled); 
  micBtn.classList.toggle("offIcon",!micEnabled); 
  micBtn.textContent=micEnabled?"🎤":"🔇";
  console.log("Mikrofon", micEnabled ? "acildi" : "kapandi");
  // FIX: Ses karsiya gitmiyor fix - audio track'i peer'da guncelle
  try{
    if(peer && peer._pc && localStream){
      const at = localStream.getAudioTracks()[0];
      if(at){
        const aSenders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="audio");
        for(const s of aSenders){ await s.replaceTrack(at); }
      }
    }
  }catch(e){ console.log("mic replaceTrack hata", e); }
};
camBtn.onclick=async()=>{ 
  if(!localStream){ try{ await startCamera(currentQuality,currentFacingMode); }catch(e){ return; } }
  camEnabled=!camEnabled; 
  localStream.getVideoTracks().forEach(t=>t.enabled=camEnabled); 
  camBtn.classList.toggle("offIcon",!camEnabled);
  try{
    if(peer && peer._pc && localStream){
      const vt = localStream.getVideoTracks()[0];
      if(vt){
        const senders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="video");
        for(const s of senders){ await s.replaceTrack(vt); }
      }
    }
  }catch(e){}
};
if(switchCameraBtn){ switchCameraBtn.onclick=async()=>{
  try{
    const wasCamOn = camEnabled;
    const wasMicOn = micEnabled;
    currentFacingMode=currentFacingMode==="user"?"environment":"user";
    console.log("Kamera gecis", currentFacingMode, "wasCam", wasCamOn, "wasMic", wasMicOn);
    await startCamera(currentQuality,currentFacingMode);
    if(localStream){
      localStream.getVideoTracks().forEach(t=>{ t.enabled = wasCamOn; });
      localStream.getAudioTracks().forEach(t=>{ t.enabled = wasMicOn; });
      myVideo.srcObject = localStream;
      myVideo.play().catch(()=>{});
      myVideo.style.transform = currentFacingMode==="user"?"scaleX(-1)":"scaleX(1)";
    }
    camEnabled = wasCamOn;
    micEnabled = wasMicOn;
    if(camEnabled) camBtn.classList.remove("offIcon"); else camBtn.classList.add("offIcon");
    if(micEnabled){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; } else { micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
    if(peer && peer._pc && localStream){
      const vt = localStream.getVideoTracks()[0];
      const at = localStream.getAudioTracks()[0];
      if(vt){
        const senders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="video");
        for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} }
      }
      if(at){
        const aSenders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="audio");
        for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} }
      }
    }
  }catch(err){
    console.error(err);
    alert("Ikinci kamera yok");
    currentFacingMode="user";
    try{ await startCamera(currentQuality,"user"); }catch(e){}
  }
}; }
remoteVideo.muted=false; remoteVideo.volume=0.1; volumeSlider.value=0.1;
volumeSlider.oninput=()=>{ const v=parseFloat(volumeSlider.value); remoteVideo.volume=v; remoteVideo.muted=v<=0; soundBtn.textContent=v<=0?"🔇":"🔊"; };
soundBtn.onclick=()=>{ remoteVideo.muted=!remoteVideo.muted; if(!remoteVideo.muted && parseFloat(volumeSlider.value)===0){ volumeSlider.value=0.5; remoteVideo.volume=0.5; } soundBtn.textContent=remoteVideo.muted?"🔇":"🔊"; };
changePasswordBtn.onclick=()=>{ const p=prompt("Yeni sifre"); if(!p) return; currentPassword=p; socket.emit("change-password",p); };

let isDragging=false,sx,sy,sl,st;
myVideoContainer.addEventListener("touchstart",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1){ isDragging=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; sl=myVideoContainer.offsetLeft; st=myVideoContainer.offsetTop; } });
myVideoContainer.addEventListener("touchmove",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1 && isDragging){ e.preventDefault(); myVideoContainer.style.left=sl+(e.touches[0].clientX-sx)+"px"; myVideoContainer.style.top=st+(e.touches[0].clientY-sy)+"px"; myVideoContainer.style.right="auto"; } });
myVideoContainer.addEventListener("touchend",()=> isDragging=false);

if(attachMenuBtn){ attachMenuBtn.onclick=(e)=>{ e.stopPropagation(); attachMenu.classList.toggle("show"); }; }
mediaBtn.onclick=(e)=>{ e.preventDefault(); attachMenu.classList.remove("show"); mediaInput.click(); };
drawBtn.onclick=()=>{ attachMenu.classList.remove("show"); drawOverlay.style.display="flex"; const dpr=window.devicePixelRatio||1; drawCanvas.width=window.innerWidth*dpr; drawCanvas.height=(window.innerHeight-80)*dpr; drawCanvas.style.width=window.innerWidth+"px"; drawCanvas.style.height=(window.innerHeight-80)+"px"; const ctx2=drawCanvas.getContext("2d"); ctx2.scale(dpr,dpr); ctx2.strokeStyle="#00ff88"; ctx2.lineWidth=4; ctx2.lineCap="round"; ctx2.fillStyle="#000"; ctx2.fillRect(0,0,window.innerWidth,window.innerHeight); window._drawCtx=ctx2; };
locationBtn.onclick=async()=>{ attachMenu.classList.remove("show"); if(!navigator.geolocation){ alert("Konum yok"); return; } navigator.geolocation.getCurrentPosition(async pos=>{ const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; let expire=getExpireFromSelect(); const msgId=await addMyMessage("📍 Konumum: "+url,expire,myRealUsername); const enc=await encryptText("📍 Konumum: "+url,currentPassword); const sentAt=Date.now();
    socket.emit("chat-message",{ msgId, enc, expireSec:expire, sentAt }); }); };

if(cameraInput){
  cameraInput.onchange=async()=>{
    isPickingFile = true;
    _photoPicking = true;
    try{
      const file=cameraInput.files[0]; if(!file){ isPickingFile=false; _photoPicking=false; return; }
      if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; _photoPicking=false; return; }
      let expire=getExpireFromSelect();
      let dataUrl="";
      try{
        const img=await createImageBitmap(file);
        const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; }
        canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
        const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.75));
        dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); });
      }catch(e){
        dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); });
      }
      const enc=await encryptText(dataUrl,currentPassword);
      const sentAt=Date.now();
      const msgId=await addMyMediaMessage(dataUrl,"image",expire,"kamera.jpg");
      socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType:"image",sentAt});
      cameraInput.value="";
      setTimeout(()=>{ if(messages) messages.scrollTop=messages.scrollHeight; }, 100);
    }catch(err){ console.log("cameraInput hata", err); }
    setTimeout(()=>{ isPickingFile=false; _photoPicking=false; }, 1500);
  };
}
mediaInput.onchange=async()=>{
    isPickingFile = true;
    _photoPicking = true;
    try{
      const file=mediaInput.files[0]; if(!file){ isPickingFile=false; _photoPicking=false; return; }
      if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; _photoPicking=false; return; }
      let expire=getExpireFromSelect();
      let dataUrl="";
      if(file.type.startsWith('image/')){
        try{
          const img=await createImageBitmap(file);
          const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; }
          canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.7));
          dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); });
        }catch(e){ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); }
      }else{
        dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); });
      }
      const enc=await encryptText(dataUrl,currentPassword);
      const mediaType=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':'file';
      const sentAt=Date.now();
      const msgId=await addMyMediaMessage(dataUrl,mediaType,expire,file.name);
      socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType,sentAt});
      mediaInput.value="";
      setTimeout(()=>{ if(messages) messages.scrollTop=messages.scrollHeight; }, 100);
    }catch(e){ console.log("mediaInput hata", e); }
    setTimeout(()=>{ isPickingFile=false; _photoPicking=false; }, 1500);
};

if(cameraBtn){
  cameraBtn.onclick=(e)=>{ e.preventDefault(); attachMenu.classList.remove("show"); cameraInput.click(); };
}
if(cameraInput){
  cameraInput.onchange=async()=>{
    const file=cameraInput.files[0]; if(!file) return;
    const MAX=20*1024*1024; if(file.size>MAX){ alert("Max 20MB"); return; }
    let expire=getExpireFromSelect();
    const img=await createImageBitmap(file);
    const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; }
    canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
    const blob=await new Promise(r=> canvas.toBlob(r,'image/jpeg',0.75));
    const dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=> res(e.target.result); fr.readAsDataURL(blob); });
    const enc=await encryptText(dataUrl,currentPassword);
    const msgId=await addMyMediaMessage(dataUrl,"image",expire,"kamera.jpg");
    socket.emit("chat-media",{ msgId, enc, expireSec:expire, mediaType:"image" }); cameraInput.value="";
  };
}

mediaInput.onchange=async()=>{
    const file=mediaInput.files[0]; if(!file) return;
    const MAX=20*1024*1024; if(file.size>MAX){ alert("Max 20MB"); return; }
    let expire=getExpireFromSelect();
    let dataUrl="";
    if(file.type.startsWith('image/')){
        const img=await createImageBitmap(file);
        const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; }
        canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
        const blob=await new Promise(r=> canvas.toBlob(r,'image/jpeg',0.7));
        dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=> res(e.target.result); fr.readAsDataURL(blob); });
    }else{
        dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=> res(e.target.result); fr.readAsDataURL(file); });
    }
    const enc=await encryptText(dataUrl,currentPassword);
    const mediaType=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':'file';
    const msgId=await addMyMediaMessage(dataUrl,mediaType,expire,file.name);
    socket.emit("chat-media",{ msgId, enc, expireSec:expire, mediaType }); mediaInput.value="";
};
function openPreview(data){ currentMediaData=data; mediaPreview.style.display="flex"; if(data.type==="image"){ previewImg.src=data.data; previewImg.style.display="block"; previewVideo.style.display="none"; }else if(data.type==="video"){ previewVideo.src=data.data; previewVideo.style.display="block"; previewImg.style.display="none"; } }
closePreview.onclick=()=>{ mediaPreview.style.display="none"; previewVideo.pause(); };
downloadMediaBtn.onclick=()=>{ const pass=prompt("İndirmek için şifre:"); if(!pass||pass!==currentPassword){ alert("Şifre yanlış."); return; } const a=document.createElement("a"); a.href=currentMediaData.data; a.download=currentMediaData.name||"gizli"; a.click(); };
if(lightModeBtn) lightModeBtn.onclick=()=>{
  remoteVideo.classList.toggle("light-mode");
  lightModeBtn.classList.toggle("active");
};

let _phoneWasCamOn = false;
let _phoneWasMicOn = false;
if(phoneModeBtn){
    phoneModeBtn.onclick=()=>{
        if(!isPhoneMode){
            volumeSlider.value=0.1; remoteVideo.volume=0.1; remoteVideo.muted=false; soundBtn.textContent="🔊";
            _phoneWasCamOn = camEnabled;
            _phoneWasMicOn = micEnabled;
            console.log("Telefon açılıyor, önceki cam", _phoneWasCamOn, "mic", _phoneWasMicOn, "- şimdi mic otomatik açılacak");
        }
        isPhoneMode=!isPhoneMode;
        document.body.classList.toggle("phone-mode",isPhoneMode);
        phoneModeBtn.classList.toggle("active",isPhoneMode);
        if(isPhoneMode){
            // TELEFON MODU AÇILIYOR - kamera kapanıyor, mikrofon OTOMATİK AÇILIYOR
            if(localStream){ 
                localStream.getVideoTracks().forEach(t=> t.enabled=false);
                localStream.getAudioTracks().forEach(t=> t.enabled=true); // Mic otomatik açık telefon görüşmesinde
            }
            camEnabled=false; camBtn.classList.add("offIcon");
            micEnabled=true; micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; // Mic otomatik açık
            console.log("Telefon modu AÇIK - mic OTOMATİK açıldı, kamera kapalı");
            phoneCallUI.style.display="flex";
            if(remoteVideo) remoteVideo.style.display="none";
            if(myVideoContainer) myVideoContainer.style.display="none";
            if(candleContainer) candleContainer.classList.remove("show");
            socket.emit("phone-mode",true);
            
            // Peer'da audio track'i güncelle - karşı tarafa ses gitsin
            if(peer && peer._pc && localStream){
              const at = localStream.getAudioTracks()[0];
              (async()=>{
                if(at){
                  const aSenders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="audio");
                  for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} }
                }
              })();
            }
        }else{
            // TELEFON MODU KAPANIYOR - mikrofon OTOMATİK KAPANIYOR, manuel istersem açarım
            if(localStream){
                localStream.getVideoTracks().forEach(t=> t.enabled=_phoneWasCamOn);
                localStream.getAudioTracks().forEach(t=> t.enabled=false); // Mic otomatik kapanıyor
            }
            camEnabled=_phoneWasCamOn;
            micEnabled=false; // Mic otomatik kapalı
            if(camEnabled) camBtn.classList.remove("offIcon"); else camBtn.classList.add("offIcon");
            micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; // Mic kapalı göster
            console.log("Telefon modu KAPALI - mic OTOMATİK kapandı, kamera önceki durumuna döndü:", camEnabled);
            phoneCallUI.style.display="none";
            if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block";
            if(myVideoContainer) myVideoContainer.style.display="block";
            socket.emit("phone-mode",false);
            // Peer'da trackleri güncelle
            if(peer && peer._pc && localStream){
              const vt = localStream.getVideoTracks()[0];
              const at = localStream.getAudioTracks()[0];
              (async()=>{
                if(vt){
                  const senders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="video");
                  for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} }
                }
                if(at){
                  const aSenders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="audio");
                  for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} }
                }
              })();
            }
        }
    };
}
socket.on("phone-mode",(enabled)=>{
    isPhoneMode=enabled;
    document.body.classList.toggle("phone-mode",enabled);
    phoneModeBtn.classList.toggle("active",enabled);
    if(enabled){ phoneCallUI.style.display="flex"; if(remoteVideo) remoteVideo.style.display="none"; if(candleContainer) candleContainer.classList.remove("show"); volumeSlider.value=0.1; remoteVideo.volume=0.1; }
    else{ phoneCallUI.style.display="none"; if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block"; if(myVideoContainer) myVideoContainer.style.display="block"; }
});
if(defaultSelfDestructSelect){
    defaultSelfDestructSelect.onchange=()=>{
        let val = defaultSelfDestructSelect.value;
        if(val === "custom"){
            const customInput = document.getElementById("customExpireInput");
            if(customInput){
                defaultExpire = parseInt(customInput.value) * 60;
            }
            const customWheel = document.getElementById("customExpireWheel");
            if(customWheel) customWheel.style.display = "block";
        } else {
            let numVal = parseInt(val);
            if(isNaN(numVal)) numVal = 14400;
            if(numVal>MAX_SEC) numVal=MAX_SEC;
            if(numVal < 900) numVal = 900; // min 15dk
            defaultExpire = numVal;
            const customWheel = document.getElementById("customExpireWheel");
            if(customWheel) customWheel.style.display = "none";
        }
        localStorage.setItem("gorgor_default_expire",defaultExpire.toString());
        updateExpireDisplay();
        console.log("Genel kaybolma süresi:", formatTime(defaultExpire));
    };
    
    // Custom expire input - 15dk to 24 saat (15 to 1440 dk) manual slider
    const customInput = document.getElementById("customExpireInput");
    const customValue = document.getElementById("customExpireValue");
    if(customInput){
        customInput.oninput = ()=>{
            let dk = parseInt(customInput.value);
            defaultExpire = dk * 60;
            if(defaultExpire > MAX_SEC) defaultExpire = MAX_SEC;
            localStorage.setItem("gorgor_default_expire",defaultExpire.toString());
            if(customValue){
                customValue.textContent = `${dk} dk (${formatTime(defaultExpire)})`;
            }
            updateExpireDisplay();
        };
    }
    
    // Init display
    updateExpireDisplay();
}

// Kalite seçimi - hem benim hem karşıdakinin aynı anda değişsin
if(qualitySelect){
    // Eski onchange'i temizle ve yeniden yaz - hem benim hem karşıdakinin kalitesi aynı anda
    qualitySelect.onchange = async()=>{
        const wasCamOn = camEnabled;
        const wasMicOn = micEnabled;
        const newQuality = parseInt(qualitySelect.value);
        currentQuality = newQuality;
        console.log("Kalite değişiyor:", newQuality, "p - hem benim hem karşıdakinin");
        
        // Karşı tarafa bildir - onun da kalitesi aynı olsun
        socket.emit("quality-change", newQuality);
        
        try{
            await startCamera(currentQuality, currentFacingMode);
            if(localStream){
                localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn);
                localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn);
                camEnabled=wasCamOn; micEnabled=wasMicOn;
                if(!wasCamOn) camBtn.classList.add("offIcon"); else camBtn.classList.remove("offIcon");
                if(!wasMicOn) micBtn.classList.add("offIcon"); else micBtn.classList.remove("offIcon");
                myVideo.srcObject = localStream;
                myVideo.play().catch(()=>{});
            }
            if(peer && peer._pc && localStream){ 
                const vt = localStream.getVideoTracks()[0];
                if(vt){
                    const senders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="video");
                    for(const s of senders){ 
                        try{ await s.replaceTrack(vt); }catch(e){ console.log("replaceTrack video hata", e); }
                    }
                }
                const at = localStream.getAudioTracks()[0];
                if(at){
                    const aSenders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="audio");
                    for(const s of aSenders){ 
                        try{ await s.replaceTrack(at); }catch(e){ console.log("replaceTrack audio hata", e); }
                    }
                }
            }
            console.log("Kalite güncellendi:", newQuality, "p - benim ve karşı taraf aynı");
        }catch(e){
            console.error("Kalite değişim hata", e);
        }
    };
    
    // Karşı taraf kalite değiştirdiğinde benimki de değişsin
    socket.on("quality-change", async(newQuality)=>{
        console.log("Karşı taraf kalite değiştirdi:", newQuality, "p - benimki de aynı olacak");
        if(qualitySelect) qualitySelect.value = newQuality.toString();
        currentQuality = newQuality;
        const wasCamOn = camEnabled;
        const wasMicOn = micEnabled;
        try{
            await startCamera(currentQuality, currentFacingMode);
            if(localStream){
                localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn);
                localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn);
                myVideo.srcObject = localStream;
                myVideo.play().catch(()=>{});
            }
            if(peer && peer._pc && localStream){ 
                const vt = localStream.getVideoTracks()[0];
                if(vt){
                    const senders = peer._pc.getSenders().filter(s=>s.track && s.track.kind==="video");
                    for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} }
                }
            }
        }catch(e){ console.error("Karşı kalite değişim uygulama hata", e); }
    });
}

function doPanic(){
    if(!confirm("🚨 PANİK: Tüm mesajlar silinsin mi?")) return;
    messages.innerHTML=""; sentMessages.clear(); activeTimers.forEach(t=>{ clearInterval(t.interval); clearTimeout(t.timeout); }); activeTimers.clear();
    socket.emit("panic");
    window.open("https://www.google.com","_blank");
    document.body.innerHTML='<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:white;color:black;font-family:Arial;"><div style="text-align:center;"><h1 style="font-size:80px;">G</h1><input style="width:400px;height:40px;border:1px solid #ddd;border-radius:20px;padding:10px;" placeholder="Google\'da ara"><p style="margin-top:20px;opacity:0.5;">Geçmiş silindi</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;">Geri Dön</button></div></div>';
}
if(panicBtn) panicBtn.onclick=doPanic;
socket.on("panic",()=>{ messages.innerHTML=""; sentMessages.clear(); activeTimers.forEach(t=>{ clearInterval(t.interval); clearTimeout(t.timeout); }); activeTimers.clear(); const div=document.createElement("div"); div.className="selfDestructed"; div.textContent="🚨 Karşı taraf panik attı - silindi"; messages.appendChild(div); });

let drawing=false;
drawCanvas.addEventListener("mousedown", e=>{ drawing=true; const ctx=window._drawCtx; if(!ctx) return; ctx.beginPath(); ctx.moveTo(e.clientX,e.clientY); });
drawCanvas.addEventListener("touchstart", e=>{ drawing=true; const ctx=window._drawCtx; if(!ctx) return; const t=e.touches[0]; ctx.beginPath(); ctx.moveTo(t.clientX,t.clientY); });
drawCanvas.addEventListener("mousemove", e=>{ if(!drawing) return; const ctx=window._drawCtx; if(!ctx) return; ctx.lineTo(e.clientX,e.clientY); ctx.stroke(); });
drawCanvas.addEventListener("touchmove", e=>{ if(!drawing) return; e.preventDefault(); const ctx=window._drawCtx; if(!ctx) return; const t=e.touches[0]; ctx.lineTo(t.clientX,t.clientY); ctx.stroke(); }, {passive:false});
drawCanvas.addEventListener("mouseup", ()=> drawing=false);
drawCanvas.addEventListener("touchend", ()=> drawing=false);
drawClear.onclick=()=>{ const ctx=window._drawCtx; if(ctx){ ctx.fillStyle="#000"; ctx.fillRect(0,0,window.innerWidth,window.innerHeight); } };
drawClose.onclick=()=>{ drawOverlay.style.display="none"; };
drawSend.onclick=async()=>{
    const dataUrl=drawCanvas.toDataURL("image/jpeg",0.7);
    let expire=getExpireFromSelect();
    const enc=await encryptText(dataUrl,currentPassword);
    const msgId=await addMyMediaMessage(dataUrl,"image",expire,"cizim.jpg");
    socket.emit("chat-media",{ msgId, enc, expireSec:expire, mediaType:"image" });
    drawOverlay.style.display="none";
};
window.addEventListener("beforeunload",()=>{ if(peer) peer.destroy(); if(localStream) localStream.getTracks().forEach(t=> t.stop()); });

// PINCH ZOOM - SADECE NORMAL MODDA
let lastScale=1, currentScale=1;
if(remoteVideo){
  remoteVideo.style.transition="transform 0.1s";
  remoteVideo.addEventListener('touchstart', e=>{
    if(e.touches.length===2 &&!document.fullscreenElement &&!isPhoneMode){
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY);
      lastScale = dist;
    }
  }, {passive:false});
  remoteVideo.addEventListener('touchmove', e=>{
    if(e.touches.length===2 &&!document.fullscreenElement &&!isPhoneMode){
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY);
      currentScale = Math.min(Math.max(1, currentScale * (dist/lastScale)), 4);
      remoteVideo.style.transform = `scale(${currentScale})`;
      lastScale = dist;
    }
  }, {passive:false});
  remoteVideo.addEventListener('touchend', ()=>{
    if(currentScale<1.1){ remoteVideo.style.transform="scale(1)"; currentScale=1; }
  });
}