console.log("V17 - LAMBA KALIN + 480-720-1080 + WHEEL + EMOJI FULL");
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
let defaultExpire = parseInt(localStorage.getItem("gorgor_default_expire") || "14400"); // V17 - sabit 4 saat
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

// === V17.3 GUVENLIK - SEKME DEGISTINCE TAM KAPANIS HESAP MAKINESINE DON ===
function doSecurityReset(reason){
  // V17.4 FIX - Foto secilirken guvenlik reseti iptal et
  if(isPickingFile || _photoPicking){
    console.log("FOTO SECILIYOR - Guvenlik reset IPTAL:", reason, "isPickingFile", isPickingFile, "_photoPicking", _photoPicking);
    return;
  }
  console.log("GUVENLIK KAPANIS:", reason);
  try{
    if(peer){ try{peer.destroy();}catch(e){} peer=null; }
    if(localStream){ localStream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} }); localStream=null; }
    if(pingTimer){ clearInterval(pingTimer); pingTimer=null; }
    // Socket odadan cik
    if(socket && currentRoom){ socket.emit("leave-room", currentRoom); }
    // Degiskenler sifirla
    currentRoom=""; currentPassword=""; myUsername=""; myRealUsername="";
    micEnabled=false; camEnabled=false; isPhoneMode=false; opponentUsername=""; opponentStatus="offline";
    messageIdCounter=0;
    // Mesajlari temizle
    if(typeof messages!=="undefined" && messages){ messages.innerHTML=""; }
    if(typeof sentMessages!=="undefined"){ sentMessages.clear(); }
    if(typeof activeTimers!=="undefined"){ activeTimers.forEach(t=>{ clearInterval(t.interval); clearTimeout(t.timeout); }); activeTimers.clear(); }
    // UI sifirla - HESAP MAKINESI EKRANINA DON
    if(typeof roomName!=="undefined") roomName.value="";
    if(typeof roomPassword!=="undefined") roomPassword.value="";
    if(typeof userName!=="undefined") userName.value="";
    if(mainScreen) mainScreen.style.display="none";
    if(roomScreen) roomScreen.style.display="none";
    const fakeCalcEl = document.getElementById("fakeCalc");
    if(fakeCalcEl) fakeCalcEl.style.display="flex";
    // calc buffer sifirla
    if(typeof calcBuf!=="undefined"){ calcBuf=""; const cd=document.getElementById("calcDisplay"); if(cd) cd.value=""; }
    document.body.classList.remove("phone-mode");
    document.body.classList.remove("chat-open");
    if(phoneCallUI) phoneCallUI.style.display="none";
    if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
    if(remoteVideo){ try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.removeAttribute("src"); remoteVideo.style.display="none"; }
    if(myVideoContainer) myVideoContainer.style.display="none";
    console.log("Guvenlik reset tamam - hesap makinesine donuldu");
  }catch(e){ console.log("Guvenlik reset hata", e); }
}

// Sekme gizlenince / uygulama asagiya inince
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){
    if(isPickingFile || _photoPicking){
      console.log("Foto secilirken sekme gizlendi - guvenlik IPTAL");
      return;
    }
    console.log("Sekme gizlendi - guvenlik kapanis");
    doSecurityReset("visibilitychange hidden");
  }
});
window.addEventListener("pagehide", ()=>{ doSecurityReset("pagehide"); });
window.addEventListener("blur", ()=>{
  setTimeout(()=>{
    if(isPickingFile || _photoPicking){
      console.log("Foto secilirken blur - guvenlik IPTAL");
      return;
    }
    if(document.hidden){ doSecurityReset("blur + hidden"); }
  }, 1000);
});
// Telefon kilit tusuna basma / minimize icin
document.addEventListener("freeze", ()=>{ doSecurityReset("freeze"); });


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

let opponentUsername = "";
let opponentStatus = "offline";
function updateOpponentDisplay(name, status){
  opponentUsername = name || opponentUsername;
  opponentStatus = status || opponentStatus;
  if(opponentNameDisplay){ opponentNameDisplay.textContent = opponentUsername || "-"; }
  if(opponentDot){ opponentDot.className = "onlineDot " + (opponentStatus === "varım" || opponentStatus === "online" ? "online" : "offline"); }
  if(opponentStatusText){
    if(opponentStatus === "varım" || opponentStatus === "online"){ opponentStatusText.textContent = "içerde"; opponentStatusText.style.color = "#00ff88"; }
    else { opponentStatusText.textContent = "dışarda"; opponentStatusText.style.color = "rgba(255,255,255,0.5)"; }
  }
  const phoneNameDisplay = document.getElementById("phoneNameDisplay");
  if(phoneNameDisplay && opponentUsername){ phoneNameDisplay.textContent = opponentUsername; }
}

roomName.addEventListener("input",()=>{
    const v=normalize(roomName.value);
    if(v.length>0){ if(fakeRoomsHint) fakeRoomsHint.style.display="block"; } else { if(fakeRoomsHint) fakeRoomsHint.style.display="none"; }
    if(v===REAL_ROOM || v.length>=2){ userName.style.display="block"; userListBox.style.display="block"; }
    else { userName.style.display="none"; userListBox.style.display="none"; }
});

async function deriveKey(password){
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return await crypto.subtle.importKey('raw', hash, { name:'AES-GCM' }, false, ['encrypt','decrypt']);
}
function bufToB64(buf){
    const bytes = new Uint8Array(buf); let binary=""; const chunk=8192;
    for(let i=0;i<bytes.length;i+=chunk){ binary+=String.fromCharCode.apply(null, bytes.subarray(i,i+chunk)); }
    return btoa(binary);
}
function b64ToBuf(b64){
    const binary=atob(b64); const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes;
}
async function encryptText(text,password){
    const key=await deriveKey(password); const iv=crypto.getRandomValues(new Uint8Array(12));
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text));
    const combined=new Uint8Array(iv.length+ct.byteLength); combined.set(iv,0); combined.set(new Uint8Array(ct),iv.length);
    return bufToB64(combined);
}
async function decryptText(b64,password){
    try{
        const key=await deriveKey(password); const combined=b64ToBuf(b64);
        const iv=combined.slice(0,12); const ct=combined.slice(12);
        const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
        return new TextDecoder().decode(pt);
    }catch(e){ return null; }
}

