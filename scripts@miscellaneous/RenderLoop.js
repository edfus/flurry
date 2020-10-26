/**
 * 原则：game.state控制renderLoop，renderLoop中禁止修改game.state
 */
class RenderLoop {
  #reverseNextThen = false;
  #promisifyNextThen = false;
  constructor(name) {
    this.name = name;
    this._if = [];
    this._then = [];
    this._else = [];
    this._thenOnce = [];
    this._elseOnce = [];
    this._promiseThen = [];
    this._promiseElse = [];
  }
  breakWhen (conditionFunc) {
    this._if.push(() => !conditionFunc());
    this.#reverseNextThen = true;
    this.#promisifyNextThen = false;

    return this;
  }
  whenGameStateIs (stateName) {
    this._if.push(() => this.constructor._game.state.now === stateName);
    this.#reverseNextThen = false;
    this.#promisifyNextThen = false;

    return this;
  }
  untilGameStateBecomes (stateName) {
    this._if.push(() => this.constructor._game.state.now !== stateName);
    this.#reverseNextThen = true;
    this.#promisifyNextThen = false;

    return this;
  }
  untilPromise (promiseFunc) {
    this.#promisifyNextThen = true;
    this.#reverseNextThen = false;

    this._promiseFunc = promiseFunc;

    return this;
  }

  then (executeFunc) {
    if(this.#promisifyNextThen) {
      this.#reverseNextThen 
      ? this._promiseElse.push(executeFunc)
      : this._promiseThen.push(executeFunc)
      return this;
    }

    this.#reverseNextThen
    ? this._else.push(executeFunc)
    : this._then.push(executeFunc)

    return this;
  }
  else (executeFunc) {
    if(this.#promisifyNextThen) {
      this.#reverseNextThen
      ? this._promiseThen.push(executeFunc)
      : this._promiseElse.push(executeFunc)
      return this;
    }

    this.#reverseNextThen
    ? this._then.push(executeFunc)
    : this._else.push(executeFunc)

    return this;
  }

  execute (executeFunc) {
    this._then.push(executeFunc);
    return this;
  }

  thenOnce (executeFunc) {
    if(!this.#reverseNextThen)
      this._thenOnce.push(executeFunc);
    else this._elseOnce.push(executeFunc);

    return this;
  }
  executeOnce (executeFunc) {
    this._thenOnce.push(executeFunc);
    return this;
  }

  init(func) {
    func();
    return this;
  }
  static add(...renderLoops) {
    renderLoops.forEach(e => {
      this[e.name] = e;
    })
    return this;
  }
  static _inControl = null;
  static _game = null;
  static _then = [];
  static start () {
    if(this._inControl._if.every(f => f())){
      this._inControl._then.forEach(f => f());
      this._inControl._thenOnce.forEach(f => f());
      this._inControl._thenOnce = [];
    } 
    else {
      this._inControl._else.forEach(f => f());
      this._inControl._elseOnce.forEach(f => f());
      this._inControl._elseOnce = [];
    }
    requestAnimationFrame(() => this.start());
  }
  static goto (newRenderLoop) {
    if(typeof newRenderLoop === "string")
      newRenderLoop = this[newRenderLoop]
    if(!newRenderLoop)
      throw new Error("not found.")
    this._inControl = newRenderLoop;

    if(newRenderLoop._promiseFunc) {
      newRenderLoop._promiseFunc().then(() =>  newRenderLoop._promiseThen.forEach(f => f()))
                                  .catch(() =>  newRenderLoop._promiseElse.forEach(f => f()))
      newRenderLoop._promiseFunc = null;
    }
    return this;
  }
  static wheneverGame (stateName) {
    this._game.event.addListener(stateName, () => this._then.forEach(f => f()));
    return this;
  }

  static then (func) {
    this._then.push(func)
    return this;
  }
}

export default RenderLoop