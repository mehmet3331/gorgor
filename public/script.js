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
let defaultExpire = parseInt(localStorage.getItem("gorgor_default_expire") || "1800");
let activeTimers = new Map();
let isPhoneMode = false;
const MAX_SEC = 604800;

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
        micEnabled=true; camEnabled=true;
        micBtn.classList.remove("offIcon"); camBtn.classList.remove("offIcon");
        return true;
    }catch(err){ return false; }
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
}
socket.on("signal", signal=>{ if(!peer) createPeer(false); peer.signal(signal); });
socket.on("user-disconnected",()=>{
    if(remoteVideo){ remoteVideo.srcObject=null; remoteVideo.style.display="none"; }
    if(candleContainer &&!isPhoneMode) candleContainer.classList.add("show");
    if(peer){ peer.destroy(); peer=null; }
    if(connectionQuality){ connectionQuality.textContent="Karşı yok - Mum 🕯️"; connectionQuality.className="bad"; }
});

qualitySelect.onchange = async()=>{
    currentQuality=parseInt(qualitySelect.value);
    socket.emit("quality-change", currentQuality);
    await startCamera(currentQuality, currentFacingMode);
    if(peer && localStream){ const sender = peer._pc.getSenders().find(s=> s.track && s.track.kind==="video"); if(sender) await sender.replaceTrack(localStream.getVideoTracks()[0]); }
};
settingsBtn.onclick = ()=> settingsContainer.classList.toggle("menu-open");
if(fullscreenBtn){ fullscreenBtn.onclick = ()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }

