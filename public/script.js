navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
})
.then(stream => {
    const video = document.getElementById("myVideo");
    video.srcObject = stream;
})
.catch(err => {
    alert("Kamera hatası: " + err.message);
    console.error(err);
});