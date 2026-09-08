import { Stage } from './engine/stage'
import { Loop } from './engine/loop'
import { Input } from './engine/input'
import { AudioEngine } from './engine/audio'

const canvas = document.getElementById('game') as HTMLCanvasElement
const stage = new Stage(canvas)
const input = new Input(stage)
const audio = new AudioEngine()
input.onGesture = () => audio.unlock()
document.getElementById('boot')?.remove()
let t = 0
const loop = new Loop(dt => { t += dt; input.drain() }, () => {
  const ctx = stage.begin()
  ctx.fillStyle = '#1b3a5c'; ctx.fillRect(0, 0, 1280, 720)
  ctx.fillStyle = '#ffd76a'; ctx.font = '48px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('Treasure Mountain ' + t.toFixed(1), 640, 360)
})
loop.start()
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