function formatTime(sec){
    if(sec<60) return `${sec} sn`;
    const m=Math.floor(sec/60); const s=sec%60;
    if(m>=60){ const h=Math.floor(m/60); const mm=m%60; if(h>=24){ const d=Math.floor(h/24); const hh=h%24; return `${d}g ${hh}sa`; } return `${h}sa ${mm}dk`; }
    return `${m} dk ${s} sn`;
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
async function addMyMessage(text, expireSec, realName){
    const msgId=`msg-${Date.now()}-${messageIdCounter++}`;
    const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; expireSec=Math.min(expireSec,MAX_SEC);
    const linked=text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    div.innerHTML=`<span class="expireInfo">🔒 ${realName} • ⏰ ${formatTime(expireSec)}</span>BEN (${realName}) → ${linked}<span class="message-tick">✓</span><span class="countdown">⏳ Karşı açınca ${formatTime(expireSec)}</span>`;
    messages.appendChild(div); messages.scrollTop=messages.scrollHeight; sentMessages.set(msgId,div); div._expireSec=expireSec; addReduceExtendButtons(div,msgId); return msgId;
}
async function addMyMediaMessage(dataUrl, mediaType, expireSec, fileName){
    const msgId=`media-${Date.now()}-${messageIdCounter++}`;
    const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; div._expireSec=expireSec;
    div.innerHTML=`<span class="expireInfo">🔒 ${myRealUsername} • ⏰ ${formatTime(expireSec)}</span>`;
    if(mediaType==="image"){ const im=document.createElement("img"); im.src=dataUrl; im.className="mediaMessage"; im.onclick=(ev)=>{ ev.stopPropagation(); openPreview({ type:"image", data:dataUrl, name:fileName }); }; div.appendChild(im); }
    else if(mediaType==="video"){ const v=document.createElement("video"); v.src=dataUrl; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
    const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ Karşı açınca ${formatTime(expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
    messages.appendChild(div); messages.scrollTop=messages.scrollHeight; sentMessages.set(msgId,div); addReduceExtendButtons(div,msgId); return msgId;
}
async function addLockedMessage(msgId, expireSec, enc, mediaType, senderReal){
    if(document.getElementById(msgId)) return;
    const div=document.createElement("div"); div.className="otherMessage lockedMessage"; div.id=msgId; expireSec=Math.min(expireSec||defaultExpire,MAX_SEC);
    div._enc=enc; div._expireSec=expireSec; div._mediaType=mediaType||"text";
    div.innerHTML=`${senderReal}: Yeni gizli ${mediaType||"mesaj"} - ${formatTime(expireSec)}<br><button class="openBtn">🔓 Aç</button><span class="countdown" style="display:none;"></span>`;
    const btn=div.querySelector(".openBtn");
    btn.onclick=async(e)=>{
        e.stopPropagation();
        const pass = prompt(`🔐 Mesajı açmak için oda şifresini gir:`);
        if(!pass) return; if(pass!==currentPassword){ alert("❌ Şifre yanlış!"); return; }
        btn.textContent="Açılıyor...";
        const plain=await decryptText(enc,pass);
        if(!plain){ alert("Şifre çözülemedi!"); btn.textContent="🔓 Aç"; return; }
        if(div._mediaType==="text"||!div._mediaType){
            const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
            div.innerHTML=`${senderReal} → ${linked}<span class="countdown">⏳ ${formatTime(expireSec)}</span>`;
        }else{
            div.innerHTML=`${senderReal} - ⏰ ${formatTime(expireSec)}`;
            if(div._mediaType==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; img.onclick=(ev)=>{ ev.stopPropagation(); openPreview({ type:"image", data:plain, name:"gizli.jpg" }); }; div.appendChild(img); }
            else if(div._mediaType==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
            const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
        }
        div.className="otherMessage";
        socket.emit("message-opened",{ msgId });
        socket.emit("message-read",msgId);
        startSelfDestruct(div,msgId,expireSec);
        addReduceExtendButtons(div,msgId);
    };
    messages.appendChild(div); messages.scrollTop=messages.scrollHeight;
    if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink"); }
}
function getExpireFromSelect(){
    let val = perMessageTimerSelect.value;
    if(val==="default") return defaultExpire;
    if(val==="custom"){
        let custom = prompt(`Manuel süre saniye:`);
        if(!custom) return defaultExpire;
        let num = parseInt(custom.replace(/[^0-9]/g,''));
        if(isNaN(num)||num<=0) return defaultExpire;
        if(num>MAX_SEC) num=MAX_SEC;
        return num;
    }
    return Math.min(parseInt(val),MAX_SEC);
}
sendBtn.onclick=async()=>{
    const text=input.value.trim(); if(!text) return;
    let expire=getExpireFromSelect();
    const persistMode=perMessagePersistSelect?perMessagePersistSelect.value:"once";
    if(persistMode==="persist"){ defaultExpire=expire; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); }
    const msgId=await addMyMessage(text,expire,myRealUsername);
    const enc=await encryptText(text,currentPassword);
    socket.emit("chat-message",{ msgId, enc, expireSec:expire });
    input.value=""; socket.emit('typing',false); isTyping=false;
};
input.addEventListener("keydown",e=>{ if(e.key==="Enter") sendBtn.click(); });
socket.on("chat-message", data=>{ addLockedMessage(data.msgId, data.expireSec, data.enc, "text", data.realUsername||data.username); });
socket.on("chat-media", data=>{ addLockedMessage(data.msgId, data.expireSec, data.enc, data.mediaType||"image", data.realUsername||data.username); });
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
                const div=document.createElement("div"); div.className="myMessage"; div.id=m.msgId; div._expireSec=m.expireSec;
                if(m.type==="text"){
                    div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)} - Henüz açılmadı</span>BEN (${m.realUsername}) → ${plain}<span class="countdown">⏳ Karşı açınca ${formatTime(m.expireSec)}</span>`;
                }else{
                    div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(m.expireSec)} - Henüz açılmadı</span>`;
                    if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; div.appendChild(img); }
                    const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ Karşı açınca ${formatTime(m.expireSec)}`; div.appendChild(document.createElement("br")); div.appendChild(cd);
                }
                messages.appendChild(div); sentMessages.set(m.msgId,div); addReduceExtendButtons(div,m.msgId);
            }else{
                addLockedMessage(m.msgId, m.expireSec, m.enc, m.type, m.realUsername);
            }
        }
    }
    messages.scrollTop=messages.scrollHeight;
});
socket.on("message-opened",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId) || sentMessages.get(msgId); if(!div) return;
    if(sentMessages.has(msgId)){
        const cd=div.querySelector(".countdown"); if(cd) cd.textContent=`⏳ Karşı açtı! ${formatTime(expireSec)}`;
        startSelfDestruct(div,msgId,expireSec,deleteAt);
    }
});
socket.on("message-opened-ack",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId); if(!div) return;
    const cd=div.querySelector(".countdown"); if(cd){ cd.style.display="block"; cd.textContent=`⏳ ${formatTime(expireSec)}`; }
    startSelfDestruct(div,msgId,expireSec,deleteAt);
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
    if(chatPanel.style.display==="flex"){ chatPanel.style.display="none"; document.body.classList.remove("chat-open"); chatToggle.textContent="💬"; }
    else{ chatPanel.style.display="flex"; document.body.classList.add("chat-open"); chatToggle.classList.remove("newMessageBlink"); chatToggle.textContent="✖"; socket.emit("messages-read-all"); }
};
input.addEventListener('input',()=>{ if(!isTyping && input.value.trim()){ socket.emit('typing',true); isTyping=true; } clearTimeout(typingTimer); typingTimer=setTimeout(()=>{ socket.emit('typing',false); isTyping=false; },1000); });
socket.on('typing',(data)=>{
    let td=document.getElementById('typingIndicator');
    if(!td){ td=document.createElement('div'); td.id='typingIndicator'; td.className='otherMessage'; messages.appendChild(td); }
    td.textContent=data.typing?`${data.username} yazıyor...`:''; td.style.display=data.typing?'block':'none';
});
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
    // ek efekt: mesajlar da titresin
    if(messages) { messages.classList.add("shake"); setTimeout(()=> messages.classList.remove("shake"),600); }
}
socket.on("nudge",()=>{ triggerNudge(false); });

// EMOJI ANIM FIX - ESKI GUZEL VERSIYON
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
function createFlyingEmoji(emoji,effect,isMine){
    const fly=document.createElement('div');
    fly.className='flying-emoji '+(effect||'');
    fly.textContent=emoji;
    const startX = isMine? window.innerWidth-120 : 100;
    fly.style.left=startX+'px';
    fly.style.bottom='120px';
    fly.style.fontSize = (effect==='heart' || effect==='fire')? '60px' : '50px';
    document.body.appendChild(fly);

    // msn sesi gibi titresim ekle
    if(effect==='heart' || effect==='kiss' || effect==='love'){
        if(navigator.vibrate) navigator.vibrate([50]);
    }

    // efekte göre farklı uçuş
    let keyframes, opts={duration:2500, easing:'ease-out'};
    if(effect==='heart' || effect==='love' || effect==='flower'){
        // 3 tane kalbe böl - yağmur efekti
        for(let i=0;i<3;i++){
            setTimeout(()=>{
                const f2=fly.cloneNode(true);
                f2.style.left = (startX + (Math.random()*80-40))+'px';
                f2.style.animationDelay = (i*0.15)+'s';
                document.body.appendChild(f2);
                setTimeout(()=>f2.remove(),3000);
            }, i*120);
        }
    }

    fly.animate([
        { transform:'translateY(0) scale(0.5)', opacity:0 },
        { transform:'translateY(-80px) scale(1.2)', opacity:1, offset:0.2 },
        { transform:'translateY(-250px) scale(1)', opacity:0 }
    ],opts).onfinish=()=> fly.remove();

    // MSN efekt layer flash
    if(msnEffectLayer && (effect==='fire' || effect==='wow')){
        msnEffectLayer.style.background = effect==='fire'? 'radial-gradient(circle, rgba(255,100,0,0.15), transparent)' : 'radial-gradient(circle, rgba(255,255,0,0.1), transparent)';
        msnEffectLayer.style.display='block';
        setTimeout(()=> msnEffectLayer.style.display='none', 400);
    }
}
if(addCustomEmoji){
    addCustomEmoji.onclick=()=>{
        const custom=prompt("Eklemek istediğin emojiyi yapıştır:"); if(!custom) return;
        const span=document.createElement("span"); span.className="flyEmoji"; span.dataset.effect="custom"; span.textContent=custom;
        span.onclick=(ev)=>{ ev.stopPropagation(); socket.emit('fly-emoji',{ emoji:custom, effect:'custom' }); createFlyingEmoji(custom,'custom',true); emojiPanel.classList.remove("show"); };
        emojiPanel.insertBefore(span,addCustomEmoji);
        const saved=JSON.parse(localStorage.getItem("customEmojis")||"[]"); saved.push(custom); localStorage.setItem("customEmojis",JSON.stringify(saved));
    };
}
window.addEventListener("load",()=>{
    const saved=JSON.parse(localStorage.getItem("customEmojis")||"[]");
    saved.forEach(custom=>{
        const span=document.createElement("span"); span.className="flyEmoji"; span.dataset.effect="custom"; span.textContent=custom;
        span.onclick=(ev)=>{ ev.stopPropagation(); socket.emit('fly-emoji',{ emoji:custom, effect:'custom' }); createFlyingEmoji(custom,'custom',true); emojiPanel.classList.remove("show"); };
        if(emojiPanel && addCustomEmoji) emojiPanel.insertBefore(span,addCustomEmoji);
    });
});

micBtn.onclick=()=>{ if(!localStream) return; micEnabled=!micEnabled; localStream.getAudioTracks().forEach(t=> t.enabled=micEnabled); micBtn.classList.toggle("offIcon",!micEnabled); micBtn.textContent=micEnabled?"🎤":"🔇"; };
camBtn.onclick=()=>{ if(!localStream) return; camEnabled=!camEnabled; localStream.getVideoTracks().forEach(t=> t.enabled=camEnabled); camBtn.classList.toggle("offIcon",!camEnabled); };
if(switchCameraBtn){ switchCameraBtn.onclick=async()=>{ try{ currentFacingMode=currentFacingMode==="user"?"environment":"user"; await startCamera(currentQuality,currentFacingMode); if(peer && localStream){ const s=peer._pc.getSenders().find(x=> x.track && x.track.kind==="video"); if(s) await s.replaceTrack(localStream.getVideoTracks()[0]); } }catch(err){ alert("Ikinci kamera yok"); } }; }
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
locationBtn.onclick=async()=>{ attachMenu.classList.remove("show"); if(!navigator.geolocation){ alert("Konum yok"); return; } navigator.geolocation.getCurrentPosition(async pos=>{ const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; let expire=getExpireFromSelect(); const msgId=await addMyMessage("📍 Konumum: "+url,expire,myRealUsername); const enc=await encryptText("📍 Konumum: "+url,currentPassword); socket.emit("chat-message",{ msgId, enc, expireSec:expire }); }); };

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
  document.body.classList.toggle("light-bg");
  lightModeBtn.classList.toggle("active");
  // pinch zoom scale korunur
  if(currentScale>1) remoteVideo.style.transform=`scale(${currentScale})`;
  console.log("lamba:", remoteVideo.classList.contains("light-mode"));
};

if(phoneModeBtn){
    phoneModeBtn.onclick=()=>{
        if(!isPhoneMode){
            volumeSlider.value=0.1; remoteVideo.volume=0.1; remoteVideo.muted=false; soundBtn.textContent="🔊";
        }
        isPhoneMode=!isPhoneMode;
        document.body.classList.toggle("phone-mode",isPhoneMode);
        phoneModeBtn.classList.toggle("active",isPhoneMode);
        if(isPhoneMode){
            if(localStream){ localStream.getVideoTracks().forEach(t=> t.enabled=false); }
            camEnabled=false; camBtn.classList.add("offIcon");
            phoneCallUI.style.display="flex";
            if(remoteVideo) remoteVideo.style.display="none";
            if(myVideoContainer) myVideoContainer.style.display="none";
            if(candleContainer) candleContainer.classList.remove("show");
            socket.emit("phone-mode",true);
        }else{
            if(localStream){ localStream.getVideoTracks().forEach(t=> t.enabled=true); }
            camEnabled=true; camBtn.classList.remove("offIcon");
            phoneCallUI.style.display="none";
            if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block";
            if(myVideoContainer) myVideoContainer.style.display="block";
            socket.emit("phone-mode",false);
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
    defaultSelfDestructSelect.onchange=()=>{ let val=parseInt(defaultSelfDestructSelect.value); if(val>MAX_SEC) val=MAX_SEC; defaultExpire=val; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); };
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
function createFlyingEmoji(emoji,effect,isMine){
    const fly=document.createElement('div');
    fly.className='flying-emoji '+(effect||'custom');
    fly.textContent=emoji;
    const startX = isMine? window.innerWidth-100 : 60;
    fly.style.left=startX+'px'; fly.style.bottom='120px';
    fly.style.fontSize='56px';
    document.body.appendChild(fly);
    if(navigator.vibrate && (effect==='heart'||effect==='kiss'||effect==='love')) navigator.vibrate(80);

    if(effect==='heart' || effect==='love' || effect==='flower'){
        for(let i=0;i<2;i++){
            setTimeout(()=>{
                const c=fly.cloneNode(true);
                c.style.left=(startX+Math.random()*100-50)+'px';
                document.body.appendChild(c);
                setTimeout(()=>c.remove(),2800);
            }, i*150);
        }
    }
    if(msnEffectLayer && (effect==='fire'||effect==='wow')){
        msnEffectLayer.style.background = effect==='fire'? 'radial-gradient(circle, rgba(255,80,0,0.18), transparent 70%)' : 'radial-gradient(circle, rgba(255,255,100,0.15), transparent)';
        msnEffectLayer.style.display='block';
        setTimeout(()=> msnEffectLayer.style.display='none', 500);
    }
    setTimeout(()=> fly.remove(), 2600);
}
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