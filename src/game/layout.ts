/** Shared layout constants (logical 1280x720 canvas). */
export const W = 1280
export const H = 720
export const PLAY_H = 560            // play area height; HUD occupies the rest
export const HUD_Y = PLAY_H
export const HUD_H = H - PLAY_H
export const GROUND_Y = 470          // where feet stand
export const LOOP_W = 7680           // one lap around the mountain (6 screens)
export const SCREENS = LOOP_W / W

/** Wraps an x coordinate into [0, LOOP_W). */
export const wrapX = (x: number): number => ((x % LOOP_W) + LOOP_W) % LOOP_W
/** Signed shortest distance from a to b on the loop. */
export function loopDelta(a: number, b: number): number {
  let d = wrapX(b) - wrapX(a)
  if (d > LOOP_W / 2) d -= LOOP_W
  if (d < -LOOP_W / 2) d += LOOP_W
  return d
}
export const loopDist = (a: number, b: number): number => Math.abs(loopDelta(a, b))
