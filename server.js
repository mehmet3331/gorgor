const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 1024 * 1024,
    cors: {
        origin: "*"
    }
});

app.use(express.static("public"));
app.use(express.json({
    limit: "1024mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "1024mb"
}));

const rooms = {};

io.on("connection", (socket) => {
    console.log("Bağlandı:", socket.id);

    socket.on("join-room", (data) => {
        const room = data.room;
        const password = data.password;

        if (!rooms[room]) {
            rooms[room] = {
                password,
                users: []
            };
        } else {
            if (rooms[room].password!== password) {
                socket.emit("room-error", "Şifre yanlış");
                return;
            }
        }

        if (rooms[room].users.length >= 2) {
            socket.emit("room-error", "Bu oda dolu");
            return;
        }

        socket.join(room);
        socket.room = room;
        rooms[room].users.push(socket.id);

        console.log(room, "oda kullanıcı sayısı:", rooms[room].users.length);
        socket.emit("joined-room", rooms[room].users.length);
        socket.to(room).emit("user-connected");
    });

    socket.on("signal", (data) => {
        socket.to(data.room).emit("signal", data.signal);
    });

    socket.on("chat-message", (msg) => {
        if (!socket.room) return;
        socket.to(socket.room).emit("chat-message", msg);
    });

    // MEDYA GÖNDERME
    socket.on("chat-media", (data) => {
        if (!socket.room) return;
        console.log("Medya geldi, boyut:", data.data.length, "karakter");
        socket.to(socket.room).emit("chat-media", data);
    });

    // ŞİFRELİ İNDİRME
    socket.on("verify-download", (data, callback) => {
        const room = socket.room;
        if (!room ||!rooms[room]) {
            callback(false);
            return;
        }
        if (rooms[room].password === data.password) {
            callback(true);
        } else {
            callback(false);
        }
    });

    socket.on("change-password", (newPassword) => {
        if (socket.room && rooms[socket.room]) {
            rooms[socket.room].password = newPassword;
            io.to(socket.room).emit("password-changed");
        }
    });

    socket.on("quality-change", (quality) => {
        if (!socket.room) return;
        socket.to(socket.room).emit("quality-change", quality);
    });

    socket.on("ping-check", (timestamp) => {
        socket.emit("pong-check", timestamp);
    });

    // MSN Titreşim
    socket.on('nudge', () => {
        if (!socket.room) return;
        socket.to(socket.room).emit('nudge');
    });

    // Yazıyor...
    socket.on('typing', (typing) => {
        if (!socket.room) return;
        socket.to(socket.room).emit('typing', typing);
    });

    // Tek mesaj okundu
    socket.on('message-read', (msgId) => {
        if (!socket.room) return;
        socket.to(socket.room).emit('message-read', msgId);
    });

    // Chat açılınca tümü okundu
    socket.on('messages-read-all', () => {
        if (!socket.room) return;
        socket.to(socket.room).emit('messages-read-all');
    });

    // Uçan Emoji - YENİ FORMAT
    socket.on('fly-emoji', (data) => {
        if (!socket.room) return;
        socket.to(socket.room).emit('fly-emoji', data);
    });

    // KONUM PAYLAŞ - YENİ
    socket.on('share-location', (data) => {
        if (!socket.room) return;
        socket.to(socket.room).emit('share-location', data);
    });

    socket.on("disconnect", (reason) => {
        console.log("Ayrıldı:", socket.id, "Sebep:", reason);
        const room = socket.room;
        if (room && rooms[room]) {
            rooms[room].users = rooms[room].users.filter(id => id!== socket.id);
            socket.to(room).emit("user-disconnected");
            if (rooms[room].users.length === 0) {
                delete rooms[room];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Sunucu çalışıyor:", PORT);
});