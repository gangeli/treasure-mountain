// Renders the app icon (drawn with the game's own canvas art) to PNGs for the manifest and Android.
// Usage: node e2e/icons.mjs
import { writeFileSync } from 'node:fs'
import { launch, playwright } from './lib.mjs'

const pw = await playwright()
const { browser, page } = await launch(pw, { width: 512, height: 512, dpr: 1 })
const html = `<!doctype html><body style="margin:0;background:transparent"><canvas id=c width=512 height=512></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
function rr(x0,y0,w,h,r){x.beginPath();x.moveTo(x0+r,y0);x.arcTo(x0+w,y0,x0+w,y0+h,r);x.arcTo(x0+w,y0+h,x0,y0+h,r);x.arcTo(x0,y0+h,x0,y0,r);x.arcTo(x0,y0,x0+w,y0,r);x.closePath()}
// background: sky gradient with rounded corners (maskable safe zone kept in the middle 80%)
const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#3c7dd9');g.addColorStop(1,'#9fd0ff');
rr(0,0,512,512,110);x.fillStyle=g;x.fill();
// Everything else is drawn at 80% about the centre, so it survives the circular crop Android
// applies to a maskable icon; the sky fills the frame behind it.
x.save();x.translate(256,256);x.scale(0.8,0.8);x.translate(-256,-256);
// sun
x.fillStyle='#ffd23f';x.beginPath();x.arc(400,120,54,0,7);x.fill();
// mountain
x.lineWidth=12;x.lineJoin='round';x.strokeStyle='#1a2238';
x.beginPath();x.moveTo(40,470);x.quadraticCurveTo(120,300,210,170);x.quadraticCurveTo(256,110,300,170);x.quadraticCurveTo(400,300,472,470);x.closePath();x.fillStyle='#9aa5b8';x.fill();x.stroke();
// terraces
const ter=[[256,420,190,34,'#3fb544'],[256,320,130,28,'#3fb544'],[256,235,80,22,'#7fe07a']];
for(const [cx,cy,rx,ry,col] of ter){x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,7);x.fillStyle=col;x.fill();x.lineWidth=7;x.stroke()}
// snow cap + castle
x.beginPath();x.moveTo(205,180);x.quadraticCurveTo(256,120,310,180);x.quadraticCurveTo(280,192,256,182);x.quadraticCurveTo(230,196,205,180);x.closePath();x.fillStyle='#f4fbff';x.fill();x.lineWidth=6;x.stroke();
rr(222,110,68,52,6);x.fillStyle='#c5cddb';x.fill();x.lineWidth=6;x.stroke();
for(const s of[-1,1]){rr(256+s*36-12,80,24,80,4);x.fillStyle='#c5cddb';x.fill();x.stroke();x.beginPath();x.moveTo(256+s*36-14,82);x.lineTo(256+s*36,52);x.lineTo(256+s*36+14,82);x.closePath();x.fillStyle='#2f6fe4';x.fill();x.stroke()}
rr(248,132,16,30,8);x.fillStyle='#1a2238';x.fill();
// key in front
x.save();x.translate(150,370);x.rotate(-0.5);x.lineWidth=7;
x.beginPath();x.arc(0,-40,34,0,7);x.fillStyle='#f6c445';x.fill();x.stroke();x.beginPath();x.arc(0,-40,13,0,7);x.fillStyle='#c48a12';x.fill();x.stroke();
rr(-12,-8,24,90,6);x.fillStyle='#f6c445';x.fill();x.stroke();rr(12,40,26,16,3);x.fill();x.stroke();rr(12,64,20,16,3);x.fill();x.stroke();x.restore();
x.restore();
</script></body>`
await page.setContent(html)
await page.waitForTimeout(100)
for (const size of [512, 192]) {
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } })
  if (size === 512) writeFileSync('public/icon-512.png', buf)
  else {
    // downscale via a second canvas
    const b64 = buf.toString('base64')
    const small = await page.evaluate(async (b64) => new Promise(res => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 192; c.height = 192; c.getContext('2d').drawImage(img, 0, 0, 192, 192); res(c.toDataURL('image/png')) }; img.src = 'data:image/png;base64,' + b64 }), b64)
    writeFileSync('public/icon-192.png', Buffer.from(small.split(',')[1], 'base64'))
  }
}
await browser.close()
console.log('icons written')
