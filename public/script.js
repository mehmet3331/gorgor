const socket = io();

const myVideo =
document.getElementById("myVideo");

const messages =
document.getElementById("messages");

const input =
document.getElementById("messageInput");

const sendBtn =
document.getElementById("sendBtn");

const chatToggle =
document.getElementById("chatToggle");

chatToggle.onclick = () => {

document.body.classList.toggle(
"chat-open"
);

};

navigator.mediaDevices
.getUserMedia({
video:true,
audio:true
})
.then(stream=>{

myVideo.srcObject = stream;

})
.catch(err=>{

alert(
"Kamera açılamadı: "
+ err.message
);

});

sendBtn.onclick = ()=>{

const text = input.value.trim();

if(!text) return;

socket.emit(
"chat-message",
text
);

messages.innerHTML +=
`
<div class="myMsg">
BEN -> ${text}
</div>
`;

input.value = "";

messages.scrollTop =
messages.scrollHeight;

};

socket.on(
"chat-message",
(msg)=>{

messages.innerHTML +=
`
<div class="otherMsg">
SEN -> ${msg}
</div>
`;

messages.scrollTop =
messages.scrollHeight;

}
);