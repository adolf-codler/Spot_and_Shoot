import { Scene } from 'phaser';
import socket from '../../network/socket';

export default class Lobby extends Scene {
    constructor() {
        super('Lobby');
    }

    create() {
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
                hostBtn.setColor('#aaaaaa'); // Visual feedback
                // Added: the login name travels with the room request and is shown to the opponent.
                const roomConfig = {
                    torch_area: this.registry.get('torch_area') || 100,
                    bullet_speed: this.registry.get('bullet_speed') || 500,
                    player_speed: this.registry.get('player_speed') || 200,
                    max_players: this.registry.get('max_players') || 8
                };

                // Send both the name and the configuration to the server
                socket.emit('createRoom', { playerName, roomConfig });
            });

        // JOIN BUTTON
        this.add.text(400, 400, '[ JOIN GAME ]', { fontSize: '24px', color: '#ffff00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const code = window.prompt('Enter 5-character Room Code:');
                if (code && code.trim().length > 0) {
                    socket.emit('joinRoom', code.trim());
                }
        });

        // --- SOCKET EVENT LISTENERS ---

        socket.on('roomCreated', (roomCode: string) => {
            console.log('Successfully hosted room:', roomCode);
            // Alerting just for testing so you can see the code to type into the other window
            alert(`Room Created! Your code is: ${roomCode}`); 
            this.transitionToGame(roomCode, true);
        });

        socket.on('joinedRoom', (roomCode: string) => {
            console.log('Successfully joined room:', roomCode);
            this.transitionToGame(roomCode, false);
        });

        socket.on('error', (errorMessage: string) => {
            alert(errorMessage); 
            hostBtn.setColor('#00ff00'); // Reset button color on failure
        });
//room settings
        const roomSettingsBtn = this.add.text(950, 50, '⚙ (Room)', {
            fontSize: '32px',
            color: '#aaaaaa'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => roomSettingsBtn.setColor('#ffffff'))
        .on('pointerout', () => roomSettingsBtn.setColor('#aaaaaa'))
        .on('pointerdown', () => {
        this.scene.start('RoomSettings');
        });
    }

    transitionToGame(roomCode: string, isHost: boolean) {
        // CRITICAL: Remove listeners before leaving the scene so they don't fire twice if you come back
        socket.off('roomCreated');
        socket.off('joinedRoom');
        socket.off('error');

        // Start the Game scene and pass the room data as an object
        this.scene.start('Game', { roomCode: roomCode, isHost: isHost });
    }
}