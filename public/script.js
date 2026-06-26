console.log("SCRIPT YÜKLENDİ - v1.1.4-stabil + SURUKLE + 15MB MEDYA + TITREME + MSN DURT + YAZIYOR + OKUNDU + UCAN EMOJI");
// ESKİ - HEPSİNİ ENGELLİYORDU
// document.addEventListener('contextmenu', e => e.preventDefault());
// document.addEventListener('selectstart', e => e.preventDefault());
// document.addEventListener('dragstart', e => e.preventDefault());

// YENİ - SADECE VİDEO VE RESİM
document.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
    }
});
document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
    }
});
// selectstart'ı tamamen kaldır - input'lara yapıştırma için

// AES ŞİFRELEME
const AES_KEY = "GorgorSecretKey2024";

const socket = io({
    timeout: 60000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

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
// v1.2.0 YENİ
const nightLightBtn = document.getElementById("nightLightBtn");
const nightLight = document.getElementById("nightLight");
const youtubeBtn = document.getElementById("youtubeBtn");
const youtubeContainer = document.getElementById("youtubeContainer");
const youtubeModal = document.getElementById("youtubeModal");
const youtubeUrl = document.getElementById("youtubeUrl");
const youtubeStartBtn = document.getElementById("youtubeStartBtn");
const youtubeCancelBtn = document.getElementById("youtubeCancelBtn");
const closeYoutubeBtn = document.getElementById("closeYoutubeBtn");
const locationBtn = document.getElementById("locationBtn");

let peer = null;
let localStream = null;
let currentRoom = "";
let micEnabled = true;
let camEnabled = true;
let currentQuality = 720;
let currentFacingMode = "user";
let pingTimer = null;
let currentMediaData = null;
let typingTimer;
let isTyping = false;
let messageIdCounter = 0;
const sentMessages = new Map();
let nightLightOn = false;
let ytPlayer = null;
let ytPlayerReady = false;

micBtn.textContent = "🎤";
camBtn.textContent = "📷";

/* ------------------
   AES ŞİFRELEME
------------------- */
function encryptMessage(text) {
    return CryptoJS.AES.encrypt(text, AES_KEY).toString();
}

function decryptMessage(ciphertext) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, AES_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext;
    } catch {
        return ciphertext;
    }
}

/* ------------------
   KAMERA - YOKSA DA DEVAM ET
------------------- */
async function startCamera(height = 720, facingMode = currentFacingMode) {
    try {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.stop());
        }

        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: facingMode },
                width: {
                    ideal: height === 1080? 1920 : height === 720? 1280 : height === 480? 854 : 640
                },
                height: { ideal: height },
                frameRate: { ideal: 30, max: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        myVideo.srcObject = localStream;
        if (facingMode === "user") {
            myVideo.style.transform = "scaleX(-1)";
        } else {
            myVideo.style.transform = "scaleX(1)";
        }
        return true;
    } catch (err) {
        console.log("Kamera/Mikrofon hatası:", err);
        alert("Kamera/Mikrofon bulunamadı veya izin verilmedi.\nSadece karşı tarafı göreceksiniz.");
        return false;
    }
}

/* ------------------
   PING ÖLÇÜMÜ
------------------- */
function startPingMonitor() {
    if (pingTimer) {
        clearInterval(pingTimer);
    }
    pingTimer = setInterval(() => {
        socket.emit("ping-check", Date.now());
    }, 3000);
}

socket.on("pong-check", timestamp => {
    const ping = Date.now() - timestamp;
    if (pingValue) {
        pingValue.textContent = ping + " ms";
    }
    if (!connectionQuality) return;

    if (ping < 100) {
        connectionQuality.textContent = "Mükemmel";
        connectionQuality.className = "good";
    } else if (ping < 200) {
        connectionQuality.textContent = "İyi";
        connectionQuality.className = "medium";
    } else {
        connectionQuality.textContent = "Zayıf";
        connectionQuality.className = "bad";
    }
});

/* ------------------
   ODAYA GİR - KAMERA YOKSA DA GİRER
------------------- */
joinBtn.onclick = async () => {
    const room = roomName.value.trim();
    const password = roomPassword.value.trim();
    if (!room ||!password) {
        alert("Oda adı ve şifre gerekli");
        return;
    }

    const cameraOK = await startCamera(currentQuality);
    if (!cameraOK) {
        console.log("Kamera olmadan devam ediliyor");
    }

    currentRoom = room;
    socket.emit("join-room", { room, password });
};

