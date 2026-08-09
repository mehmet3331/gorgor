const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] }, pingInterval: 25000, pingTimeout: 60000, maxHttpBufferSize: 25e6 });

app.use(express.static(path.join(__dirname, "public")));
const rooms = {};

const REAL_ROOM = "oda1";
const FAKE_ROOMS = ["oda","oda2","oda3","oda4","oda5","oda6","oda7","oda8","oda9","oda10"];
const REAL_USERS = ["varım","yokum"];
const FAKE_USERS = ["buradayım","geldim","bekliyorum","hazırım","uyuyorum","meşgulüm","çevrimiçiyim","çevrimdışıyım","yoldayım","müsaitim","dinleniyorum","çalışıyorum"];

const MAX_AFTER_OPEN_SEC = 86400;
function normalize(str){ return (str||"").toString().trim().toLowerCase(); }
function cleanupMessage(room, msgId){ if(!rooms[room]) return; rooms[room].messages = rooms[room].messages.filter(m=> m.msgId!==msgId); }

io.on("connection", (socket)=>{
    socket.on("join-room", ({ room, password, username })=>{
        const roomNorm = normalize(room);
        const userNorm = normalize(username);
        if(roomNorm!== REAL_ROOM){
            socket.emit("room-error", `🚫 Oda aktif değil.`);
            return;
        }
        if(!REAL_USERS.includes(userNorm)){
            socket.emit("room-error", `🚫 Kullanıcı aktif değil.`);
            return;
        }
        if(!password || password.trim().length<2){ socket.emit("room-error","Şifre gerekli"); return; }
        if(!rooms[REAL_ROOM]) rooms[REAL_ROOM] = { users: {}, messages: [] };
        const roomData = rooms[REAL_ROOM];
        const existing = Object.values(roomData.users).find(u=> u.username===userNorm);
        if(existing){ socket.emit("room-error", `🚫 Bu kullanıcı zaten içeride.`); return; }
        if(Object.keys(roomData.users).length>=2){ socket.emit("room-error","🚫 Oda dolu."); return; }
        socket.join(REAL_ROOM);
        socket.room = REAL_ROOM;
        socket.username = userNorm;
        socket.realUsername = username.trim();
        roomData.users[socket.id] = { username: userNorm, real: socket.realUsername };
        const count = Object.keys(roomData.users).length;
        socket.emit("joined-room", { count, username: socket.realUsername, users: Object.values(roomData.users).map(u=>u.real) });
        const pending = roomData.messages.map(m=>({ msgId: m.msgId, enc: m.enc, expireSec: m.expireSec, type: m.type, username: m.username, realUsername: m.realUsername, opened: m.opened || false, deleteAt: m.deleteAt || null }));
        socket.emit("pending-messages", pending);
        if(count===2){ socket.to(REAL_ROOM).emit("user-connected", { username: socket.realUsername }); }
    });
    socket.on("signal", ({ signal })=>{ socket.to(REAL_ROOM).emit("signal", signal); });
    socket.on("chat-message", (data)=>{ const room = socket.room; if(!room ||!rooms[room]) return; const msg = { msgId: data.msgId, enc: data.enc, expireSec: Math.min(data.expireSec||1800, MAX_AFTER_OPEN_SEC), type: "text", username: socket.username, realUsername: socket.realUsername, opened:false, deleteAt:null, createdAt: Date.now() }; rooms[room].messages.push(msg); socket.to(room).emit("chat-message", { msgId: msg.msgId, enc: msg.enc, expireSec: msg.expireSec, username: msg.username, realUsername: msg.realUsername }); });
    socket.on("chat-media", (data)=>{ const room = socket.room; if(!room ||!rooms[room]) return; const msg = { msgId: data.msgId, enc: data.enc, expireSec: Math.min(data.expireSec||1800, MAX_AFTER_OPEN_SEC), type: data.mediaType||"image", username: socket.username, realUsername: socket.realUsername, opened:false, deleteAt:null, createdAt: Date.now() }; rooms[room].messages.push(msg); socket.to(room).emit("chat-media", { msgId: msg.msgId, enc: msg.enc, expireSec: msg.expireSec, mediaType: msg.type, username: msg.username, realUsername: msg.realUsername }); });
    socket.on("message-opened", ({ msgId })=>{ const room = socket.room; if(!room ||!rooms[room]) return; const msg = rooms[room].messages.find(m=> m.msgId===msgId); if(!msg || msg.opened) return; msg.opened = true; const expire = Math.min(msg.expireSec, MAX_AFTER_OPEN_SEC); msg.deleteAt = Date.now() + expire*1000; socket.emit("message-opened-ack", { msgId, deleteAt: msg.deleteAt, expireSec: expire }); socket.to(room).emit("message-opened", { msgId, deleteAt: msg.deleteAt, expireSec: expire }); setTimeout(()=> cleanupMessage(room, msgId), expire*1000 + 500); });
    socket.on("reduce-request", ({ msgId, newExpireSec })=>{ const room = socket.room; if(!room ||!rooms[room]) return; let sec = parseInt(newExpireSec); if(isNaN(sec)||sec<=0) return; if(sec>MAX_AFTER_OPEN_SEC) sec=MAX_AFTER_OPEN_SEC; const msg = rooms[room].messages.find(m=> m.msgId===msgId); if(!msg) return; if(msg.deleteAt){ const remaining = Math.max(0, Math.floor((msg.deleteAt - Date.now())/1000)); if(sec>=remaining) return; msg.deleteAt = Date.now() + sec*1000; msg.expireSec = sec; io.to(room).emit("reduce-accepted", { msgId, newExpireSec: sec, newDeleteAt: msg.deleteAt }); }else{ if(msg.username!==socket.username) return; msg.expireSec = sec; io.to(room).emit("reduce-accepted", { msgId, newExpireSec: sec, newDeleteAt: null }); } });
    socket.on("extend-request", ({ msgId, extraSec })=>{ const room = socket.room; if(!room ||!rooms[room]) return; const msg = rooms[room].messages.find(m=> m.msgId===msgId); if(!msg||!msg.deleteAt) return; let add = parseInt(extraSec); if(isNaN(add)||add<=0) return; if(add>MAX_AFTER_OPEN_SEC) add=MAX_AFTER_OPEN_SEC; msg.deleteAt += add*1000; io.to(room).emit("extend-accepted", { msgId, newDeleteAt: msg.deleteAt, extraSec: add }); });
    socket.on("typing", (t)=>{ const room=socket.room; if(room) socket.to(room).emit("typing", { typing: t, username: socket.realUsername }); });
    socket.on("nudge", ()=>{ const room=socket.room; if(room) socket.to(room).emit("nudge", { username: socket.realUsername }); });
    socket.on("fly-emoji", (d)=>{ const room=socket.room; if(room) socket.to(room).emit("fly-emoji", { emoji: d.emoji, effect: d.effect, username: socket.realUsername }); });
    socket.on("phone-mode", (e)=>{ const room=socket.room; if(room) socket.to(room).emit("phone-mode", e); });
    socket.on("panic", ()=>{ const room=socket.room; if(room){ if(rooms[room]) rooms[room].messages=[]; io.to(room).emit("panic"); } });
    socket.on("change-password", (p)=>{ const room=socket.room; if(room) socket.to(room).emit("password-changed"); });
    socket.on("quality-change", (q)=>{ const room=socket.room; if(room) socket.to(room).emit("quality-change", q); });
    socket.on("ping-check", (ts)=> socket.emit("pong-check", ts));
    socket.on("verify-download", ({password}, cb)=>{ cb(true); });
    socket.on("message-read", (id)=>{ const room=socket.room; if(room) socket.to(room).emit("message-read", id); });
    socket.on("messages-read-all", ()=>{ const room=socket.room; if(room) socket.to(room).emit("messages-read-all"); });
    socket.on("disconnect", ()=>{ const room = socket.room; if(room && rooms[room] && rooms[room].users[socket.id]){ delete rooms[room].users[socket.id]; socket.to(room).emit("user-disconnected", { username: socket.realUsername }); } });
});
app.get("/", (req,res)=> res.sendFile(path.join(__dirname, "public", "index.html")));
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`GORGOR V12.3 FIX - gizli - ${PORT}`));