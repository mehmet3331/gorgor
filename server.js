const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 20 * 1024 * 1024, cors: { origin: "*" } });
app.use(express.static('public'));
let persistedMessages = [];
let mongoCollection = null;
let saveTimeout = null;
async function initMongo(){
  if(!process.env.MONGODB_URI){ console.log("MONGODB_URI YOK!"); return; }
  try{
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    mongoCollection = client.db('gorgor').collection('messages');
    persistedMessages = await mongoCollection.find({}).toArray();
    console.log(`MONGODB BAGLI - ${persistedMessages.length} mesaj`);
  }catch(e){ console.error("Mongo hatasi", e); }
}
initMongo();
function debouncedSave(){ if(saveTimeout) clearTimeout(saveTimeout); saveTimeout=setTimeout(saveDisk,1000); }
async function saveDisk(){ if(!mongoCollection) return; try{ await mongoCollection.deleteMany({}); if(persistedMessages.length) await mongoCollection.insertMany(persistedMessages); }catch(e){ console.error(e.message); } }
setInterval(async()=>{ const now=Date.now(); const before=persistedMessages.length; persistedMessages=persistedMessages.filter(m=>{ const del=m.deleteAt||m.expireAt||0; return del>now; }); if(before!==persistedMessages.length){ console.log(`AUTO DELETE ${before-persistedMessages.length} mesaj - suresi doldu, okunmasa bile silindi`); await saveDisk(); } },60000);

function normalize(s){ return (s||"").toString().trim().toLowerCase(); }

let rooms={};
// rooms[room] = { users: {socketId: username}, lastSeen: {normalizedUsername: timestamp}, messages: Map }

