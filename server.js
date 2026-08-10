
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] },
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 25e6
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "50mb" }));

const DATA_DIR = path.join(__dirname, "data");
const PERSIST_FILE = path.join(DATA_DIR, "rooms.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let rooms = {}; // rooms[roomName] = { password, users:{socketId:username}, messages:[], lastEmptyAt }
let ramOnlyMessages = {}; // ramOnlyMessages[room] = [{...}] for 5dk 15dk

function loadPersist() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSIST_FILE, "utf-8"));
      // Only load messages with expire > 15min
      rooms = data.rooms || {};
      console.log("Persist yüklendi:", Object.keys(rooms).length, "oda");
    }
  } catch(e){ console.log("Persist yüklenemedi", e); rooms={}; }
}
function savePersist() {
  try {
    // Save only rooms that have long-term messages
    const toSave = {};
    for (const rn in rooms) {
      const r = rooms[rn];
      const longMsgs = (r.messages||[]).filter(m => m.expireSec > 900); // >15dk
      if (longMsgs.length>0 || Object.keys(r.users||{}).length>0) {
        toSave[rn] = { password: r.password, users: {}, messages: longMsgs, lastEmptyAt: r.lastEmptyAt };
      }
    }
    fs.writeFileSync(PERSIST_FILE, JSON.stringify({ rooms: toSave }, null, 2));
  } catch(e){ console.log("Persist yazılamadı", e); }
}
loadPersist();

function normalize(s){ return (s||"").toString().trim().toLowerCase(); }

const REAL_ROOM = "oda1";
const FAKE_ROOMS = ["oda","oda2","oda3","oda4","oda5","oda6","oda7","oda8","oda9","oda10"];
const REAL_USERS = ["varım","yokum"];

const TTL_MAP = {
  "300": 300,
  "900": 900,
  "14400": 14400,
  "86400": 86400,
  "604800": 604800
};

function cleanup() {
  const now = Date.now();
  for (const rn in rooms) {
    const r = rooms[rn];
    if (!r.messages) continue;
    const before = r.messages.length;
    r.messages = r.messages.filter(m => {
      // if not opened yet, keep until createdAt + expire
      if (!m.openedAt) return (now - m.createdAt) < (m.expireSec*1000);
      // opened, delete after deleteAt
      return now < m.deleteAt;
    });
    if (r.messages.length !== before) console.log(`Temizlendi ${rn}: ${before} -> ${r.messages.length}`);
  }
  // RAM only cleanup
  for (const rn in ramOnlyMessages) {
    ramOnlyMessages[rn] = (ramOnlyMessages[rn]||[]).filter(m => (now - m.createdAt) < (m.expireSec*1000));
  }
  savePersist();
}
setInterval(cleanup, 30*1000);

