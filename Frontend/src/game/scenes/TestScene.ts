import { Scene, GameObjects, Input, Math as Pmath } from "phaser";

export default class TestScene extends Scene{
  private player!: GameObjects.Rectangle
  private projectiles: GameObjects.Rectangle[]=[]

  constructor(){
    super('TestScene')
  }

  create(){
    this.player = this.add.rectangle(400, 300, 20, 20, 0x00ff00)

    this.input.on("pointerdown", (pointer: Input.Pointer) => {
      if (pointer.leftButtonDown()) {
	this.shoot();
      }
    });
  }

  update() {
    for (const projectile of this.projectiles) {
      projectile.x += projectile.getData("velocityX");
      projectile.y += projectile.getData("velocityY");
    }

    this.projectiles = this.projectiles.filter(projectile => {
      const outside =
	projectile.x < -20 ||
	projectile.x > 1100 ||
	projectile.y < -20 ||
	projectile.y > 800 ;

      if (outside) {
	projectile.destroy();
	return false;
      }

      return true;
    });
  }

  private shoot() {
    const angle = Pmath.Angle.Between(
      this.player.x,
      this.player.y,
      this.input.activePointer.x,
      this.input.activePointer.y
    );

    const projectile = this.add.rectangle(
      this.player.x,
      this.player.y,
      8,
      8,
      0xffff00
    );

    const speed = 5;
    projectile.setData("velocityX", Math.cos(angle) * speed);
    projectile.setData("velocityY", Math.sin(angle) * speed);

    this.projectiles.push(projectile);
  }
}


