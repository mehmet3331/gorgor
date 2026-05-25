const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("Bir kullanıcı bağlandı");

    socket.on("chat-message", (msg) => {
        io.emit("chat-message", msg);
    });

    socket.on("disconnect", () => {
        console.log("Kullanıcı ayrıldı");
    });
});

server.listen(3000, "0.0.0.0", () => {
    console.log("Sunucu çalışıyor: http://localhost:3000");
});