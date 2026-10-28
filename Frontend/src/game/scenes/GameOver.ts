import { Scene } from 'phaser';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameover_text : Phaser.GameObjects.Text;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0xff0000);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.gameover_text = this.add.text(512, 330, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        this.gameover_text.setOrigin(0.5);

        // Added: make the existing but unused GameOver scene offer an explicit retry button.
        const retry = this.add.text(512, 450, 'PLAY AGAIN', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffff00',
            backgroundColor: '#333333', padding: { x: 18, y: 12 }, align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        retry.once('pointerdown', () => this.scene.start('Lobby'));
    }
}
