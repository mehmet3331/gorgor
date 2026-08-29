const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 30 * 1024 * 1024, cors: { origin: "*" } });
app.use(express.static('public'));
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
// V22.2 ANTI-SLEEP
app.get('/health', (req,res)=>{ res.status(200).send('OK HESAPLAMA V24 STABLE - '+new Date().toISOString()); });
app.get('/keepalive', (req,res)=>{ res.status(200).send('alive '+Date.now()); });
app.get('/ping', (req,res)=>{ res.status(200).send('pong '+Date.now()); });
app.get('/api/ping', (req,res)=>{ res.json({status:'alive', time: Date.now()}); });
function normalize(s){ return (s||'').toString().trim().toLowerCase(); }
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
    // V19 - TTL index ile oto silme - teknik temizlik
    try{
      await mongoCollection.createIndex({expireAt: 1}, {expireAfterSeconds: 0});
      await mongoCollection.createIndex({room: 1});
      await mongoCollection.createIndex({msgId: 1});
      console.log("MongoDB indexler olusturuldu - TTL aktif");
    }catch(e){ console.log("Index hatasi", e.message); }
    persistedMessages = await mongoCollection.find({}).toArray();
    console.log(`MONGODB BAGLI - ${persistedMessages.length} mesaj`);
  }catch(e){ console.error("Mongo hatasi", e); }
}
initMongo();
function debouncedSave(){ if(saveTimeout) clearTimeout(saveTimeout); saveTimeout=setTimeout(saveDisk,1000); }
async function saveDisk(){ if(!mongoCollection) return; try{ await mongoCollection.deleteMany({}); if(persistedMessages.length) await mongoCollection.insertMany(persistedMessages); }catch(e){ console.error(e.message); } }
setInterval(async()=>{ const now=Date.now(); const before=persistedMessages.length; persistedMessages=persistedMessages.filter(m=>{ const del=m.deleteAt||m.expireAt||0; return del>now; }); if(before!==persistedMessages.length){ console.log(`AUTO DELETE ${before-persistedMessages.length} mesaj - suresi doldu`); await saveDisk(); } },60000);
let rooms={};
io.on('connection', socket=>{
  socket.on('ping-check', ts=>{ socket.emit('pong-check', ts); });
  socket.on('status-change', ({user,status})=>{ 
    if(status==='yokum' && socket.room && rooms[socket.room]){
      if(!rooms[socket.room].lastSeen) rooms[socket.room].lastSeen={};
      rooms[socket.room].lastSeen[user]=Date.now();
      io.to(socket.room).emit('user-last-seen',{user, ts: Date.now(), online:false});
    }
    io.emit('user-status',{user,status,online:status==='varım'}); 
  });
  socket.on('typing', b=>{ if(!socket.room) return; if(typeof b==='object'&&b.from){ socket.to(socket.room).emit('typing',{username:b.from,typing:true}); } else if(typeof b==='object'){ socket.to(socket.room).emit('typing',b); } else { socket.to(socket.room).emit('typing',{username:socket.realUsername,typing:b}); } });
  socket.on('message-read', data=>{ if(!socket.room) return; const msgId=typeof data==='string'?data:data.msgId; const reader=data.reader||socket.realUsername; io.to(socket.room).emit('message-read',{msgId,reader,time:Date.now()}); });
  socket.on('message-reaction', data=>{ if(!socket.room) return; io.to(socket.room).emit('message-reaction',{msgId:data.msgId,emoji:data.emoji,user:socket.realUsername,time:Date.now()}); });
  socket.on('screenshot-detected', data=>{ if(!socket.room) return; console.log(`SCREENSHOT ${socket.room} from ${socket.realUsername}`); io.to(socket.room).emit('screenshot-alert',{from:socket.realUsername,time:Date.now()}); });
  socket.on('draw-stroke', data=>{ if(!socket.room) return; socket.to(socket.room).emit('draw-stroke',data); });
  socket.on('draw-clear', ()=>{ if(!socket.room) return; io.to(socket.room).emit('draw-clear'); });
  socket.on('voice-start', data=>{ if(!socket.room) return; socket.to(socket.room).emit('voice-start',{from:socket.realUsername}); });
  socket.on('background-blur', data=>{ if(!socket.room) return; socket.to(socket.room).emit('background-blur',data); });
  socket.on('keepalive-ping', data=>{ if(socket.room && rooms[socket.room]){ rooms[socket.room].lastSeen[socket.realUsername]=Date.now(); } socket.emit('keepalive-pong', {time: Date.now()}); });
  socket.on('keepalive', data=>{ if(socket.room && rooms[socket.room]){ rooms[socket.room].lastSeen[data.user||socket.realUsername]=Date.now(); } });
  // V22.1 HARMAN - 41-54 events - ViewOnce pasif
  socket.on('chat-edit', data=>{ if(!socket.room) return; const room=socket.room; if(rooms[room]?.messages.has(data.msgId)){ const m=rooms[room].messages.get(data.msgId); m.enc=data.enc; } let idx=persistedMessages.findIndex(m=>m.msgId===data.msgId&&m.room===room); if(idx>=0) persistedMessages[idx].enc=data.enc; debouncedSave(); socket.to(room).emit('chat-edit', data); io.to(room).emit('message-edit', data); });
  socket.on('message-edit', data=>{ if(!socket.room) return; const room=socket.room; if(rooms[room]?.messages.has(data.msgId)){ const m=rooms[room].messages.get(data.msgId); m.enc=data.enc; } let idx=persistedMessages.findIndex(m=>m.msgId===data.msgId&&m.room===room); if(idx>=0) persistedMessages[idx].enc=data.enc; debouncedSave(); socket.to(room).emit('chat-edit', data); socket.to(room).emit('message-edit', data); });
  socket.on('pin-message', data=>{ if(!socket.room) return; io.to(socket.room).emit('pin-message', data); });
  socket.on('poll-vote', data=>{ if(!socket.room) return; io.to(socket.room).emit('poll-vote', data); });
  socket.on('checklist-toggle', data=>{ if(!socket.room) return; io.to(socket.room).emit('checklist-toggle', data); });
  socket.on('delete-message', data=>{ if(!socket.room) return; const room=socket.room; if(rooms[room]?.messages.has(data.msgId)) rooms[room].messages.delete(data.msgId); persistedMessages=persistedMessages.filter(m=>!(m.msgId===data.msgId&&m.room===room)); debouncedSave(); io.to(room).emit('delete-message', data); });
  socket.on('join-room', data=>{
    const room=data.room; const requestedUsername=data.username;
    if(!rooms[room]) rooms[room]={users:{},messages:new Map(), lastSeen:{}};
    if(!rooms[room].lastSeen) rooms[room].lastSeen={};
    for(const [sid, uname] of Object.entries(rooms[room].users)){
      const alive = io.sockets.sockets.get(sid);
      if(normalize(uname)===normalize(requestedUsername) || !alive){
        delete rooms[room].users[sid];
      }
    }
    const currentCount=Object.keys(rooms[room].users).length;
    if(currentCount>=2){ socket.emit('room-error','Oda dolu - sadece 2 kişi'); return; }
    socket.room=room; socket.username=requestedUsername; socket.realUsername=data.realUsername||requestedUsername;
    rooms[room].users[socket.id]=socket.username; 
    rooms[room].lastSeen[socket.realUsername]=Date.now();
    socket.join(room);
    const count=Object.keys(rooms[room].users).length;
    socket.emit('joined-room',{username:data.username,count});
    socket.to(room).emit('user-connected',{username:data.username,realUsername:socket.realUsername});
    socket.emit('last-seen-list', rooms[room].lastSeen);
    socket.to(room).emit('user-last-seen',{user:socket.realUsername, ts: Date.now(), online:true});
    const now2=Date.now(); const pending=persistedMessages.filter(m=>m.room===room && (m.deleteAt||m.expireAt||0)>now2);
    if(pending.length) socket.emit('pending-messages',pending);
    console.log(`ODA: ${room} - ${data.username} girdi ${count} - lastSeen guncellendi`);
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
  socket.on('chat-voice', async data=>{
    const room=socket.room; if(!room||!rooms[room]) return; const now=Date.now();
    const msg={msgId:data.msgId,enc:data.enc,expireSec:data.expireSec,type:'voice',username:socket.username,realUsername:socket.realUsername,opened:false,room,expireAt:now+data.expireSec*1000,deleteAt:now+data.expireSec*1000,duration:data.duration};
    rooms[room].messages.set(data.msgId,msg); persistedMessages.push(msg); debouncedSave();
    socket.to(room).emit('chat-voice',{...data,username:socket.username,realUsername:socket.realUsername});
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
      if(socket.realUsername){
        if(!rooms[room].lastSeen) rooms[room].lastSeen={};
        rooms[room].lastSeen[socket.realUsername]=Date.now();
        io.to(room).emit('user-last-seen',{user:socket.realUsername, ts: Date.now(), online:false});
      }
      delete rooms[room].users[socket.id]; 
      socket.to(room).emit('user-disconnected'); 
      io.emit('user-status',{user:socket.realUsername,status:'yokum',online:false}); 
    }
    socket.room=null;
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
      if(socket.realUsername){
        if(!rooms[room].lastSeen) rooms[room].lastSeen={};
        rooms[room].lastSeen[socket.realUsername]=Date.now();
        io.to(room).emit('user-last-seen',{user:socket.realUsername, ts: Date.now(), online:false});
      }
      delete rooms[room].users[socket.id]; 
      socket.leave(room); 
      socket.to(room).emit('user-disconnected'); 
    }
    socket.room=null;
  });
  socket.on('panic', async ()=>{ if(socket.room){ const r=rooms[socket.room]; if(r) r.messages.clear(); persistedMessages=persistedMessages.filter(m=>m.room!==socket.room); await saveDisk(); io.to(socket.room).emit('panic'); } });
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', ()=> console.log(`HESAPLAMA V24 STABLE - tum ozellikler - FINAL STABIL - port ${PORT} - PBKDF2 + sesli + reaksiyon + screenshot + panic2 + fakeNotif + blur + otoReconnect + cizim`));