console.log("V12.1 FIX - offline foto+mesaj + titreşim + emoji anim + telefon");
document.addEventListener('contextmenu', e => e.preventDefault());
const socket = io({ timeout: 60000, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 10 });

const myVideo = document.getElementById("myVideo");
const remoteVideo = document.getElementById("remoteVideo");
const roomScreen = document.getElementById("roomScreen");
const mainScreen = document.getElementById("mainScreen");
const joinBtn = document.getElementById("joinBtn");
const roomName = document.getElementById("roomName");
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

let peer = null; let localStream = null; let currentRoom = ""; let currentPassword = "";
let micEnabled = true; let camEnabled = true;
let currentQuality = 720; let currentFacingMode = "user"; let pingTimer = null; let currentMediaData = null;
let typingTimer; let isTyping = false; let messageIdCounter = 0;
const sentMessages = new Map();
let defaultExpire = parseInt(localStorage.getItem("gorgor_default_expire") || "1800");
let activeTimers = new Map();
let isPhoneMode = false;
const MAX_SEC = 3600;

async function deriveKey(password){
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return await crypto.subtle.importKey('raw', hash, { name:'AES-GCM' }, false, ['encrypt','decrypt']);
}
async function encryptText(text,password){
    const key = await deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(text));
    const combined = new Uint8Array(iv.length + ct.byteLength);
    combined.set(iv,0); combined.set(new Uint8Array(ct), iv.length);
    return btoa(String.fromCharCode(...combined));
}
async function decryptText(b64,password){
    try{
        const key = await deriveKey(password);
        const combined = Uint8Array.from(atob(b64), c=> c.charCodeAt(0));
        const iv = combined.slice(0,12); const ct = combined.slice(12);
        const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
        return new TextDecoder().decode(pt);
    }catch(e){ return "🔒 Şifre çözülemedi"; }
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
    }catch(err){ console.log("Kamera hatasi",err); return false; }
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
    const room = roomName.value.trim(); const password = roomPassword.value.trim();
    if(!room||!password){ alert("Oda adi ve sifre gerekli"); return; }
    currentPassword=password;
    await startCamera(currentQuality);
    currentRoom=room;
    socket.emit("join-room",{ room, password });
};
socket.on("room-error", msg=> alert(msg));
socket.on("joined-room", count=>{
    roomScreen.style.display="none"; mainScreen.style.display="block";
    if(candleContainer) candleContainer.classList.remove("show");
    if(remoteVideo) remoteVideo.style.display="block";
    startPingMonitor();
    if(count===2) createPeer(true);
});
socket.on("user-connected",()=>{ if(!peer) createPeer(false); });

