import { Scene, GameObjects, Input, Math as Pmath } from "phaser";
import socket from "../../network/socket";

export default class TestScene extends Scene{
  private roomCode = ""
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  // Added: keep WASD available alongside the arrow-key controls.
  private wasd!: Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
  private player?: { rect: GameObjects.Rectangle; label: GameObjects.Text }
  private opponents: Record<string, { rect: GameObjects.Rectangle; label: GameObjects.Text; targetX: number; targetY: number }> = {}
  private projectiles: Array<{ rect: GameObjects.Rectangle; ownerId: string; x: number; y: number; velocityX: number; velocityY: number; createdAt: number; hitReported: boolean }> = []
  private lastMoveSentAt = 0
  private lastReplicatedX = 0
  private lastReplicatedY = 0
  private gameFinished = false
  private endScreen?: GameObjects.Container

  constructor(){
    super('TestScene')
  }

  init(data: { roomCode: string }) {
    this.roomCode = data.roomCode
  }

  create(){
    this.add.text(20, 20, `ROOM ${this.roomCode}  |  ARROWS / WASD: MOVE  |  CLICK: SHOOT`, { color: '#ffffff' })
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = {
        w: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.D)
      }
    }

    // Added: clear stale handlers before this room scene is entered again after a retry.
    socket.off('currentPlayers')
    socket.off('newPlayerSpawned')
    socket.off('playerMoved')
    socket.off('playerDisconnected')
    socket.off('playerShot')
    socket.off('gameFinished')
    socket.off('gameRestarted')

    socket.on('currentPlayers', (players: Record<string, any>) => {
      Object.entries(players).forEach(([id, info]) => this.addPlayer(id, info))
    })
    socket.on('newPlayerSpawned', (data: { id: string; playerInfo: any }) => this.addPlayer(data.id, data.playerInfo))
    socket.on('playerMoved', (data: { id: string; x: number; y: number }) => {
      const opponent = this.opponents[data.id]
      if (opponent) {
        opponent.targetX = data.x
        opponent.targetY = data.y
      }
    })
    socket.on('playerDisconnected', (id: string) => {
      this.opponents[id]?.rect.destroy()
      this.opponents[id]?.label.destroy()
      delete this.opponents[id]
    })
    socket.on('playerShot', (shot: { id: string; x: number; y: number; velocityX: number; velocityY: number }) => {
      this.addProjectile(shot.id, shot.x, shot.y, shot.velocityX, shot.velocityY)
    })
    // Added: display the same winning player's name on both clients.
    socket.on('gameFinished', (result: { winnerName?: string; winnerId?: string } = {}) => this.finishRound(result))
    socket.on('gameRestarted', (players: Record<string, any>) => this.resetRound(players))

    // Added: register with the websocket room and receive the shared player state.
    socket.emit('spawnInGame', this.roomCode)

    this.input.on("pointerdown", (pointer: Input.Pointer) => {
      if (pointer.leftButtonDown() && this.player && !this.gameFinished) this.shoot()
    });
  }

  update(time: number, delta: number) {
    if (!this.player || this.gameFinished) return

    const speed = 5
    if (this.cursors.left.isDown || this.wasd.a.isDown) this.player.rect.x -= speed
    else if (this.cursors.right.isDown || this.wasd.d.isDown) this.player.rect.x += speed
    if (this.cursors.up.isDown || this.wasd.w.isDown) this.player.rect.y -= speed
    else if (this.cursors.down.isDown || this.wasd.s.isDown) this.player.rect.y += speed
    // Added: keep the player fully inside the 1024x768 play area on every client.
    this.player.rect.x = Pmath.Clamp(this.player.rect.x, 20, 1004)
    this.player.rect.y = Pmath.Clamp(this.player.rect.y, 20, 748)
    const needsSync = this.player.rect.x !== this.lastReplicatedX || this.player.rect.y !== this.lastReplicatedY
    if (needsSync && time - this.lastMoveSentAt >= 50) {
      this.lastMoveSentAt = time
      this.lastReplicatedX = this.player.rect.x
      this.lastReplicatedY = this.player.rect.y
      this.player.label.setPosition(this.player.rect.x, this.player.rect.y)
      // Added: throttle movement to 20 updates/second to avoid flooding the host's socket.
      socket.emit('playerMoved', { roomCode: this.roomCode, x: this.player.rect.x, y: this.player.rect.y })
    }
    this.player.label.setPosition(this.player.rect.x, this.player.rect.y)

    // Added: smooth remote player positions between websocket updates.
    const blend = Math.min(1, delta / 70)
    Object.values(this.opponents).forEach(opponent => {
      opponent.rect.x += (opponent.targetX - opponent.rect.x) * blend
      opponent.rect.y += (opponent.targetY - opponent.rect.y) * blend
      opponent.label.setPosition(opponent.rect.x, opponent.rect.y)
    })

    for (const projectile of this.projectiles) {
      // Added: derive bullet positions from elapsed time so clients use the same speed per second.
      const elapsed = Math.max(0, (time - projectile.createdAt) / 1000)
      projectile.rect.setPosition(projectile.x + projectile.velocityX * elapsed, projectile.y + projectile.velocityY * elapsed)
      // Added: only the shooter reports its own hit; the server ends the round for the room.
      if (projectile.ownerId === socket.id && !projectile.hitReported) {
        const hit = Object.entries(this.opponents).find(([, opponent]) =>
          Math.abs(projectile.rect.x - opponent.rect.x) < 24 && Math.abs(projectile.rect.y - opponent.rect.y) < 24
        )
        if (hit) {
          socket.emit('playerHit', { roomCode: this.roomCode, targetId: hit[0] })
          projectile.rect.destroy()
          projectile.hitReported = true
        }
      }
    }

    this.projectiles = this.projectiles.filter(projectile => {
      // Added: despawn shots as soon as they leave the actual canvas bounds.
      const outside = projectile.rect.x < -4 || projectile.rect.x > 1028 || projectile.rect.y < -4 || projectile.rect.y > 772 || projectile.hitReported
      if (outside) projectile.rect.destroy()
      return !outside
    })
  }

  // Added: the server broadcasts a shared end screen and retry action to both players.
  private finishRound(result: { winnerName?: string; winnerId?: string } = {}) {
    if (this.gameFinished) return
    this.gameFinished = true
    this.projectiles.forEach(projectile => projectile.rect.destroy())
    this.projectiles = []
    const shade = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.75)
    // Added: resolve the ID from local player labels if a server event lacks winnerName.
    const winnerName = result.winnerName || this.getPlayerName(result.winnerId)
    const message = winnerName ? `${winnerName} won!` : 'Round over'
    const title = this.add.text(512, 320, message, { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5)
    const retry = this.add.text(512, 410, 'PLAY AGAIN', { fontSize: '26px', color: '#ffff00' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true })
    retry.on('pointerdown', () => socket.emit('playAgain', this.roomCode))
    this.endScreen = this.add.container(0, 0, [shade, title, retry]).setDepth(10)
  }

  // Added: map a winner socket ID back to the name shown on the player's rectangle.
  private getPlayerName(playerId?: string) {
    if (!playerId) return undefined
    if (playerId === socket.id) return this.player?.label.text
    return this.opponents[playerId]?.label.text
  }

  // Added: apply the server's reset to every connected player and clear the retry screen.
  private resetRound(players: Record<string, any>) {
    this.endScreen?.destroy()
    this.endScreen = undefined
    this.projectiles.forEach(projectile => projectile.rect.destroy())
    this.projectiles = []
    this.gameFinished = false
    Object.entries(players).forEach(([id, info]) => {
      if (id === socket.id && this.player) {
        this.player.rect.setPosition(info.x, info.y)
        this.player.label.setPosition(info.x, info.y)
        this.lastReplicatedX = info.x
        this.lastReplicatedY = info.y
      } else if (this.opponents[id]) {
        this.opponents[id].rect.setPosition(info.x, info.y)
        this.opponents[id].label.setPosition(info.x, info.y)
        this.opponents[id].targetX = info.x
        this.opponents[id].targetY = info.y
      }
    })
  }

  private addPlayer(id: string, info: { x: number; y: number; id: string }) {
    if (id === socket.id) {
      if (this.player) return
      const rect = this.add.rectangle(info.x, info.y, 40, 40, 0x00ff00)
      const label = this.add.text(info.x, info.y, info.id, { color: '#000000' }).setOrigin(0.5)
      this.player = { rect, label }
      this.lastReplicatedX = info.x
      this.lastReplicatedY = info.y
      return
    }
    if (this.opponents[id]) return
    const rect = this.add.rectangle(info.x, info.y, 40, 40, 0xff0000)
    const label = this.add.text(info.x, info.y, info.id, { color: '#000000' }).setOrigin(0.5)
    this.opponents[id] = { rect, label, targetX: info.x, targetY: info.y }
  }

  private addProjectile(ownerId: string, x: number, y: number, velocityX: number, velocityY: number) {
    const rect = this.add.rectangle(x, y, 8, 8, 0xffff00)
    // Added: start each client copy at its receipt time and animate from the same initial state.
    this.projectiles.push({ rect, ownerId, x, y, velocityX, velocityY, createdAt: this.time.now, hitReported: false })
  }

  private shoot() {
    if (!this.player) return
    const angle = Pmath.Angle.Between(
      this.player.rect.x,
      this.player.rect.y,
      this.input.activePointer.x,
      this.input.activePointer.y
    );
    const speed = 400
    // Added: relay each shot so all clients render the same projectile.
    socket.emit('playerShot', {
      roomCode: this.roomCode,
      x: this.player.rect.x,
      y: this.player.rect.y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed
    })
  }
}


