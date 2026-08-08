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
const phoneModeBtn = document.getElementById("phoneModeBtn");
const phoneModeOverlay = document.getElementById("phoneModeOverlay");
const phoneModeExitBtn = document.getElementById("phoneModeExitBtn");
const disconnectOverlay = document.getElementById("disconnectOverlay");
const expirySelect = document.getElementById("expirySelect");
const expiryOnce = document.getElementById("expiryOnce");

let peer = null; let localStream = null; let currentRoom = ""; let micEnabled = true; let camEnabled = true;
let currentQuality = 720; let currentFacingMode = "user"; let pingTimer = null; let currentMediaData = null;
let typingTimer; let isTyping = false; let messageIdCounter = 0; const sentMessages = new Map();
const openMessageTimers = new Map();
const MAX_OPEN_MS = 60 * 60 * 1000;
let roomKey = null;
let roomPasswordLocal = "";
const clientId = localStorage.getItem("gorgorClientId") || (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("gorgorClientId", id);
    return id;
})();
let isPhoneMode = false;

micBtn.textContent = "🎤"; camBtn.textContent = "📷";
if (expirySelect) {
    const savedExpiry = localStorage.getItem("gorgorExpiryMinutes");
    if (savedExpiry && ["1","5","10","30","60"].includes(savedExpiry)) expirySelect.value = savedExpiry;
    expirySelect.addEventListener("change", () => {
        if (!expiryOnce || !expiryOnce.checked) localStorage.setItem("gorgorExpiryMinutes", expirySelect.value);
    });
}

async function startCamera(height = 720, facingMode = currentFacingMode) {
    try {
        const width = height === 1080 ? 1920 : height === 720 ? 1280 : height === 480 ? 854 : 640;
        if (localStream && localStream.getAudioTracks().length) {
            const oldAudioTracks = localStream.getAudioTracks();
            const newVideoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: facingMode }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: 30, max: 30 } },
                audio: false
            });
            localStream.getVideoTracks().forEach(track => track.stop());
            localStream = new MediaStream([...oldAudioTracks, ...newVideoStream.getVideoTracks()]);
        } else {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: facingMode }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: 30, max: 30 } },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
        }
        myVideo.srcObject = localStream;
        myVideo.style.transform = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";
        if (peer && localStream) {
            const videoSender = peer._pc.getSenders().find(sender => sender.track && sender.track.kind === "video");
            const audioSender = peer._pc.getSenders().find(sender => sender.track && sender.track.kind === "audio");
            const videoTrack = localStream.getVideoTracks()[0];
            const audioTrack = localStream.getAudioTracks()[0];
            if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack);
            if (audioSender && audioTrack && audioSender.track !== audioTrack) {
                await audioSender.replaceTrack(audioTrack);
                audioTrack.enabled = micEnabled;
            }
        }
        return true;
    } catch (err) {
        console.log("Kamera/Mikrofon hatası:", err);
        alert("Kamera/Mikrofon bulunamadı veya izin verilmedi.\nSadece karşı tarafı göreceksiniz.");
        return false;
    }
}

function startPingMonitor() { if (pingTimer) clearInterval(pingTimer); pingTimer = setInterval(() => socket.emit("ping-check", Date.now()), 3000); }
socket.on("pong-check", timestamp => { const ping = Date.now() - timestamp; if (pingValue) pingValue.textContent = ping + " ms"; if (!connectionQuality) return; if (ping < 100) { connectionQuality.textContent = "Mükemmel"; connectionQuality.className = "good"; } else if (ping < 200) { connectionQuality.textContent = "İyi"; connectionQuality.className = "medium"; } else { connectionQuality.textContent = "Zayıf"; connectionQuality.className = "bad"; } });


// GORGOR E2EE — AES-256-GCM anahtarı yalnızca tarayıcıda türetilir.
// Server ham oda şifresini veya AES anahtarını görmez.
function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(binary);
}
function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
async function sha256(text) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return bytesToBase64(new Uint8Array(hash));
}
async function deriveRoomKey(password, room) {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const salt = new TextEncoder().encode("GORGOR-E2EE-V1:" + room);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
        material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}
