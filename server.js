const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server =
http.createServer(app);

const io =
new Server(server);

app.use(
express.static("public")
);

io.on(
"connection",
(socket)=>{

console.log(
"Kullanıcı bağlandı"
);

socket.on(
"chat-message",
(msg)=>{

socket.broadcast.emit(
"chat-message",
msg
);

});

socket.on(
"disconnect",
()=>{

console.log(
"Kullanıcı ayrıldı"
);

});

}
);

const PORT =
process.env.PORT || 3000;

server.listen(
PORT,
"0.0.0.0",
()=>{

console.log(
"Sunucu çalışıyor: " + PORT
);

}
);