if(defaultSelfDestructSelect) defaultSelfDestructSelect.value = "14400";
micBtn.textContent="🎤"; camBtn.textContent="📹";

async function startCamera(height=720, facingMode=currentFacingMode){
    try{
        if(localStream){ localStream.getVideoTracks().forEach(t=>t.stop()); }
        localStream=await navigator.mediaDevices.getUserMedia({
            video:{ facingMode:{ideal:facingMode}, width:{ideal:height===1080?1920:height===720?1280:854}, height:{ideal:height}, frameRate:{ideal:30}},
            audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}
        });
        myVideo.srcObject=localStream;
        myVideo.style.transform=facingMode==="user"?"scaleX(-1)":"scaleX(1)";
        localStream.getVideoTracks().forEach(t=>t.enabled=false);
        localStream.getAudioTracks().forEach(t=>t.enabled=false);
        micEnabled=false; camEnabled=false;
        micBtn.classList.add("offIcon"); camBtn.classList.add("offIcon"); micBtn.textContent="🔇";
        return true;
    }catch(err){ console.log("kamera hata",err); return false; }
}
function startPingMonitor(){ if(pingTimer) clearInterval(pingTimer); pingTimer=setInterval(()=>socket.emit("ping-check",Date.now()),3000); }
socket.on("pong-check", ts=>{
    const ping=Date.now()-ts;
    if(pingValue) pingValue.textContent=ping+" ms";
    if(!connectionQuality) return;
    if(ping<100){ connectionQuality.textContent="Mükemmel"; connectionQuality.className="good"; }
    else if(ping<200){ connectionQuality.textContent="İyi"; connectionQuality.className="medium"; }
    else { connectionQuality.textContent="Zayıf"; connectionQuality.className="bad"; }
});

joinBtn.onclick=async()=>{
    const room=roomName.value.trim(); const password=roomPassword.value.trim(); const uname=userName.value.trim();
    if(!room){ alert("Oda adı gir"); return; }
    if(!uname){ alert("Kullanıcı adı gir"); return; }
    if(!password){ alert("Şifre gerekli"); return; }
    currentPassword=password; myUsername=normalize(uname); myRealUsername=uname;
    await startCamera(currentQuality);
    currentRoom=room;
    socket.emit("join-room",{room,password,username:uname});
};

socket.on("room-error", msg=>alert(msg));
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
  const oppName=d.username||d.realUsername||"Bilinmeyen";
  updateOpponentDisplay(oppName,"varım");
  if(candleContainer){ candleContainer.classList.remove("show"); candleContainer.style.display="none"; }
});
function createPeer(initiator){
    peer=new SimplePeer({initiator,trickle:false,stream:localStream,config:{iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}]}});
    peer.on("signal",signal=>socket.emit("signal",{room:currentRoom,signal}));
    peer.on("stream",stream=>{
        remoteVideo.srcObject=stream; remoteVideo.play().catch(()=>{});
        if(candleContainer) candleContainer.classList.remove("show");
        if(isPhoneMode){ remoteVideo.style.display="none"; } else { remoteVideo.style.display="block"; }
    });
    peer.on("close",()=>{
        if(remoteVideo){ remoteVideo.pause(); try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.load(); remoteVideo.style.display="none"; }
        if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; }
    });
}
socket.on("signal",signal=>{ if(!peer) createPeer(false); peer.signal(signal); });
socket.on("user-status",(data)=>{
  const {user,status,online}=data;
  if(user===myRealUsername) return;
  const isOnline=status==="varım"||online;
  updateOpponentDisplay(user,isOnline?"varım":"yokum");
  if(connectionQuality){
    if(isOnline){ connectionQuality.textContent=`${user} içerde`; connectionQuality.className="good"; }
    else { connectionQuality.textContent=`${user} dışarda`; connectionQuality.className="bad"; }
  }
});
socket.on("user-disconnected",()=>{
    if(remoteVideo){ remoteVideo.pause(); try{remoteVideo.srcObject=null;}catch(e){} remoteVideo.removeAttribute("src"); remoteVideo.load(); remoteVideo.style.display="none"; }
    if(peer){ try{peer.destroy();}catch(e){} peer=null; }
    if(candleContainer){ candleContainer.classList.add("show"); candleContainer.style.display="flex"; }
    if(connectionQuality){ connectionQuality.textContent="Karşı yok - Mum 🕯"; connectionQuality.className="bad"; }
    if(pingTimer){ clearInterval(pingTimer); pingTimer=null; }
    updateOpponentDisplay(opponentUsername||"Bilinmeyen","yokum");
});

// === V17 - KALİTE DEĞİŞİNCE İKİMİZİN DEĞİŞSİN ===
qualitySelect.onchange=async()=>{
    const wasCamOn=camEnabled; const wasMicOn=micEnabled;
    currentQuality=parseInt(qualitySelect.value);
    console.log("Kalite degistiriliyor:", currentQuality);
    socket.emit("quality-change", currentQuality);
    await startCamera(currentQuality, currentFacingMode);
    if(localStream){
        localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn);
        localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn);
        camEnabled=wasCamOn; micEnabled=wasMicOn;
        if(!wasCamOn) camBtn.classList.add("offIcon"); else camBtn.classList.remove("offIcon");
    }
    if(peer&&localStream){
        const sender=peer._pc.getSenders().find(s=>s.track&&s.track.kind==="video");
        if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]);
    }
};
socket.on("quality-change", async(q)=>{
    console.log("Karsi kalite degistirdi:", q);
    currentQuality=parseInt(q);
    if(qualitySelect) qualitySelect.value=currentQuality.toString();
    const wasCamOn=camEnabled; const wasMicOn=micEnabled;
    await startCamera(currentQuality, currentFacingMode);
    if(localStream){
        localStream.getVideoTracks().forEach(t=>t.enabled=wasCamOn);
        localStream.getAudioTracks().forEach(t=>t.enabled=wasMicOn);
    }
    if(peer&&localStream){
        const sender=peer._pc.getSenders().find(s=>s.track&&s.track.kind==="video");
        if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]);
    }
    if(connectionQuality){ connectionQuality.textContent=`Kalite ${q}p`; setTimeout(()=>{ if(connectionQuality) connectionQuality.textContent="İyi"; },2000); }
});