socket.on("room-error", msg => {
    alert(msg);
});

socket.on("joined-room", count => {
    roomScreen.style.display = "none";
    mainScreen.style.display = "block";
    startPingMonitor();
    if (count === 2) {
        createPeer(true);
    }
});

socket.on("user-connected", () => {
    if (!peer) {
        createPeer(false);
    }
});

/* ------------------
   PEER
------------------- */
function createPeer(initiator) {
    peer = new SimplePeer({
        initiator,
        trickle: false,
        stream: localStream,
        config: {
            iceServers: [
                { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
            ]
        }
    });

    peer.on("signal", signal => {
        socket.emit("signal", { room: currentRoom, signal });
    });

    peer.on("stream", stream => {
        remoteVideo.srcObject = stream;
        remoteVideo.play().catch(() => {});
    });

    peer.on("connect", () => {
        console.log("Peer bağlandı");
    });

    peer.on("close", () => {
        console.log("Peer kapandı");
    });

    peer.on("error", err => {
        console.log("Peer hata:", err);
    });
}

socket.on("signal", signal => {
    if (!peer) {
        createPeer(false);
    }
    peer.signal(signal);
});

socket.on("user-disconnected", () => {
    remoteVideo.srcObject = null;
    if (peer) {
        peer.destroy();
        peer = null;
    }
    connectionQuality.textContent = "Bağlantı Yok";
    connectionQuality.className = "bad";
});

/* ------------------
   KALİTE DEĞİŞTİR
------------------- */
qualitySelect.onchange = async () => {
    currentQuality = parseInt(qualitySelect.value);
    socket.emit("quality-change", currentQuality);
    await startCamera(currentQuality, currentFacingMode);

    if (peer && localStream) {
        const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) {
            await sender.replaceTrack(localStream.getVideoTracks()[0]);
        }
    }
};

socket.on("quality-change", quality => {
    console.log("Karşı taraf kalite istedi:", quality);
});

/* ------------------
   AYARLAR MENÜ AÇ KAPA
------------------- */
settingsBtn.onclick = () => {
    settingsContainer.classList.toggle("menu-open");
};

/* ------------------
   TAM EKRAN
------------------- */
if (fullscreenBtn) {
    fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };
}

/* ------------------
   EKRAN PAYLAŞ
------------------- */
if (shareScreenBtn) {
    shareScreenBtn.onclick = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            if (peer) {
                const videoSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);
                }
            }

            myVideo.srcObject = screenStream;

            screenTrack.onended = async () => {
                await startCamera(currentQuality, currentFacingMode);
                if (peer && localStream) {
                    const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
                    if (sender) {
                        sender.replaceTrack(localStream.getVideoTracks()[0]);
                    }
                }
            };
        } catch (err) {
            console.log(err);
        }
    };
}

/* ------------------
   MESAJLAR - OKUNDU TIKI FİX + AES
------------------- */
function addMyMessage(text) {
    const msgId = `msg-${Date.now()}-${messageIdCounter++}`;
    const div = document.createElement("div");
    div.className = "myMessage";
    div.id = msgId;
    
    if (text.includes("maps.google.com")) {
        div.innerHTML = `BEN → <a href="${text}" target="_blank" style="color:#00ff88">Konum</a><span class="message-tick">✓</span>`;
    } else {
        div.innerHTML = `BEN → ${text}<span class="message-tick">✓</span>`;
    }
    
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    sentMessages.set(msgId, div);
    return msgId;
}
function addOtherMessage(text, msgId) {
    const div = document.createElement("div");
    div.className = "otherMessage";
    
    // Konum linki ise tıklanabilir yap
    if (text.includes("maps.google.com")) {
        div.innerHTML = `SEN → <a href="${text}" target="_blank" style="color:#ff9800;text-decoration:underline">Konumu Aç</a>`;
    } else {
        div.textContent = "SEN → " + text;
    }
    
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    
    if (msgId && chatPanel.style.display === "flex") {
        socket.emit("message-read", msgId);
    }
    
    if (chatPanel.style.display!== "flex") {
        chatToggle.classList.add("newMessageBlink");
        chatToggle.classList.add("shake");
        setTimeout(() => {
            chatToggle.classList.remove("shake");
        }, 600);
    }
}

sendBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    const msgId = addMyMessage(text);
    const encrypted = encryptMessage(text);
    socket.emit("chat-message", { text: encrypted, msgId });
    input.value = "";
    // Yazıyor'u durdur
    socket.emit('typing', false);
    isTyping = false;
};

input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

socket.on("chat-message", data => {
    const decrypted = decryptMessage(data.text);
    addOtherMessage(decrypted, data.msgId);
});

// OKUNDU BİLGİSİ GELİNCE - TEK MESAJ
socket.on("message-read", (msgId) => {
    const msgElement = sentMessages.get(msgId);
    if (msgElement) {
        const tick = msgElement.querySelector(".message-tick");
        if (tick) {
            tick.textContent = "✓✓";
            tick.classList.add("read");
        }
    }
});

// TÜMÜ OKUNDU GELİNCE - CHAT SONRADAN AÇILINCA
socket.on("messages-read-all", () => {
    sentMessages.forEach((msgElement) => {
        const tick = msgElement.querySelector(".message-tick");
        if (tick) {
            tick.textContent = "✓✓";
            tick.classList.add("read");
        }
    });
});

chatToggle.onclick = () => {
    if (chatPanel.style.display === "flex") {
        chatPanel.style.display = "none";
        document.body.classList.remove("chat-open");
        chatToggle.textContent = "💬";
    } else {
        chatPanel.style.display = "flex";
        document.body.classList.add("chat-open");
        chatToggle.classList.remove("newMessageBlink");
        chatToggle.classList.remove("shake");
        chatToggle.textContent = "✖";

        // Chat açılınca karşı tarafa tüm mesajları okudum de
        socket.emit("messages-read-all");
    }
};

/* ------------------
   YAZIYOR ANİMASYONU
------------------- */
input.addEventListener('input', () => {
    if (!isTyping && input.value.trim()) {
        socket.emit('typing', true);
        isTyping = true;
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit('typing', false);
        isTyping = false;
    }, 1000);
});

socket.on('typing', (typing) => {
    let typingDiv = document.getElementById('typingIndicator');
    if (!typingDiv) {
        typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'otherMessage';
        messages.appendChild(typingDiv);
    }

    if (typing) {
        typingDiv.textContent = 'SEN yazıyor...';
        typingDiv.style.display = 'block';
        messages.scrollTop = messages.scrollHeight;
    } else {
        typingDiv.style.display = 'none';
    }
});

/* ------------------
   MSN TİTREŞİM
------------------- */
if (nudgeBtn) {
    nudgeBtn.onclick = () => {
        socket.emit("nudge");
        // Kendini de salla
        document.body.classList.add("screen-shake");
        setTimeout(() => {
            document.body.classList.remove("screen-shake");
        }, 800);
    };
}

socket.on("nudge", () => {
    document.body.classList.add("screen-shake");
    if (navigator.vibrate) navigator.vibrate(500);
    setTimeout(() => {
        document.body.classList.remove("screen-shake");
    }, 800);

    // Chat kapalıysa butonu da titret
    if (chatPanel.style.display!== "flex") {
        chatToggle.classList.add("shake");
        setTimeout(() => chatToggle.classList.remove("shake"), 600);
    }
});

/* ------------------
   UÇAN EMOJİ
------------------- */
if (emojiBtn) {
    emojiBtn.onclick = () => {
        emojiPanel.classList.toggle("show");
    };
}const customEmoji = document.getElementById("customEmoji");
if (customEmoji) {
    customEmoji.onchange = () => {
        const emoji = customEmoji.value.trim();
        if (emoji) {
            socket.emit('fly-emoji', emoji);
            createFlyingEmoji(emoji, true);
            customEmoji.value = '';
            emojiPanel.classList.remove("show");
        }
    };
}

document.querySelectorAll('.flyEmoji').forEach(emoji => {
    emoji.onclick = () => {
        const emojiText = emoji.textContent;
        socket.emit('fly-emoji', emojiText);
        createFlyingEmoji(emojiText, true);
        emojiPanel.classList.remove("show");
    };
});

