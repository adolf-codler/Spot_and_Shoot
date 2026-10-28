import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene
{
    background!: GameObjects.Image;
    title!: GameObjects.Text;
    playButton!: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Add the background image (centered in a 1024x768 canvas)
        this.background = this.add.image(512, 384, 'background');

        // Game Title
        this.title = this.add.text(512, 250, 'SPOT AND SHOOT', {
            fontFamily: 'Arial Black', 
            fontSize: 64, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
        const settingsBtn = this.add.text(950, 50, '⚙', {
            fontSize: '42px',
            color: '#aaaaaa'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => settingsBtn.setColor('#ffffff'))
        .on('pointerout', () => settingsBtn.setColor('#aaaaaa'))
        .on('pointerdown', () => {
            this.scene.start('Settings');
        });
        // Interactive PLAY Button
        this.playButton = this.add.text(512, 450, '[ PLAY ]', {
            fontFamily: 'Arial Black', 
            fontSize: 38, 
            color: '#00ff00',
            stroke: '#000000', 
            strokeThickness: 6,
            align: 'center'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
            this.playButton.setColor('#ffffff'); // Hover effect
        })
        .on('pointerout', () => {
            this.playButton.setColor('#00ff00'); // Reset color
        })
        .on('pointerdown', () => {
            this.playButton.setColor('#aaaaaa'); // Click effect
            this.scene.start('Lobby'); // Route to your networking lobby
        });
    }
}