settingsBtn.onclick=()=>settingsContainer.classList.toggle("menu-open");
if(fullscreenBtn){ fullscreenBtn.onclick=()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }

function formatTime(sec){
    if(sec<60) return `${sec} sn`;
    const m=Math.floor(sec/60); const s=sec%60;
    if(m<60) return `${m} dk ${s} sn`;
    const h=Math.floor(m/60); const mm=m%60;
    if(h<24) return `${h}sa ${mm}dk`;
    const d=Math.floor(h/24); const hh=h%24;
    return `${d}g ${hh}sa ${mm}dk`;
}
function startSelfDestruct(div,msgId,expireSec,deleteAt){
    expireSec=Math.min(expireSec,MAX_SEC);
    if(activeTimers.has(msgId)){ const old=activeTimers.get(msgId); clearInterval(old.interval); clearTimeout(old.timeout); }
    const expireAt=deleteAt||(Date.now()+expireSec*1000);
    const countdownEl=div.querySelector(".countdown");
    const interval=setInterval(()=>{
        const remaining=Math.max(0,Math.floor((expireAt-Date.now())/1000));
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
// V17 - Azalt/Uzat kaldirildi
function addReduceExtendButtons(div,msgId){ return; }

async function addMyMessage(text,expireSec,realName){
    const now=Date.now(); const msgId=`msg-${now}-${messageIdCounter++}`;
    const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; expireSec=Math.min(expireSec,MAX_SEC);
    const linked=text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(expireSec)}</span>BEN (${realName}) → ${linked}<span class="ticks single" style="color:#999;"> ✓</span><span class="countdown">⏳ ${formatTime(expireSec)}</span>`;
    div._sentAt=now; div._deleteAt=now+expireSec*1000;
    messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; },10);
    sentMessages.set(msgId,div); div._expireSec=expireSec; startSelfDestruct(div,msgId,expireSec,div._deleteAt); return msgId;
}
async function addMyMediaMessage(dataUrl,mediaType,expireSec,fileName){
    const now=Date.now(); const msgId=`media-${now}-${messageIdCounter++}`;
    const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; div._expireSec=expireSec; div._sentAt=now; div._deleteAt=now+expireSec*1000;
    div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(expireSec)}</span>`;
    if(mediaType==="image"){ const im=document.createElement("img"); im.src=dataUrl; im.className="mediaMessage"; im.onclick=(ev)=>{ ev.stopPropagation(); openPreview({type:"image",data:dataUrl,name:fileName}); }; div.appendChild(im); setupLongPress(im,msgId); }
    else if(mediaType==="video"){ const v=document.createElement("video"); v.src=dataUrl; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
    const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
    messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; },10); sentMessages.set(msgId,div); startSelfDestruct(div,msgId,expireSec,div._deleteAt); return msgId;
}
function setupLongPress(img,msgId){
  let timer;
  img.addEventListener("touchstart",(e)=>{ timer=setTimeout(()=>{ const inp=prompt("Foto süresi değiştir (sn, max 86400):"); if(!inp) return; let v=parseInt(inp); if(v>0&&v<=86400){ const div=document.getElementById(msgId); if(div){ const newDelete=Date.now()+v*1000; div._deleteAt=newDelete; startSelfDestruct(div,msgId,v,newDelete); } } },800); }, {passive:true});
  img.addEventListener("touchend",()=>clearTimeout(timer));
  img.addEventListener("mousedown",(e)=>{ timer=setTimeout(()=>{ const inp=prompt("Foto süresi değiştir (sn, max 86400):"); if(!inp) return; let v=parseInt(inp); if(v>0&&v<=86400){ const div=document.getElementById(msgId); if(div){ const newDelete=Date.now()+v*1000; div._deleteAt=newDelete; startSelfDestruct(div,msgId,v,newDelete); } } },800); });
  img.addEventListener("mouseup",()=>clearTimeout(timer));
}
async function addLockedMessage(msgId,expireSec,enc,mediaType,senderReal,sentAt){
    if(document.getElementById(msgId)) return;
    expireSec=Math.min(expireSec||defaultExpire,MAX_SEC);
    const sent=sentAt||Date.now(); const deleteAt=sent+expireSec*1000;
    try{
        const plain=await decryptText(enc,currentPassword); if(!plain) return;
        const div=document.createElement("div"); div.className="otherMessage"; div.id=msgId; div._expireSec=expireSec; div._sentAt=sent; div._deleteAt=deleteAt;
        const remaining=Math.max(1,Math.floor((deleteAt-Date.now())/1000));
        if(mediaType==="text"||!mediaType){
            const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
            div.innerHTML=`<span class="senderName">${senderReal}</span> → ${linked}<span class="ticks single" style="color:#999;"> ✓</span><span class="countdown">⏳ ${formatTime(remaining)}</span>`;
        }else{
            div.innerHTML=`<span class="senderName">${senderReal}</span> - ⏰ ${formatTime(remaining)}`;
            if(mediaType==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; div.appendChild(img); setupLongPress(img,msgId); }
            else if(mediaType==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
            const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
        }
        messages.appendChild(div); setTimeout(()=>{ messages.scrollTop=messages.scrollHeight; },10);
        startSelfDestruct(div,msgId,remaining,deleteAt);
        socket.emit("message-opened",{msgId}); socket.emit("message-read",{msgId,reader:myRealUsername});
        if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink"); }
        return;
    }catch(e){ console.log("addLocked err",e); }
}

function getExpireFromSelect(){
    let val=perMessageTimerSelect.value;
    if(val==="default") return defaultExpire;
    if(val==="custom"){ let custom=prompt(`Manuel süre saniye:`); if(!custom) return defaultExpire; let num=parseInt(custom.replace(/[^0-9]/g,'')); if(isNaN(num)||num<=0) return defaultExpire; if(num>MAX_SEC) num=MAX_SEC; return num; }
    return Math.min(parseInt(val),MAX_SEC);
}
sendBtn.onclick=async()=>{
    const text=input.value.trim(); if(!text) return;
    let expire=getExpireFromSelect();
    const persistMode=perMessagePersistSelect?perMessagePersistSelect.value:"once";
    if(persistMode==="persist"){ defaultExpire=expire; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); }
    const msgId=await addMyMessage(text,expire,myRealUsername);
    const enc=await encryptText(text,currentPassword); const sentAt=Date.now();
    socket.emit("chat-message",{msgId,enc,expireSec:expire,sentAt});
    input.value=""; socket.emit('typing',false); isTyping=false;
};
input.addEventListener("keydown",e=>{ if(e.key==="Enter") sendBtn.click(); });
socket.on("chat-message", data=>{ addLockedMessage(data.msgId,data.expireSec,data.enc,"text",data.realUsername||data.username,data.sentAt); });
socket.on("chat-media", data=>{ addLockedMessage(data.msgId,data.expireSec,data.enc,data.mediaType||"image",data.realUsername||data.username,data.sentAt); });
socket.on("pending-messages", async(list)=>{
    for(const m of list){
        const plain=await decryptText(m.enc,currentPassword); if(!plain) continue;
        const isMine=m.username===myUsername;
        if(m.opened&&m.deleteAt){
            const remaining=Math.max(1,Math.floor((m.deleteAt-Date.now())/1000)); if(remaining<=0) continue;
            const div=document.createElement("div"); div.className=isMine?"myMessage":"otherMessage"; div.id=m.msgId;
            if(m.type==="text"){
                const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
                div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} - ${isMine?`BEN (${m.realUsername})`:m.realUsername}</span>${isMine?`BEN (${m.realUsername}) → `:`${m.realUsername} → `}${linked}<span class="countdown">⏳ ${formatTime(remaining)}</span>`;
            }else{
                div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} - ${m.realUsername}</span>`;
                if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; img.onclick=(ev)=>{ ev.stopPropagation(); openPreview({type:"image",data:plain,name:"gizli.jpg"}); }; div.appendChild(img); }
                else if(m.type==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
                const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
            }
            messages.appendChild(div); startSelfDestruct(div,m.msgId,remaining,m.deleteAt); if(isMine) sentMessages.set(m.msgId,div);
        }else{
            if(isMine){
                const div=document.createElement("div"); div.className="myMessage"; div.id=m.msgId; div._expireSec=m.expireSec;
                if(m.type==="text"){ div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)} - Henüz açılmadı</span>BEN (${m.realUsername}) → ${plain}<span class="countdown">⏳ Karşı açınca ${formatTime(m.expireSec)}</span>`; }
                else{ div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)} - Henüz açılmadı</span>`; if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; div.appendChild(img); } const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ Karşı açınca ${formatTime(m.expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd); }
                messages.appendChild(div); sentMessages.set(m.msgId,div);
            }else{ addLockedMessage(m.msgId,m.expireSec,m.enc,m.type,m.realUsername); }
        }
    }
    messages.scrollTop=messages.scrollHeight;
});
socket.on("message-opened",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId)||sentMessages.get(msgId); if(!div) return;
    if(sentMessages.has(msgId)){ const cd=div.querySelector(".countdown"); if(cd){ cd.textContent=`✓ Karşı açtı - ${cd.textContent}`; cd.style.color="#00ff88"; } }
});
chatToggle.onclick=()=>{
    if(chatPanel.style.display==="flex"){ chatPanel.style.display="none"; document.body.classList.remove("chat-open"); chatToggle.textContent="💬"; }
    else{
        chatPanel.style.display="flex"; document.body.classList.add("chat-open"); chatToggle.classList.remove("newMessageBlink"); chatToggle.textContent="✖";
        const goBottom=()=>{ if(messages){ messages.scrollTop=messages.scrollHeight; } }; goBottom(); setTimeout(goBottom,50); setTimeout(goBottom,200); setTimeout(goBottom,600);
        socket.emit("messages-read-all");
    }
};
input.addEventListener('input',()=>{ if(!isTyping&&input.value.trim()){ socket.emit('typing',true); isTyping=true; } clearTimeout(typingTimer); typingTimer=setTimeout(()=>{ socket.emit('typing',false); isTyping=false; },1000); });
socket.on('typing',(data)=>{
    let td=document.getElementById('typingIndicator');
    if(!td){ td=document.createElement('div'); td.id='typingIndicator'; td.className='otherMessage'; messages.appendChild(td); }
    td.textContent=data.typing?`${data.username} yazıyor...`:''; td.style.display=data.typing?'block':'none';
});