socket.on('fly-emoji', (emoji) => {
    createFlyingEmoji(emoji, false);
});

function createFlyingEmoji(emoji, isMine) {
    const flyEmoji = document.createElement('div');
    flyEmoji.className = 'flying-emoji';
    flyEmoji.textContent = emoji;

    // Pozisyon
    const x = isMine? window.innerWidth - 100 : 100;
    flyEmoji.style.left = x + 'px';
    flyEmoji.style.bottom = '100px';

    document.body.appendChild(flyEmoji);

    setTimeout(() => {
        flyEmoji.remove();
    }, 2000);
}

// Panel dışına tıklayınca kapat
document.addEventListener('click', (e) => {
    if (emojiPanel &&!emojiPanel.contains(e.target) && e.target!== emojiBtn) {
        emojiPanel.classList.remove("show");
    }
});

/* ------------------
   MİKROFON
------------------- */
micBtn.onclick = () => {
    if (!localStream) return;
    micEnabled =!micEnabled;

    localStream.getAudioTracks().forEach(track => {
        track.enabled = micEnabled;
    });

    if (peer && localStream) {
        const audioSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "audio");
        if (audioSender && audioSender.track) {
            audioSender.track.enabled = micEnabled;
        }
    }

    if (micEnabled) {
        micBtn.classList.remove("offIcon");
        micBtn.textContent = "🎤";
    } else {
        micBtn.classList.add("offIcon");
        micBtn.textContent = "🔇";
    }
};

/* ------------------
   KAMERA
------------------- */
camBtn.onclick = () => {
    if (!localStream) return;
    camEnabled =!camEnabled;

    localStream.getVideoTracks().forEach(track => {
        track.enabled = camEnabled;
    });

    if (peer && localStream) {
        const videoSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (videoSender && videoSender.track) {
            videoSender.track.enabled = camEnabled;
        }
    }

    if (camEnabled) {
        camBtn.classList.remove("offIcon");
        camBtn.textContent = "📷";
    } else {
        camBtn.classList.add("offIcon");
        camBtn.textContent = "📷";
    }
};

/* ------------------
   KAMERA ÇEVİR
------------------- */
if (switchCameraBtn) {
    switchCameraBtn.onclick = async () => {
        try {
            currentFacingMode = currentFacingMode === "user"? "environment" : "user";
            await startCamera(currentQuality, currentFacingMode);
            if (peer && localStream) {
                const videoSender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
                if (videoSender) {
                    await videoSender.replaceTrack(localStream.getVideoTracks()[0]);
                }
            }
        } catch (err) {
            console.log("Kamera çevrilemedi:", err);
            alert("Cihazda ikinci kamera bulunamadı.");
        }
    };
}

/* ------------------
   SES
------------------- */
remoteVideo.muted = false;
remoteVideo.volume = 0.1;
volumeSlider.value = 0.1;

volumeSlider.oninput = () => {
    const volume = parseFloat(volumeSlider.value);
    remoteVideo.volume = volume;
    if (volume <= 0) {
        remoteVideo.muted = true;
        soundBtn.textContent = "🔇";
    } else {
        remoteVideo.muted = false;
        soundBtn.textContent = "🔊";
    }
};

soundBtn.onclick = () => {
    if (remoteVideo.muted) {
        remoteVideo.muted = false;
        if (parseFloat(volumeSlider.value) === 0) {
            volumeSlider.value = 0.5;
            remoteVideo.volume = 0.5;
        }
        soundBtn.textContent = "🔊";
    } else {
        remoteVideo.muted = true;
        soundBtn.textContent = "🔇";
    }
};

/* ------------------
   ŞİFRE DEĞİŞTİR
------------------- */
changePasswordBtn.onclick = () => {
    const pass = prompt("Yeni şifre");
    if (!pass) return;
    socket.emit("change-password", pass);
};

socket.on("password-changed", () => {
    alert("Şifre değiştirildi");
});

/* ------------------
   KÜÇÜK KAMERAYI SÜRÜKLE + BÜYÜT KÜÇÜLT
------------------- */
let isDragging = false;
let startX, startY, startLeft, startTop;
let startDistance = 0;
let startWidth = 0;
let startHeight = 0;

