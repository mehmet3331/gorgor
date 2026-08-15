const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 20 * 1024 * 1024, cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;

app.use(express.static('public'));
app.use(express.static(__dirname));

app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let persistedMessages = [];
let onlineUsers = {};
let mongoCollection = null;
let saveTimeout = null;

async function initMongo(){
  if(!process.env.MONGODB_URI){ console.log("MONGODB_URI YOK! Disk kullaniliyor"); return; }
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
    socket.room = room;
    socket.username = data.username;
    socket.realUsername = data.realUsername || data.username;
    if(!rooms[room]) rooms[room] = { users: {}, messages: new Map() };
    rooms[room].users[socket.id] = socket.username;
    socket.join(room);
    const count = Object.keys(rooms[room].users).length;
    socket.emit('joined-room', {username: data.username, count});
    socket.to(room).emit('user-connected', {username: data.username});
    const pending = persistedMessages.filter(m=>m.room===room);
    if(pending.length){ socket.emit('pending-messages', pending); }
  });
  socket.on('chat-message', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return;
    const msg={msgId:data.msgId, enc:data.enc, expireSec:data.expireSec, type:'text', username:socket.username, realUsername:socket.realUsername, opened:false, room, expireAt: Date.now()+data.expireSec*1000, deleteAt: null};
    rooms[room].messages.set(data.msgId, msg);
    persistedMessages.push(msg);
    debouncedSave();
    socket.to(room).emit('chat-message',{...data, username:socket.username, realUsername:socket.realUsername});
  });
  socket.on('chat-media', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return;
    const msg={msgId:data.msgId, enc:data.enc, expireSec:data.expireSec, type:data.mediaType, username:socket.username, realUsername:socket.realUsername, opened:false, room, expireAt: Date.now()+data.expireSec*1000, deleteAt: null};
    rooms[room].messages.set(data.msgId, msg);
    persistedMessages.push(msg);
    debouncedSave();
    socket.to(room).emit('chat-media',{...data, username:socket.username, realUsername:socket.realUsername});
  });
  socket.on('message-opened', async ({msgId})=>{
    const room=socket.room; if(!room) return;
    const t=rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    const baseSec = t?.expireSec || (idx>=0? persistedMessages[idx].expireSec : 14400);
    const deleteAt = Date.now()+baseSec*1000;
    if(t){ t.opened=true; t.deleteAt=deleteAt; }
    if(idx>=0){ persistedMessages[idx].opened=true; persistedMessages[idx].deleteAt=deleteAt; persistedMessages[idx].expireAt=deleteAt; debouncedSave(); }
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
  socket.on('panic', async ()=>{
    if(socket.room){
      const r=rooms[socket.room]; if(r) r.messages.clear();
      persistedMessages=persistedMessages.filter(m=>m.room!==socket.room);
      await saveDisk();
      io.to(socket.room).emit('panic');
    }
  });
  socket.on('change-password', (p)=>{ if(socket.room && rooms[socket.room]) rooms[socket.room].password=p; });
  socket.on('quality-change', ()=>{});
  socket.on('messages-read-all', ()=>{});
  socket.on('reduce-request', ({msgId, newExpireSec})=>{
    const room=socket.room; if(!room) return;
    const t=rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    const newDeleteAt = Date.now()+newExpireSec*1000;
    if(t){ t.expireSec=newExpireSec; t.deleteAt=newDeleteAt; t.expireAt=newDeleteAt; }
    if(idx>=0){ persistedMessages[idx].expireSec=newExpireSec; persistedMessages[idx].deleteAt=newDeleteAt; persistedMessages[idx].expireAt=newDeleteAt; debouncedSave(); }
    io.to(room).emit('reduce-accepted',{msgId, newExpireSec, newDeleteAt});
  });
  socket.on('extend-request', ({msgId, extraSec})=>{
    const room=socket.room; if(!room) return;
    const t=rooms[room]?.messages.get(msgId);
    let idx=persistedMessages.findIndex(m=>m.msgId===msgId && m.room===room);
    if(t && t.deleteAt){ t.deleteAt+=extraSec*1000; t.expireAt=t.deleteAt; }
    if(idx>=0 && persistedMessages[idx].deleteAt){ persistedMessages[idx].deleteAt+=extraSec*1000; persistedMessages[idx].expireAt=persistedMessages[idx].deleteAt; debouncedSave(); }
    const newDeleteAt = t?.deleteAt || persistedMessages[idx]?.deleteAt;
    io.to(room).emit('extend-accepted',{msgId, newDeleteAt, extraSec});
  });
});

server.listen(PORT, () => console.log('GORGOR calisiyor port ' + PORT));