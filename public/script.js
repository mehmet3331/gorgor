const socket = io();

const myVideo =
document.getElementById("myVideo");

const remoteVideo =
document.getElementById("remoteVideo");

const chatToggle =
document.getElementById("chatToggle");

const chatPanel =
document.getElementById("chatPanel");

const input =
document.getElementById("messageInput");

const sendBtn =
document.getElementById("sendBtn");

const messages =
document.getElementById("messages");

const cameraBtn =
document.getElementById("cameraBtn");

const micBtn =
document.getElementById("micBtn");

const volumeSlider =
document.getElementById("volumeSlider");

let localStream;

remoteVideo.volume = 0;

navigator.mediaDevices
.getUserMedia({
video:true,
audio:true
})
.then(stream=>{

localStream = stream;

myVideo.srcObject =
stream;

})
.catch(err=>{

alert(
"Kamera açılamadı: "
+ err.message
);

});

chatToggle.onclick = ()=>{

if(chatPanel.style.display==="flex"){

chatPanel.style.display="none";

document.body.classList.remove(
"chat-open"
);

}else{

chatPanel.style.display="flex";

document.body.classList.add(
"chat-open"
);

}

};

cameraBtn.onclick = ()=>{

const track =
localStream.getVideoTracks()[0];

track.enabled =
!track.enabled;

cameraBtn.textContent =
track.enabled
?
"📷 Açık"
:
"📷 Kapalı";

};

micBtn.onclick = ()=>{

const track =
localStream.getAudioTracks()[0];

track.enabled =
!track.enabled;

micBtn.textContent =
track.enabled
?
"🎤 Açık"
:
"🎤 Kapalı";

};

volumeSlider.oninput = ()=>{

remoteVideo.volume =
volumeSlider.value / 100;

};

function addMyMessage(text){

const div =
document.createElement("div");

div.className =
"myMessage";

div.textContent =
"BEN -> " + text;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

function addOtherMessage(text){

const div =
document.createElement("div");

div.className =
"otherMessage";

div.textContent =
"SEN -> " + text;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

function sendMessage(){

const text =
input.value.trim();

if(!text) return;

addMyMessage(text);

socket.emit(
"chat-message",
text
);

input.value="";

}

sendBtn.onclick =
sendMessage;

input.addEventListener(
"keydown",
e=>{

if(e.key==="Enter"){

sendMessage();

}

}
);

socket.on(
"chat-message",
msg=>{

addOtherMessage(msg);

}
);

document
.querySelectorAll(".emoji")
.forEach(emoji=>{

emoji.onclick = ()=>{

input.value +=
emoji.textContent;

input.focus();

};

});