myVideoContainer.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startLeft = myVideoContainer.offsetLeft;
        startTop = myVideoContainer.offsetTop;
    } else if (e.touches.length === 2) {
        isDragging = false;
        startDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        startWidth = myVideoContainer.offsetWidth;
        startHeight = myVideoContainer.offsetHeight;
    }
});

myVideoContainer.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        myVideoContainer.style.left = startLeft + dx + "px";
        myVideoContainer.style.top = startTop + dy + "px";
        myVideoContainer.style.right = "auto";
    } else if (e.touches.length === 2) {
        const distance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = distance / startDistance;
        let newWidth = startWidth * scale;
        let newHeight = startHeight * scale;

        if (newWidth < 100) newWidth = 100;
        if (newWidth > 300) newWidth = 300;
        if (newHeight < 130) newHeight = 130;
        if (newHeight > 400) newHeight = 400;

        myVideoContainer.style.width = newWidth + "px";
        myVideoContainer.style.height = newHeight + "px";
    }
});

myVideoContainer.addEventListener("touchend", () => {
    isDragging = false;
});

/* ------------------
   MEDYA GÖNDERME
------------------- */
mediaBtn.onclick = (e) => {
    e.preventDefault();
    mediaInput.click();
};

mediaInput.onchange = async () => {
    const file = mediaInput.files[0];
    if (!file) return;

    console.log("Seçilen dosya:", file.name, "Boyut:", (file.size / 1024).toFixed(2), "MB");

    const MAX_FILE_SIZE = 1024 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        alert("Dosya çok büyük! Max 1GB");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = {
            type: file.type.split('/')[0],
            data: e.target.result,
            name: file.name
        };
        console.log("Gönderiliyor... Base64 boyut:", (e.target.result.length / 1024).toFixed(2), "MB");
        socket.emit("chat-media", data);
        addMyMediaMessage(data);
    };
    reader.onerror = (err) => {
        console.log("FileReader hatası:", err);
        alert("Dosya okunamadı");
    };
    reader.readAsDataURL(file);
    mediaInput.value = "";
};

function addMyMediaMessage(data) {
    const div = document.createElement("div");
    div.className = "myMessage";
    if (data.type === "image") {
        const img = document.createElement("img");
        img.src = data.data;
        img.className = "mediaMessage";
        img.onclick = () => openPreview(data);
        img.oncontextmenu = e => e.preventDefault();
        img.draggable = false;
        div.appendChild(img);
    } else if (data.type === "video") {
        const video = document.createElement("video");
        video.src = data.data;
        video.className = "mediaMessage";
        video.controls = true;
        video.oncontextmenu = e => e.preventDefault();
        video.controlsList = "nodownload";
        div.appendChild(video);
    } else if (data.type === "audio") {
        const audio = document.createElement("audio");
        audio.src = data.data;
        audio.controls = true;
        audio.controlsList = "nodownload";
        div.appendChild(audio);
    }
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

socket.on("chat-media", (data) => {
    console.log("Medya alındı:", data.name);
    const div = document.createElement("div");
    div.className = "otherMessage";
    if (data.type === "image") {
        const img = document.createElement("img");
        img.src = data.data;
        img.className = "mediaMessage";
        img.onclick = () => openPreview(data);
        img.oncontextmenu = e => e.preventDefault();
        img.draggable = false;
        div.appendChild(img);
    } else if (data.type === "video") {
        const video = document.createElement("video");
        video.src = data.data;
        video.className = "mediaMessage";
        video.controls = true;
        video.oncontextmenu = e => e.preventDefault();
        video.controlsList = "nodownload";
        div.appendChild(video);
    } else if (data.type === "audio") {
        const audio = document.createElement("audio");
        audio.src = data.data;
        audio.controls = true;
        audio.controlsList = "nodownload";
        div.appendChild(audio);
    }
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

    // Medya gelince de titret
    if (chatPanel.style.display!== "flex") {
        chatToggle.classList.add("newMessageBlink");
        chatToggle.classList.add("shake");
        setTimeout(() => {
            chatToggle.classList.remove("shake");
        }, 600);
    }
});

function openPreview(data) {
    currentMediaData = data;
    mediaPreview.style.display = "flex";
    if (data.type === "image") {
        previewImg.src = data.data;
        previewImg.style.display = "block";
        previewVideo.style.display = "none";
    } else if (data.type === "video") {
        previewVideo.src = data.data;
        previewVideo.style.display = "block";
        previewImg.style.display = "none";
    }
}

closePreview.onclick = () => {
    mediaPreview.style.display = "none";
    previewVideo.pause();
};

downloadMediaBtn.onclick = () => {
    const pass = prompt("İndirmek için oda şifresini girin:");
    if (!pass) return;
    socket.emit("verify-download", { password: pass }, (ok) => {
        if (ok) {
            const a = document.createElement("a");
            a.href = currentMediaData.data;
            a.download = currentMediaData.name;
            a.click();
        } else {
            alert("Şifre yanlış. İndirilemez.");
        }
    });
};

/* ------------------
   v1.2.0 YENİ ÖZELLİKLER - HAZIRLIK
------------------- */



// YENİSİ ÖN KAMERA AYDINLATMA
if (nightLightBtn) {
    nightLightBtn.onclick = () => {
        nightLightOn =!nightLightOn;
        document.body.classList.toggle("night-light-active", nightLightOn);
        nightLightBtn.classList.toggle("active", nightLightOn);
    };
}

// 2. KONUM PAYLAŞ - TODO
if (locationBtn) {
    locationBtn.onclick = () => {
        if (!navigator.geolocation) {
            alert("Tarayıcı konum desteklemiyor");
            return;
        }

        // ÖNCE ONAY SOR
        if (!confirm("Konumunu paylaşmak istiyor musun?")) return;

        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lon = pos.coords.longitude.toFixed(6);
            const link = `https://maps.google.com/?q=${lat},${lon}`;

            // ÖNİZLEME GÖSTER
            if (confirm(`Konum: ${lat}, ${lon}\nGönderilsin mi?`)) {
                const msgId = addMyMessage(link);
                socket.emit("chat-message", { text: encryptMessage(link), msgId });
                socket.emit("location-share", { lat, lon });
            }
        }, () => alert("Konum alınamadı"));
    };
}

