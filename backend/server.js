const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const activeRooms = new Map();
const roomState = {}; // NEW: Tracks X, Y coordinates for players in a room

io.on('connection', (socket) => {
    
    socket.on('createRoom', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.join(roomCode);
        activeRooms.set(roomCode, [socket.id]);
        roomState[roomCode] = { players: {} }; // Initialize game state
        socket.emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', (roomCode) => {
        const code = roomCode.toUpperCase();
        if (activeRooms.has(code)) {
            socket.join(code);
            activeRooms.get(code).push(socket.id);
            socket.emit('joinedRoom', code);
            socket.to(code).emit('playerJoined', socket.id);
        }
    });

    // movement sync check (temporary)

    // Player enters the actual Game scene
    socket.on('spawnInGame', (roomCode) => {
        if (!roomState[roomCode]) return;
        
        // Assign a random starting position
        const playerInfo = {
            x: Math.floor(Math.random() * 600) + 100,
            y: Math.floor(Math.random() * 400) + 100,
            id: socket.id.substring(0, 4) // Shorten ID for display
        };
        
        roomState[roomCode].players[socket.id] = playerInfo;

        // Send all current players to the new guy
        socket.emit('currentPlayers', roomState[roomCode].players);
        // Tell everyone else the new guy spawned
        socket.to(roomCode).emit('newPlayerSpawned', { id: socket.id, playerInfo });
    });

    // Player presses an arrow key
    socket.on('playerMoved', (data) => {
        const { roomCode, x, y } = data;
        if (roomState[roomCode] && roomState[roomCode].players[socket.id]) {
            roomState[roomCode].players[socket.id].x = x;
            roomState[roomCode].players[socket.id].y = y;
            
            // Blast the new coordinates to everyone else
            socket.to(roomCode).emit('playerMoved', { id: socket.id, x, y });
        }
    });

    socket.on('disconnect', () => {
        for (const [roomCode, players] of activeRooms.entries()) {
            const index = players.indexOf(socket.id);
            if (index !== -1) {
                players.splice(index, 1);
                if (roomState[roomCode] && roomState[roomCode].players[socket.id]) {
                    delete roomState[roomCode].players[socket.id];
                    // Tell frontend to delete the square
                    socket.to(roomCode).emit('playerDisconnected', socket.id); 
                }
                if (players.length === 0) {
                    activeRooms.delete(roomCode);
                    delete roomState[roomCode];
                }
                break;
            }
        }
    });
});

server.listen(3000, () => console.log('Server listening on port 3000'));