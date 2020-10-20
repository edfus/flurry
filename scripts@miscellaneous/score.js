class Score { 
  #dom = {innerText: ''};
  #value = 0;
  #speed = 0;
  #timer = 0; // timeoutID starts from 1
  #previousMS = Infinity;
  constructor (initialSpeed, initialScore = this.loadPrevious()) {
    this.#speed = initialSpeed;
    this.#value = initialScore;
  }
  // set speed (newSpeed) {}
  
  bind (domElement) {
    const tempText = this.#dom.innerText;
    this.#dom = domElement;
    // if(tempText)
    this.#dom.innerText = tempText;
  }

  start () {
    this.#previousMS = performance.now();
    this.update();
  }

  pause () {
    this.#previousMS = Infinity;
    if(this.#timer !== -1)
      clearInterval(this.#timer)
    this.#timer = -1;
  }

  intervalUpdate (ms) {
    if(this.#timer !== -1)
      clearInterval(this.#timer)
    this.#timer = setInterval(() => {
      this.#dom.innerText = String((this.updateValue() / 1000).toFixed(1)).concat(" Km");
    }, ms)
  }

  update () {
    if(this.#previousMS === Infinity)
      return ;
    if(this.#value < 10000) {
      this.#dom.innerText = String(this.updateValue().toFixed(2)).concat(" m");
      requestAnimationFrame(() => this.update())
    } else {
      this.#dom.innerText = String((this.#value / 1000).toFixed(1)).concat(" Km");
      this.intervalUpdate(1e5 / this.#speed) // ms per 0.1km
    }
  }

  updateValue () {
    this.#value += this.#speed * (performance.now() - this.#previousMS) / 1000;
    this.#previousMS = performance.now();
    return this.#value;
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
    store_obj[dateId] = store_obj[dateId] ? (this.#value > store_obj[dateId] ? this.#value : store_obj[dateId]) : this.#value;
    localStorage.score_obj = JSON.stringify(store_obj);

    localStorage.score = this.#encrypt(this.#value);
  }

  loadPrevious () {
    return this.#decrypt(localStorage.score)
  }
  #map = new Array(1, 9, 5, 0, 3, 7, 2 ,8); // 2的n次方
  #algorithm (value) { // 简单地散列useragent，以之异或为校验和转换为16进制到value末尾
    let str = '';
    let i = 0;
    const maxLength = value.length / 2;
    for(const ch of navigator.userAgent) {
      i = this.#map[ch.codePointAt(0) & (this.#map.length - 1)];
      str += value[i] ^ i; // undefined will just be i
      if(str.length >= maxLength)
        break;
    } // as navigator.userAgent length is usually longer...
    return parseInt(str).toString(16);
  }
  
  #identifier = 'o'
  #decrypt (value) { 
    if(typeof value !== "string")
      return 0;
    const separatorI = value.lastIndexOf(this.#identifier);
    if(separatorI === -1)
      return 0;
    const data = value.substring(0, separatorI);
    const check = value.substring(separatorI + this.#identifier.length, value.length);
    if(this.#algorithm(data) === check){
      return parseInt(data, 16);
    }
    else return 0;
  }
  
  #encrypt (value) {
    return value.toString(16) + this.#identifier + this.#algorithm(value.toString(16));
  }
}

export default Score;