socket.on('location-share', (coords) => {
    const link = `https://maps.google.com/?q=${coords.lat},${coords.lon}`;
    const div = document.createElement("div");
    div.className = "otherMessage locationMessage";
    div.innerHTML = `SEN → <a href="${link}" target="_blank">Konumu Aç</a>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});

// YOUTUBE - TAM ÇALIŞAN VERSİYON
let ytPlayer = null;

window.onYouTubeIframeAPIReady = function() {
    ytPlayerReady = true;
};

if (youtubeStartBtn) {
    youtubeStartBtn.onclick = () => {
        const url = youtubeUrl.value.trim();
        if (!url) return;

        // Video ID çıkar
        let videoId = '';
        if (url.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else {
            alert('Geçerli YouTube linki gir');
            return;
        }

        youtubeModal.classList.remove("active");
        youtubeContainer.classList.add("active");
        youtubeBtn.classList.add("active");

        // Player oluştur
        if (ytPlayer) ytPlayer.destroy();
        ytPlayer = new YT.Player('youtubePlayer', {
            videoId: videoId,
            playerVars: { autoplay: 1, controls: 1 },
            events: {
                'onReady': () => {
                    socket.emit('youtube-sync', { action: 'play', videoId, time: 0 });
                }
            }
        });
    };
}

if (closeYoutubeBtn) {
    closeYoutubeBtn.onclick = () => {
        youtubeContainer.classList.remove("active");
        youtubeBtn.classList.remove("active");
        if (ytPlayer) {
            ytPlayer.destroy();
            ytPlayer = null;
        }
    };
}

// Karşı taraf senkron
socket.on('youtube-sync', (data) => {
    if (data.videoId &&!ytPlayer) {
        youtubeContainer.classList.add("active");
        youtubeBtn.classList.add("active");
        ytPlayer = new YT.Player('youtubePlayer', {
            videoId: data.videoId,
            playerVars: { autoplay: 1 }
        });
    }
});

/* ------------------
   SAYFA KAPANIRKEN
------------------- */
window.addEventListener("beforeunload", () => {
    if (peer) {
        peer.destroy();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
});

console.log("Script tamamen yüklendi - v1.1.5");