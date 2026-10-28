import { io } from 'socket.io-client';

// Added: allow the frontend to target the matching backend URL in local and deployed builds.
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000');

export default socket;
