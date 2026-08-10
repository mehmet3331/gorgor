const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 20 * 1024 * 1024,
  cors: { origin: "*" }
});

app.use(express.static('public'));

const PERSIST_FILE = path.join(__dirname, 'persist.json');
const RAM_LIMIT = 15 * 60; // 15dk = 900sn üstü diske

let rooms = {}; // room -> { users, messages: Map (RAM only short) }
let persistedMessages = []; // diskte duranlar

// Diskten yükle
try {
  if (fs.existsSync(PERSIST_FILE)) {
    persistedMessages = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf8'));
    console.log(`Diskten ${persistedMessages.length} kalıcı mesaj yüklendi`);
  }
} catch(e){ persistedMessages = []; }

function saveDisk(){
  try{ fs.writeFileSync(PERSIST_FILE, JSON.stringify(persistedMessages, null, 2)); }catch(e){ console.log("disk save fail", e); }
}

// Her 60sn temizle
setInterval(()=>{
  const now = Date.now();
  const before = persistedMessages.length;
  persistedMessages = persistedMessages.filter(m => m.expireAt > now);
  if(persistedMessages.length!== before){ saveDisk(); console.log(`Temizlendi ${before-persistedMessages.length} mesaj`); }

  // RAM'dekileri de temizle
  for(let room in rooms){
    for(let [msgId, msg] of rooms[room].messages){
      if(msg.deleteAt && msg.deleteAt < now) rooms[room].messages.delete(msgId);
    }
  }
}, 60000);

