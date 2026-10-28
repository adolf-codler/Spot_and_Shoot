import { Scene } from 'phaser';

export default class RoomSettings extends Scene {
    constructor() {
        super('RoomSettings');
    }

    create() {
        // Initialize default room settings in the registry
        if (this.registry.get('torch_area') === undefined) {
            this.registry.set('torch_area', 100);    // Radius in pixels
            this.registry.set('bullet_speed', 500);  // Speed in px/s
            this.registry.set('player_speed', 200);  // Speed in px/s
            this.registry.set('max_players', 8);     // Max allowed in room
        }

        this.add.text(512, 100, 'ROOM SETTINGS', { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // Dummy Torch Light Area
        const torchText = this.add.text(512, 250, `Torch Light Area: ${this.registry.get('torch_area')}px`, { fontSize: '28px' }).setOrigin(0.5);
        torchText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('torch_area');
            let next = current >= 300 ? 50 : current + 50;
            this.registry.set('torch_area', next);
            torchText.setText(`Torch Light Area: ${next}px`);
        });

        // Dummy Bullet Speed
        const bulletText = this.add.text(512, 330, `Bullet Speed: ${this.registry.get('bullet_speed')} px/s`, { fontSize: '28px' }).setOrigin(0.5);
        bulletText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('bullet_speed');
            let next = current >= 1000 ? 300 : current + 100;
            this.registry.set('bullet_speed', next);
            bulletText.setText(`Bullet Speed: ${next} px/s`);
        });

        // Dummy Player Speed
        const speedText = this.add.text(512, 410, `Player Speed: ${this.registry.get('player_speed')} px/s`, { fontSize: '28px' }).setOrigin(0.5);
        speedText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('player_speed');
            let next = current >= 400 ? 100 : current + 50;
            this.registry.set('player_speed', next);
            speedText.setText(`Player Speed: ${next} px/s`);
        });

        // Dummy Max Players
        const maxPlayersText = this.add.text(512, 490, `Max Players: ${this.registry.get('max_players')}`, { fontSize: '28px' }).setOrigin(0.5);
        maxPlayersText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('max_players');
            let next = current >= 10 ? 2 : current + 1;
            this.registry.set('max_players', next);
            maxPlayersText.setText(`Max Players: ${next}`);
        });

        // Back Button
        this.add.text(512, 620, '[ BACK TO LOBBY ]', { fontSize: '32px', color: '#ff0000' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('Lobby');
            });
    }
}