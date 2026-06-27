console.log("SCRIPT YÜKLENDİ - V9 ÖZEL EMOJİ + HARİTA + GLOW");
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

const socket = io({ timeout: 60000, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 5 });

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
const shareScreenBtn = document.getElementById("shareScreenBtn");
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

let peer = null; let localStream = null; let currentRoom = ""; let micEnabled = true; let camEnabled = true;
let currentQuality = 720; let currentFacingMode = "user"; let pingTimer = null; let currentMediaData = null;
let typingTimer; let isTyping = false; let messageIdCounter = 0; const sentMessages = new Map();

micBtn.textContent = "🎤"; camBtn.textContent = "📷";

async function startCamera(height = 720, facingMode = currentFacingMode) {
    try {
        if (localStream) { localStream.getVideoTracks().forEach(track => track.stop()); }
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode }, width: { ideal: height === 1080? 1920 : height === 720? 1280 : height === 480? 854 : 640 }, height: { ideal: height }, frameRate: { ideal: 30, max: 30 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        myVideo.srcObject = localStream;
        myVideo.style.transform = facingMode === "user"? "scaleX(-1)" : "scaleX(1)";
        return true;
    } catch (err) { console.log("Kamera/Mikrofon hatası:", err); alert("Kamera/Mikrofon bulunamadı veya izin verilmedi.\nSadece karşı tarafı göreceksiniz."); return false; }
}

function startPingMonitor() { if (pingTimer) clearInterval(pingTimer); pingTimer = setInterval(() => socket.emit("ping-check", Date.now()), 3000); }
socket.on("pong-check", timestamp => { const ping = Date.now() - timestamp; if (pingValue) pingValue.textContent = ping + " ms"; if (!connectionQuality) return; if (ping < 100) { connectionQuality.textContent = "Mükemmel"; connectionQuality.className = "good"; } else if (ping < 200) { connectionQuality.textContent = "İyi"; connectionQuality.className = "medium"; } else { connectionQuality.textContent = "Zayıf"; connectionQuality.className = "bad"; } });

joinBtn.onclick = async () => { const room = roomName.value.trim(); const password = roomPassword.value.trim(); if (!room ||!password) { alert("Oda adı ve şifre gerekli"); return; } await startCamera(currentQuality); currentRoom = room; socket.emit("join-room", { room, password }); };
socket.on("room-error", msg => alert(msg));
socket.on("joined-room", count => { roomScreen.style.display = "none"; mainScreen.style.display = "block"; startPingMonitor(); if (count === 2) createPeer(true); });
socket.on("user-connected", () => { if (!peer) createPeer(false); });

function createPeer(initiator) {
    peer = new SimplePeer({ initiator, trickle: false, stream: localStream, config: { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] } });
    peer.on("signal", signal => socket.emit("signal", { room: currentRoom, signal }));
    peer.on("stream", stream => { remoteVideo.srcObject = stream; remoteVideo.play().catch(() => {}); });
    peer.on("connect", () => console.log("Peer bağlandı")); peer.on("close", () => console.log("Peer kapandı")); peer.on("error", err => console.log("Peer hata:", err));
}
socket.on("signal", signal => { if (!peer) createPeer(false); peer.signal(signal); });
socket.on("user-disconnected", () => { remoteVideo.srcObject = null; if (peer) { peer.destroy(); peer = null; } connectionQuality.textContent = "Bağlantı Yok"; connectionQuality.className = "bad"; });