async function encryptPayload(payload) {
    if (!roomKey) throw new Error("Şifreleme anahtarı hazır değil.");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, roomKey, plain);
    return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
}
async function decryptPayload(packet, keyOverride = roomKey) {
    if (!keyOverride) throw new Error("Şifreleme anahtarı hazır değil.");
    const iv = base64ToBytes(packet.iv);
    const encrypted = base64ToBytes(packet.data);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyOverride, encrypted);
    return JSON.parse(new TextDecoder().decode(plain));
}
function getExpiryMs() {
    return Math.min(60 * 60 * 1000, Math.max(60 * 1000, parseInt(expirySelect?.value || "30", 10) * 60 * 1000));
}
function removeMessageElement(msgId) {
    const el = document.getElementById(msgId);
    if (el) el.remove();
    sentMessages.delete(msgId);
    if (openMessageTimers.has(msgId)) { clearTimeout(openMessageTimers.get(msgId)); openMessageTimers.delete(msgId); }
}
function startLocalExpiry(msgId, ms) {
    const safeMs = Math.min(60 * 60 * 1000, Math.max(1000, ms));
    if (openMessageTimers.has(msgId)) clearTimeout(openMessageTimers.get(msgId));
    openMessageTimers.set(msgId, setTimeout(() => removeMessageElement(msgId), safeMs));
}
function formatRemaining(ms) {
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    return seconds < 60 ? `${seconds} sn` : `${Math.ceil(seconds / 60)} dk`;
}
async function sendSecurePayload(payload) {
    const packet = await encryptPayload(payload);
    packet.senderClientId = clientId;
    addLockedSecureMessage(packet, true);
    socket.emit("secure-message", packet);
}
async function openSecurePacket(packet, container) {
    const pass = prompt("Mesajı açmak için oda şifresini girin:");
    if (pass === null) return;
    try {
        const candidateKey = await deriveRoomKey(pass, currentRoom);
        const payload = await decryptPayload(packet, candidateKey);

        const defaultMin = parseInt(expirySelect?.value || "30", 10);
        let selectedMin = defaultMin;
        const answer = prompt("Bu içerik kaç dakika sonra silinsin? (1 / 5 / 10 / 30 / 60)", String(defaultMin));
        if (answer === null) return;
        selectedMin = parseInt(answer, 10);
        if (![1,5,10,30,60].includes(selectedMin)) {
            alert("Geçerli süre: 1, 5, 10, 30 veya 60 dakika.");
            return;
        }
        if (!expiryOnce?.checked) localStorage.setItem("gorgorExpiryMinutes", String(selectedMin));
        if (expirySelect) expirySelect.value = String(selectedMin);

        renderSecurePayload(payload, container, selectedMin);
        if (expiryOnce) expiryOnce.checked = false;
    } catch (err) {
        console.error(err);
        alert("Şifre yanlış veya mesaj bozulmuş.");
    }
}
function renderSecurePayload(payload, container, selectedMin) {
    container.innerHTML = "";
    container.className = "otherMessage secure-opened";
    if (payload.kind === "text") {
        const linked = payload.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
        container.innerHTML = "SEN → " + linked;
    } else if (payload.type === "image") {
        const img = document.createElement("img"); img.src = payload.data; img.className = "mediaMessage"; img.draggable = false;
        img.onclick = () => openPreview(payload); img.oncontextmenu = e => e.preventDefault(); container.appendChild(img);
    } else if (payload.type === "video") {
        const video = document.createElement("video"); video.src = payload.data; video.className = "mediaMessage";
        video.controls = true; video.controlsList = "nodownload"; video.oncontextmenu = e => e.preventDefault(); container.appendChild(video);
    } else if (payload.type === "audio") {
        const audio = document.createElement("audio"); audio.src = payload.data; audio.controls = true; audio.controlsList = "nodownload"; container.appendChild(audio);
    }

    const controls = document.createElement("div");
    controls.className = "expiryControls";
    const ms = Math.min(60 * 60 * 1000, selectedMin * 60 * 1000);
    const startedAt = Date.now();
    const tick = setInterval(() => {
        const left = ms - (Date.now() - startedAt);
        controls.textContent = left <= 0 ? "🗑️ Silindi" : `⏳ ${formatRemaining(left)} içinde silinecek`;
        if (left <= 0) clearInterval(tick);
    }, 1000);
    controls.textContent = `⏳ ${formatRemaining(ms)} içinde silinecek`;
    container.appendChild(controls);

    startLocalExpiry(payload.id, ms);
    socket.emit("secure-opened", { id: payload.id, expiryMs: ms });
}
function addLockedSecureMessage(packet, isMine = false) {
    const div = document.createElement("div");
    div.className = isMine ? "myMessage secure-locked" : "otherMessage secure-locked";
    div.id = packet.id;
    div.innerHTML = `<div>🔐 ${isMine ? "Gönderildi — karşı taraf açınca süre başlayacak." : "🔒 Şifreli mesaj / medya"}</div>`;
    if (!isMine) {
        const btn = document.createElement("button"); btn.textContent = "🔑 Şifre ile aç";
        btn.onclick = () => openSecurePacket(packet, div); div.appendChild(btn);
    } else {
        const status = document.createElement("span"); status.className = "secureStatus"; status.textContent = "✓ gönderildi"; div.appendChild(status);
        sentMessages.set(packet.id, div);
    }
    messages.appendChild(div); messages.scrollTop = messages.scrollHeight;
}

