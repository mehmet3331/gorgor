const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // roomName -> { password, users:[], chatTimerSec }

io.on('connection', (socket)=>{
  socket.on('join-room', ({room,password,username})=>{
    const r = rooms[room];
    if(r && r.password !== password){
      socket.emit('room-error','Şifre yanlış');
      return;
    }
    if(!rooms[room]) rooms[room]={password, users:[], chatTimerSec:14400, chatTimerAt: Date.now()+14400*1000};
    if(rooms[room].users.length>=2){
      socket.emit('room-error','Oda dolu');
      return;
    }
    socket.join(room);
    socket.room=room;
    socket.username=username||'anon';
    rooms[room].users.push(socket.id);
    socket.emit('joined-room',{count:rooms[room].users.length, username:socket.username, timerSec:rooms[room].chatTimerSec});
    socket.to(room).emit('user-connected',{username:socket.username});
    // timer bilgisi gonder
    socket.emit('chat-timer',{sec:rooms[room].chatTimerSec, at:rooms[room].chatTimerAt});
  });

  socket.on('signal', ({room, signal})=>{
    socket.to(room).emit('signal', signal);
  });

  socket.on('chat-message', data=>{
    if(!socket.room) return;
    const roomData = rooms[socket.room];
    // RAM mod: <=15dk ise sadece relay et, saklama yok
    // >15dk ise de sadece relay, temizleme timer client tarafta
    socket.to(socket.room).emit('chat-message', data);
  });
  socket.on('chat-media', data=>{
    if(!socket.room) return;
    socket.to(socket.room).emit('chat-media', data);
  });
  socket.on('chat-clear', ()=>{
    if(!socket.room) return;
    io.to(socket.room).emit('chat-clear');
  });
  socket.on('chat-timer-set', ({sec, at})=>{
    if(!socket.room || !rooms[socket.room]) return;
    rooms[socket.room].chatTimerSec=sec;
    rooms[socket.room].chatTimerAt=at;
    socket.to(socket.room).emit('chat-timer',{sec, at});
  });
  socket.on('quality-change', q=>{ if(socket.room) socket.to(socket.room).emit('quality-change', q); });
  socket.on('phone-mode', en=>{ if(socket.room) socket.to(socket.room).emit('phone-mode', en); });
  socket.on('nudge', ()=>{ if(socket.room) socket.to(socket.room).emit('nudge'); });
  socket.on('fly-emoji', d=>{ if(socket.room) socket.to(socket.room).emit('fly-emoji', d); });
  socket.on('panic', ()=>{ if(socket.room) socket.to(socket.room).emit('panic'); });
  socket.on('ping-check', t=>{ socket.emit('pong-check', t); });
  socket.on('paused', ()=>{ /* optional */ });

  socket.on('disconnect', ()=>{
    if(socket.room && rooms[socket.room]){
      rooms[socket.room].users = rooms[socket.room].users.filter(id=>id!==socket.id);
      socket.to(socket.room).emit('user-disconnected',{username:socket.username});
      if(rooms[socket.room].users.length===0) delete rooms[socket.room];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`GORGOR V13 listening ${PORT}`));