qualitySelect.onchange = async () => { currentQuality = parseInt(qualitySelect.value); socket.emit("quality-change", currentQuality); await startCamera(currentQuality, currentFacingMode); if (peer && localStream) { const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video"); if (sender) await sender.replaceTrack(localStream.getVideoTracks()[0]); } };
socket.on("quality-change", quality => console.log("Karşı taraf kalite istedi:", quality));
settingsBtn.onclick = () => settingsContainer.classList.toggle("menu-open");
if (fullscreenBtn) { fullscreenBtn.onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }; }

function addMyMessage(text) {
    const msgId = `msg-${Date.now()}-${messageIdCounter++}`;
    const div = document.createElement("div"); div.className = "myMessage"; div.id = msgId;
    const linked = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    div.innerHTML = `BEN → ${linked}<span class="message-tick">✓</span>`;
    // HARİTA ÖNİZLEME
    if (text.includes("maps.google.com") || text.includes("google.com/maps")) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/); if (urlMatch) { const mapUrl = urlMatch[1]; const coords = mapUrl.match(/q=([-\d.]+),([-\d.]+)/); if (coords) { const lat = coords[1], lon = coords[2]; const img = document.createElement("img"); img.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=15&size=400x240&markers=${lat},${lon},red`; img.className = "location-preview"; img.onclick = () => window.open(mapUrl, "_blank"); div.appendChild(document.createElement("br")); div.appendChild(img); } } }
    messages.appendChild(div); messages.scrollTop = messages.scrollHeight; sentMessages.set(msgId, div); return msgId;
}
function addOtherMessage(text, msgId) {
    const div = document.createElement("div"); div.className = "otherMessage";
    const linked = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    div.innerHTML = "SEN → " + linked;
    if (text.includes("maps.google.com") || text.includes("google.com/maps")) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/); if (urlMatch) { const mapUrl = urlMatch[1]; const coords = mapUrl.match(/q=([-\d.]+),([-\d.]+)/); if (coords) { const lat = coords[1], lon = coords[2]; const img = document.createElement("img"); img.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=15&size=400x240&markers=${lat},${lon},red`; img.className = "location-preview"; img.onclick = () => window.open(mapUrl, "_blank"); div.appendChild(document.createElement("br")); div.appendChild(img); } } }
    messages.appendChild(div); messages.scrollTop = messages.scrollHeight;
    if (msgId && chatPanel.style.display === "flex") { socket.emit("message-read", msgId); }
    if (chatPanel.style.display!== "flex") { chatToggle.classList.add("newMessageBlink", "shake"); setTimeout(() => chatToggle.classList.remove("shake"), 600); }
}

sendBtn.onclick = () => { const text = input.value.trim(); if (!text) return; const msgId = addMyMessage(text); socket.emit("chat-message", { text, msgId }); input.value = ""; socket.emit('typing', false); isTyping = false; };
input.addEventListener("keydown", e => { if (e.key === "Enter") sendBtn.click(); });
socket.on("chat-message", data => addOtherMessage(data.text, data.msgId));
socket.on("message-read", (msgId) => { const msgElement = sentMessages.get(msgId); if (msgElement) { const tick = msgElement.querySelector(".message-tick"); if (tick) { tick.textContent = "✓✓"; tick.classList.add("read"); } } });
socket.on("messages-read-all", () => { sentMessages.forEach((msgElement) => { const tick = msgElement.querySelector(".message-tick"); if (tick) { tick.textContent = "✓✓"; tick.classList.add("read"); } }); });

chatToggle.onclick = () => { if (chatPanel.style.display === "flex") { chatPanel.style.display = "none"; document.body.classList.remove("chat-open"); chatToggle.textContent = "💬"; } else { chatPanel.style.display = "flex"; document.body.classList.add("chat-open"); chatToggle.classList.remove("newMessageBlink", "shake"); chatToggle.textContent = "✖"; socket.emit("messages-read-all"); } };

input.addEventListener('input', () => { if (!isTyping && input.value.trim()) { socket.emit('typing', true); isTyping = true; } clearTimeout(typingTimer); typingTimer = setTimeout(() => { socket.emit('typing', false); isTyping = false; }, 1000); });
socket.on('typing', (typing) => { let typingDiv = document.getElementById('typingIndicator'); if (!typingDiv) { typingDiv = document.createElement('div'); typingDiv.id = 'typingIndicator'; typingDiv.className = 'otherMessage'; messages.appendChild(typingDiv); } typingDiv.textContent = typing? 'SEN yazıyor...' : ''; typingDiv.style.display = typing? 'block' : 'none'; messages.scrollTop = messages.scrollHeight; });

if (nudgeBtn) { nudgeBtn.onclick = () => { socket.emit("nudge"); document.body.classList.add("screen-shake"); setTimeout(() => document.body.classList.remove("screen-shake"), 800); }; }
socket.on("nudge", () => { document.body.classList.add("screen-shake"); if (navigator.vibrate) navigator.vibrate(500); setTimeout(() => document.body.classList.remove("screen-shake"), 800); if (chatPanel.style.display!== "flex") { chatToggle.classList.add("shake"); setTimeout(() => chatToggle.classList.remove("shake"), 600); } });

if (emojiBtn) emojiBtn.onclick = () => emojiPanel.classList.toggle("show");
document.querySelectorAll('.flyEmoji').forEach(emoji => { if (emoji.id === 'addCustomEmoji') return; emoji.onclick = () => { const emojiText = emoji.textContent; const effect = emoji.dataset.effect; socket.emit('fly-emoji', { emoji: emojiText, effect }); createFlyingEmoji(emojiText, effect, true); emojiPanel.classList.remove("show"); }; });
socket.on('fly-emoji', (data) => createFlyingEmoji(data.emoji, data.effect, false));