function createPeer(initiator){
    peer = new SimplePeer({ initiator, trickle:false, stream:localStream, config:{ iceServers:[{ urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"] }] } });
    peer.on("signal", signal=> socket.emit("signal",{ room:currentRoom, signal }));
    peer.on("stream", stream=>{
        remoteVideo.srcObject=stream; remoteVideo.play().catch(()=>{});
        if(candleContainer) candleContainer.classList.remove("show");
        // telefon modundaysa gizli kalsin
        if(isPhoneMode){ remoteVideo.style.display="none"; }
        else{ remoteVideo.style.display="block"; }
    });
}
socket.on("signal", signal=>{ if(!peer) createPeer(false); peer.signal(signal); });
socket.on("user-disconnected",()=>{
    // sadece video kismini kapat, mesaji degil
    if(remoteVideo){ remoteVideo.srcObject=null; remoteVideo.style.display="none"; }
    if(candleContainer && !isPhoneMode) candleContainer.classList.add("show");
    if(peer){ peer.destroy(); peer=null; }
    if(connectionQuality){ connectionQuality.textContent="Bağlantı Yok - Mum yanıyor 🕯️"; connectionQuality.className="bad"; }
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
    if(m>=60){ const h=Math.floor(m/60); const mm=m%60; return `${h}sa ${mm}dk`; }
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
function addReduceButton(div, msgId){
    if(div.querySelector(".reduceBtn")) return;
    const btn=document.createElement("button"); btn.className="reduceBtn"; btn.textContent="⏩ Süreyi azalt";
    btn.onclick=(e)=>{
        e.stopPropagation();
        const timer=activeTimers.get(msgId);
        let remaining=3600; if(timer) remaining=Math.max(0,Math.floor((timer.expireAt-Date.now())/1000)); else remaining=div._expireSec||defaultExpire;
        const inp=prompt(`Kalan: ${formatTime(remaining)} (max 1 saat)\nYeni süre? 10=10sn, 60=1dk\nSonuna 's' eklersen kalici olur`);
        if(!inp) return; let isPersistent=inp.toLowerCase().includes('s'); let newVal=parseInt(inp.replace(/[^0-9]/g,''));
        if(isNaN(newVal)||newVal<=0){ alert("Gecersiz"); return; } if(newVal>MAX_SEC) newVal=MAX_SEC;
        if(timer && newVal>=remaining){ alert("Kalan süreden daha az yaz!"); return; }
        socket.emit("reduce-request",{ msgId, newExpireSec:newVal });
        if(isPersistent){ defaultExpire=newVal; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); }
    };
    div.appendChild(btn);
}

async function addMyMessage(text, expireSec){
    const msgId=`msg-${Date.now()}-${messageIdCounter++}`;
    const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; expireSec=Math.min(expireSec,MAX_SEC);
    const linked=text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    div.innerHTML=`<span class="expireInfo">🔒 E2E şifreli • ⏰ ${formatTime(expireSec)} sonra kaybolacak (karşı taraf açınca başlar)</span>BEN → ${linked}<span class="message-tick">✓</span><span class="countdown">⏳ Karşı taraf açınca ${formatTime(expireSec)} sayaç başlayacak</span>`;
    messages.appendChild(div); messages.scrollTop=messages.scrollHeight; sentMessages.set(msgId,div); div._expireSec=expireSec; addReduceButton(div,msgId); return msgId;
}

async function addLockedMessage(msgId, expireSec, enc, mediaType){
    if(document.getElementById(msgId)) return;
    const div=document.createElement("div"); div.className="otherMessage lockedMessage"; div.id=msgId; expireSec=Math.min(expireSec||defaultExpire,MAX_SEC);
    div._enc=enc; div._expireSec=expireSec; div._mediaType=mediaType||"text";
    const icon=mediaType && mediaType!=="text"?"📎":"💬";
    div.innerHTML=`<span class="expireInfo">🔒 E2E şifreli • Açılmadan server okuyamaz</span>${icon} Yeni gizli ${mediaType||"mesaj"} - ${formatTime(expireSec)} sonra kaybolacak<br><small style="opacity:0.7;">Açınca sayaç başlar</small><br><button class="openBtn">🔓 Aç ve sayacı başlat</button><span class="countdown" style="display:none;"></span>`;
    const btn=div.querySelector(".openBtn");
    btn.onclick=async(e)=>{
        e.stopPropagation(); // FIX: video kapanma bugi
        btn.textContent="Açılıyor...";
        const plain=await decryptText(enc,currentPassword);
        if(div._mediaType==="text"||!div._mediaType){
            const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
            div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(expireSec)} içinde kaybolacak</span>SEN → ${linked}<span class="countdown">⏳ ${formatTime(expireSec)} içinde kaybolacak</span>`;
        }else{
            div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(expireSec)} içinde kaybolacak</span>`;
            if(div._mediaType==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; img.onclick=(ev)=>{ ev.stopPropagation(); openPreview({ type:"image", data:plain, name:"gizli.jpg" }); }; div.appendChild(img); }
            else if(div._mediaType==="video"){ const v=document.createElement("video"); v.src=plain; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
            const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(expireSec)} içinde kaybolacak`; div.appendChild(document.createElement("br")); div.appendChild(cd);
        }
        div.className="otherMessage";
        // server'a açıldı de - sayacı herkes için başlat
        socket.emit("message-opened",{ msgId });
        socket.emit("message-read",msgId);
        // lokal timer'ı ack gelince başlatacağız, ama hemen de başlat
        startSelfDestruct(div,msgId,expireSec);
        addReduceButton(div,msgId);
    };
    messages.appendChild(div); messages.scrollTop=messages.scrollHeight;
    if(chatPanel.style.display!=="flex"){ chatToggle.classList.add("newMessageBlink"); }
}

sendBtn.onclick=async()=>{
    const text=input.value.trim(); if(!text) return;
    let expire=perMessageTimerSelect.value==="default"?defaultExpire:parseInt(perMessageTimerSelect.value); expire=Math.min(expire,MAX_SEC);
    const persistMode=perMessagePersistSelect?perMessagePersistSelect.value:"once";
    if(persistMode==="persist"){ defaultExpire=expire; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); }
    const msgId=await addMyMessage(text,expire);
    const enc=await encryptText(text,currentPassword);
    socket.emit("chat-message",{ msgId, enc, expireSec:expire });
    input.value=""; socket.emit('typing',false); isTyping=false;
};
input.addEventListener("keydown",e=>{ if(e.key==="Enter") sendBtn.click(); });

socket.on("chat-message", data=>{ addLockedMessage(data.msgId, data.expireSec, data.enc, "text"); });
socket.on("chat-media", data=>{ addLockedMessage(data.msgId, data.expireSec, data.enc, data.mediaType||"image"); });

socket.on("pending-messages", async(list)=>{
    for(const m of list){
        if(m.opened && m.deleteAt){
            const remaining=Math.max(1, Math.floor((m.deleteAt-Date.now())/1000)); if(remaining<=0) continue;
            const plain=await decryptText(m.enc,currentPassword);
            const div=document.createElement("div"); div.className="otherMessage"; div.id=m.msgId;
            if(m.type==="text"){
                const linked=plain.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
                div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} içinde kaybolacak (önceden açıldı)</span>SEN → ${linked}<span class="countdown">⏳ ${formatTime(remaining)} içinde kaybolacak</span>`;
            }else{
                div.innerHTML=`<span class="expireInfo">⏰ ${formatTime(remaining)} içinde kaybolacak</span>`;
                if(m.type==="image"){ const img=document.createElement("img"); img.src=plain; img.className="mediaMessage"; img.onclick=(ev)=>{ ev.stopPropagation(); openPreview({ type:"image", data:plain, name:"gizli.jpg" }); }; div.appendChild(img); }
                const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ ${formatTime(remaining)} içinde kaybolacak`; div.appendChild(document.createElement("br")); div.appendChild(cd);
            }
            messages.appendChild(div); startSelfDestruct(div,m.msgId,remaining,m.deleteAt); addReduceButton(div,m.msgId);
        }else{
            addLockedMessage(m.msgId, m.expireSec, m.enc, m.type);
        }
    }
    messages.scrollTop=messages.scrollHeight;
});

socket.on("message-opened",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId) || sentMessages.get(msgId); if(!div) return;
    if(sentMessages.has(msgId)){
        const tick=div.querySelector(".message-tick"); if(tick){ tick.textContent="✓✓"; tick.classList.add("read"); }
        const cd=div.querySelector(".countdown"); if(cd) cd.textContent=`⏳ Karşı taraf açtı! ${formatTime(expireSec)} içinde silinecek`;
        startSelfDestruct(div,msgId,expireSec,deleteAt);
    }
});
socket.on("message-opened-ack",({msgId,deleteAt,expireSec})=>{
    const div=document.getElementById(msgId); if(!div) return;
    const cd=div.querySelector(".countdown"); if(cd){ cd.style.display="block"; cd.textContent=`⏳ ${formatTime(expireSec)} içinde kaybolacak`; }
    startSelfDestruct(div,msgId,expireSec,deleteAt);
});
socket.on("reduce-accepted",({msgId,newExpireSec,newDeleteAt})=>{
    const div=document.getElementById(msgId); if(!div) return;
    const cd=div.querySelector(".countdown"); if(cd) cd.textContent=`⏳ Süre azaltıldı: ${formatTime(newExpireSec)} içinde kaybolacak`;
    if(newDeleteAt) startSelfDestruct(div,msgId,newExpireSec,newDeleteAt); else div._expireSec=newExpireSec;
});
socket.on("message-read",(msgId)=>{ const el=sentMessages.get(msgId); if(el){ const tick=el.querySelector(".message-tick"); if(tick){ tick.textContent="✓✓"; tick.classList.add("read"); } } });
socket.on("messages-read-all",()=>{ sentMessages.forEach(el=>{ const tick=el.querySelector(".message-tick"); if(tick){ tick.textContent="✓✓"; tick.classList.add("read"); } }); });

chatToggle.onclick=()=>{
    if(chatPanel.style.display==="flex"){ chatPanel.style.display="none"; document.body.classList.remove("chat-open"); chatToggle.textContent="💬"; }
    else{ chatPanel.style.display="flex"; document.body.classList.add("chat-open"); chatToggle.classList.remove("newMessageBlink"); chatToggle.textContent="✖"; socket.emit("messages-read-all"); }
};
input.addEventListener('input',()=>{ if(!isTyping && input.value.trim()){ socket.emit('typing',true); isTyping=true; } clearTimeout(typingTimer); typingTimer=setTimeout(()=>{ socket.emit('typing',false); isTyping=false; },1000); });
socket.on('typing',(typing)=>{
    let td=document.getElementById('typingIndicator');
    if(!td){ td=document.createElement('div'); td.id='typingIndicator'; td.className='otherMessage'; messages.appendChild(td); }
    td.textContent=typing?'SEN yazıyor...':''; td.style.display=typing?'block':'none'; messages.scrollTop=messages.scrollHeight;
});

// TITRESIM FIX
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
}
socket.on("nudge",()=>{ triggerNudge(false); });

// EMOJI ANIM FIX
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
    const fly=document.createElement('div'); fly.className='flying-emoji'; fly.textContent=emoji;
    const startX = isMine ? window.innerWidth-120 : 100;
    fly.style.left=startX+'px'; fly.style.bottom='120px';
    document.body.appendChild(fly);
    // animasyon
    fly.animate([
        { transform:'translateY(0) scale(0.5)', opacity:0 },
        { transform:'translateY(-80px) scale(1.2)', opacity:1, offset:0.2 },
        { transform:'translateY(-250px) scale(1)', opacity:0 }
    ],{ duration:2500, easing:'ease-out' }).onfinish=()=> fly.remove();
}

document.addEventListener('click',(e)=>{
    if(emojiPanel && !emojiPanel.contains(e.target) && e.target!==emojiBtn){ emojiPanel.classList.remove("show"); }
});
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

micBtn.onclick=()=>{
    if(!localStream) return;
    micEnabled=!micEnabled;
    localStream.getAudioTracks().forEach(t=> t.enabled=micEnabled);
    if(peer && localStream){ const s=peer._pc.getSenders().find(x=> x.track && x.track.kind==="audio"); if(s&&s.track) s.track.enabled=micEnabled; }
    micBtn.classList.toggle("offIcon",!micEnabled); micBtn.textContent=micEnabled?"🎤":"🔇";
};
camBtn.onclick=()=>{
    if(!localStream) return;
    camEnabled=!camEnabled;
    localStream.getVideoTracks().forEach(t=> t.enabled=camEnabled);
    if(peer && localStream){ const s=peer._pc.getSenders().find(x=> x.track && x.track.kind==="video"); if(s&&s.track) s.track.enabled=camEnabled; }
    camBtn.classList.toggle("offIcon",!camEnabled);
};
if(switchCameraBtn){
    switchCameraBtn.onclick=async()=>{
        try{
            currentFacingMode=currentFacingMode==="user"?"environment":"user";
            await startCamera(currentQuality,currentFacingMode);
            if(peer && localStream){ const s=peer._pc.getSenders().find(x=> x.track && x.track.kind==="video"); if(s) await s.replaceTrack(localStream.getVideoTracks()[0]); }
        }catch(err){ alert("Ikinci kamera yok"); }
    };
}
remoteVideo.muted=false; remoteVideo.volume=0.1; volumeSlider.value=0.1;
volumeSlider.oninput=()=>{ const v=parseFloat(volumeSlider.value); remoteVideo.volume=v; remoteVideo.muted=v<=0; soundBtn.textContent=v<=0?"🔇":"🔊"; };
soundBtn.onclick=()=>{
    remoteVideo.muted=!remoteVideo.muted;
    if(!remoteVideo.muted && parseFloat(volumeSlider.value)===0){ volumeSlider.value=0.5; remoteVideo.volume=0.5; }
    soundBtn.textContent=remoteVideo.muted?"🔇":"🔊";
};
changePasswordBtn.onclick=()=>{ const p=prompt("Yeni sifre"); if(!p) return; currentPassword=p; socket.emit("change-password",p); };
socket.on("password-changed",()=> alert("Sifre degistirildi"));

// DRAG
let isDragging=false,sx,sy,sl,st;
myVideoContainer.addEventListener("touchstart",(e)=>{
    if(isPhoneMode) return;
    if(e.touches.length===1){ isDragging=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; sl=myVideoContainer.offsetLeft; st=myVideoContainer.offsetTop; }
});
myVideoContainer.addEventListener("touchmove",(e)=>{
    if(isPhoneMode) return;
    if(e.touches.length===1 && isDragging){ e.preventDefault(); myVideoContainer.style.left=sl+(e.touches[0].clientX-sx)+"px"; myVideoContainer.style.top=st+(e.touches[0].clientY-sy)+"px"; myVideoContainer.style.right="auto"; }
});
myVideoContainer.addEventListener("touchend",()=> isDragging=false);

mediaBtn.onclick=(e)=>{ e.preventDefault(); mediaInput.click(); };
mediaInput.onchange=async()=>{
    const file=mediaInput.files[0]; if(!file) return;
    const MAX=8*1024*1024; if(file.size>MAX){ alert("Max 8MB"); return; }
    let expire=perMessageTimerSelect.value==="default"?defaultExpire:parseInt(perMessageTimerSelect.value); expire=Math.min(expire,MAX_SEC);
    const persistMode=perMessagePersistSelect?perMessagePersistSelect.value:"once";
    if(persistMode==="persist"){ defaultExpire=expire; localStorage.setItem("gorgor_default_expire",defaultExpire.toString()); if(defaultSelfDestructSelect) defaultSelfDestructSelect.value=defaultExpire.toString(); }
    const msgId=`media-${Date.now()}-${messageIdCounter++}`;
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
    const div=document.createElement("div"); div.className="myMessage"; div.id=msgId; div._expireSec=expire;
    div.innerHTML=`<span class="expireInfo">🔒 E2E şifreli • ⏰ ${formatTime(expire)} sonra kaybolacak (açılınca başlar)</span>`;
    if(mediaType==="image"){ const im=document.createElement("img"); im.src=dataUrl; im.className="mediaMessage"; im.onclick=(ev)=>{ ev.stopPropagation(); openPreview({ type:"image", data:dataUrl, name:file.name }); }; div.appendChild(im); }
    else if(mediaType==="video"){ const v=document.createElement("video"); v.src=dataUrl; v.className="mediaMessage"; v.controls=true; div.appendChild(v); }
    const cd=document.createElement("span"); cd.className="countdown"; cd.textContent=`⏳ Karşı taraf açınca ${formatTime(expire)} sayaç başlayacak`;
    div.appendChild(document.createElement("br")); div.appendChild(cd);
    messages.appendChild(div); messages.scrollTop=messages.scrollHeight; sentMessages.set(msgId,div); addReduceButton(div,msgId);
    socket.emit("chat-media",{ msgId, enc, expireSec:expire, mediaType }); mediaInput.value="";
};

function openPreview(data){ currentMediaData=data; mediaPreview.style.display="flex"; if(data.type==="image"){ previewImg.src=data.data; previewImg.style.display="block"; previewVideo.style.display="none"; }else if(data.type==="video"){ previewVideo.src=data.data; previewVideo.style.display="block"; previewImg.style.display="none"; } }
closePreview.onclick=()=>{ mediaPreview.style.display="none"; previewVideo.pause(); };
downloadMediaBtn.onclick=()=>{ const pass=prompt("İndirmek için oda şifresini girin:"); if(!pass) return; socket.emit("verify-download",{password:pass},(ok)=>{ if(ok){ const a=document.createElement("a"); a.href=currentMediaData.data; a.download=currentMediaData.name||"gizli"; a.click(); }else alert("Şifre yanlış."); }); };
if(lightModeBtn) lightModeBtn.onclick=()=>{ remoteVideo.classList.toggle("light-mode"); document.body.classList.toggle("light-bg"); };
if(locationBtn){ locationBtn.onclick=async()=>{ if(!navigator.geolocation){ alert("Konum yok"); return; } navigator.geolocation.getCurrentPosition(async pos=>{ const url=`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; let expire=perMessageTimerSelect.value==="default"?defaultExpire:parseInt(perMessageTimerSelect.value); expire=Math.min(expire,MAX_SEC); const msgId=await addMyMessage("📍 Konumum: "+url,expire); const enc=await encryptText("📍 Konumum: "+url,currentPassword); socket.emit("chat-message",{ msgId, enc, expireSec:expire }); }); }; }

// TELEFON MODU FIX
if(phoneModeBtn){
    phoneModeBtn.onclick=()=>{
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
    if(enabled){
        phoneCallUI.style.display="flex";
        if(remoteVideo) remoteVideo.style.display="none";
        if(candleContainer) candleContainer.classList.remove("show");
        document.body.classList.add("phone-mode");
        phoneModeBtn.classList.add("active");
        isPhoneMode=true;
    }else{
        phoneCallUI.style.display="none";
        if(remoteVideo && remoteVideo.srcObject) remoteVideo.style.display="block";
        document.body.classList.remove("phone-mode");
        phoneModeBtn.classList.remove("active");
        isPhoneMode=false;
    }
});

if(defaultSelfDestructSelect){
    defaultSelfDestructSelect.onchange=()=>{
        let val=parseInt(defaultSelfDestructSelect.value); if(val>MAX_SEC) val=MAX_SEC;
        defaultExpire=val; localStorage.setItem("gorgor_default_expire",defaultExpire.toString());
    };
}
window.addEventListener("beforeunload",()=>{ if(peer) peer.destroy(); if(localStream) localStream.getTracks().forEach(t=> t.stop()); });
