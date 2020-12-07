# 使用worker加载模型或直接使用main thread加载？

## 结论

- 使用worker同时加载多个小的，非立即使用的模型较好，可减少50%左右的blocking时间
- 对于大模型而言，worker和main thread的blocking时间相差无几（worker将blocking的时间延后了），worker加载的时间长30%左右
    - worker额外重复的对OBJLoader、THREE的module引用消耗时间较少，主要耗费时间应该是postMessage部分对数据必须的处理：
        1. 因为数据是对象而非arrayBuffer等，只能通过clone的方式传递，而clone必须调用Object3D的toJSON方法，并clone之。在主线程额外消耗1000ms以上(对于测试用的大模型)
        2. 传递之后还需new THREE.ObjectLoader().parse()对传递来的数据进行解析，额外消耗600ms(对于测试用的大模型)
        3. 我菜，想不到更好的改进方法，因此极限大概至此了(^^;)



## 比较过程

### 主线程-小模型（500KB）

![main-thread-small](scripts@loader/comparing-loading-mode/main-thread-small.png)

![main-thread-small-end-time](scripts@loader/comparing-loading-mode/main-thread-small-end-time.png)

于一秒内加载完成，blocking 184ms，无verbose warning

### 主线程-大模型（15.2MB，27万个顶点）

![main-thread-large](scripts@loader/comparing-loading-mode/main-thread-large.png)

![main-thread-large-end-time](scripts@loader/comparing-loading-mode/main-thread-large-end-time.png)

三秒内加载完成，加载完成之前用户无交互。

### worker-小模型

![worker-small](screenshots/worker-small.png)

![worker-small-end-time](scripts@loader/comparing-loading-mode/worker-small-end-time.png)

和使用main thread相差无几。加载时间多50~100ms左右，帧率下降的时间少90ms左右

### worker-大模型

![worker-large](scripts@loader/comparing-loading-mode/worker-large.png)

![worker-large-end-time](scripts@loader/comparing-loading-mode/worker-large-end-time.png)

![2020-10-22_191536](scripts@loader/comparing-loading-mode/2020-10-22_191536.png)