// === TITRESIM ===
if(nudgeBtn){ nudgeBtn.onclick=(e)=>{ e.stopPropagation(); socket.emit("nudge"); triggerNudge(true); }; }
function triggerNudge(){
    document.body.classList.add("screen-shake"); setTimeout(()=>document.body.classList.remove("screen-shake"),800);
    if(navigator.vibrate) navigator.vibrate([200,100,200]);
    if(messages){ messages.classList.add("shake"); setTimeout(()=>messages.classList.remove("shake"),600); }
}
socket.on("nudge",()=>{ triggerNudge(false); });

// === V17 EMOJI - HER BIRI AYRI ANIMASYON ===
if(emojiBtn) emojiBtn.onclick=(e)=>{ e.stopPropagation(); emojiPanel.classList.toggle("show"); };
document.querySelectorAll('.flyEmoji').forEach(emoji=>{
    if(emoji.id==='addCustomEmoji') return;
    emoji.onclick=(e)=>{
        e.stopPropagation(); const emojiText=emoji.textContent; const effect=emoji.dataset.effect;
        socket.emit('fly-emoji',{emoji:emojiText,effect}); createFlyingEmoji(emojiText,effect,true); emojiPanel.classList.remove("show");
    };
});
socket.on('fly-emoji',(data)=>createFlyingEmoji(data.emoji,data.effect,false));