joinBtn.onclick = async () => {
    const room = roomName.value.trim(); const password = roomPassword.value.trim();
    if (!room || !password) { alert("Oda adı ve şifre gerekli"); return; }
    if (!(await startCamera(currentQuality))) return;
    currentRoom = room; roomPasswordLocal = password; roomKey = await deriveRoomKey(password, room);
    const passwordHash = await sha256(password);
    socket.emit("join-room", { room, passwordHash, clientId });
};
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


qualitySelect.onchange = async () => {
    currentQuality = parseInt(qualitySelect.value);
    socket.emit("quality-change", currentQuality);
    await startCamera(currentQuality, currentFacingMode);
};
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

sendBtn.onclick = async () => {
    const text = input.value.trim(); if (!text) return;
    const msgId = `msg-${Date.now()}-${messageIdCounter++}`;
    try { await sendSecurePayload({ id: msgId, kind: "text", text, createdAt: Date.now() }); input.value = ""; socket.emit('typing', false); isTyping = false; }
    catch (err) { console.error(err); alert("Mesaj güvenli şekilde şifrelenemedi."); }
};
input.addEventListener("keydown", e => { if (e.key === "Enter") sendBtn.click(); });
socket.on("chat-message", data => addOtherMessage(data.text, data.msgId));

socket.on("secure-message", packet => addLockedSecureMessage(packet, false));
socket.on("secure-message-queued", packet => addLockedSecureMessage(packet, false));
socket.on("secure-opened", data => {
    const el = document.getElementById(data.id);
    if (!el) return;
    const status = el.querySelector(".secureStatus");
    if (status) status.textContent = `✓✓ açıldı — ${Math.ceil(Math.min(60*60*1000, data.expiryMs) / 60000)} dk`;
    startLocalExpiry(data.id, Math.min(60*60*1000, data.expiryMs));
});
socket.on("secure-expired", id => removeMessageElement(id));

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
if (switchCameraBtn) {
    switchCameraBtn.onclick = async () => {
        try { currentFacingMode = currentFacingMode === "user" ? "environment" : "user"; await startCamera(currentQuality, currentFacingMode); }
        catch (err) { console.log("Kamera çevrilemedi:", err); alert("Cihazda ikinci kamera bulunamadı."); }
    };
}
remoteVideo.muted = false; remoteVideo.volume = 0.1; volumeSlider.value = 0.1;
volumeSlider.oninput = () => { const volume = parseFloat(volumeSlider.value); remoteVideo.volume = volume; remoteVideo.muted = volume <= 0; soundBtn.textContent = volume <= 0? "🔇" : "🔊"; };
soundBtn.onclick = () => { remoteVideo.muted =!remoteVideo.muted; if (!remoteVideo.muted && parseFloat(volumeSlider.value) === 0) { volumeSlider.value = 0.5; remoteVideo.volume = 0.5; } soundBtn.textContent = remoteVideo.muted? "🔇" : "🔊"; };
changePasswordBtn.onclick = async () => {
    const pass = prompt("Yeni şifre");
    if (!pass) return;
    try {
        const encrypted = await encryptPayload({ kind: "password-change", password: pass });
        const passwordHash = await sha256(pass);
        socket.emit("change-password", { passwordHash, encrypted });
        roomPasswordLocal = pass;
        roomKey = await deriveRoomKey(pass, currentRoom);
    } catch (err) {
        console.error(err);
        alert("Şifre değiştirilemedi.");
    }
};
socket.on("password-changed", async (data) => {
    if (data && data.encrypted) {
        try {
            const payload = await decryptPayload(data.encrypted);
            if (payload.kind === "password-change") {
                roomPasswordLocal = payload.password;
                roomKey = await deriveRoomKey(payload.password, currentRoom);
            }
        } catch (err) {
            console.error("Yeni oda şifresi güvenli şekilde alınamadı:", err);
        }
    }
    alert("Şifre değiştirildi");
});
socket.on("password-changed", () => alert("Şifre değiştirildi"));

