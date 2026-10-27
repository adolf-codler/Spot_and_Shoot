const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Allows your Vite frontend to talk to this backend

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, restrict this to your frontend domain
        methods: ["GET", "POST"]
    }
});

// Track rooms and the players inside them
const activeRooms = new Map();

io.on('connection', (socket) => {
    console.log(`[CONNECTED] Player ID: ${socket.id}`);

    // 1. Host creates a room
    socket.on('createRoom', () => {
        // Generate a random 5-character alphanumeric code
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        
        socket.join(roomCode);
        activeRooms.set(roomCode, [socket.id]);

        console.log(`[ROOM CREATED] ${roomCode} by ${socket.id}`);
        
        // Send the code back to the host
        socket.emit('roomCreated', roomCode);
    });

    // 2. Player joins an existing room
    socket.on('joinRoom', (roomCode) => {
        const code = roomCode.toUpperCase();
        
        if (activeRooms.has(code)) {
            socket.join(code);
            
            const players = activeRooms.get(code);
            players.push(socket.id);
            activeRooms.set(code, players);

            console.log(`[JOINED] Player ${socket.id} joined room ${code}`);
            
            // Confirm to the player they joined successfully
            socket.emit('joinedRoom', code);
            
            // Alert everyone else in the room that a new player arrived
            socket.to(code).emit('playerJoined', socket.id);
        } else {
            socket.emit('error', 'Room not found or invalid code.');
        }
    });

    // 3. Handle disconnects
    socket.on('disconnect', () => {
        console.log(`[DISCONNECTED] Player ID: ${socket.id}`);
        
        // Iterate through rooms to remove the disconnected player
        for (const [roomCode, players] of activeRooms.entries()) {
            const index = players.indexOf(socket.id);
            if (index !== -1) {
                players.splice(index, 1);
                
                // If room is empty, delete it
                if (players.length === 0) {
                    activeRooms.delete(roomCode);
                    console.log(`[ROOM DELETED] ${roomCode} is empty.`);
                } else {
                    // Notify remaining players
                    socket.to(roomCode).emit('playerLeft', socket.id);
                }
                break;
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});