const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(express.static("public"));

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

                socket.emit(
                    "room-error",
                    "Şifre yanlış"
                );

                return;
            }
        }

        if (rooms[room].users.length >= 2) {

            socket.emit(
                "room-error",
                "Bu oda dolu"
            );

            return;
        }

        socket.join(room);

        socket.room = room;

        rooms[room].users.push(
            socket.id
        );

        console.log(
            room,
            "oda kullanıcı sayısı:",
            rooms[room].users.length
        );

        socket.emit(
            "joined-room",
            rooms[room].users.length
        );

        socket.to(room).emit(
            "user-connected"
        );

    });

    socket.on("signal", (data) => {

        socket
         .to(data.room)
         .emit(
                "signal",
                data.signal
            );

    });

    socket.on("chat-message", (msg) => {

        if (!socket.room)
            return;

        socket
         .to(socket.room)
         .emit(
                "chat-message",
                msg
            );

    });

    // MEDYA GÖNDERME - YENİ
    socket.on("chat-media", (data) => {
        if (!socket.room) return;
        socket.to(socket.room).emit("chat-media", data);
    });

    // ŞİFRELİ İNDİRME - YENİ
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

        if (
            socket.room &&
            rooms[socket.room]
        ) {

            rooms[socket.room].password =
                newPassword;

            io.to(socket.room).emit(
                "password-changed"
            );

        }

    });

    /* ------------------
       KALİTE DEĞİŞİMİ
    ------------------- */

    socket.on(
        "quality-change",
        (quality) => {

            if (!socket.room)
                return;

            socket
             .to(socket.room)
             .emit(
                    "quality-change",
                    quality
                );

        }
    );

    /* ------------------
       PING TESTİ
    ------------------- */

    socket.on(
        "ping-check",
        (timestamp) => {

            socket.emit(
                "pong-check",
                timestamp
            );

        }
    );

    socket.on("disconnect", () => {

        const room =
            socket.room;

        if (
            room &&
            rooms[room]
        ) {

            rooms[room].users =
                rooms[room].users.filter(
                    id => id!== socket.id
                );

            socket
             .to(room)
             .emit(
                    "user-disconnected"
                );

            if (
                rooms[room].users.length === 0
            ) {

                delete rooms[room];

            }

        }

        console.log(
            "Ayrıldı:",
            socket.id
        );

    });

});

const PORT =
    process.env.PORT || 3000;

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "Sunucu çalışıyor:",
            PORT
        );

    }
);