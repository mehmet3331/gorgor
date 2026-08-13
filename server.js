const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 20 * 1024 * 1024, cors: { origin: "*" } });
app.use(express.static('public'));

let persistedMessages = [];
let mongoCollection = null;

async function initMongo(){
  if(!process.env.MONGODB_URI){ console.log("MONGODB_URI YOK!"); return; }
  try{
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    mongoCollection = client.db('gorgor').collection('messages');
    persistedMessages = await mongoCollection.find({}).toArray();
    console.log(`MONGODB BAGLI - ${persistedMessages.length} mesaj KALICI yuklendi`);
  }catch(e){ console.error("Mongo hatasi", e); }
}
initMongo();

async function saveDisk(){
  if(mongoCollection){
    try{
      await mongoCollection.deleteMany({});
      if(persistedMessages.length) await mongoCollection.insertMany(persistedMessages);
    }catch(e){}
  }
}

setInterval(async()=>{
  const now = Date.now();
  const before = persistedMessages.length;
  persistedMessages = persistedMessages.filter(m => (m.deleteAt || m.expireAt || 0) > now);
  if(before!== persistedMessages.length) await saveDisk();
}, 60000);

let rooms = {};

io.on('connection', socket=>{
  // === YENİ ÖZELLİKLER - YAZIYOR + OKUNDU + ONLINE ===
  socket.on('status-change', ({user, status})=>{
    io.emit('user-status', {user, status, online: status==='varım'});
  });

  socket.on('typing', (b)=>{
    if(socket.room){
      // eski typing + yeni detaylı
      if(typeof b === 'object'){
        socket.to(socket.room).emit('typing', b);
      } else {
        socket.to(socket.room).emit('typing',{username:socket.realUsername, typing:b});
      }
      // yeni: user-typing
      if(b && b.typing!== undefined? b.typing : b){
        socket.to(socket.room).emit('user-typing', {from: socket.realUsername});
      }
    }
  });

  socket.on('message-read', ({msgId, reader})=>{
    if(socket.room){
      io.to(socket.room).emit('message-read', {msgId, reader, time: Date.now()});
    }
  });

  // === ESKİ KODLARIN - HEPSİ ICERIDE ===
  socket.on('join-room', (data)=>{
    // senin join kodun buraya gelecek - mevcutsa koru
    socket.room = data.room;
    socket.username = data.username;
    socket.realUsername = data.realUsername || data.username;
    if(!rooms[data.room]) rooms[data.room] = { users: {}, messages: new Map() };
    rooms[data.room].users[socket.id] = socket.username;
  });

  socket.on('chat-message', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return;
    const msg={msgId:data.msgId, enc:data.enc, expireSec:data.expireSec, type:'text', username:socket.username, realUsername:socket.realUsername, opened:false, room, expireAt: Date.now()+data.expireSec*1000, deleteAt: null};
    rooms[room].messages.set(data.msgId, msg);
    persistedMessages.push(msg); await saveDisk();
    socket.to(room).emit('chat-message',{...data, username:socket.username, realUsername:socket.realUsername});
  });

  socket.on('chat-media', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return;
    const msg={msgId:data.msgId, enc:data.enc, expireSec:data.expireSec, type:data.mediaType, username:socket.username, realUsername:socket.realUsername, opened:false, room, expireAt: Date.now()+data.expireSec*1000, deleteAt: null};
    rooms[room].messages.set(data.msgId, msg);
    persistedMessages.push(msg); await saveDisk();
    socket.to(room).emit('chat-media',{...data, username:socket.username, realUsername:socket.realUsername});
  });

  socket.on('message-opened', async ({msgId})=>{
    const room=socket.room; if(!room) return;
    const t=rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    const baseSec = t?.expireSec || (idx>=0? persistedMessages[idx].expireSec : 24*3600);
    const deleteAt = Date.now()+baseSec*1000;
    if(t){ t.opened=true; t.deleteAt=deleteAt; }
    if(idx>=0){ persistedMessages[idx].opened=true; persistedMessages[idx].deleteAt=deleteAt; persistedMessages[idx].expireAt=deleteAt; await saveDisk(); }
    io.to(room).emit('message-opened',{msgId, deleteAt, expireSec: baseSec});
  });

  socket.on('disconnect', ()=>{
    const room=socket.room;
    if(room&&rooms[room]){
      delete rooms[room].users[socket.id];
      socket.to(room).emit('user-disconnected');
      socket.to(room).emit('clear-remote-video');
      io.emit('user-status', {user: socket.realUsername, status:'yokum', online:false});
    }
  });

  socket.on('signal', d=> socket.to(d.room).emit('signal', d.signal));
  socket.on('nudge', ()=>{ if(socket.room) socket.to(socket.room).emit('nudge'); });
  socket.on('fly-emoji', d=>{ if(socket.room) socket.to(socket.room).emit('fly-emoji', d); });
  socket.on('phone-mode', b=>{ if(socket.room) socket.to(socket.room).emit('phone-mode', b); });
  socket.on('paused', ()=>{ if(socket.room) socket.to(socket.room).emit('peer-paused'); });
  socket.on('panic', async ()=>{ if(socket.room){ const r=rooms[socket.room]; if(r) r.messages.clear(); persistedMessages=persistedMessages.filter(m=>m.room!==socket.room); await saveDisk(); io.to(socket.room).emit('panic'); }});
});

server.listen(process.env.PORT||10000, ()=> console.log("GOR calisiyor port 10000"));