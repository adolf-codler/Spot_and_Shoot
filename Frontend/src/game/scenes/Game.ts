import { Scene } from 'phaser';
import socket from '../../network/socket';
import { playersCollide } from '../systems/Collision';

export default class Game extends Scene {
    private roomCode!: string;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Track visual objects
    private localPlayerObj!: { rect: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text };
    private otherPlayers: { [id: string]: { rect: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text } } = {};
    // Added: hold the end screen objects so the game can restart in the same room.
    private gameFinished = false;
    private endScreen?: Phaser.GameObjects.Container;

    constructor() {
        super('Game');
    }

    init(data: { roomCode: string, isHost: boolean }) {
        this.roomCode = data.roomCode;
    }

    create() {
        // Enable keyboard
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // Tell server we arrived and need a spawn location
        socket.emit('spawnInGame', this.roomCode);

        // 1. Initial load of everyone already in the room
        socket.on('currentPlayers', (players: any) => {
            Object.keys(players).forEach((id) => {
                if (id === socket.id) {
                    this.addLocalPlayer(players[id]);
                } else {
                    this.addOtherPlayer(id, players[id]);
                }
            });
        });

        // 2. Someone new spawned in after us
        socket.on('newPlayerSpawned', (data: any) => {
            this.addOtherPlayer(data.id, data.playerInfo);
        });

        // 3. Someone else moved
        socket.on('playerMoved', (data: any) => {
            if (this.otherPlayers[data.id]) {
                this.otherPlayers[data.id].rect.setPosition(data.x, data.y);
                this.otherPlayers[data.id].text.setPosition(data.x, data.y);
                // Added: check the synced opponent position locally for immediate collision feedback.
                if (this.localPlayerObj && playersCollide(this.localPlayerObj.rect, this.otherPlayers[data.id].rect)) {
                    this.showPlayAgainScreen();
                }
            }
        });

        // 4. Someone quit
        socket.on('playerDisconnected', (id: string) => {
            if (this.otherPlayers[id]) {
                this.otherPlayers[id].rect.destroy();
                this.otherPlayers[id].text.destroy();
                delete this.otherPlayers[id];
            }
        });

        // Added: stop movement on collision and show the replay screen to both players.
        socket.on('gameFinished', () => this.showPlayAgainScreen());
        // Added: the server sends fresh positions after either player presses Play Again.
        socket.on('gameRestarted', (players: any) => {
            this.endScreen?.destroy();
            this.endScreen = undefined;
            this.gameFinished = false;
            Object.keys(players).forEach((id) => {
                if (id === socket.id && this.localPlayerObj) {
                    this.localPlayerObj.rect.setPosition(players[id].x, players[id].y);
                    this.localPlayerObj.text.setPosition(players[id].x, players[id].y);
                } else if (this.otherPlayers[id]) {
                    this.otherPlayers[id].rect.setPosition(players[id].x, players[id].y);
                    this.otherPlayers[id].text.setPosition(players[id].x, players[id].y);
                }
            });
        });
    }

    update() {
        if (!this.localPlayerObj || this.gameFinished) return; // Added: freeze players while the end screen is open.

        let moved = false;
        const speed = 5;

        if (this.cursors.left.isDown) {
            this.localPlayerObj.rect.x -= speed;
            moved = true;
        } else if (this.cursors.right.isDown) {
            this.localPlayerObj.rect.x += speed;
            moved = true;
        }
        
        if (this.cursors.up.isDown) {
            this.localPlayerObj.rect.y -= speed;
            moved = true;
        } else if (this.cursors.down.isDown) {
            this.localPlayerObj.rect.y += speed;
            moved = true;
        }

        if (moved) {
            // Keep text locked to the square
            this.localPlayerObj.text.setPosition(this.localPlayerObj.rect.x, this.localPlayerObj.rect.y);
            
            // Blast new coordinates to server
            socket.emit('playerMoved', { 
                roomCode: this.roomCode, 
                x: this.localPlayerObj.rect.x, 
                y: this.localPlayerObj.rect.y 
            });
        }
    }

    // Added: render an in-scene end screen so replay keeps the current room connection.
    private showPlayAgainScreen() {
        if (this.gameFinished) return;
        this.gameFinished = true;
        const shade = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.75);
        const title = this.add.text(512, 320, 'Game Over', {
            fontSize: '56px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        const button = this.add.text(512, 420, 'PLAY AGAIN', {
            fontSize: '28px', color: '#ffff00', backgroundColor: '#333333', padding: { x: 18, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => socket.emit('playAgain', this.roomCode));
        this.endScreen = this.add.container(0, 0, [shade, title, button]).setDepth(10);
    }

    // --- HELPER FUNCTIONS ---

    addLocalPlayer(playerInfo: any) {
        // Local player is Green
        const rect = this.add.rectangle(playerInfo.x, playerInfo.y, 40, 40, 0x00ff00);
        const text = this.add.text(playerInfo.x, playerInfo.y, playerInfo.id, { color: '#000' }).setOrigin(0.5);
        this.localPlayerObj = { rect, text };
    }

    addOtherPlayer(id: string, playerInfo: any) {
        // Other players are Red
        const rect = this.add.rectangle(playerInfo.x, playerInfo.y, 40, 40, 0xff0000);
        const text = this.add.text(playerInfo.x, playerInfo.y, playerInfo.id, { color: '#000' }).setOrigin(0.5);
        this.otherPlayers[id] = { rect, text };
    }
}

// Added: preserve the named export expected by the scene list in main.ts.
export { Game };
