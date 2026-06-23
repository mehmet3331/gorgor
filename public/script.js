console.log("SCRIPT YÜKLENDİ - STABIL + SURUKLE + 15MB MEDYA");
// SAĞ TIK + BASILI TUT ENGELLE
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
const socket = io();

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
// YENİ EKLENENLER
const myVideoContainer = document.getElementById("myVideoContainer");
const mediaBtn = document.getElementById("mediaBtn");
const mediaInput = document.getElementById("mediaInput");
const mediaPreview = document.getElementById("mediaPreview");
const previewImg = document.getElementById("previewImg");
const previewVideo = document.getElementById("previewVideo");
const closePreview = document.getElementById("closePreview");
const downloadMediaBtn = document.getElementById("downloadMediaBtn");

let peer = null;
let localStream = null;
let currentRoom = "";
let micEnabled = true;
let camEnabled = true;
let currentQuality = 720;
let currentFacingMode = "user";
let pingTimer = null;
let currentMediaData = null; // YENİ

micBtn.textContent = "🎤";
camBtn.textContent = "📷";

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
   MESAJLAR
------------------- */
function addMyMessage(text) {
    const div = document.createElement("div");
    div.className = "myMessage";
    div.textContent = "BEN → " + text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function addOtherMessage(text) {
    const div = document.createElement("div");
    div.className = "otherMessage";
    div.textContent = "SEN → " + text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    if (chatPanel.style.display!== "flex") {
        chatToggle.classList.add("newMessageBlink");
    }
}

sendBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    socket.emit("chat-message", text);
    addMyMessage(text);
    input.value = "";
};

input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

socket.on("chat-message", msg => {
    addOtherMessage(msg);
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
        chatToggle.textContent = "✖";
    }
};

/* ------------------
   MİKROFON
------------------- */
micBtn.onclick = () => {
    if (!localStream) return;
    micEnabled =!micEnabled;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = micEnabled;
    });
    if (micEnabled) {
        micBtn.classList.remove("offIcon");
    } else {
        micBtn.classList.add("offIcon");
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
    if (camEnabled) {
        camBtn.classList.remove("offIcon");
    } else {
        camBtn.classList.add("offIcon");
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
   KÜÇÜK KAMERAYI SÜRÜKLE + BÜYÜT KÜÇÜLT - YENİ
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
   MEDYA GÖNDERME - 15MB LİMİT
------------------- */
mediaBtn.onclick = (e) => {
    e.preventDefault();
    mediaInput.click();
};

mediaInput.onchange = async () => {
    const file = mediaInput.files[0];
    if (!file) return;

    if (file.size > 15 * 1024) { // 15MB LİMİT DÜZELTİLDİ
        alert("Dosya 15MB'dan büyük olamaz");
        mediaInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = {
            type: file.type.split('/')[0],
            data: e.target.result,
            name: file.name
        };
        socket.emit("chat-media", data);
        addMyMediaMessage(data);
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
    if (chatPanel.style.display!== "flex") {
        chatToggle.classList.add("newMessageBlink");
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

console.log("Script tamamen yüklendi");