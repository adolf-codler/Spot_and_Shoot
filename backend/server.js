const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// Added: use the same 40px player bounds as the frontend for collision detection.
const playersCollide = (a, b) => Math.abs(a.x - b.x) < 40 && Math.abs(a.y - b.y) < 40;
// Added: keep the server's accepted player positions inside the Phaser canvas.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const activeRooms = new Map();
const roomState = {}; // NEW: Tracks X, Y coordinates for players in a room

io.on('connection', (socket) => {
    
    socket.on('createRoom', (data = {}) => {
        // Added: keep the lobby's chosen login name for the shared player label.
        socket.data.playerName = typeof data?.playerName === 'string' ? data.playerName.trim().slice(0, 16) : '';
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.join(roomCode);
        activeRooms.set(roomCode, [socket.id]);
        roomState[roomCode] = { players: {} }; // Initialize game state
        socket.emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', (data) => {
        const code = typeof data === 'string' ? data.toUpperCase() : String(data?.code || '').toUpperCase();
        // Added: save the joining player's name before the game scene spawns them.
        socket.data.playerName = typeof data?.playerName === 'string' ? data.playerName.trim().slice(0, 16) : '';
        if (activeRooms.has(code)) {
            if (activeRooms.get(code).length >= 2) {
                socket.emit('roomError', 'That room already has two players.');
                return;
            }
            socket.join(code);
            activeRooms.get(code).push(socket.id);
            socket.emit('joinedRoom', code);
            socket.to(code).emit('playerJoined', socket.id);
        } else {
            // Added: report invalid room codes to the lobby instead of leaving the join screen stuck.
            socket.emit('roomError', 'Room not found. Check the code and try again.');
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
            // Added: display the login name to both clients, with the short socket ID as fallback.
            id: socket.data.playerName || socket.id.substring(0, 4)
        };
        
        roomState[roomCode].players[socket.id] = playerInfo;

        // Send all current players to the new guy
        socket.emit('currentPlayers', roomState[roomCode].players);
        // Tell everyone else the new guy spawned
        socket.to(roomCode).emit('newPlayerSpawned', { id: socket.id, playerInfo });
    });

    // Player presses an arrow key
    socket.on('playerMoved', (data) => {
        if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
        const { roomCode } = data;
        if (roomState[roomCode] && roomState[roomCode].players[socket.id] && !roomState[roomCode].finished) {
            const x = clamp(data.x, 20, 1004);
            const y = clamp(data.y, 20, 748);
            roomState[roomCode].players[socket.id].x = x;
            roomState[roomCode].players[socket.id].y = y;
            
            // Blast the new coordinates to everyone else
            socket.to(roomCode).emit('playerMoved', { id: socket.id, x, y });

            // Added: finish the round once two player rectangles overlap.
            const opponents = Object.entries(roomState[roomCode].players).filter(([id]) => id !== socket.id);
            const collided = opponents.some(([, opponent]) => playersCollide(roomState[roomCode].players[socket.id], opponent));
            if (collided) {
                roomState[roomCode].finished = true;
                // Added: include a winner name so both clients can show who won on the retry screen.
                io.to(roomCode).emit('gameFinished', { winnerId: socket.id, winnerName: roomState[roomCode].players[socket.id].id });
            }
        }
    });

    // Added: relay validated shots to every client in the same match.
    socket.on('playerShot', (data) => {
        const { roomCode, x, y, velocityX, velocityY } = data || {};
        if (!roomState[roomCode] || roomState[roomCode].finished || !roomState[roomCode].players[socket.id]) return;
        if (![x, y, velocityX, velocityY].every(Number.isFinite)) return;
        io.to(roomCode).emit('playerShot', { id: socket.id, x, y, velocityX, velocityY });
    });

    // Added: accept a hit only when shooter and target are both players in the same room.
    socket.on('playerHit', (data) => {
        const { roomCode, targetId } = data || {};
        if (!roomState[roomCode] || roomState[roomCode].finished) return;
        if (!roomState[roomCode].players[socket.id] || !roomState[roomCode].players[targetId] || socket.id === targetId) return;
        roomState[roomCode].finished = true;
        // Added: share the winning player's display name with both clients.
        io.to(roomCode).emit('gameFinished', {
            winnerId: socket.id,
            winnerName: roomState[roomCode].players[socket.id].id,
            targetId
        });
    });

    // Added: Play Again starts a fresh round for everyone in the room.
    socket.on('playAgain', (roomCode) => {
        if (!roomState[roomCode] || !activeRooms.get(roomCode)?.includes(socket.id)) return;
        roomState[roomCode].finished = false;
        for (const id of Object.keys(roomState[roomCode].players)) {
            roomState[roomCode].players[id].x = Math.floor(Math.random() * 600) + 100;
            roomState[roomCode].players[id].y = Math.floor(Math.random() * 400) + 100;
        }
        io.to(roomCode).emit('gameRestarted', roomState[roomCode].players);
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

// Added: allow isolated integration checks and deployments to choose the server port.
const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`Server listening on port ${port}`));