let isDragging = false, startX, startY, startLeft, startTop, startDistance = 0, startWidth = 0, startHeight = 0;
myVideoContainer.addEventListener("touchstart", (e) => { if (e.touches.length === 1) { isDragging = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; startLeft = myVideoContainer.offsetLeft; startTop = myVideoContainer.offsetTop; } else if (e.touches.length === 2) { isDragging = false; startDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); startWidth = myVideoContainer.offsetWidth; startHeight = myVideoContainer.offsetHeight; } });
myVideoContainer.addEventListener("touchmove", (e) => { e.preventDefault(); if (e.touches.length === 1 && isDragging) { myVideoContainer.style.left = startLeft + (e.touches[0].clientX - startX) + "px"; myVideoContainer.style.top = startTop + (e.touches[0].clientY - startY) + "px"; myVideoContainer.style.right = "auto"; } else if (e.touches.length === 2) { const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const scale = distance / startDistance; let newWidth = Math.min(300, Math.max(100, startWidth * scale)); let newHeight = Math.min(400, Math.max(130, startHeight * scale)); myVideoContainer.style.width = newWidth + "px"; myVideoContainer.style.height = newHeight + "px"; } });
myVideoContainer.addEventListener("touchend", () => isDragging = false);

mediaBtn.onclick = (e) => { e.preventDefault(); mediaInput.click(); };
mediaInput.onchange = async () => {
    const file = mediaInput.files[0]; if (!file) return;
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) { alert("Dosya çok büyük! Max 5MB (fotoğrafı küçült)"); return; }
    try {
        if (file.type.startsWith('image/')) {
            const img = await createImageBitmap(file); const canvas = document.createElement('canvas'); const max = 1280;
            let w = img.width, h = img.height; if (w > max) { h = h * max / w; w = max; }
            canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.7));
            const reader = new FileReader();
            reader.onload = async e => {
                const id = `media-${Date.now()}-${messageIdCounter++}`;
                await sendSecurePayload({ id, kind: "media", type: "image", data: e.target.result, name: file.name, createdAt: Date.now() });
            };
            reader.readAsDataURL(blob);
        } else {
            const reader = new FileReader();
            reader.onload = async e => {
                const id = `media-${Date.now()}-${messageIdCounter++}`;
                await sendSecurePayload({ id, kind: "media", type: file.type.split('/')[0], data: e.target.result, name: file.name, createdAt: Date.now() });
            };
            reader.readAsDataURL(file);
        }
    } catch (err) { console.error(err); alert("Medya güvenli şekilde şifrelenemedi."); }
    mediaInput.value = "";
};
function addMyMediaMessage(data) { const div = document.createElement("div"); div.className = "myMessage"; if (data.type === "image") { const img = document.createElement("img"); img.src = data.data; img.className = "mediaMessage"; img.onclick = () => openPreview(data); img.oncontextmenu = e => e.preventDefault(); img.draggable = false; div.appendChild(img); } else if (data.type === "video") { const video = document.createElement("video"); video.src = data.data; video.className = "mediaMessage"; video.controls = true; video.oncontextmenu = e => e.preventDefault(); video.controlsList = "nodownload"; div.appendChild(video); } else if (data.type === "audio") { const audio = document.createElement("audio"); audio.src = data.data; audio.controls = true; audio.controlsList = "nodownload"; div.appendChild(audio); } messages.appendChild(div); messages.scrollTop = messages.scrollHeight; }
socket.on("chat-media", (data) => { const div = document.createElement("div"); div.className = "otherMessage"; if (data.type === "image") { const img = document.createElement("img"); img.src = data.data; img.className = "mediaMessage"; img.onclick = () => openPreview(data); img.oncontextmenu = e => e.preventDefault(); img.draggable = false; div.appendChild(img); } else if (data.type === "video") { const video = document.createElement("video"); video.src = data.data; video.className = "mediaMessage"; video.controls = true; video.oncontextmenu = e => e.preventDefault(); video.controlsList = "nodownload"; div.appendChild(video); } else if (data.type === "audio") { const audio = document.createElement("audio"); audio.src = data.data; audio.controls = true; audio.controlsList = "nodownload"; div.appendChild(audio); } messages.appendChild(div); messages.scrollTop = messages.scrollHeight; if (chatPanel.style.display!== "flex") { chatToggle.classList.add("newMessageBlink", "shake"); setTimeout(() => chatToggle.classList.remove("shake"), 600); } });