function createFlyingEmoji(emoji,effect,isMine){
    const startX=isMine?window.innerWidth-120:80; const baseY=140;
    if(effect==='big-kiss'){
        const big=document.createElement('div'); big.className='big-kiss-mark'; big.textContent='💋'; big.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:120px;z-index:9999;animation:explodeBoom 1s forwards;'; document.body.appendChild(big); setTimeout(()=>big.remove(),1000); return;
    }
    if(effect==='water'){
        for(let i=0;i<10;i++){ setTimeout(()=>{ const d=document.createElement('div'); d.className='flying-emoji water'; d.textContent='💧'; d.style.left=(window.innerWidth/2+Math.random()*200-100)+'px'; d.style.bottom='50%'; d.style.fontSize='40px'; d.style.animation='fireRainFall 1.5s forwards'; document.body.appendChild(d); setTimeout(()=>d.remove(),1500); }, i*60); }
        return;
    }
    let count=1; let animClass=effect||'heart';
    if(effect==='heart'||effect==='kiss') count=8;
    else if(effect==='kiss-rain'||effect==='heart-rain'||effect==='money-rain'||effect==='star-rain'||effect==='fire-rain'||effect==='laugh-rain'||effect==='angry-rain'||effect==='emoji-rain') count=14;
    else if(effect==='flower'||effect==='sparkle'||effect==='star') count=6;
    else if(effect==='fire'||effect==='explode') count=3;
    else if(effect==='party'||effect==='confetti') count=20;
    else if(effect==='money'||effect==='thumbs'||effect==='wow'||effect==='skull'||effect==='heart-burst') count=1;

    for(let i=0;i<count;i++){
        setTimeout(()=>{
            const fly=document.createElement('div');
            fly.className='flying-emoji '+animClass;
            fly.textContent=emoji;
            fly.style.left=(startX+Math.random()*180-90+i*12)+'px';
            fly.style.bottom=(baseY+Math.random()*60)+'px';
            fly.style.fontSize=(effect==='explode'||effect==='heart-burst')?'90px':(effect==='fire'?'72px':(52+Math.random()*28)+'px');
            document.body.appendChild(fly);
            setTimeout(()=>fly.remove(),3500);
        }, i*80);
    }
    // Efektler
    if(['fire','explode','party','confetti','rocket','rocket-fly'].includes(effect)){
        document.body.classList.add('mega-shake'); setTimeout(()=>document.body.classList.remove('mega-shake'),700);
        if(msnEffectLayer){ msnEffectLayer.style.background=effect==='fire'?'radial-gradient(circle at 50% 70%, rgba(255,80,0,0.25), transparent 65%)':'radial-gradient(circle at 50% 50%, rgba(255,255,0,0.2), transparent 60%)'; msnEffectLayer.style.display='block'; setTimeout(()=>msnEffectLayer.style.display='none',600); }
        if(navigator.vibrate) navigator.vibrate([80,40,80]);
    } else if(['heart','kiss','love','heart-burst'].includes(effect)){
        if(navigator.vibrate) navigator.vibrate([50,30,50]);
    }
}

micBtn.onclick=async()=>{
  if(!localStream) return;
  micEnabled=!micEnabled; localStream.getAudioTracks().forEach(t=>t.enabled=micEnabled);
  micBtn.classList.toggle("offIcon",!micEnabled); micBtn.textContent=micEnabled?"🎤":"🔇";
  try{
    if(peer&&peer._pc&&localStream){
      const at=localStream.getAudioTracks()[0];
      if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ await s.replaceTrack(at); } }
    }
  }catch(e){}
};
camBtn.onclick=async()=>{
  if(!localStream){ try{ await startCamera(currentQuality,currentFacingMode); }catch(e){ return; } }
  // V17.3 - Kamera acilirken sesli acma sorusu
  if(!camEnabled){
    // Kamera kapali -> acilacak, sor
    const sesliAc = confirm("Kamerayı sesli olarak açmak ister misiniz?\n\nTamam = Mikrofon da açılsın\nİptal = Sadece kamera açılsın (mikrofon kapalı kalır)");
    camEnabled=true;
    localStream.getVideoTracks().forEach(t=>t.enabled=true);
    camBtn.classList.remove("offIcon");
    if(sesliAc){
      localStream.getAudioTracks().forEach(t=>t.enabled=true);
      micEnabled=true; micBtn.classList.remove("offIcon"); micBtn.textContent="🎤";
      console.log("Kamera sesli acildi - mikrofon da acildi");
    } else {
      localStream.getAudioTracks().forEach(t=>t.enabled=false);
      micEnabled=false; micBtn.classList.add("offIcon"); micBtn.textContent="🔇";
      console.log("Kamera sessiz acildi - mikrofon kapali, istersen acabilirsin");
    }
  } else {
    // Kamera acik -> kapat - V17.5 FIX: kamera kapaninca mikrofon da kapansin
    camEnabled=false;
    localStream.getVideoTracks().forEach(t=>t.enabled=false);
    camBtn.classList.add("offIcon");
    // Mikrofon da kapat
    localStream.getAudioTracks().forEach(t=>t.enabled=false);
    micEnabled=false;
    micBtn.classList.add("offIcon"); micBtn.textContent="🔇";
    console.log("Kamera kapatildi - V17.5 mikrofon da kapatildi");
  }
  try{
    if(peer&&peer._pc&&localStream){
      const vt=localStream.getVideoTracks()[0];
      const at=localStream.getAudioTracks()[0];
      if(vt){ const senders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="video"); for(const s of senders){ await s.replaceTrack(vt); } }
      if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ await s.replaceTrack(at); } }
    }
  }catch(e){}
};
if(switchCameraBtn){ switchCameraBtn.onclick=async()=>{
  try{
    const wasCamOn=camEnabled; const wasMicOn=micEnabled;
    currentFacingMode=currentFacingMode==="user"?"environment":"user";
    await startCamera(currentQuality,currentFacingMode);
    if(localStream){
      localStream.getVideoTracks().forEach(t=>{ t.enabled=wasCamOn; });
      localStream.getAudioTracks().forEach(t=>{ t.enabled=wasMicOn; });
      myVideo.srcObject=localStream; myVideo.play().catch(()=>{}); myVideo.style.transform=currentFacingMode==="user"?"scaleX(-1)":"scaleX(1)";
    }
    camEnabled=wasCamOn; micEnabled=wasMicOn;
    if(camEnabled) camBtn.classList.remove("offIcon"); else camBtn.classList.add("offIcon");
    if(micEnabled){ micBtn.classList.remove("offIcon"); micBtn.textContent="🎤"; } else { micBtn.classList.add("offIcon"); micBtn.textContent="🔇"; }
    if(peer&&peer._pc&&localStream){
      const vt=localStream.getVideoTracks()[0]; const at=localStream.getAudioTracks()[0];
      if(vt){ const senders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="video"); for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} } }
      if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} } }
    }
  }catch(err){ alert("Ikinci kamera yok"); currentFacingMode="user"; try{ await startCamera(currentQuality,"user"); }catch(e){} }
}; }
remoteVideo.muted=false; remoteVideo.volume=0.1; volumeSlider.value=0.1;
volumeSlider.oninput=()=>{ const v=parseFloat(volumeSlider.value); remoteVideo.volume=v; remoteVideo.muted=v<=0; soundBtn.textContent=v<=0?"🔇":"🔊"; };
soundBtn.onclick=()=>{ remoteVideo.muted=!remoteVideo.muted; if(!remoteVideo.muted&&parseFloat(volumeSlider.value)===0){ volumeSlider.value=0.5; remoteVideo.volume=0.5; } soundBtn.textContent=remoteVideo.muted?"🔇":"🔊"; };
changePasswordBtn.onclick=()=>{ const p=prompt("Yeni sifre"); if(!p) return; currentPassword=p; socket.emit("change-password",p); };

