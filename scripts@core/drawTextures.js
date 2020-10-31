import { CanvasTexture, FloatType } from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';
// https://threejs.org/docs/#api/en/textures/CanvasTexture
class Drawer {
  constructor () {
    this.width = 64;
    this.height = 64;
    this.radius = 32;
    this.canvas = new OffscreenCanvas(this.width, this.height);
    this.context = this.canvas.getContext("2d");
  }
  triangle (rgba, glowIntensity) {

  }
  rect_hollow (rgba, glowIntensity) {

  }
  rect (rgba, glowIntensity) {

  }
  hexagon () {

  }
  snow (R = 255, G = 255, B = 255) {
    this.context.save();
    this.context.clearRect(0, 0, this.width, this.height);
    const r = this.radius;
    const gradient = this.context.createRadialGradient(r, r, 0, r, r, r);
      gradient.addColorStop(0, `rgba(${R}, ${G}, ${B}, .15)`);
      gradient.addColorStop(1, `rgba(${R}, ${G}, ${B}, 0)`);
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.restore();
    return this._render();
  }
  headLight (R = 255, G = 255, B = 255) {
    this.context.save();
    this.context.clearRect(0, 0, this.width, this.height);
    const r = this.radius;
    const gradient = this.context.createRadialGradient(r, r, 0, r, r, r);
      gradient.addColorStop(0, `rgba(${R}, ${G}, ${B}, .15)`);
      gradient.addColorStop(1, `rgba(${R}, ${G}, ${B}, 0)`);
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.restore();
    return this._render();
  }
  styledLine () {

  }
  meteor () {

  }
  setRadius (r) {
    this.width = r * 2;
    this.height = r * 2;
    this.radius = r;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
  _render () {
    const texture = new CanvasTexture(this.canvas);
    texture.type = FloatType;
    // texture.needsUpdate = true;
    return texture;
    // return this.canvas.transferToImageBitmap();
  }
  _glow () {
    this.context.shadowBlur = 20;
    this.context.shadowColor = "white";
    // f they are drawn on the screen with canvas drawing functions, then how about redrawing the circle 25 times, each circle getting one pixel thicker in width?
  }
}

export default Drawer;