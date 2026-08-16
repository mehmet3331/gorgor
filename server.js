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
    console.log(`MONGODB BAGLI - ${persistedMessages.length} mesaj KALICI yuklendi`);
  }catch(e){ console.error("Mongo hatasi", e); }
}
initMongo();

function debouncedSave(){
  if(saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveDisk, 1000);
}

async function saveDisk(){
  if(!mongoCollection) return;
  try{
    await mongoCollection.deleteMany({});
    if(persistedMessages.length) await mongoCollection.insertMany(persistedMessages);
  }catch(e){ console.error("saveDisk hata", e.message); }
}

// SADECE açılmış ve süresi dolmuş mesajları sil
setInterval(async()=>{
  const now = Date.now();
  const before = persistedMessages.length;
  persistedMessages = persistedMessages.filter(m => {
    if(!m.opened) return true;
    return (m.deleteAt || 0) > now;
  });
  if(before!== persistedMessages.length) await saveDisk();
}, 60000);

let rooms = {};

io.on('connection', socket=>{
  socket.on('ping-check', (ts)=>{ socket.emit('pong-check', ts); });

  socket.on('status-change', ({user, status})=>{
    io.emit('user-status', {user, status, online: status==='varım'});
  });

  socket.on('typing', (b)=>{
    if(!socket.room) return;
    if(typeof b === 'object' && b.from){
      socket.to(socket.room).emit('typing', {username:b.from, typing:true});
      socket.to(socket.room).emit('user-typing', {from:b.from});
    } else if(typeof b === 'object'){
      socket.to(socket.room).emit('typing', b);
    } else {
      socket.to(socket.room).emit('typing',{username:socket.realUsername, typing:b});
      if(b) socket.to(socket.room).emit('user-typing', {from: socket.realUsername});
    }
  });

  socket.on('message-read', (data)=>{
    if(!socket.room) return;
    const msgId = typeof data === 'string'? data : data.msgId;
    const reader = data.reader || socket.realUsername;
    io.to(socket.room).emit('message-read', {msgId, reader, time: Date.now()});
  });

  socket.on('join-room', (data)=>{
    const room = data.room;
    const requestedUsername = data.username;
    
    // MAX 2 KİŞİ KONTROLÜ - 3. kişi engellensin
    if(!rooms[room]) rooms[room] = { users: {}, messages: new Map() };
    const currentCount = Object.keys(rooms[room].users).length;
    if(currentCount >= 2){
      console.log(`ODA DOLU: ${room} - ${requestedUsername} giremedi, zaten ${currentCount} kişi var`);
      socket.emit('room-error', 'Oda dolu - sadece 2 kişi girebilir');
      return;
    }

    socket.room = room;
    socket.username = requestedUsername;
    socket.realUsername = data.realUsername || requestedUsername;

    rooms[room].users[socket.id] = socket.username;

    socket.join(room);

    const count = Object.keys(rooms[room].users).length;
    socket.emit('joined-room', {username: data.username, count});
    socket.to(room).emit('user-connected', {username: data.username, realUsername: socket.realUsername});
    
    const otherUsers = Object.values(rooms[room].users).filter(u => u !== data.username);
    if(otherUsers.length > 0){
      socket.emit('existing-users', otherUsers);
    }

    const pending = persistedMessages.filter(m=>m.room===room);
    if(pending.length){
      socket.emit('pending-messages', pending);
    }
    
    console.log(`ODA: ${room} - ${data.username} girdi, toplam ${count} kişi`);
  });

  socket.on('chat-message', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return;
    const now = Date.now();
    const msg={msgId:data.msgId, enc:data.enc, expireSec:data.expireSec, type:'text', username:socket.username, realUsername:socket.realUsername, opened:false, room, expireAt: now+data.expireSec*1000, deleteAt: now+data.expireSec*1000};
    rooms[room].messages.set(data.msgId, msg);
    persistedMessages.push(msg);
    debouncedSave();
    socket.to(room).emit('chat-message',{...data, username:socket.username, realUsername:socket.realUsername});
  });

  socket.on('chat-media', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return;
    const now = Date.now();
    const msg={msgId:data.msgId, enc:data.enc, expireSec:data.expireSec, type:data.mediaType, username:socket.username, realUsername:socket.realUsername, opened:false, room, expireAt: now+data.expireSec*1000, deleteAt: now+data.expireSec*1000};
    rooms[room].messages.set(data.msgId, msg);
    persistedMessages.push(msg);
    debouncedSave();
    socket.to(room).emit('chat-media',{...data, username:socket.username, realUsername:socket.realUsername});
  });

  socket.on('message-opened', async ({msgId})=>{
    const room=socket.room; if(!room) return;
    const t=rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    const existingDeleteAt = t?.deleteAt || (idx>=0 ? persistedMessages[idx].deleteAt : null) || (t?.expireAt || Date.now()+14400*1000);
    const baseSec = t?.expireSec || (idx>=0? persistedMessages[idx].expireSec : 14400);
    if(t){ t.opened=true; }
    if(idx>=0){ persistedMessages[idx].opened=true; debouncedSave(); }
    io.to(room).emit('message-opened',{msgId, deleteAt: existingDeleteAt, expireSec: baseSec, openedAt: Date.now()});
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
  socket.on('panic', async ()=>{
    if(socket.room){
      const r=rooms[socket.room]; if(r) r.messages.clear();
      persistedMessages=persistedMessages.filter(m=>m.room!==socket.room);
      await saveDisk();
      io.to(socket.room).emit('panic');
    }
  });
});

server.listen(process.env.PORT||10000, ()=> console.log("GOR calisiyor port 10000 - BEYAZ LAMBA + FOTO FIX AKTIF"));