let isDragging=false,sx,sy,sl,st;
myVideoContainer.addEventListener("touchstart",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1){ isDragging=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; sl=myVideoContainer.offsetLeft; st=myVideoContainer.offsetTop; } });
myVideoContainer.addEventListener("touchmove",(e)=>{ if(isPhoneMode) return; if(e.touches.length===1&&isDragging){ e.preventDefault(); myVideoContainer.style.left=sl+(e.touches[0].clientX-sx)+"px"; myVideoContainer.style.top=st+(e.touches[0].clientY-sy)+"px"; myVideoContainer.style.right="auto"; } });
myVideoContainer.addEventListener("touchend",()=>isDragging=false);
if(attachMenuBtn){ attachMenuBtn.onclick=(e)=>{ e.stopPropagation(); attachMenu.classList.toggle("show"); }; }
mediaBtn.onclick=(e)=>{ e.preventDefault(); isPickingFile=true; _photoPicking=true; console.log("Galeri aciliyor - guvenlik iptal aktif"); attachMenu.classList.remove("show"); setTimeout(()=>{ mediaInput.click(); }, 100); };
drawBtn.onclick=()=>{ attachMenu.classList.remove("show"); drawOverlay.style.display="flex"; const dpr=window.devicePixelRatio||1; drawCanvas.width=window.innerWidth*dpr; drawCanvas.height=(window.innerHeight-80)*dpr; drawCanvas.style.width=window.innerWidth+"px"; drawCanvas.style.height=(window.innerHeight-80)+"px"; const ctx2=drawCanvas.getContext("2d"); ctx2.scale(dpr,dpr); ctx2.strokeStyle="#00ff88"; ctx2.lineWidth=4; ctx2.lineCap="round"; ctx2.fillStyle="#000"; ctx2.fillRect(0,0,window.innerWidth,window.innerHeight); window._drawCtx=ctx2; };
locationBtn.onclick=async()=>{ attachMenu.classList.remove("show"); if(!navigator.geolocation){ alert("Konum yok"); return; } navigator.geolocation.getCurrentPosition(async pos=>{ const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; let expire=getExpireFromSelect(); const msgId=await addMyMessage("📍 Konumum: "+url,expire,myRealUsername); const enc=await encryptText("📍 Konumum: "+url,currentPassword); const sentAt=Date.now(); socket.emit("chat-message",{msgId,enc,expireSec:expire,sentAt}); }); };

if(cameraBtn){ cameraBtn.onclick=(e)=>{ e.preventDefault(); isPickingFile=true; _photoPicking=true; console.log("Kamera cekimi aciliyor - guvenlik iptal aktif"); attachMenu.classList.remove("show"); setTimeout(()=>{ cameraInput.click(); }, 100); }; }
cameraInput.onchange=async()=>{
    isPickingFile=true; _photoPicking=true;
    try{
      const file=cameraInput.files[0]; if(!file){ isPickingFile=false; _photoPicking=false; return; }
      if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; _photoPicking=false; return; }
      let expire=getExpireFromSelect(); let dataUrl="";
      try{
        const img=await createImageBitmap(file); const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; }
        canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
        const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.75));
        dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); });
      }catch(e){ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); }
      const enc=await encryptText(dataUrl,currentPassword); const sentAt=Date.now();
      const msgId=await addMyMediaMessage(dataUrl,"image",expire,"kamera.jpg");
      socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType:"image",sentAt});
      cameraInput.value=""; setTimeout(()=>{ if(messages) messages.scrollTop=messages.scrollHeight; },100);
    }catch(err){ console.log("cameraInput hata",err); }
    setTimeout(()=>{ isPickingFile=false; _photoPicking=false; },1500);
};
mediaInput.onchange=async()=>{
    isPickingFile=true; _photoPicking=true;
    try{
      const file=mediaInput.files[0]; if(!file){ isPickingFile=false; _photoPicking=false; return; }
      if(file.size>20*1024*1024){ alert("Max 20MB"); isPickingFile=false; _photoPicking=false; return; }
      let expire=getExpireFromSelect(); let dataUrl="";
      if(file.type.startsWith('image/')){
        try{
          const img=await createImageBitmap(file); const canvas=document.createElement('canvas'); const max=1280; let w=img.width,h=img.height; if(w>max){ h=h*max/w; w=max; }
          canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.7));
          dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); });
        }catch(e){ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); }
      }else{ dataUrl=await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(file); }); }
      const enc=await encryptText(dataUrl,currentPassword); const mediaType=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':'file'; const sentAt=Date.now();
      const msgId=await addMyMediaMessage(dataUrl,mediaType,expire,file.name);
      socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType,sentAt});
      mediaInput.value=""; setTimeout(()=>{ if(messages) messages.scrollTop=messages.scrollHeight; },100);
    }catch(e){ console.log("mediaInput hata",e); }
    setTimeout(()=>{ isPickingFile=false; _photoPicking=false; },1500);
};
function openPreview(data){ currentMediaData=data; mediaPreview.style.display="flex"; if(data.type==="image"){ previewImg.src=data.data; previewImg.style.display="block"; previewVideo.style.display="none"; }else if(data.type==="video"){ previewVideo.src=data.data; previewVideo.style.display="block"; previewImg.style.display="none"; } }
closePreview.onclick=()=>{ mediaPreview.style.display="none"; previewVideo.pause(); };
downloadMediaBtn.onclick=()=>{ const pass=prompt("İndirmek için şifre:"); if(!pass||pass!==currentPassword){ alert("Şifre yanlış."); return; } const a=document.createElement("a"); a.href=currentMediaData.data; a.download=currentMediaData.name||"gizli"; a.click(); };

