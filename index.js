const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Caja relay server OK');
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', (roomCode) => {
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = String(roomCode).trim().toLowerCase();
    const existingCount = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
    socket.join(currentRoom);
    const count = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
    io.to(currentRoom).emit('room-users', count);
    if (existingCount > 0) {
      // Pedirle a los que ya estaban que manden sus datos al nuevo
      socket.to(currentRoom).emit('new-peer');
    }
  });

  socket.on('data-update', ({ roomCode, key, data }) => {
    const room = String(roomCode).trim().toLowerCase();
    socket.to(room).emit('data-update', { key, data });
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      setTimeout(() => {
        const count = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
        io.to(currentRoom).emit('room-users', count);
      }, 200);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Caja relay server running on port ${PORT}`);
});
