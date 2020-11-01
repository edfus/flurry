export default {
  planeRed: 0x581515,
  lightBlue: 0x8fe7fd,
  azure: 0xadfadf,
  sceneColors: [
    [0x0beff7, "#0beff7"], 
    [0x1000f7, "#0beff7"], 
    [0xfd0000, "#0beff7"], 
    [0xf04ea4, "#0beff7"]
  ],
  // [0xadfadf, 0x66ff99, 0xf04ea4]
  greenForTest: 0x00ff00,
  hslStarColor: {
    h: .583,
    s: 1,
    l: .5
  },
  complementaryOf (color) {
    if(color.isColor) {
      color.setHex(color.getHex() ^ 0xffffff)
      return color;
    } else {
      switch(arguments.length) {
        case 3: 
          const h = color;
          h += .5;
          while (h >= 1) h -= 1; 
          while (h < 0) h += 1; 
          return `hsl(${h}, ${arguments[1]}, ${arguments[2]})`;;
        case 1: return parseInt(('000000' + ((0xffffff ^ color).toString(16))).slice(-6), 16);
        default: console.error(`complementaryColorOf: wrong color value: ${arguments}`)
      }
    }
  },
  RGB_Linear_Shade (p,c) {
    var i=parseInt,r=Math.round,[a,b,c,d]=c.split(","),P=p<0,t=P?0:255*p,P=P?1+p:1-p;
    return"rgb"+(d?"a(":"(")+r(i(a[3]=="a"?a.slice(5):a.slice(4))*P+t)+","+r(i(b)*P+t)+","+r(i(c)*P+t)+(d?","+d:")");
    // https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
  }
}

// Note the lack of CamelCase in the name
// const color5 = new THREE.Color( 'skyblue' );
// https://github.com/mrdoob/three.js/blob/master/src/math/Color.js