// === V17 LAMBA - BEYAZ ÇERÇEVE KALIN + GECE AYDINLATMA ===
if(lightModeBtn){
  lightModeBtn.onclick=()=>{
    const isLampOn = remoteVideo.classList.contains("lamp-on");
    if(isLampOn){
      remoteVideo.classList.remove("lamp-on");
      remoteVideo.classList.remove("light-mode");
      lightModeBtn.classList.remove("active");
      console.log("Lamba kapandi - normal mod");
    } else {
      remoteVideo.classList.add("lamp-on");
      remoteVideo.classList.add("light-mode");
      lightModeBtn.classList.add("active");
      console.log("Lamba acildi - BEYAZ CERCEVE 8px + isik, gece zifiri karanlikta yuzun aydinlanacak");
      // Ekran parlakligini artir gecici
      remoteVideo.style.filter="brightness(1.3) contrast(1.1)";
      setTimeout(()=>{ if(remoteVideo.classList.contains("lamp-on")) remoteVideo.style.filter="brightness(1.15)"; }, 300);
    }
  };
}

let _phoneWasCamOn=false; let _phoneWasMicOn=false;
if(phoneModeBtn){
    phoneModeBtn.onclick=()=>{
        if(!isPhoneMode){
            // TELEFON ACILIYOR - V17.3 MANTIGI: kamera aciksa mikrofon otomatik acilsin
            volumeSlider.value=0.15; remoteVideo.volume=0.15; remoteVideo.muted=false; soundBtn.textContent="🔊";
            // V17.4 - Hoparlor aciksa bile en dusuk %15
            if(parseFloat(volumeSlider.value) < 0.15){ volumeSlider.value=0.15; remoteVideo.volume=0.15; }
            _phoneWasCamOn=camEnabled; _phoneWasMicOn=micEnabled;
            console.log("Telefon aciliyor, onceki cam", _phoneWasCamOn, "mic", _phoneWasMicOn);
            // V17.4 - Kamera aciksa VEYA kapaliysa bile telefon acilinca mikrofon OTOMATIK %15 acilsin
            // Hoparlor aciksa bile en dusuk %15
            if(localStream){
              localStream.getAudioTracks().forEach(t=>{ t.enabled=true; });
            }
            micEnabled=true; micBtn.classList.remove("offIcon"); micBtn.textContent="🎤";
            // Ses seviyesi en az %15
            if(volumeSlider){ 
              if(parseFloat(volumeSlider.value) < 0.15){ volumeSlider.value=0.15; }
              remoteVideo.volume = Math.max(0.15, parseFloat(volumeSlider.value)||0.15);
              remoteVideo.muted=false;
            }
            console.log("V17.4 Telefon acildi - mikrofon otomatik %15 acildi, hoparlor de en az %15");
        }
        isPhoneMode=!isPhoneMode;
        document.body.classList.toggle("phone-mode",isPhoneMode);
        phoneModeBtn.classList.toggle("active",isPhoneMode);
        if(isPhoneMode){
            if(localStream){ localStream.getVideoTracks().forEach(t=>t.enabled=false); }
            camEnabled=false; camBtn.classList.add("offIcon");
            phoneCallUI.style.display="flex";
            if(remoteVideo) remoteVideo.style.display="none";
            if(myVideoContainer) myVideoContainer.style.display="none";
            if(candleContainer) candleContainer.classList.remove("show");
            socket.emit("phone-mode",true);
        }else{
            // TELEFON KAPANIYOR - V17.4 MANTIGI: kamera ve mikrofon ikisi de kapansin, ben istersem acayim (duzeltildi)
            console.log("Telefon kapaniyor - V17.4 kamera ve mikrofon KAPANIYOR, istersem acacagim");
            if(localStream){
                localStream.getVideoTracks().forEach(t=>t.enabled=false);
                localStream.getAudioTracks().forEach(t=>t.enabled=false);
            }
            camEnabled=false; micEnabled=false;
            camBtn.classList.add("offIcon");
            micBtn.classList.add("offIcon"); micBtn.textContent="🔇";
            phoneCallUI.style.display="none";
            if(remoteVideo&&remoteVideo.srcObject) remoteVideo.style.display="block";
            if(myVideoContainer) myVideoContainer.style.display="block";
            socket.emit("phone-mode",false);
            // Peer trackleri guncelle - kapali trackler
            if(peer&&peer._pc&&localStream){
              const vt=localStream.getVideoTracks()[0]; const at=localStream.getAudioTracks()[0];
              (async()=>{
                if(vt){ const senders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="video"); for(const s of senders){ try{ await s.replaceTrack(vt); }catch(e){} } }
                if(at){ const aSenders=peer._pc.getSenders().filter(s=>s.track&&s.track.kind==="audio"); for(const s of aSenders){ try{ await s.replaceTrack(at); }catch(e){} } }
              })();
            }
        }
    };
}
socket.on("phone-mode",(enabled)=>{
    isPhoneMode=enabled; document.body.classList.toggle("phone-mode",enabled); phoneModeBtn.classList.toggle("active",enabled);
    if(enabled){ phoneCallUI.style.display="flex"; if(remoteVideo) remoteVideo.style.display="none"; if(candleContainer) candleContainer.classList.remove("show"); volumeSlider.value=0.15; remoteVideo.volume=0.15; if(parseFloat(volumeSlider.value) < 0.15){ volumeSlider.value=0.15; remoteVideo.volume=0.15; } }
    else{ phoneCallUI.style.display="none"; if(remoteVideo&&remoteVideo.srcObject) remoteVideo.style.display="block"; if(myVideoContainer) myVideoContainer.style.display="block"; }
});

// === V17 WHEEL PICKER ===
const wheelOverlay=document.getElementById("wheelOverlay");
const wheelHour=document.getElementById("wheelHour");
const wheelMinute=document.getElementById("wheelMinute");
const wheelOk=document.getElementById("wheelOk");
const wheelCancel=document.getElementById("wheelCancel");
const openWheelBtn=document.getElementById("openWheelBtn");

