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
    socket.room = room;
    socket.username = data.username;
    socket.realUsername = data.realUsername || data.username;

    if(!rooms[room]) rooms[room] = { users: {}, messages: new Map() };
    rooms[room].users[socket.id] = socket.username;

    socket.join(room);

    const count = Object.keys(rooms[room].users).length;
    socket.emit('joined-room', {username: data.username, count});
    socket.to(room).emit('user-connected', {username: data.username});

    // KALICI MESAJLARI GÖNDER - ÇIKIP GİRİNCE KAYBOLMASIN
    const pending = persistedMessages.filter(m=>m.room===room);
    if(pending.length){
      socket.emit('pending-messages', pending);
    }
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
});

server.listen(process.env.PORT||10000, ()=> console.log("GOR calisiyor port 10000 - BEYAZ LAMBA + FOTO FIX AKTIF"));










* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; color: #fff; font-family: Arial, sans-serif; overflow: hidden; -webkit-user-select: none; user-select: none; }
#fakeCalc { position: fixed; inset: 0; background: #111; z-index: 10000; display: flex; justify-content: center; align-items: center; }
.calc-container { background: #222; padding: 20px; border-radius: 16px; width: 300px; }
.calc-container h3 { text-align: center; margin-bottom: 10px; }
.calc-container input { width: 100%; height: 50px; font-size: 22px; text-align: right; padding: 10px; border-radius: 10px; border: none; margin-bottom: 10px; background: #000; color: #0f0; }
.calc-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
.calc-grid button { height: 50px; border: none; border-radius: 10px; font-size: 18px; background: #333; color: white; cursor: pointer; }
#roomScreen { position: fixed; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; background: #000; z-index: 9999; }
#roomScreen h2 { font-size: 28px; }
#roomScreen input { width: 280px; height: 45px; padding: 10px; border: none; border-radius: 10px; font-size: 16px; }
#roomScreen button { width: 280px; height: 45px; border: none; border-radius: 10px; background: #00c853; color: white; font-size: 16px; cursor: pointer; font-weight: bold; }
.userTag { padding: 6px 11px; border-radius: 20px; font-size: 12px; cursor: pointer; background: #1a1a1a; border: 1px solid #2a2a2a; color: #777; }
.userTag:hover { background: #222; color: #aaa; border-color: #444; }
#mainScreen { display: none; width: 100%; height: 100vh; }
#remoteVideo { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: #000; z-index: 1; touch-action: pinch-zoom!important; -webkit-touch-callout: none; }
#myVideoContainer { position: fixed; top: 15px; right: 15px; width: 180px; height: 240px; border-radius: 12px; border: 2px solid #fff; background: #000; z-index: 100; touch-action: none; cursor: move; }
#myVideo { width: 100%; height: 100%; border-radius: 10px; object-fit: cover; transform: scaleX(-1); }
.cameraOverlayBtn { position: absolute; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0,0,0,.7); color: white; font-size: 16px; cursor: pointer; z-index: 120; }
#switchCameraBtn { bottom: 5px; left: 5px; } #fullscreenBtn { top: 5px; right: 5px; }
.qualitySelect { position: absolute; bottom: 5px; right: 5px; width: 60px; height: 28px; border: none; border-radius: 6px; background: rgba(0,0,0,.8); color: white; font-size: 12px; }
#settingsContainer { position: fixed; top: 10px; left: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 8px; max-height: 90vh; overflow-y: auto; }
#settingsBtn { width: 46px; height: 46px; border: none; border-radius: 50%; font-size: 22px; cursor: pointer; background: rgba(0,0,0,.7); color: white; }
#settingsContainer > button:not(#settingsBtn), #settingsContainer > #statusBar, #settingsContainer > #secretSettings { display: none; width: 50px; height: 50px; border: none; border-radius: 12px; font-size: 22px; cursor: pointer; background: rgba(0,0,0,.8); color: white; }
#settingsContainer.menu-open > button:not(#settingsBtn), #settingsContainer.menu-open > #statusBar { display: block; }
#settingsContainer.menu-open > #secretSettings { display: flex; width: 190px; height: auto; flex-direction: column; padding: 10px; font-size: 13px; background: rgba(0,0,0,0.9); border-radius: 10px; }
#secretSettings select { width: 100%; height: 32px; background: #111; color: #00ff88; border: 1px solid #333; border-radius: 6px; margin-top: 4px; }
#statusBar { display: flex; flex-direction: column; gap: 6px; margin-top: 5px; width: auto; height: auto; background: none; }
.statusBox { background: rgba(0,0,0,.75); padding: 8px; border-radius: 10px; font-size: 12px; color: white; width: max-content; }
#chatToggle { position: fixed; bottom: 15px; right: 15px; width: 60px; height: 60px; border: none; border-radius: 50%; background: #00bcd4; color: white; font-size: 26px; font-weight: bold; cursor: pointer; z-index: 1000; }
#chatPanel { position: fixed; left: 0; bottom: 0; width: 100%; height: 52%; background: #0f0f0f; display: none; flex-direction: column; z-index: 900; border-top: 2px solid #333; }
.chat-open #chatPanel { display: flex; }.chat-open #remoteVideo { height: 48%; }.chat-open #chatToggle { bottom: 53%; }
#messages { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; min-height: 0; }
.myMessage { color: #00ff88; text-align: right; margin: 8px 0; font-weight: bold; word-break: break-word; position: relative; background: rgba(0,255,136,0.08); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,255,136,0.15); }
.otherMessage { color: #00aaff; text-align: left; margin: 8px 0; font-weight: bold; word-break: break-word; background: rgba(0,170,255,0.08); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,170,255,0.15); }

/* YENİ INPUT LAYOUT - ÇİZİMİNE GÖRE */
#inputArea { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #000; flex-shrink: 0; border-top: 1px solid #222; }
.inputTopRow { display: flex; gap: 8px; align-items: center; }
.inputTopRow select { flex: 1; height: 40px; border-radius: 14px; background: #111; color: #00ff88; border: 1px solid #333; font-size: 12px; padding-left: 10px; }
.inputTopRow #perMessagePersistSelect { color: #ffcc00; }
.inputTopRow #emojiBtn,.inputTopRow #nudgeBtn { width: 72px; min-width: 72px; height: 40px; border: none; border-radius: 14px; background: #1e1e1e; color: white; font-size: 12px; cursor: pointer; border: 1px solid #333; }
.inputBottomRow { display: flex; gap: 10px; align-items: center; }
#attachMenuBtn { width: 48px; height: 48px; min-width:48px; border: none; border-radius: 14px; background: #1a1a1a; color: #999; font-size: 22px; cursor: pointer; border: 1px solid #333; }
#messageInput { flex: 1; height: 50px; padding: 14px 16px; border: none; border-radius: 24px; font-size: 15px; background: #1e1e1e; color: white; border: 1px solid #333; }
#messageInput:focus { outline: none; border-color: #00aa55; background: #252525; }
#sendBtn { width: 80px; height: 48px; min-width:80px; border: none; border-radius: 24px; background: #00aa55; color: white; cursor: pointer; font-weight: bold; font-size: 13px; }
#attachMenu { display: none; position: absolute; bottom: 58px; left: 0; background: #222; border-radius: 16px; padding: 8px; flex-direction: column; gap: 6px; z-index: 200; width: 230px; border: 1px solid #444; box-shadow: 0 10px 30px rgba(0,0,0,0.9); }
#attachMenu.show { display: flex; }
#attachMenu button { width: 100%; height: 46px; border: none; border-radius: 12px; background: #2a2a2a; color: white; text-align: left; padding-left: 16px; cursor: pointer; font-size: 14px; }
#attachMenu button:hover { background: #333; }

#mediaPreview { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; justify-content: center; align-items: center; flex-direction: column; z-index: 99999; gap: 15px; }
#mediaPreview img, #mediaPreview video { max-width: 90%; max-height: 80%; border-radius: 10px; }
#closePreview { position: absolute; top: 20px; right: 20px; font-size: 35px; color: white; cursor: pointer; }
#downloadMediaBtn { padding: 12px 30px; border: none; border-radius: 10px; background: #00aa55; color: white; font-size: 18px; cursor: pointer; }
.mediaMessage { max-width: 220px; max-height: 220px; border-radius: 10px; cursor: pointer; margin: 5px 0; }
#emojiPanel { display: none; position: absolute; bottom: 125px; right: 10px; background: #222; border-radius: 14px; padding: 10px; gap: 10px; z-index: 100; flex-wrap: wrap; max-width: 280px; border: 1px solid #333; } #emojiPanel.show { display: flex; }
.flyEmoji { font-size: 24px; cursor: pointer; }.flying-emoji { position: fixed; font-size: 50px; z-index: 9999; pointer-events: none; }
#candleContainer { position: fixed; inset: 0; background: radial-gradient(circle at center, #1a0f00 0%, #000 70%); z-index: 5; display: none; flex-direction: column; justify-content: center; align-items: center; gap: 20px; } #candleContainer.show { display: flex; }
.candle { position: relative; width: 60px; height: 120px; }.wax { position: absolute; bottom: 0; width: 60px; height: 80px; background: linear-gradient(to bottom, #fff8dc, #f5e6c8); border-radius: 6px 6px 0 0; }.wick { position: absolute; bottom: 78px; left: 28px; width: 4px; height: 12px; background: #222; }.flame { position: absolute; bottom: 88px; left: 18px; width: 24px; height: 36px; background: radial-gradient(ellipse at center, #ffff00 0%, #ffcc00 40%, #ff6600 80%); border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; animation: flicker 0.3s infinite alternate; } @keyframes flicker { 0% { transform: scaleY(1); } 100% { transform: scaleY(1.1); } }
#phoneCallUI { position: fixed; inset: 0; background: radial-gradient(circle at center, #0a2a12 0%, #000 80%); z-index: 4; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 18px; color: white; }
.phoneAvatar { font-size: 90px; background: #111; width: 140px; height: 140px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 3px solid #00ff88; }
.phoneName { font-size: 26px; font-weight: bold; }.phoneWave { display: flex; gap: 6px; }.phoneWave span { width: 6px; height: 24px; background: #00ff88; border-radius: 4px; animation: wave 1s infinite; } @keyframes wave { 0%,100% { height: 12px; } 50% { height: 28px; } }
body.phone-mode #myVideoContainer, body.phone-mode #remoteVideo, body.phone-mode #candleContainer { display: none!important; }
body.phone-mode #settingsContainer > button:not(#settingsBtn):not(#phoneModeBtn):not(#micBtn):not(#soundBtn) { opacity: 0.15; pointer-events: none; }
body.phone-mode #chatPanel { pointer-events: none; opacity: 0.2; } body.phone-mode #chatToggle { opacity: 0.2; pointer-events: none; }
#phoneModeBtn.active { background: #00aa55!important; }
#msnEffectLayer { position: fixed; inset: 0; pointer-events: none; z-index: 9998; overflow: hidden; }
#drawOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10001; display: flex; flex-direction: column; }
#drawCanvas { flex: 1; background: #000; touch-action: none; }
.countdown { font-size: 11px; color: #ffcc00; display: block; margin-top: 6px; font-weight: bold; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 6px; border: 1px solid #333; }
.expireInfo { font-size: 9px; color: #00ff88; opacity: 0.9; display: block; margin-bottom: 4px; }
.selfDestructed { color: #666; font-style: italic; text-align: center; background: #111!important; border: 1px dashed #333!important; }
.reduceBtn,.extendBtn { font-size: 10px; background: #222; color: #ffcc00; border: 1px solid #555; border-radius: 6px; padding: 4px 8px; margin-top: 6px; cursor: pointer; margin-right: 4px; }
.openBtn { font-size: 13px; background: #00aa55; color: white; border: none; border-radius: 8px; padding: 6px 14px; margin-top: 8px; cursor: pointer; font-weight: bold; }
.lockedMessage { background: #1a1a1a!important; border: 2px dashed #00aa55!important; text-align: center; padding: 14px!important; }
.newMessageBlink { animation: blink.8s infinite; } @keyframes blink { 0% { background: #ff0000; } 50% { background: #ffff00; color: #000; } 100% { background: #ff0000; } }
.good { color: #00ff88; }.medium { color: #ffcc00; }.bad { color: #ff4444; }
#volumeSlider { position: fixed; top: 15px; left: 50%; transform: translateX(-50%); width: 180px; z-index: 1000; }
.offIcon { position:relative; }.offIcon::after { content:""; position:absolute; left:3px; top:22px; width:34px; height:4px; background:#ff0000; transform:rotate(-45deg); border-radius:5px; pointer-events:none; }
/* ESKI GUZEL TITREME - V12.1 */
@keyframes shake { 0%,100% { transform: translateX(0); } 10%,30%,50%,70%,90% { transform: translateX(-3px); } 20%,40%,60%,80% { transform: translateX(3px); } }
.shake { animation: shake 0.6s; }
@keyframes screenShake { 
  0%,100% { transform: translate(0,0); } 
  10% { transform: translate(-10px,-5px); } 
  20% { transform: translate(10px,5px); } 
  30% { transform: translate(-8px,8px); } 
  40% { transform: translate(8px,-8px); } 
  50% { transform: translate(-6px,6px); } 
  60% { transform: translate(-6px,-6px); } 
  70% { transform: translate(-4px,4px); } 
  80% { transform: translate(4px,-4px); } 
  90% { transform: translate(-2px,2px); } 
}
.screen-shake { animation: screenShake 0.8s cubic-bezier(.36,.07,.19,.97) both; }
#nudgeBtn { background: #ff4444 !important; box-shadow: 0 0 10px rgba(255,68,68,0.5); }
#emojiBtn { background: #444 !important; }
#emojiPanel { display: none; position: absolute; bottom: 125px; right: 10px; background: #222; border-radius: 14px; padding: 10px; gap: 10px; z-index: 100; flex-wrap: wrap; max-width: 280px; border: 1px solid #333; box-shadow: 0 8px 20px rgba(0,0,0,0.8); }
#emojiPanel.show { display: flex; }
.flyEmoji { font-size: 24px; cursor: pointer; transition: transform 0.15s ease; user-select: none; }
.flyEmoji:hover { transform: scale(1.35) rotate(5deg); }
.flying-emoji { position: fixed; font-size: 50px; z-index: 9999; pointer-events: none; text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5); will-change: transform, opacity; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }
#myVideoContainer { resize: both; overflow: hidden; min-width: 90px; min-height: 120px; max-width: 90vw; max-height: 70vh; }
#myVideoContainer:active { border-color: #00ff88; }
/* MSN ULTRA EFEKTLER - FINAL */
@keyframes heartRain { 0%{transform:translateY(0) scale(0) rotate(0); opacity:0;} 15%{opacity:1; transform:translateY(-30px) scale(1.2) rotate(10deg);} 100%{transform:translateY(-500px) scale(1.8) rotate(-20deg) translateX(40px); opacity:0;} }
@keyframes kissPop { 0%{transform:translate(-50%,0) scale(0);} 20%{transform:translate(-50%,-40px) scale(1.6) rotate(-5deg);} 40%{transform:translate(-50%,-90px) scale(0.9) rotate(5deg);} 70%{transform:translate(-50%,-160px) scale(1.3);} 100%{transform:translate(-50%,-280px) scale(0.8); opacity:0;} }
@keyframes laughBounce { 0%{transform:translateY(0) rotate(0) scale(0.5); opacity:0;} 10%{opacity:1;} 25%{transform:translateY(-70px) rotate(-15deg) scale(1.4);} 50%{transform:translateY(-140px) rotate(15deg) scale(0.9);} 75%{transform:translateY(-220px) rotate(-10deg) scale(1.2);} 100%{transform:translateY(-350px) rotate(10deg) scale(0.6); opacity:0;} }
@keyframes fireFlicker { 0%{transform:translateY(0) scale(0.8) rotate(-3deg); filter:brightness(1);} 20%{transform:translateY(-50px) scale(1.5) rotate(3deg); filter:brightness(1.8) drop-shadow(0 0 20px #ff6600);} 50%{transform:translateY(-150px) scale(1.2) rotate(-2deg); filter:brightness(1.4);} 100%{transform:translateY(-320px) scale(0.5); opacity:0; filter:brightness(0.5);} }
@keyframes megaShake { 0%,100%{transform:translate(0,0) scale(1);} 10%{transform:translate(-12px,-8px) scale(1.1);} 20%{transform:translate(12px,8px) scale(0.95);} 30%{transform:translate(-10px,10px) scale(1.05);} 40%{transform:translate(10px,-10px) scale(1);} 50%{transform:translate(-8px,5px) scale(1.08);} }

.flying-emoji { position:fixed; font-size:60px; z-index:9999; pointer-events:none; text-shadow:0 0 15px rgba(255,255,255,0.9), 0 0 30px currentColor; will-change:transform,opacity; filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6)); user-select:none; }
.flying-emoji.heart{ animation:heartRain 3s cubic-bezier(.25,.46,.45,.94) forwards; color:#ff3366; }
.flying-emoji.kiss{ animation:kissPop 2.4s cubic-bezier(.175,.885,.32,1.275) forwards; }
.flying-emoji.laugh{ animation:laughBounce 2.8s ease-in-out forwards; }
.flying-emoji.fire{ animation:fireFlicker 2.2s ease-in-out forwards; font-size:70px!important; }
.flying-emoji.thumbs{ animation:kissPop 2s ease-out forwards; }
.flying-emoji.cry{ animation:heartRain 3.2s ease-in forwards; filter:blur(0.3px) brightness(0.8); }
.flying-emoji.wow{ animation:laughBounce 2s ease-out forwards; font-size:75px!important; }
.flying-emoji.flower{ animation:heartRain 3s linear forwards; }
.flying-emoji.love{ animation:heartRain 2.8s ease-out forwards; color:#ff0055; text-shadow:0 0 20px #ff0055; }
.flying-emoji.hug{ animation:kissPop 2.5s ease-out forwards; }

.mega-shake{ animation:megaShake 0.7s cubic-bezier(.36,.07,.19,.97) both; }
body:fullscreen #remoteVideo { touch-action: none!important; object-fit: cover; }

body:fullscreen #remoteVideo { touch-action: none!important; object-fit: cover; }

/* === LAMBA FIX - BEYAZ DIS CERCEVE === */
#remoteVideo {
  border: 4px solid transparent;
  border-radius: 12px;
  transition: all 0.4s ease;
}
#remoteVideo.lamp-on {
  border-color: #ffffff !important;
  box-shadow: 
    0 0 12px #ffffff,
    0 0 25px #ffffff,
    0 0 50px rgba(255,255,255,0.7) !important;
  filter: none !important;
}
#lightModeBtn.active { 
  background: #ffffff !important; 
  color: #000 !important; 
  box-shadow: 0 0 15px #ffffff; 
}

/* YAZIYOR + OKUNDU */
#typingIndicator {
  position: fixed;
  bottom: 54%;
  left: 12px;
  background: rgba(0,0,0,0.8);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #00ff88;
  display: none;
  z-index: 950;
}
.msg.read .ticks{ color:#00bfff !important; }
.typing-dots span{ animation: blink 1s infinite; }
@keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }










<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<title>GORGOR</title>
<link rel="stylesheet" href="style.css" />
<script src="/socket.io/socket.io.js"></script>
<script src="./simplepeer.min.js"></script>
</head>
<body>
<div id="fakeCalc" style="display:flex;">
  <div class="calc-container">
    <h3>🔢 Hesap Makinesi</h3>
    <input id="calcDisplay" readonly placeholder="0" />
    <div class="calc-grid">
      <button onclick="calcPress('7')">7</button><button onclick="calcPress('8')">8</button><button onclick="calcPress('9')">9</button><button onclick="calcPress('/')">/</button>
      <button onclick="calcPress('4')">4</button><button onclick="calcPress('5')">5</button><button onclick="calcPress('6')">6</button><button onclick="calcPress('*')">*</button>
      <button onclick="calcPress('1')">1</button><button onclick="calcPress('2')">2</button><button onclick="calcPress('3')">3</button><button onclick="calcPress('-')">-</button>
      <button onclick="calcPress('0')">0</button><button onclick="calcPress('.')">.</button><button onclick="calcClear()">C</button><button onclick="calcPress('+')">+</button>
      <button onclick="calcEqual()" style="grid-column: span 4; background:#00c853; color:white; font-weight:bold;">=</button>
    </div>
  </div>
</div>

<div id="roomScreen" style="display:none;">
  <h2>🔒 GORGOR</h2>
  <input id="roomName" placeholder="Oda adı" autocomplete="off" />
  <div id="fakeRoomsHint" style="display:none; width:280px; background:#111; border:1px solid #333; border-radius:10px; padding:8px; font-size:12px;">
    <div id="fakeRoomsList" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
  </div>
  <input id="userName" placeholder="Kullanıcı adı" autocomplete="off" style="display:none;" />
  <div id="userListBox" style="display:none; width:280px; background:#111; border:1px solid #333; border-radius:10px; padding:8px; max-height:200px; overflow-y:auto;">
    <div id="fakeUsersList" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
  </div>
  <input id="roomPassword" type="password" placeholder="Oda şifresi" />
  <button id="joinBtn">Giriş</button>
</div>

<div id="mainScreen" style="display:none;">
  <video id="remoteVideo" autoplay playsinline></video>
  <div id="myVideoContainer">
    <video id="myVideo" autoplay muted playsinline></video>
    <button id="switchCameraBtn" class="cameraOverlayBtn">🔄</button>
    <button id="fullscreenBtn" class="cameraOverlayBtn">⛶</button>
    <select id="qualitySelect" class="qualitySelect"><option value="480">480p</option><option value="720" selected>720p</option><option value="1080">1080p</option></select>
  </div>
  <div id="candleContainer"><div class="candle"><div class="wick"></div><div class="flame"></div><div class="wax"></div></div><p>Karşı taraf yok<br/>Mum yanıyor 🕯</p></div>
  <div id="phoneCallUI" style="display:none;"><div class="phoneAvatar">👤</div><div class="phoneName" id="phoneNameDisplay">-</div><div class="phoneStatus">Telefon modu</div><div class="phoneWave"><span></span><span></span></div></div>
  <div id="settingsContainer">
    <button id="settingsBtn">⚙</button>
    <button id="micBtn" title="Mikrofon"></button>
    <button id="camBtn" title="Kamera"></button>
    <button id="soundBtn" title="Ses">🔊</button>
    <input id="volumeSlider" type="range" min="0" max="1" step="0.05" value="0.1" />
    <button id="phoneModeBtn" title="Telefon Modu">📞</button>
    <button id="panicBtn" title="Panik">🚨</button>
    <button id="lightModeBtn" title="Işık">💡</button>
    <button id="changePasswordBtn" title="Şifre">🔑</button>
    <div id="statusBar"><div class="statusBox"><span id="pingValue">-- ms</span> | <span id="connectionQuality">Bağlanıyor</span></div><div class="statusBox" id="currentUserBox">-</div></div>
    <div id="secretSettings"><label>Varsayılan yok olma:</label><select id="defaultSelfDestructSelect"><option value="300">5 dk</option><option value="3600">1 saat</option><option value="14400" selected>4 saat</option><option value="86400">24 saat</option></select></div>
  </div>
  <button id="chatToggle">💬</button>
  <div id="chatPanel">
    <div id="messages"></div>
    <div id="inputArea">
      <div class="inputTopRow">
        <select id="perMessageTimerSelect">
          <option value="300">5 dakika</option>
          <option value="3600">1 saat</option>
          <option value="14400" selected>4 saat (varsayılan)</option>
          <option value="86400">1 gün</option>
        </select>
        <select id="perMessagePersistSelect"><option value="once">Bu mesaj</option><option value="persist">Varsayılan yap</option></select>
        <button id="emojiBtn" title="Emoji">😊</button>
        <button id="nudgeBtn" title="Titreşim">👉</button>
      </div>
      <div class="inputBottomRow">
        <div style="position:relative;">
          <button id="attachMenuBtn">⋯</button>
          <div id="attachMenu">
            <button id="cameraBtn">📷 Kameradan Çek</button>
            <button id="mediaBtn">🖼 Galeriden Seç (20MB)</button>
            <button id="drawBtn">✏ Çizim</button>
            <button id="locationBtn">📍 Konum</button>
          </div>
        </div>
        <input id="messageInput" placeholder="Mesaj..." autocomplete="off" />
        <button id="sendBtn">Gönder</button>
      </div>
    </div>
    <div id="emojiPanel">
      <span class="flyEmoji" data-effect="heart">❤</span>
      <span class="flyEmoji" data-effect="kiss">💋</span>
      <span class="flyEmoji" data-effect="big-kiss">💋</span>
      <span class="flyEmoji" data-effect="kiss-rain">😘</span>
      <span class="flyEmoji" data-effect="kiss-rain">😍</span>
      <span class="flyEmoji" data-effect="water">💦</span>
      <span class="flyEmoji" data-effect="fire">🔥</span>
      <span class="flyEmoji" data-effect="flower">🌸</span>
      <span class="flyEmoji" data-effect="thumbs">👍</span>
      <span class="flyEmoji" data-effect="wow">😮</span>
      <span id="addCustomEmoji" class="flyEmoji">➕</span>
    </div>
    <input type="file" id="mediaInput" accept="image/*,video/*" style="display:none;" />
    <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display:none;" />
  </div>
</div>

<div id="mediaPreview"><span id="closePreview">×</span><img id="previewImg" /><video id="previewVideo" controls></video><button id="downloadMediaBtn">⬇ İndir</button></div>
<div id="drawOverlay" style="display:none;"><canvas id="drawCanvas"></canvas><div style="display:flex; gap:10px; padding:10px;"><button id="drawClear">Temizle</button><button id="drawSend" style="background:#00c853;color:white;">Gönder</button><button id="drawClose">Kapat</button></div></div>
<div id="msnEffectLayer"></div>

<script>
let calcBuf="";
function calcPress(v){ calcBuf+=v; document.getElementById("calcDisplay").value=calcBuf; }
function calcClear(){ calcBuf=""; document.getElementById("calcDisplay").value=""; }
function calcEqual(){
  if(calcBuf==="0000"){
    document.getElementById("fakeCalc").style.display="none";
    document.getElementById("roomScreen").style.display="flex";
    calcBuf=""; document.getElementById("calcDisplay").value="";
    return;
  }
  try{ let r=eval(calcBuf); document.getElementById("calcDisplay").value=r; calcBuf=r.toString(); }catch(e){ document.getElementById("calcDisplay").value="Hata"; calcBuf=""; }
}
</script>
<script src="script.js"></script>
</body>
</html>