const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// --- KALICI STORAGE ICIN ---
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ rooms: {} }));

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { rooms: {} }; }
}
function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db));
}
let db = loadDB();

// 5 dakikada bir süresi dolanları temizle
setInterval(() => {
  let changed = false;
  const now = Date.now();
  for (const roomName in db.rooms) {
    const room = db.rooms[roomName];
    if (!room.messages) continue;
    const before = room.messages.length;
    room.messages = room.messages.filter(m =>!m.deleteAt || m.deleteAt > now);
    if (room.messages.length!== before) changed = true;
  }
  if (changed) saveDB(db);
}, 60 * 1000);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // anlık kullanıcılar için hala RAM

io.on('connection', (socket) => {
  console.log('baglandi', socket.id);

  socket.on('join-room', ({ room, password, username }) => {
    // oda şifre kontrolü basit
    if (!rooms[room]) rooms[room] = { password, users: [] };
    if (rooms[room].password!== password) {
      socket.emit('room-error', 'Şifre yanlış');
      return;
    }
    if (rooms[room].users.length >= 2) {
      socket.emit('room-error', 'Oda dolu');
      return;
    }

    socket.join(room);
    socket.room = room;
    socket.username = username;
    rooms[room].users.push({ id: socket.id, username });

    // DB'de oda yoksa oluştur
    if (!db.rooms[room]) db.rooms[room] = { messages: [] };

    // KALICI MESAJLARI GÖNDER - burası düzeldi
    const pending = db.rooms[room].messages || [];
    socket.emit('pending-messages', pending);

    socket.emit('joined-room', { username, count: rooms[room].users.length });
    socket.to(room).emit('user-connected', { username });

    socket.on('chat-message', (data) => {
      // DB'ye kaydet - KALICI
      const msg = {
        msgId: data.msgId,
        enc: data.enc,
        expireSec: data.expireSec,
        type: 'text',
        username: socket.username.toLowerCase(),
        realUsername: socket.username,
        opened: false,
        createdAt: Date.now()
      };
      db.rooms[room].messages.push(msg);
      saveDB(db);
      socket.to(room).emit('chat-message', {...data, username: socket.username.toLowerCase(), realUsername: socket.username });
    });

    socket.on('chat-media', (data) => {
      // Foto/video da artık kalıcı
      const msg = {
        msgId: data.msgId,
        enc: data.enc,
        expireSec: data.expireSec,
        type: data.mediaType,
        mediaType: data.mediaType,
        username: socket.username.toLowerCase(),
        realUsername: socket.username,
        opened: false,
        createdAt: Date.now()
      };
      db.rooms[room].messages.push(msg);
      saveDB(db);
      socket.to(room).emit('chat-media', {...data, username: socket.username.toLowerCase(), realUsername: socket.username });
    });

    socket.on('message-opened', ({ msgId }) => {
      const roomData = db.rooms[room];
      if (!roomData) return;
      const m = roomData.messages.find(x => x.msgId === msgId);
      if (m &&!m.opened) {
        m.opened = true;
        m.deleteAt = Date.now() + m.expireSec * 1000;
        saveDB(db);
        io.to(room).emit('message-opened', { msgId, deleteAt: m.deleteAt, expireSec: m.expireSec });
        socket.emit('message-opened-ack', { msgId, deleteAt: m.deleteAt, expireSec: m.expireSec });
      }
    });

    socket.on('reduce-request', ({ msgId, newExpireSec }) => {
      const roomData = db.rooms[room];
      const m = roomData?.messages.find(x => x.msgId === msgId);
      if (m && m.deleteAt) {
        m.deleteAt = Date.now() + newExpireSec * 1000;
        m.expireSec = newExpireSec;
        saveDB(db);
        io.to(room).emit('reduce-accepted', { msgId, newExpireSec, newDeleteAt: m.deleteAt });
      }
    });

    socket.on('extend-request', ({ msgId, extraSec }) => {
      const roomData = db.rooms[room];
      const m = roomData?.messages.find(x => x.msgId === msgId);
      if (m && m.deleteAt) {
        m.deleteAt += extraSec * 1000;
        saveDB(db);
        io.to(room).emit('extend-accepted', { msgId, newDeleteAt: m.deleteAt, extraSec });
      }
    });

    socket.on('disconnect', () => {
      if (rooms[room]) {
        rooms[room].users = rooms[room].users.filter(u => u.id!== socket.id);
        if (rooms[room].users.length === 0) {
          // Oda boşalsa bile mesajları SİLME - KALICI KALSIN
          // delete rooms[room] demiyoruz mesajlar için
        }
        socket.to(room).emit('user-disconnected');
      }
    });

    // diğer eventler (nudge, fly-emoji, typing, phone-mode, panic) aynı kalsın
    socket.on('nudge', () => socket.to(room).emit('nudge'));
    socket.on('fly-emoji', (d) => socket.to(room).emit('fly-emoji', d));
    socket.on('typing', (b) => socket.to(room).emit('typing', { username: socket.username, typing: b }));
    socket.on('signal', ({ room, signal }) => socket.to(room).emit('signal', signal));
    socket.on('ping-check', (t) => socket.emit('pong-check', t));
    socket.on('phone-mode', (e) => socket.to(room).emit('phone-mode', e));
    socket.on('panic', () => {
      if (db.rooms[room]) { db.rooms[room].messages = []; saveDB(db); }
      socket.to(room).emit('panic');
    });
    socket.on('change-password', (p) => { if(rooms[room]) rooms[room].password = p; });
    socket.on('quality-change', () => {});
    socket.on('message-read', () => {});
    socket.on('messages-read-all', () => {});
  });
});

server.listen(PORT, () => console.log('GOR calisiyor port ' + PORT));