function openWheel(){ console.log('openWheel cagrildi'); 
  if(!wheelOverlay) return;
  const total=defaultExpire;
  const h=Math.floor(total/3600); const m=Math.floor((total%3600)/60);
  if(wheelHour) wheelHour.value=h; if(wheelMinute) wheelMinute.value=m;
  wheelOverlay.classList.add("show");
}
function closeWheel(){ if(wheelOverlay) wheelOverlay.classList.remove("show"); }
function wheelStep(type,dir){
  if(type==='hour'&&wheelHour){ let v=parseInt(wheelHour.value)||0; v+=dir; if(v<0) v=23; if(v>23) v=0; wheelHour.value=v; }
  if(type==='minute'&&wheelMinute){ let v=parseInt(wheelMinute.value)||0; v+=dir; if(v<0) v=59; if(v>59) v=0; wheelMinute.value=v; }
}
function setWheelQuick(sec){ if(wheelHour&&wheelMinute){ wheelHour.value=Math.floor(sec/3600); wheelMinute.value=Math.floor((sec%3600)/60); } }

if(openWheelBtn){ openWheelBtn.onclick=()=>{ openWheel(); }; }
if(defaultSelfDestructSelect){
    defaultSelfDestructSelect.onchange=()=>{
        if(defaultSelfDestructSelect.value==="custom"){ openWheel(); return; }
        let val=parseInt(defaultSelfDestructSelect.value); if(val>MAX_SEC) val=MAX_SEC; defaultExpire=val; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); console.log("Varsayilan süre:", formatTime(defaultExpire), "- sabit 4 saat mantigi aktif");
    };
}
if(wheelOk){
  wheelOk.onclick=()=>{
    const h=parseInt(wheelHour.value)||0; const m=parseInt(wheelMinute.value)||0;
    let sec=h*3600+m*60; if(sec<300) sec=300; if(sec>86400) sec=86400;
    defaultExpire=sec; localStorage.setItem("gorgor_default_expire",defaultExpire.toString());
    if(defaultSelfDestructSelect){
        let customOpt=defaultSelfDestructSelect.querySelector('option[value="custom_display"]');
        if(!customOpt){ customOpt=document.createElement("option"); customOpt.value="custom_display"; defaultSelfDestructSelect.appendChild(customOpt); }
        customOpt.textContent=formatTime(defaultExpire)+" (wheel)"; customOpt.selected=true;
    }
    closeWheel();
    console.log("Wheel ile ayarlandi:", formatTime(sec));
  };
}
if(wheelCancel){ wheelCancel.onclick=()=>closeWheel(); }
if(wheelOverlay){ wheelOverlay.addEventListener("click",(e)=>{ if(e.target===wheelOverlay) closeWheel(); }); }

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
drawCanvas.addEventListener("mouseup", ()=>drawing=false);
drawCanvas.addEventListener("touchend", ()=>drawing=false);
drawClear.onclick=()=>{ const ctx=window._drawCtx; if(ctx){ ctx.fillStyle="#000"; ctx.fillRect(0,0,window.innerWidth,window.innerHeight); } };
drawClose.onclick=()=>{ drawOverlay.style.display="none"; };
drawSend.onclick=async()=>{
    const dataUrl=drawCanvas.toDataURL("image/jpeg",0.7);
    let expire=getExpireFromSelect();
    const enc=await encryptText(dataUrl,currentPassword);
    const msgId=await addMyMediaMessage(dataUrl,"image",expire,"cizim.jpg");
    socket.emit("chat-media",{msgId,enc,expireSec:expire,mediaType:"image"});
    drawOverlay.style.display="none";
};
window.addEventListener("beforeunload",()=>{ if(peer) peer.destroy(); if(localStream) localStream.getTracks().forEach(t=>t.stop()); });
let lastScale=1, currentScale=1;
if(remoteVideo){
  remoteVideo.style.transition="transform 0.1s";
  remoteVideo.addEventListener('touchstart', e=>{
    if(e.touches.length===2&&!document.fullscreenElement&&!isPhoneMode){ e.preventDefault(); const dist=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); lastScale=dist; }
  }, {passive:false});
  remoteVideo.addEventListener('touchmove', e=>{
    if(e.touches.length===2&&!document.fullscreenElement&&!isPhoneMode){
      e.preventDefault(); const dist=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY);
      currentScale=Math.min(Math.max(1,currentScale*(dist/lastScale)),4);
      remoteVideo.style.transform=`scale(${currentScale})`; lastScale=dist;
    }
  }, {passive:false});
  remoteVideo.addEventListener('touchend', ()=>{ if(currentScale<1.1){ remoteVideo.style.transform="scale(1)"; currentScale=1; } });
}


// === V17.1 WHEEL FIX - GLOBAL YAP ===
window.wheelStep = wheelStep;
window.setWheelQuick = setWheelQuick;
window.openWheel = openWheel;
window.closeWheel = closeWheel;

document.addEventListener("DOMContentLoaded", ()=>{
  const owb = document.getElementById("openWheelBtn");
  const wo = document.getElementById("wheelOverlay");
  const wh = document.getElementById("wheelHour");
  const wm = document.getElementById("wheelMinute");
  if(owb){ owb.addEventListener("click",(e)=>{ e.stopPropagation(); console.log("Wheel butonu tiklandi"); openWheel(); }); }
  // Custom select tetik
  const dsd = document.getElementById("defaultSelfDestructSelect");
  if(dsd){ dsd.addEventListener("change", ()=>{ if(dsd.value==="custom"){ console.log("Custom secildi wheel aciliyor"); openWheel(); } }); }
  console.log("Wheel fix yuklendi - butonlar aktif");
});
console.log("V17.1 LAMBA 28px KALIN + WHEEL FIX AKTIF");

// V17.5 EXTRA SAFETY - Foto secme flaglerini 10sn sonra otomatik sifirla (kullanici iptal ederse)
setInterval(()=>{
  if(isPickingFile || _photoPicking){
    // Eger 10 saniyeden fazla acik kaldiysa ve hala picking ise, sifirla (kullanici galeriyi kapatti)
    if(window._pickingStart){
      if(Date.now() - window._pickingStart > 10000){
        console.log("Foto secme timeout - flagler sifirlaniyor");
        isPickingFile=false; _photoPicking=false; window._pickingStart=null;
      }
    } else {
      window._pickingStart = Date.now();
    }
  } else {
    window._pickingStart = null;
  }
}, 2000);
console.log("V17.5 FIX - foto cekme guvenlik iptal + kamera kapaninca mic kapanis");