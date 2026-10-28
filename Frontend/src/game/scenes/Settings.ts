import { Scene, GameObjects } from 'phaser';

export default class Settings extends Scene {
    constructor() {
        super('Settings');
    }

    create() {
        // Initialize default global settings if they don't exist yet
        if (this.registry.get('vol_music') === undefined) {
            this.registry.set('vol_music', 100);
            this.registry.set('vol_sfx', 100); // Footsteps & Bullets
            this.registry.set('sensitivity', 50);
        }

        this.add.text(512, 100, 'SETTINGS', { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // Dummy Music Volume Control
        const musicText = this.add.text(512, 250, `Music Volume: ${this.registry.get('vol_music')}%`, { fontSize: '28px' }).setOrigin(0.5);
        musicText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('vol_music');
            let next = current >= 100 ? 0 : current + 10;
            this.registry.set('vol_music', next);
            musicText.setText(`Music Volume: ${next}%`);
        });

        // Dummy SFX Volume Control
        const sfxText = this.add.text(512, 350, `SFX Volume: ${this.registry.get('vol_sfx')}%`, { fontSize: '28px' }).setOrigin(0.5);
        sfxText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('vol_sfx');
            let next = current >= 100 ? 0 : current + 10;
            this.registry.set('vol_sfx', next);
            sfxText.setText(`SFX Volume: ${next}%`);
        });

        // Dummy Sensitivity Control
        const sensText = this.add.text(512, 450, `Aim Sensitivity: ${this.registry.get('sensitivity')}%`, { fontSize: '28px' }).setOrigin(0.5);
        sensText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            let current = this.registry.get('sensitivity');
            let next = current >= 100 ? 10 : current + 10;
            this.registry.set('sensitivity', next);
            sensText.setText(`Aim Sensitivity: ${next}%`);
        });

        // Back Button
        const backBtn = this.add.text(512, 600, '[ BACK TO MENU ]', { fontSize: '32px', color: '#ff0000' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('MainMenu');
            });
    }
}