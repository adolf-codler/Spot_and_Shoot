import { Scene } from 'phaser';
import socket from '../../network/socket';

export default class Lobby extends Scene {
    constructor() {
        super('Lobby');
    }

    create() {
        // Added: clear any listeners left from a previous visit to avoid duplicate transitions.
        socket.off('roomCreated');
        socket.off('joinedRoom');
        socket.off('roomError');

        // Title
        this.add.text(400, 150, 'SPOT AND SHOOT', { 
            fontSize: '48px', 
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // HOST BUTTON
        const hostBtn = this.add.text(400, 300, '[ HOST GAME ]', { fontSize: '24px', color: '#00ff00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const playerName = window.prompt('Enter your player name:')?.trim();
                if (!playerName) return;
                hostBtn.setColor('#aaaaaa'); // Visual feedback
                // Added: the login name travels with the room request and is shown to the opponent.
                socket.emit('createRoom', { playerName });
            });

        // JOIN BUTTON
        this.add.text(400, 400, '[ JOIN GAME ]', { fontSize: '24px', color: '#ffff00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const playerName = window.prompt('Enter your player name:')?.trim();
                if (!playerName) return;
                const code = window.prompt('Enter 5-character Room Code:');
                if (code && code.trim().length > 0) {
                    // Added: joining players share their login name with the host.
                    socket.emit('joinRoom', { code: code.trim().toUpperCase(), playerName });
                }
        });

        // --- SOCKET EVENT LISTENERS ---

        // Added: register one-shot room responses so stale handlers cannot fire later.
        socket.once('roomCreated', (roomCode: string) => {
            console.log('Successfully hosted room:', roomCode);
            // Alerting just for testing so you can see the code to type into the other window
            alert(`Room Created! Your code is: ${roomCode}`); 
            this.transitionToGame(roomCode, true);
        });

        socket.once('joinedRoom', (roomCode: string) => {
            console.log('Successfully joined room:', roomCode);
            this.transitionToGame(roomCode, false);
        });

        socket.on('roomError', (errorMessage: string) => {
            alert(errorMessage); 
            hostBtn.setColor('#00ff00'); // Reset button color on failure
        });
    }

    transitionToGame(roomCode: string, isHost: boolean) {
        // CRITICAL: Remove listeners before leaving the scene so they don't fire twice if you come back
        socket.off('roomCreated');
        socket.off('joinedRoom');
        socket.off('roomError');

        // Added: after hosting/joining (login), enter the websocket-backed test match.
        this.scene.start('TestScene', { roomCode: roomCode, isHost: isHost });
    }
}