function createFlyingEmoji(emoji, effect, isMine) {
    const flyEmoji = document.createElement('div'); flyEmoji.className = `flying-emoji ${effect}`; if (effect === 'custom') flyEmoji.style.animation = 'fly-heart 2s forwards';
    flyEmoji.textContent = emoji; const x = isMine? window.innerWidth - 100 : 100; flyEmoji.style.left = x + 'px'; flyEmoji.style.bottom = '100px'; document.body.appendChild(flyEmoji); setTimeout(() => flyEmoji.remove(), 2500);
}
document.addEventListener('click', (e) => { if (emojiPanel &&!emojiPanel.contains(e.target) && e.target!== emojiBtn) { emojiPanel.classList.remove("show"); } });

// ÖZEL EMOJİ
if (addCustomEmoji) {
    addCustomEmoji.onclick = () => {
        const custom = prompt("Eklemek istediğin emojiyi yapıştır:");
        if (!custom) return;
        const span = document.createElement("span"); span.className = "flyEmoji"; span.dataset.effect = "custom"; span.textContent = custom;
        span.onclick = () => { socket.emit('fly-emoji', { emoji: custom, effect: 'custom' }); createFlyingEmoji(custom, 'custom', true); emojiPanel.classList.remove("show"); };
        emojiPanel.insertBefore(span, addCustomEmoji);
        const saved = JSON.parse(localStorage.getItem("customEmojis") || "[]"); saved.push(custom); localStorage.setItem("customEmojis", JSON.stringify(saved));
    };
}
window.addEventListener("load", () => {
    const saved = JSON.parse(localStorage.getItem("customEmojis") || "[]");
    saved.forEach(custom => {
        const span = document.createElement("span"); span.className = "flyEmoji"; span.dataset.effect = "custom"; span.textContent = custom;
        span.onclick = () => { socket.emit('fly-emoji', { emoji: custom, effect: 'custom' }); createFlyingEmoji(custom, 'custom', true); emojiPanel.classList.remove("show"); };
        emojiPanel.insertBefore(span, addCustomEmoji);
    });
});

