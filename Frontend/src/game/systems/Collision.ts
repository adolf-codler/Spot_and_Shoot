// Added: simple rectangle overlap check shared by the multiplayer scene.
export function playersCollide(
    first: { x: number; y: number },
    second: { x: number; y: number },
    size = 40
): boolean {
    return Math.abs(first.x - second.x) < size && Math.abs(first.y - second.y) < size;
}