io.on('connection', socket => {
  socket.on('join-room', ({ room, password, username }) => {
    if(!rooms[room]) rooms[room] = { password, users: {}, messages: new Map() };
    if(rooms[room].password!== password){ socket.emit('room-error','Şifre yanlış'); return; }
    if(Object.keys(rooms[room].users).length >= 2){ socket.emit('room-error','Oda dolu'); return; }

    socket.join(room);
    socket.room = room;
    socket.username = username.toLowerCase();
    socket.realUsername = username;
    rooms[room].users[socket.id] = { username: socket.username, realUsername: username };

    const count = Object.keys(rooms[room].users).length;
    socket.emit('joined-room',{ username, count });

    // RAM + Disk mesajları birleştir gönder
    const now = Date.now();
    const ramMsgs = Array.from(rooms[room].messages.values()).filter(m=>!m.deleteAt || m.deleteAt > now);
    const diskMsgs = persistedMessages.filter(m=> m.room === room && m.expireAt > now).map(m=>({
      msgId: m.msgId, enc: m.enc, expireSec: Math.floor((m.expireAt-now)/1000),
      type: m.type, username: m.username, realUsername: m.realUsername,
      opened: m.opened, deleteAt: m.deleteAt
    }));
    socket.emit('pending-messages', [...ramMsgs,...diskMsgs]);

    if(count===2) socket.to(room).emit('user-connected',{ username });
  });

  socket.on('chat-message', data => {
    const room = socket.room; if(!room||!rooms[room]) return;
    const msg = { msgId: data.msgId, enc: data.enc, expireSec: data.expireSec, type:'text', username:socket.username, realUsername:socket.realUsername, opened:false };
    if(data.expireSec <= RAM_LIMIT){
      rooms[room].messages.set(data.msgId, msg);
    }else{
      persistedMessages.push({...msg, room, expireAt: Date.now()+data.expireSec*1000, opened:false, deleteAt:null });
      saveDisk();
    }
    socket.to(room).emit('chat-message',{...data, username:socket.username, realUsername:socket.realUsername });
  });

  socket.on('chat-media', data => {
    const room = socket.room; if(!room||!rooms[room]) return;
    const msg = { msgId: data.msgId, enc: data.enc, expireSec: data.expireSec, type:data.mediaType, username:socket.username, realUsername:socket.realUsername, opened:false };
    if(data.expireSec <= RAM_LIMIT){
      rooms[room].messages.set(data.msgId, msg);
    }else{
      persistedMessages.push({...msg, room, expireAt: Date.now()+data.expireSec*1000, opened:false, deleteAt:null });
      saveDisk();
    }
    socket.to(room).emit('chat-media',{...data, username:socket.username, realUsername:socket.realUsername });
  });

  socket.on('message-opened', ({msgId})=>{
    const room=socket.room; if(!room) return;
    let target = rooms[room]?.messages.get(msgId);
    let diskIdx = persistedMessages.findIndex(m=> m.msgId===msgId && m.room===room);
    let expireSec = target?.expireSec || (diskIdx>=0? Math.floor((persistedMessages[diskIdx].expireAt-Date.now())/1000):0);
    const deleteAt = Date.now()+expireSec*1000;
    if(target){ target.opened=true; target.deleteAt=deleteAt; }
    if(diskIdx>=0){ persistedMessages[diskIdx].opened=true; persistedMessages[diskIdx].deleteAt=deleteAt; saveDisk(); }
    io.to(room).emit('message-opened',{msgId, deleteAt, expireSec});
    socket.emit('message-opened-ack',{msgId, deleteAt, expireSec});
  });

  socket.on('reduce-request', ({msgId,newExpireSec})=>{
    const room=socket.room; if(!room) return;
    const newDeleteAt = Date.now()+newExpireSec*1000;
    let t = rooms[room]?.messages.get(msgId);
    if(t){ t.expireSec=newExpireSec; t.deleteAt=newDeleteAt; }
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    if(idx>=0){ persistedMessages[idx].expireAt=newDeleteAt; persistedMessages[idx].deleteAt=newDeleteAt; persistedMessages[idx].expireSec=newExpireSec; saveDisk(); }
    io.to(room).emit('reduce-accepted',{msgId,newExpireSec,newDeleteAt});
  });

  socket.on('extend-request', ({msgId,extraSec})=>{
    const room=socket.room; if(!room) return;
    let t = rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    let newDeleteAt = Date.now()+extraSec*1000;
    if(t && t.deleteAt) newDeleteAt = t.deleteAt + extraSec*1000;
    if(idx>=0 && persistedMessages[idx].deleteAt) newDeleteAt = persistedMessages[idx].deleteAt + extraSec*1000;
    else if(idx>=0) newDeleteAt = persistedMessages[idx].expireAt + extraSec*1000;

    if(t){ t.deleteAt=newDeleteAt; }
    if(idx>=0){ persistedMessages[idx].deleteAt=newDeleteAt; persistedMessages[idx].expireAt=newDeleteAt; saveDisk(); }
    io.to(room).emit('extend-accepted',{msgId,newDeleteAt,extraSec});
  });

  // diğer socket olayları (signal, typing, nudge, fly-emoji, phone-mode, panic aynı kalacak)
  socket.on('signal', d=> socket.to(d.room).emit('signal', d.signal));
  socket.on('typing', b=>{ if(socket.room) socket.to(socket.room).emit('typing',{username:socket.realUsername, typing:b}); });
  socket.on('nudge', ()=>{ if(socket.room) socket.to(socket.room).emit('nudge'); });
  socket.on('fly-emoji', d=>{ if(socket.room) socket.to(socket.room).emit('fly-emoji', d); });
  socket.on('phone-mode', b=>{ if(socket.room) socket.to(socket.room).emit('phone-mode', b); });
  socket.on('panic', ()=>{ if(socket.room){ const r=rooms[socket.room]; if(r){ r.messages.clear(); persistedMessages=persistedMessages.filter(m=>m.room!==socket.room); saveDisk(); } io.to(socket.room).emit('panic'); }});
  socket.on('ping-check', t=> socket.emit('pong-check', t));
  socket.on('disconnect', ()=>{
    const room=socket.room; if(room&&rooms[room]){ delete rooms[room].users[socket.id]; if(Object.keys(rooms[room].users).length===0){ /* oda boş ama mesajlar kalsın */ } socket.to(room).emit('user-disconnected'); }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Gorgor ${PORT} - Hibrit RAM+Disk aktif`));