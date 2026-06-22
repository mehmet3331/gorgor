console.log("SCRIPT YÜKLENDİ - ESKI STABIL");

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

let peer = null;
let localStream = null;
let currentRoom = "";
let micEnabled = true;
let camEnabled = true;
let currentQuality = 720;
let currentFacingMode = "user";
let pingTimer = null;

micBtn.textContent = "🎤";
camBtn.textContent = "📷";

/* ------------------
   KAMERA - SADECE ODAYA GİRİNCE ÇALIŞIR
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
        alert("Kamera/Mikrofon açılamadı: " + err.message + "\nİzinleri kontrol et.");
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
   ODAYA GİR
------------------- */
joinBtn.onclick = async () => {
    const room = roomName.value.trim();
    const password = roomPassword.value.trim();
    if (!room ||!password) {
        alert("Oda adı ve şifre gerekli");
        return;
    }

    // Kamerayı şimdi aç, yoksa da devam et
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

    if (peer) {
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
   AYARLAR MENÜ AÇ KAPA - ESKİ MANTIK
------------------- */
settingsBtn.onclick = () => {

    const menu = document.getElementById("settingsMenu");

    if (menu.style.display === "flex") {

        menu.style.display = "none";

    } else {

        menu.style.display = "flex";

    }

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
                if (peer) {
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

    micEnabled = !micEnabled;

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

    camEnabled = !camEnabled;

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
            if (peer) {
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