micBtn.onclick = () => { if (!localStream) return; micEnabled =!micEnabled; localStream.getAudioTracks().forEach(track => track.enabled = micEnabled); if (peer && localStream) { const audioSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "audio"); if (audioSender && audioSender.track) audioSender.track.enabled = micEnabled; } micBtn.classList.toggle("offIcon",!micEnabled); micBtn.textContent = micEnabled? "🎤" : "🔇"; };
camBtn.onclick = () => { if (!localStream) return; camEnabled =!camEnabled; localStream.getVideoTracks().forEach(track => track.enabled = camEnabled); if (peer && localStream) { const videoSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video"); if (videoSender && videoSender.track) videoSender.track.enabled = camEnabled; } camBtn.classList.toggle("offIcon",!camEnabled); };
if (switchCameraBtn) { switchCameraBtn.onclick = async () => { try { currentFacingMode = currentFacingMode === "user"? "environment" : "user"; await startCamera(currentQuality, currentFacingMode); if (peer && localStream) { const videoSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video"); if (videoSender) await videoSender.replaceTrack(localStream.getVideoTracks()[0]); } } catch (err) { console.log("Kamera çevrilemedi:", err); alert("Cihazda ikinci kamera bulunamadı."); } }; }

remoteVideo.muted = false; remoteVideo.volume = 0.1; volumeSlider.value = 0.1;
volumeSlider.oninput = () => { const volume = parseFloat(volumeSlider.value); remoteVideo.volume = volume; remoteVideo.muted = volume <= 0; soundBtn.textContent = volume <= 0? "🔇" : "🔊"; };
soundBtn.onclick = () => { remoteVideo.muted =!remoteVideo.muted; if (!remoteVideo.muted && parseFloat(volumeSlider.value) === 0) { volumeSlider.value = 0.5; remoteVideo.volume = 0.5; } soundBtn.textContent = remoteVideo.muted? "🔇" : "🔊"; };
changePasswordBtn.onclick = () => { const pass = prompt("Yeni şifre"); if (!pass) return; socket.emit("change-password", pass); };
socket.on("password-changed", () => alert("Şifre değiştirildi"));

let isDragging = false, startX, startY, startLeft, startTop, startDistance = 0, startWidth = 0, startHeight = 0;
myVideoContainer.addEventListener("touchstart", (e) => { if (e.touches.length === 1) { isDragging = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; startLeft = myVideoContainer.offsetLeft; startTop = myVideoContainer.offsetTop; } else if (e.touches.length === 2) { isDragging = false; startDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); startWidth = myVideoContainer.offsetWidth; startHeight = myVideoContainer.offsetHeight; } });
myVideoContainer.addEventListener("touchmove", (e) => { e.preventDefault(); if (e.touches.length === 1 && isDragging) { myVideoContainer.style.left = startLeft + (e.touches[0].clientX - startX) + "px"; myVideoContainer.style.top = startTop + (e.touches[0].clientY - startY) + "px"; myVideoContainer.style.right = "auto"; } else if (e.touches.length === 2) { const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const scale = distance / startDistance; let newWidth = Math.min(300, Math.max(100, startWidth * scale)); let newHeight = Math.min(400, Math.max(130, startHeight * scale)); myVideoContainer.style.width = newWidth + "px"; myVideoContainer.style.height = newHeight + "px"; } });
myVideoContainer.addEventListener("touchend", () => isDragging = false);

mediaBtn.onclick = (e) => { e.preventDefault(); mediaInput.click(); };
mediaInput.onchange = async () => { const file = mediaInput.files[0]; if (!file) return; const MAX_FILE_SIZE = 1024 * 1024 * 1024; if (file.size > MAX_FILE_SIZE) { alert("Dosya çok büyük! Max 1GB"); return; } const reader = new FileReader(); reader.onload = (e) => { const data = { type: file.type.split('/')[0], data: e.target.result, name: file.name }; socket.emit("chat-media", data); addMyMediaMessage(data); }; reader.readAsDataURL(file); mediaInput.value = ""; };
function addMyMediaMessage(data) { const div = document.createElement("div"); div.className = "myMessage"; if (data.type === "image") { const img = document.createElement("img"); img.src = data.data; img.className = "mediaMessage"; img.onclick = () => openPreview(data); img.oncontextmenu = e => e.preventDefault(); img.draggable = false; div.appendChild(img); } else if (data.type === "video") { const video = document.createElement("video"); video.src = data.data; video.className = "mediaMessage"; video.controls = true; video.oncontextmenu = e => e.preventDefault(); video.controlsList = "nodownload"; div.appendChild(video); } else if (data.type === "audio") { const audio = document.createElement("audio"); audio.src = data.data; audio.controls = true; audio.controlsList = "nodownload"; div.appendChild(audio); } messages.appendChild(div); messages.scrollTop = messages.scrollHeight; }
socket.on("chat-media", (data) => { const div = document.createElement("div"); div.className = "otherMessage"; if (data.type === "image") { const img = document.createElement("img"); img.src = data.data; img.className = "mediaMessage"; img.onclick = () => openPreview(data); img.oncontextmenu = e => e.preventDefault(); img.draggable = false; div.appendChild(img); } else if (data.type === "video") { const video = document.createElement("video"); video.src = data.data; video.className = "mediaMessage"; video.controls = true; video.oncontextmenu = e => e.preventDefault(); video.controlsList = "nodownload"; div.appendChild(video); } else if (data.type === "audio") { const audio = document.createElement("audio"); audio.src = data.data; audio.controls = true; audio.controlsList = "nodownload"; div.appendChild(audio); } messages.appendChild(div); messages.scrollTop = messages.scrollHeight; if (chatPanel.style.display!== "flex") { chatToggle.classList.add("newMessageBlink", "shake"); setTimeout(() => chatToggle.classList.remove("shake"), 600); } });

function openPreview(data) { currentMediaData = data; mediaPreview.style.display = "flex"; if (data.type === "image") { previewImg.src = data.data; previewImg.style.display = "block"; previewVideo.style.display = "none"; } else if (data.type === "video") { previewVideo.src = data.data; previewVideo.style.display = "block"; previewImg.style.display = "none"; } }
closePreview.onclick = () => { mediaPreview.style.display = "none"; previewVideo.pause(); };
downloadMediaBtn.onclick = () => { const pass = prompt("İndirmek için oda şifresini girin:"); if (!pass) return; socket.emit("verify-download", { password: pass }, (ok) => { if (ok) { const a = document.createElement("a"); a.href = currentMediaData.data; a.download = currentMediaData.name; a.click(); } else alert("Şifre yanlış. İndirilemez."); }); };

if (lightModeBtn) lightModeBtn.onclick = () => { remoteVideo.classList.toggle("light-mode"); document.body.classList.toggle("light-bg"); };
if (locationBtn) { locationBtn.onclick = () => { if (!navigator.geolocation) { alert("Konum desteklenmiyor"); return; } navigator.geolocation.getCurrentPosition(pos => { const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; const msgId = addMyMessage("📍 Konumum: " + url); socket.emit("chat-message", { text: "📍 Konumum: " + url, msgId }); }); }; }

window.addEventListener("beforeunload", () => { if (peer) peer.destroy(); if (localStream) localStream.getTracks().forEach(track => track.stop()); });
console.log("Script tamamen yüklendi");