function openPreview(data) { currentMediaData = data; mediaPreview.style.display = "flex"; if (data.type === "image") { previewImg.src = data.data; previewImg.style.display = "block"; previewVideo.style.display = "none"; } else if (data.type === "video") { previewVideo.src = data.data; previewVideo.style.display = "block"; previewImg.style.display = "none"; } }
closePreview.onclick = () => { mediaPreview.style.display = "none"; previewVideo.pause(); };
downloadMediaBtn.onclick = async () => {
    const pass = prompt("İndirmek için oda şifresini girin:");
    if (!pass || !currentMediaData) return;
    const passwordHash = await sha256(pass);
    socket.emit("verify-download", { passwordHash }, (ok) => {
        if (ok) { const a = document.createElement("a"); a.href = currentMediaData.data; a.download = currentMediaData.name; a.click(); }
        else alert("Şifre yanlış. İndirilemez.");
    });
};

if (lightModeBtn) lightModeBtn.onclick = () => { remoteVideo.classList.toggle("light-mode"); document.body.classList.toggle("light-bg"); };
if (locationBtn) { locationBtn.onclick = () => { if (!navigator.geolocation) { alert("Konum desteklenmiyor"); return; } navigator.geolocation.getCurrentPosition(pos => { const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`; const msgId = addMyMessage("📍 Konumum: " + url); socket.emit("chat-message", { text: "📍 Konumum: " + url, msgId }); }); }; }


function setPhoneMode(enabled) {
    isPhoneMode = enabled; document.body.classList.toggle("phone-mode", enabled);
    if (phoneModeOverlay) phoneModeOverlay.style.display = enabled ? "flex" : "none";
    if (enabled) {
        if (localStream) localStream.getVideoTracks().forEach(track => track.enabled = false);
        if (camBtn) camBtn.classList.add("offIcon");
    } else {
        if (localStream && camEnabled) localStream.getVideoTracks().forEach(track => track.enabled = true);
        if (camBtn) camBtn.classList.toggle("offIcon", !camEnabled);
    }
}
if (phoneModeBtn) phoneModeBtn.onclick = () => setPhoneMode(!isPhoneMode);
if (phoneModeExitBtn) phoneModeExitBtn.onclick = () => setPhoneMode(false);
socket.on("user-disconnected", () => {
    remoteVideo.srcObject = null; if (peer) { peer.destroy(); peer = null; }
    connectionQuality.textContent = "Bağlantı Yok"; connectionQuality.className = "bad";
    if (disconnectOverlay) disconnectOverlay.style.display = "flex";
});
socket.on("user-connected", () => { if (disconnectOverlay) disconnectOverlay.style.display = "none"; });

window.addEventListener("beforeunload", () => { if (peer) peer.destroy(); if (localStream) localStream.getTracks().forEach(track => track.stop()); });
console.log("Script tamamen yüklendi");