io.on("connection", (socket)=>{
  console.log("Bağlandı:", socket.id);

  socket.on("join-room", ({ room, password, username })=>{
    const rn = normalize(room);
    const un = normalize(username);
    // bulmaca kontrolü - istersen kapatabilirsin
    if (rn !== REAL_ROOM && REAL_ROOM) {
      // Eski V12.3 kontrolü vardı, şimdi her odaya izin ver ama logla
      // socket.emit("room-error", "🚫 Oda aktif değil."); return;
    }
    if (!rn || !password) { socket.emit("room-error","Oda ve şifre gerekli"); return; }

    if (!rooms[rn]) {
      rooms[rn] = { password, users: {}, messages: [], lastEmptyAt: null };
    } else {
      if (rooms[rn].password !== password) { socket.emit("room-error","Şifre yanlış"); return; }
    }
    if (Object.keys(rooms[rn].users).length >=2) { socket.emit("room-error","Oda dolu"); return; }

    socket.join(rn);
    socket.room = rn;
    socket.username = un;
    rooms[rn].users[socket.id] = un;
    rooms[rn].lastEmptyAt = null;

    // Offline mesajları gönder - önce RAM sonra kalıcı
    const allPending = [...(ramOnlyMessages[rn]||[]), ...(rooms[rn].messages||[])].filter(m=> m.to !== socket.id);
    if (allPending.length>0) {
      console.log(`${rn} için ${allPending.length} offline mesaj gönderiliyor -> ${socket.id}`);
      allPending.forEach(m=>{
        socket.emit(m.type==="media"?"chat-media":"chat-message", m.payload);
      });
    }

    socket.emit("joined-room", { count: Object.keys(rooms[rn].users).length, username: un });
    socket.to(rn).emit("user-connected", { id: socket.id, username: un });
    savePersist();
  });

  socket.on("signal", ({ room, signal })=>{
    const rn = normalize(room);
    socket.to(rn).emit("signal", signal);
  });

  socket.on("chat-message", async (data)=>{
    const rn = socket.room;
    if (!rn || !rooms[rn]) return;
    // data: { encryptedText, expireSec, msgId, username }
    const expireSec = Math.min(parseInt(data.expireSec||"1800"), 604800);
    const msgObj = {
      msgId: data.msgId,
      type: "text",
      payload: data,
      expireSec,
      createdAt: Date.now(),
      openedAt: null,
      deleteAt: null,
      from: socket.id,
      to: null // broadcast
    };
    // Hibrit saklama
    if (expireSec <= 900) {
      // 5dk 15dk -> sadece RAM
      if (!ramOnlyMessages[rn]) ramOnlyMessages[rn]=[];
      ramOnlyMessages[rn].push(msgObj);
      console.log(`RAM saklandı ${rn} ${expireSec}s`);
    } else {
      // 4s 24s 7gün -> kalıcı
      rooms[rn].messages.push(msgObj);
      savePersist();
      console.log(`KALICI saklandı ${rn} ${expireSec}s`);
    }
    socket.to(rn).emit("chat-message", data);
  });

  socket.on("chat-media", (data)=>{
    const rn = socket.room;
    if (!rn || !rooms[rn]) return;
    const expireSec = Math.min(parseInt(data.expireSec||"1800"), 604800);
    const msgObj = {
      msgId: data.msgId,
      type: "media",
      payload: data,
      expireSec,
      createdAt: Date.now(),
      openedAt: null,
      deleteAt: null,
      from: socket.id
    };
    if (expireSec <= 900) {
      if (!ramOnlyMessages[rn]) ramOnlyMessages[rn]=[];
      ramOnlyMessages[rn].push(msgObj);
    } else {
      rooms[rn].messages.push(msgObj);
      savePersist();
    }
    socket.to(rn).emit("chat-media", data);
  });

  socket.on("message-opened", ({ msgId, expireSec })=>{
    const rn = socket.room;
    if (!rn) return;
    const now = Date.now();
    const exp = Math.min(parseInt(expireSec||"1800"), 604800);
    // Find in both stores
    let found = null;
    for (const list of [ramOnlyMessages[rn]||[], rooms[rn]?.messages||[]]) {
      const m = list.find(x=> x.msgId===msgId);
      if (m) { found=m; break; }
    }
    if (found) {
      found.openedAt = now;
      found.deleteAt = now + exp*1000;
      console.log(`Mesaj açıldı ${msgId} -> ${exp}s sonra silinecek`);
      savePersist();
    }
    socket.to(rn).emit("message-opened", { msgId, deleteAt: now+exp*1000 });
  });

  socket.on("update-expire", ({ msgId, newExpireSec })=>{
    const rn = socket.room;
    if (!rn) return;
    newExpireSec = Math.min(parseInt(newExpireSec), 604800);
    // RAM'den kalıcıya taşıma veya tersi
    let msg = null;
    let fromRam = false;
    if (ramOnlyMessages[rn]) {
      const idx = ramOnlyMessages[rn].findIndex(m=> m.msgId===msgId && m.from===socket.id);
      if (idx!==-1) { msg = ramOnlyMessages[rn][idx]; fromRam=true; }
    }
    if (!msg && rooms[rn]) {
      msg = rooms[rn].messages.find(m=> m.msgId===msgId && m.from===socket.id);
    }
    if (!msg) return;
    msg.expireSec = newExpireSec;
    // Taşıma logic
    if (newExpireSec <=900 && !fromRam) {
      // kalıcıdan RAM'e
      rooms[rn].messages = rooms[rn].messages.filter(m=> m.msgId!==msgId);
      if (!ramOnlyMessages[rn]) ramOnlyMessages[rn]=[];
      ramOnlyMessages[rn].push(msg);
      console.log(`Taşındı: kalıcı -> RAM ${msgId}`);
    } else if (newExpireSec >900 && fromRam) {
      ramOnlyMessages[rn] = ramOnlyMessages[rn].filter(m=> m.msgId!==msgId);
      rooms[rn].messages.push(msg);
      console.log(`Taşındı: RAM -> kalıcı ${msgId}`);
    }
    savePersist();
    io.to(rn).emit("expire-updated", { msgId, newExpireSec });
  });

  socket.on("ping-check", (t)=> socket.emit("pong-check", t));
  socket.on("typing", (b)=> { if(socket.room) socket.to(socket.room).emit("typing", b); });
  socket.on("nudge", ()=> { if(socket.room) io.to(socket.room).emit("nudge"); });
  socket.on("fly-emoji", (d)=> { if(socket.room) socket.to(socket.room).emit("fly-emoji", d); });
  socket.on("message-read", (id)=> { if(socket.room) socket.to(socket.room).emit("message-read", id); });
  socket.on("messages-read-all", ()=> { if(socket.room) socket.to(socket.room).emit("messages-read-all"); });

  socket.on("disconnect", ()=>{
    const rn = socket.room;
    if (!rn || !rooms[rn]) return;
    delete rooms[rn].users[socket.id];
    if (Object.keys(rooms[rn].users).length===0) {
      rooms[rn].lastEmptyAt = Date.now();
      // RAM mesajları tutmaya devam et, kalıcılar zaten dosyada
    }
    socket.to(rn).emit("user-disconnected");
    savePersist();
    console.log("Çıktı:", socket.id, "oda:", rn);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log("Sunucu çalışıyor:", PORT));
