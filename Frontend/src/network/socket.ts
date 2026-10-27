import { io } from 'socket.io-client';

// Connect to your local Node server. 
// Note: Change this to your live server URL when you deploy the game later.
const socket = io('http://localhost:3000');

export default socket;