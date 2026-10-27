import { Scene } from 'phaser';
import socket from '../../network/socket';

export default class Game extends Scene {
    private roomCode!: string;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Track visual objects
    private localPlayerObj!: { rect: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text };
    private otherPlayers: { [id: string]: { rect: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text } } = {};

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
    }

    update() {
        if (!this.localPlayerObj) return; // Wait until server spawns us

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
