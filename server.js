const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 20 * 1024 * 1024,
    cors: { origin: "*" }
});
app.use(express.static("public"));
app.use(express.json({ limit: "1024mb" }));
app.use(express.urlencoded({ extended: true, limit: "1024mb" }));

// rooms[room] = { password, users: [socketId], pending: [...] , createdAt }
const rooms = {};
const HOLD_BEFORE_OPEN_MS = 24 * 60 * 60 * 1000; // açılmadan 24 saat tut
const MAX_AFTER_OPEN_SEC = 3600; // açıldıktan sonra max 1 saat

function cleanRooms(){
    const now = Date.now();
    for(const name in rooms){
        const r = rooms[name];
        r.pending = r.pending.filter(m=>{
            if(!m.opened) return (now - m.createdAt) < HOLD_BEFORE_OPEN_MS;
            return now < m.deleteAt;
        });
        // oda boş + pending yoksa ve 24 saat geçmişse sil
        if(r.users.length===0 && r.pending.length===0){
            if((now - (r.lastEmptyAt||now)) > HOLD_BEFORE_OPEN_MS){
                delete rooms[name];
            }
        }
    }
}
setInterval(cleanRooms, 30*1000);

io.on("connection",(socket)=>{
    console.log("Baglandi:",socket.id);

    socket.on("join-room",(data)=>{
        const room = data.room?.trim();
        const password = data.password?.trim();
        if(!room || !password){ socket.emit("room-error","Oda adi ve sifre gerekli"); return; }

        if(!rooms[room]){
            rooms[room] = { password, users:[], pending:[], lastEmptyAt: Date.now() };
        }else{
            if(rooms[room].password !== password){ socket.emit("room-error","Sifre yanlis"); return; }
        }
        if(rooms[room].users.length >= 2){ socket.emit("room-error","Oda dolu"); return; }

        socket.join(room);
        socket.room = room;
        rooms[room].users.push(socket.id);
        rooms[room].lastEmptyAt = null;

        socket.emit("joined-room", rooms[room].users.length);
        socket.to(room).emit("user-connected");

        // OFFLINE FIX: karsi tarafin biraktigi tum mesajlari (acilmamis + acilmis ama silinmemis) gonder
        const now = Date.now();
        const valid = rooms[room].pending.filter(m=>{
            if(!m.opened) return (now - m.createdAt) < HOLD_BEFORE_OPEN_MS;
            return now < m.deleteAt;
        });
        if(valid.length>0){
            // sadece baskasinin gonderdiklerini gonder
            const forMe = valid.filter(m=> m.from !== socket.id);
            if(forMe.length>0) socket.emit("pending-messages", forMe);
        }
    });

    socket.on("signal",(data)=>{ socket.to(data.room).emit("signal",data.signal); });

    socket.on("chat-message",(payload)=>{
        if(!socket.room || !rooms[socket.room]) return;
        const room = rooms[socket.room];
        let expireSec = Math.min(parseInt(payload.expireSec||1800), MAX_AFTER_OPEN_SEC);
        if(isNaN(expireSec)||expireSec<=0) expireSec=1800;
        const msg = { msgId:payload.msgId, enc:payload.enc, type:"text", expireSec, createdAt:Date.now(), opened:false, deleteAt:null, from:socket.id };
        room.pending.push(msg);
        socket.to(socket.room).emit("chat-message",{ msgId:msg.msgId, enc:msg.enc, expireSec:msg.expireSec, createdAt:msg.createdAt });
    });

    socket.on("chat-media",(payload)=>{
        if(!socket.room || !rooms[socket.room]) return;
        const room = rooms[socket.room];
        let expireSec = Math.min(parseInt(payload.expireSec||1800), MAX_AFTER_OPEN_SEC);
        if(isNaN(expireSec)||expireSec<=0) expireSec=1800;
        const msg = { msgId:payload.msgId, enc:payload.enc, type:payload.mediaType||"image", expireSec, createdAt:Date.now(), opened:false, deleteAt:null, from:socket.id };
        room.pending.push(msg);
        socket.to(socket.room).emit("chat-media",{ msgId:msg.msgId, enc:msg.enc, expireSec:msg.expireSec, mediaType:msg.type, createdAt:msg.createdAt });
    });

    socket.on("message-opened",({msgId})=>{
        if(!socket.room || !rooms[socket.room]) return;
        const room = rooms[socket.room];
        const msg = room.pending.find(m=> m.msgId===msgId);
        if(!msg || msg.opened) return;
        msg.opened=true;
        msg.deleteAt = Date.now() + msg.expireSec*1000;
        // gonderene de bildir ki sayaci baslasin
        io.to(socket.room).emit("message-opened",{ msgId, deleteAt:msg.deleteAt, expireSec:msg.expireSec });
        socket.emit("message-opened-ack",{ msgId, deleteAt:msg.deleteAt, expireSec:msg.expireSec });
    });

    socket.on("reduce-request",({msgId,newExpireSec})=>{
        if(!socket.room || !rooms[socket.room]) return;
        newExpireSec = Math.min(parseInt(newExpireSec),MAX_AFTER_OPEN_SEC);
        if(isNaN(newExpireSec)||newExpireSec<=0) return;
        const room = rooms[socket.room];
        const msg = room.pending.find(m=> m.msgId===msgId);
        if(!msg) return;
        if(msg.opened){
            const remaining = Math.floor((msg.deleteAt - Date.now())/1000);
            if(newExpireSec >= remaining) return;
            msg.deleteAt = Date.now()+newExpireSec*1000;
            msg.expireSec=newExpireSec;
        }else{
            if(newExpireSec >= msg.expireSec) return;
            msg.expireSec=newExpireSec;
        }
        io.to(socket.room).emit("reduce-accepted",{ msgId, newExpireSec, newDeleteAt:msg.deleteAt });
    });

    socket.on("verify-download",(data,cb)=>{ const r=socket.room; if(!r||!rooms[r]) return cb(false); cb(rooms[r].password===data.password); });
    socket.on("change-password",(np)=>{ if(socket.room&&rooms[socket.room]){ rooms[socket.room].password=np; io.to(socket.room).emit("password-changed"); } });
    socket.on("quality-change",(q)=>{ if(!socket.room) return; socket.to(socket.room).emit("quality-change",q); });
    socket.on("ping-check",(t)=>{ socket.emit("pong-check",t); });
    socket.on('nudge',()=>{ if(!socket.room) return; io.to(socket.room).emit('nudge'); });
    socket.on('typing',(t)=>{ if(!socket.room) return; socket.to(socket.room).emit('typing',t); });
    socket.on('message-read',(id)=>{ if(!socket.room) return; socket.to(socket.room).emit('message-read',id); });
    socket.on('messages-read-all',()=>{ if(!socket.room) return; socket.to(socket.room).emit('messages-read-all'); });
    socket.on('fly-emoji',(d)=>{ if(!socket.room) return; io.to(socket.room).emit('fly-emoji',d); });
    socket.on("phone-mode",(en)=>{ if(!socket.room) return; socket.to(socket.room).emit("phone-mode",en); });

    socket.on("disconnect",()=>{
        const rn = socket.room;
        if(rn && rooms[rn]){
            rooms[rn].users = rooms[rn].users.filter(id=> id!==socket.id);
            if(rooms[rn].users.length===0) rooms[rn].lastEmptyAt = Date.now();
            socket.to(rn).emit("user-disconnected");
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,"0.0.0.0",()=>{ console.log("GORGOR V12.1 FIX - 24h offline + E2E + phone - Port:",PORT); });
