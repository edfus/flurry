class SVG {
  constructor (rgba, fill, glow) {
    this.set(rgba, fill, glow)
  }
  set (rgba = "#fff", fill = rgba, glow = 4) {
    this.rgba = rgba;
    this.fillStyle = fill;
    this.glowIntensity = glow
  }
  triangle () {
    return URL.createObjectURL(new Blob([`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <defs><filter id="glow" width="200%" height="200%" x="-50%" y="-50%"><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity / 2}" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity}" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#glow)">
        <polygon points="14,16  24,33.32 34,16 14,16" stroke-linejoin="round" fill="transparent" stroke="${this.rgba}"/>
        <circle cx="14" cy="16" r="2" fill="${this.rgba}"/>
        <circle cx="24" cy="33.32" r="2" fill="${this.rgba}"/>
        <circle cx="34" cy="16" r="2" fill="${this.rgba}"/>
      </g>
    </svg>`], {type:'image/svg+xml;charset=utf-8'}));
  }
  rectangle () {
    return URL.createObjectURL(new Blob([`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <defs><filter id="glow" width="200%" height="200%" x="-50%" y="-50%"><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity / 2}" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity}" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g filter="url(#glow)">
    <polygon points="14,14 34,14 34,34 14,34 14,14" stroke-linejoin="round" fill="${this.fillStyle}" stroke="${this.rgba}"/>
    </g>
    </svg>`], {type:'image/svg+xml;charset=utf-8'}));
  }
  hexagon () {
    return URL.createObjectURL(new Blob([`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <defs><filter id="glow" width="200%" height="200%" x="-50%" y="-50%"><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity / 2}" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity}" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g filter="url(#glow)">
    <polygon points="8.4,15 8.4,33 24,42 39.6,33 39.6,15 24,6 8.4,15" stroke-linejoin="round" fill="transparent" stroke="${this.rgba}"/>
    </g>
    </svg>`], {type:'image/svg+xml;charset=utf-8'}));
  }

  styledLine () {
    return URL.createObjectURL(new Blob([`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <defs><filter id="glow" width="200%" height="200%" x="-50%" y="-50%"><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity / 2}" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowIntensity}" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g filter="url(#glow)">
    <polygon points="24,14 24,34" stroke-linejoin="round" fill="transparent" stroke="${this.rgba}"/>
    <circle cx="24" cy="14" r="2" fill="${this.rgba}"/>
    <circle cx="24" cy="34" r="2" fill="${this.rgba}"/> 
    </g>
    </svg>`], {type:'image/svg+xml;charset=utf-8'}));
  }
}

export default SVG