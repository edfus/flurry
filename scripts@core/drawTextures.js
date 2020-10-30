import { CanvasTexture } from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';
// https://threejs.org/docs/#api/en/textures/CanvasTexture
class Drawer {
  constructor () {

  }
  triangle (rgba, glowIntensity) {

  }
  rect_hollow (rgba, glowIntensity) {

  }
  rect (rgba, glowIntensity) {

  }
  hexagon () {

  }
  point () {

  }
  styledLine () {

  }
  meteor () {

  }
  _glow () {
    this.context.shadowBlur = 20;
    this.context.shadowColor = "white";
    // f they are drawn on the screen with canvas drawing functions, then how about redrawing the circle 25 times, each circle getting one pixel thicker in width?
  }
}