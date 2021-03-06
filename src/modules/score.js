const map = new Array(1, 9, 5, 0, 3, 7, 2, 8); // length should be powers of 2
const identifier = 'o';
let value = 0
class Score { 
  dom = {innerText: ''};
  speed = 0;
  _timer = 0; // timeoutID starts from 1
  _previousMS = Infinity;
  
  constructor (initialSpeed = 150, initialScore = this.loadPrevious()) {
    this.speed = initialSpeed;
    if(isNaN(initialScore) || !isFinite(initialScore))
      initialScore = 0;
    value = Number(initialScore); // in case
  }
  
  bind (domElement) {
    this.dom = domElement;
    if(value < 10000) {
      this.dom.innerText = String(value.toFixed(2)).concat(" m");
    } else {
      this.dom.innerText = String((value / 1000).toFixed(1)).concat(" Km");
    }
  }

  start () {
    this._previousMS = performance.now();
    this.update();
  }

  pause () {
    this._previousMS = Infinity;
    if(this._timer !== -1)
      clearInterval(this._timer)
    this._timer = -1;
  }

  intervalUpdate (ms) {
    if(this._timer !== -1)
      clearInterval(this._timer)
    this._timer = setInterval(() => {
      this.dom.innerText = String((this.updateValue() / 1000).toFixed(1)).concat(" Km");
    }, ms)
  }

  update () {
    if(this._previousMS === Infinity)
      return '';
    if(value < 10000) {
      this.dom.innerText = String(this.updateValue().toFixed(2)).concat(" m");
        requestAnimationFrame(() => this.update())
    } else {
      this.dom.innerText = String((this.updateValue() / 1000).toFixed(1)).concat(" Km");
        this.intervalUpdate(1e5 / this.speed) // ms per 0.1km
    }
  }

  updateValue () {
    value += this.speed * (performance.now() - this._previousMS) / 1000;
    this._previousMS = performance.now();
    return value;
  }

  get value () {
    return this.updateValue();
  }

  store () {
    const dateId = new Date().toLocaleDateString(
        Intl.DateTimeFormat().resolvedOptions().locale, 
        {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      );
    const store_obj = JSON.parse("score_obj" in localStorage ? localStorage.score_obj : `{}`)
    store_obj[dateId] = store_obj[dateId] ? (value > store_obj[dateId] ? value : store_obj[dateId]) : value;
    localStorage.score_obj = JSON.stringify(store_obj);

    localStorage.score = encrypt(value);
    if(!localStorage.uuid)
      localStorage.uuid = uuidv4()
  }

  loadPrevious () {
    return decrypt(localStorage.score)
  }
}

//TODO: SubtleCrypto.sign()
function _algorithm(value) {
  let str = '';
  let i = 0;
  const maxLength = value.length / 2;
  for(const ch of navigator.userAgent) {
    i = map[ch.codePointAt(0) & (map.length - 1)];
    str += value[i] ^ i; // undefined will just yield i
    if(str.length >= maxLength)
      break;
  }
  return parseInt(str).toString(16);
}

function decrypt (value) { 
  if(typeof value !== "string")
    return 0;
  const separatorI = value.lastIndexOf(identifier);
  if(separatorI === -1)
    return 0;
  const data = value.substring(0, separatorI);
  const check = value.substring(separatorI + identifier.length, value.length);
  if(_algorithm(data) === check){
    return parseInt(data, 16);
  }
  else return 0;
}

function encrypt (value) {
  return value.toString(16) + identifier + _algorithm(value.toString(16));
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
} // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid

export default Score;