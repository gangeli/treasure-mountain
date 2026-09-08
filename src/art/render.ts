import { P } from './palette'
import { type Ctx, text, circle, star } from './draw'
import { W, PLAY_H, GROUND_Y, LOOP_W, loopDelta } from '../game/layout'
import type { Game } from '../game/game'
import { drawBackdrop, drawFrame } from './backgrounds'
import { drawGroup } from './scenery'
import { drawFeature, drawGroundCoin, drawPoof, drawSparkle, drawTreasure } from './features'
import { drawPlayer, drawElf, drawKey, drawNet } from './characters'
import { drawHud, drawPause, drawButtons } from './hud'
import { drawScreen } from './screens'

/** Top-level render: level scenes here, all other screens in screens.ts. */
export function render(ctx: Ctx, g: Game): void {
  const buttons = g.buttons()
  if (g.screen === 'level') {
    drawLevel(ctx, g)
    drawHud(ctx, g, buttons)
  } else {
    drawScreen(ctx, g, buttons)
    if (g.screen !== 'castle') drawButtons(ctx, buttons, g)
  }
  if (g.paused) drawPause(ctx, g.buttons(), g)
}


export function drawLevelScene(ctx: Ctx, g: Game): void { drawLevel(ctx, g) }

function drawLevel(ctx: Ctx, g: Game): void {
  const lvl = g.lvl!, run = g.run!, level = lvl.level
  const cam = lvl.camX
  const t = g.time
  const sx = (wx: number) => { let d = wx - cam; d = ((d % LOOP_W) + LOOP_W) % LOOP_W; if (d > LOOP_W - 400) d -= LOOP_W; return d }
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, W, PLAY_H); ctx.clip()
  drawBackdrop(ctx, level.no, cam, t)

  // Scenery groups and features sorted by x (features behind groups when overlapping is impossible by layout)
  const pending = (lvl as any).pendingReveal as { group: { id: number }; t: number } | undefined
  const poofs = lvl.effects.filter(e => e.kind === 'poof')
  for (const f of level.features) {
    const x = sx(f.x)
    if (x < -400 || x > W + 400) continue
    const tr = lvl.transition
    const progress = tr && ((tr.kind === 'climb' && f.type === 'keyhole') || (tr.kind === 'ride' && f.type === 'fountain') || (tr.kind === 'castle' && f.type === 'castledoor')) ? Math.min(1, tr.t / 1.2) : 0
    drawFeature(ctx, f, x, GROUND_Y, level.no, t, { netPrice: level.netPrice, hasKey: run.hasKey, secretUsed: run.secretUsed, bridgeGap: g.stars() >= 3, progress })
  }
  for (const grp of level.groups) {
    const x = sx(grp.x)
    if (x < -400 || x > W + 400) continue
    // hidden while a POOF is active on this group
    const poof = poofs.find(e => Math.abs(loopDelta(e.x, grp.x)) < 10)
    const hidden = poof ? (poof.t < 1.0 ? Math.min(1, poof.t / 0.3) : Math.max(0, 1 - (poof.t - 1.0) / 0.4)) : 0
    drawGroup(ctx, grp, x, GROUND_Y, t, hidden)
  }
  // The POOF cloud belongs where the scenery was - behind the player, who is standing in front of
  // it. Drawn with the other effects, after the player, it swallowed him whole at the exact moment
  // he was being told what he had found.
  for (const e of poofs) drawPoof(ctx, sx(e.x), e.y, e.t)
  // Ground coins
  for (const c of lvl.groundCoins) drawGroundCoin(ctx, sx(c.x), GROUND_Y, t + c.x)
  // Elves
  for (const e of lvl.elves) {
    const x = sx(e.x)
    if (x < -120 || x > W + 120 || e.state === 'gone') continue
    const pose = e.state === 'caught' ? 'caught' : e.state === 'dance' ? 'dance' : 'run'
    drawElf(ctx, x, GROUND_Y, e.dir, pose, e.t, e.color, e.kind === 'scroll' ? 'scroll' : e.kind === 'balloon' ? 'balloon' : e.kind === 'dust' ? 'dust' : 'none')
    if (e.state === 'caught') { ctx.save(); ctx.translate(x, GROUND_Y - 30); ctx.rotate(Math.PI); ctx.scale(1.3, 1.3); drawNet(ctx, 1); ctx.restore() }
  }
  // Player
  const p = lvl.player
  const px = sx(p.x)
  const tr = lvl.transition
  let py = GROUND_Y - p.y
  if (tr && (tr.kind === 'climb' || tr.kind === 'ride')) py = GROUND_Y - Math.min(1, tr.t / 2.2) * 560
  if (tr && tr.kind === 'castle') py = GROUND_Y - Math.min(1, tr.t / 1.4) * 60
  const netSwing = p.state === 'net' ? -120 + Math.min(1, p.t / 0.25) * 170 : 0
  if (!(tr && (tr.kind === 'tunnel' || tr.kind === 'secret') && tr.t > 0.4)) drawPlayer(ctx, px, py, p.facing, p.state, p.t, p.walkT, netSwing)
  // Dust puffs in flight
  for (const d of lvl.dusts) { ctx.save(); ctx.globalAlpha = 0.9; for (let i = 0; i < 5; i++) star(ctx, sx(d.x) + Math.sin(i * 2 + t * 9) * 10, GROUND_Y - d.y + Math.cos(i * 3 + t * 7) * 8, 5, i % 2 ? P.yellow : P.purplePale, 'rgba(0,0,0,0)', 0, 4); ctx.restore() }
  // Effects
  for (const e of lvl.effects) {
    const x = sx(e.x)
    if (e.kind === 'poof') {
      // (the cloud itself is drawn with the scenery, above)
      // What was behind the scenery pops up in front of the cloud once it has cleared.
      // The key or treasure rises as the cloud fades, not through it: sharing the cloud, the word
      // POOF came out with its middle behind whatever was coming up out of the ground.
      if (e.t > 0.85) {
        const grp = level.groups.find(gp => Math.abs(loopDelta(gp.x, e.x)) < 10)
        const item = grp && (run.searched.includes(grp.id) || (pending && pending.group.id === grp.id)) ? grp : null
        const rise = Math.min(1, (e.t - 0.85) / 0.45)
        // High enough that the *bottom* of what comes up clears the Super Solver's cap. This was
        // tuned for the key, which is small; a treasure is drawn bigger and from a taller box, so
        // a jack-in-the-box came up wearing the Super Solver's head. Every treasure is drawn inside
        // y -56..33 of its origin (e2e/artbox.mjs), so one height clears all of them.
        const y = GROUND_Y - 60 - rise * 165 + Math.sin(e.t * 6) * 4
        // Fades out at the end of the effect instead of blinking away.
        ctx.save(); ctx.globalAlpha = Math.min(1, (2.2 - e.t) / 0.3)
        if (item && item.hides === 'key') drawKey(ctx, x, y, 1.6, true)
        else if (item && item.hides === 'treasure') drawTreasure(ctx, item.treasure || 'ball', x, y, 1.4)
        ctx.restore()
      }
    }
    else if (e.kind === 'sparkle') drawSparkle(ctx, x, e.y, e.t)
    else if (e.kind === 'text') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e.t / 1.2); text(ctx, e.text || '', x, GROUND_Y - e.y - e.t * 60, { size: 30, align: 'center', color: e.text?.startsWith('-') ? P.red : P.yellow, weight: 900, outline: P.ink, outlineWidth: 5 }); ctx.restore() }
    else if (e.kind === 'dustpuff') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e.t); for (let i = 0; i < 6; i++) circle(ctx, x + Math.cos(i) * (10 + e.t * 40), GROUND_Y - e.y + Math.sin(i * 1.3) * (8 + e.t * 30), 6, P.purplePale, 'rgba(0,0,0,0)', 0); ctx.restore() }
  }
  // Tunnel / secret fade to black
  if (tr && (tr.kind === 'tunnel' || tr.kind === 'secret')) {
    const dur = tr.kind === 'tunnel' ? 1.2 : 1.5
    const k = tr.t < dur / 2 ? tr.t / (dur / 2) : Math.max(0, 1 - (tr.t - dur / 2) / (dur / 2))
    ctx.fillStyle = `rgba(5,10,20,${Math.min(1, k)})`; ctx.fillRect(0, 0, W, PLAY_H)
    if (tr.kind === 'secret' && k > 0.6) { for (let i = 0; i < 3; i++) circle(ctx, W / 2 - 60 + i * 60, PLAY_H / 2 + Math.sin(t * 6 + i) * 8, 18, P.gold, P.ink, 3); text(ctx, 'A secret cave!', W / 2, PLAY_H / 2 - 70, { size: 40, align: 'center', color: P.yellow, weight: 900, outline: P.ink, outlineWidth: 6 }) }
  }
  ctx.restore()
  drawFrame(ctx)
}