io.on('connection', socket=>{
  socket.on('ping-check', ts=>{ socket.emit('pong-check', ts); });
  socket.on('status-change', ({user,status})=>{
    const room = socket.room;
    if(room && rooms[room]){
      const norm = normalize(user);
      if(status==='yokum'){
        rooms[room].lastSeen[norm]=Date.now();
      } else {
        delete rooms[room].lastSeen[norm];
      }
    }
    io.emit('user-status',{user,status,online:status==='varım', lastSeen: Date.now()});
    if(room && rooms[room]){
      socket.to(room).emit('user-status',{user,status,online:status==='varım', lastSeen: rooms[room].lastSeen[normalize(user)]||Date.now()});
    }
  });
  socket.on('typing', b=>{ if(!socket.room) return; if(typeof b==='object'&&b.from){ socket.to(socket.room).emit('typing',{username:b.from,typing:true}); } else if(typeof b==='object'){ socket.to(socket.room).emit('typing',b); } else { socket.to(socket.room).emit('typing',{username:socket.realUsername,typing:b}); } });
  socket.on('message-read', data=>{ if(!socket.room) return; const msgId=typeof data==='string'?data:data.msgId; const reader=data.reader||socket.realUsername; io.to(socket.room).emit('message-read',{msgId,reader,time:Date.now()}); });
  socket.on('join-room', data=>{
    const room=data.room; const requestedUsername=data.username;
    if(!rooms[room]) rooms[room]={users:{}, lastSeen:{}, messages:new Map()};
    // === V18.21 FIX - oda dolu bug düzeltme ===
    // 1) ölü socketleri temizle
    for(const sid of Object.keys(rooms[room].users)){
      if(!io.sockets.sockets.get(sid)){
        console.log(`Temizleniyor ölü socket ${sid} odadan ${room}`);
        delete rooms[room].users[sid];
      }
    }
    // 2) aynı kullanıcı adı varsa eski kaydı sil (yeniden girişe izin ver)
    const normReq = normalize(requestedUsername);
    for(const [sid, uname] of Object.entries(rooms[room].users)){
      if(normalize(uname)===normReq){
        console.log(`Aynı isimle yeniden giriş: ${uname} eski ${sid} siliniyor`);
        try{ io.sockets.sockets.get(sid)?.leave(room); }catch(e){}
        delete rooms[room].users[sid];
      }
    }
    const currentCount=Object.keys(rooms[room].users).length;
    if(currentCount>=2){ socket.emit('room-error','Oda dolu - sadece 2 kişi (V18.21)'); return; }
    socket.room=room; socket.username=requestedUsername; socket.realUsername=data.realUsername||requestedUsername;
    rooms[room].users[socket.id]=socket.username;
    // online olunca lastSeen sil
    delete rooms[room].lastSeen[normReq];
    socket.join(room);
    const count=Object.keys(rooms[room].users).length;
    socket.emit('joined-room',{username:data.username,count, lastSeen: rooms[room].lastSeen});
    socket.to(room).emit('user-connected',{username:data.username,realUsername:socket.realUsername});
    const now2=Date.now(); const pending=persistedMessages.filter(m=>m.room===room && (m.deleteAt||m.expireAt||0)>now2);
    if(pending.length) socket.emit('pending-messages',pending);
    console.log(`ODA: ${room} - ${data.username} girdi ${count} - lastSeen:`, rooms[room].lastSeen);
  });
  socket.on('chat-message', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return; const now=Date.now();
    const msg={msgId:data.msgId,enc:data.enc,expireSec:data.expireSec,type:'text',username:socket.username,realUsername:socket.realUsername,opened:false,room,expireAt:now+data.expireSec*1000,deleteAt:now+data.expireSec*1000};
    rooms[room].messages.set(data.msgId,msg); persistedMessages.push(msg); debouncedSave();
    socket.to(room).emit('chat-message',{...data,username:socket.username,realUsername:socket.realUsername});
  });
  socket.on('chat-media', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return; const now=Date.now();
    const msg={msgId:data.msgId,enc:data.enc,expireSec:data.expireSec,type:data.mediaType,username:socket.username,realUsername:socket.realUsername,opened:false,room,expireAt:now+data.expireSec*1000,deleteAt:now+data.expireSec*1000};
    rooms[room].messages.set(data.msgId,msg); persistedMessages.push(msg); debouncedSave();
    socket.to(room).emit('chat-media',{...data,username:socket.username,realUsername:socket.realUsername});
  });
  socket.on('message-opened', async ({msgId})=>{
    const room=socket.room; if(!room) return;
    const t=rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId&&m.room===room);
    const existingDeleteAt=t?.deleteAt||(idx>=0?persistedMessages[idx].deleteAt:null)||(t?.expireAt||Date.now()+14400*1000);
    const baseSec=t?.expireSec||(idx>=0?persistedMessages[idx].expireSec:14400);
    if(t) t.opened=true; if(idx>=0){ persistedMessages[idx].opened=true; debouncedSave(); }
    io.to(room).emit('message-opened',{msgId,deleteAt:existingDeleteAt,expireSec:baseSec,openedAt:Date.now()});
  });
  socket.on('disconnect', ()=>{
    const room=socket.room;
    if(room&&rooms[room]){
      const norm = normalize(socket.realUsername||socket.username);
      rooms[room].lastSeen[norm]=Date.now();
      delete rooms[room].users[socket.id];
      socket.to(room).emit('user-disconnected');
      io.emit('user-status',{user:socket.realUsername,status:'yokum',online:false, lastSeen: Date.now()});
      socket.to(room).emit('user-status',{user:socket.realUsername,status:'yokum',online:false, lastSeen: rooms[room].lastSeen[norm]});
      console.log(`DISCONNECT ${room} ${socket.realUsername} lastSeen kaydedildi`);
      if(Object.keys(rooms[room].users).length===0){
        // oda boş kaldı, lastSeen'i 1 saat daha tut, sonra sil
        setTimeout(()=>{ if(rooms[room] && Object.keys(rooms[room].users).length===0){ console.log(`Oda ${room} boş, temizleniyor`); /* delete rooms[room]; */ } }, 1000*60*60);
      }
    }
  });
  socket.on('signal', d=> socket.to(d.room).emit('signal', d.signal));
  socket.on('nudge', ()=>{ if(socket.room) socket.to(socket.room).emit('nudge'); });
  socket.on('fly-emoji', d=>{ if(socket.room) socket.to(socket.room).emit('fly-emoji', d); });
  socket.on('quality-change', q=>{ if(socket.room) socket.to(socket.room).emit('quality-change', q); });
  socket.on('phone-mode', b=>{ if(socket.room) socket.to(socket.room).emit('phone-mode', b); });
  socket.on('video-call-request', d=>{ if(socket.room){ console.log(`video-call-request ${socket.room} from ${d.from}`); socket.to(socket.room).emit('video-call-request', d); } });
  socket.on('video-call-accept', d=>{ if(socket.room){ console.log(`video-call-accept ${socket.room}`); io.to(socket.room).emit('video-call-accept', d); } });
  socket.on('video-call-decline', d=>{ if(socket.room) socket.to(socket.room).emit('video-call-decline', d); });
  socket.on('video-call-end', d=>{ if(socket.room){ console.log(`video-call-end ${socket.room}`); io.to(socket.room).emit('video-call-end', d); } });
  socket.on('phone-call-request', d=>{ if(socket.room){ console.log(`phone-call-request ${socket.room} from ${d.from}`); socket.to(socket.room).emit('phone-call-request', d); } });
  socket.on('phone-call-accept', d=>{ if(socket.room){ console.log(`phone-call-accept ${socket.room}`); io.to(socket.room).emit('phone-call-accept', d); } });
  socket.on('phone-call-decline', d=>{ if(socket.room) socket.to(socket.room).emit('phone-call-decline', d); });
  socket.on('phone-call-end', d=>{ if(socket.room){ console.log(`phone-call-end ${socket.room}`); io.to(socket.room).emit('phone-call-end', d); } });
  socket.on('paused', ()=>{ if(socket.room) socket.to(socket.room).emit('peer-paused'); });
  socket.on('general-pause', ()=>{ if(socket.room){ socket.to(socket.room).emit('general-pause'); socket.to(socket.room).emit('peer-paused'); } });
  socket.on('leave-room', room=>{
    if(room&&rooms[room]){
      const r = room || socket.room;
      const norm = normalize(socket.realUsername||socket.username);
      if(rooms[r]){
        rooms[r].lastSeen[norm]=Date.now();
        delete rooms[r].users[socket.id];
        socket.leave(r);
        socket.to(r).emit('user-disconnected');
        socket.to(r).emit('user-status',{user:socket.realUsername||socket.username, status:'yokum', online:false, lastSeen: rooms[r].lastSeen[norm]});
        console.log(`LEAVE-ROOM ${r} ${socket.realUsername} - lastSeen ${rooms[r].lastSeen[norm]} - kalan ${Object.keys(rooms[r].users).length}`);
      }
    }
    socket.room="";
  });
  socket.on('panic', async ()=>{ if(socket.room){ const r=rooms[socket.room]; if(r) r.messages.clear(); persistedMessages=persistedMessages.filter(m=>m.room!==socket.room); await saveDisk(); io.to(socket.room).emit('panic'); } });
  socket.on('get-last-seen', (data)=>{
    const room = data.room || socket.room;
    if(room && rooms[room]){
      socket.emit('last-seen-data', {room, lastSeen: rooms[room].lastSeen, users: Object.values(rooms[room].users)});
    }
  });
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', ()=> console.log(`GORGOR V18.21 FINAL - oda dolu fix + son görülme + 14dk kilit - port ${PORT}`));