

# Project: Flurry

---

*This repository is intended for educational purposes only.*

---

### 特性描述

*要做什么样的游戏？还能有什么样的功能？怎么做最易实现？*

1. 粒子效果（喷气、得分）
2. 光渲染
3. 碰撞检测
4. 障碍物（差集运算）
    https://threejs.org/examples/#webgl_clipping_intersection
    https://threejs.org/examples/#webgl_clipping_stencil
    https://threejs.org/examples/#webgl_geometry_shapes
5. 

![效果图](0_参考/Screenshot_20200912-212610.png.webp)

### To-do list

*请自己添加、删改任务。*

---

All:
- [ ] 找到适合的游戏图标(app)、网站图标。任何合适的都请放入/public/images/中
- [ ] 找到适合的飞机的模型 .obj https://clara.io/library?query=drone
- [ ] 浏览[Example](https://threejs.org/examples/)

---

z1042117441 & naiziguai: 

- [ ] 完成01_学/学习任务.md

---


cloudres: 

Chores#1:

- [x] 下载[Loner Game Soundtrack](https://soundcloud.com/innerpeacestudio/sets/loner-game-soundtrack)并添加好meta tags
- [ ] 完善文档规范
    如：
    - Todo tree - BUG FIX等的具体
    - console.error console.warn console.info console.log console.dir
    - const let var
      - 准则：能用const的地方就不要用let，能用let的地方就不要用var。const > let > var
      - 尽量少给同一个变量赋予不同类型的值。
      - JS中的对象变量是引用类型，因此可以在用const声明变量后修改其内部属性。const obj = {}; obj.aaa = 'aaa'; 但为了方便辨识，这种会在其后修改值的变量都不用const声明。不过在很多情况下，const声明的变量是作为three.js新建对象配置而存在，因此作为配置的对象声明也可以用const
        如：  
        const geometry = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
        geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
        this.mesh = new THREE.Mesh(geometry, material);
    - commit message规范写法 
      - MINOR #:checkered_flag:(在最后)
      - :bug:BUG-REPORT :green_heart:BUG-FIX 
      - :sparkles:NEW-FEATURE :zap:IMPROVE :memo:DOC-UP
      - :construction:WORKING :lipstick:STYLE-UI
    - markdown基础写法
    - 
- [ ] 帮助使用部署
- [ ] 基础框架写好(half done)

Chores#2:

- [ ] 使用service worker缓存lib等，达成PWA
- [ ] 使用web worker及indexedDB存储obj、音乐、字体
- [ ] 发布到github pages
- [ ] 增加google流量分析等
- [ ] 使用免费域名Flurry.tk
- [ ] manifest.webmanifest - shortcuts by location.search

Maybe:

- [ ] 支持Android及IOS端

---

### Change log

- 09-12 init. 完成基本框架建设，完成团队组织。

### Credits

- [蓝飞互娱(kunpo)](https://kunpo.cc/) - [Loner](https://play.google.com/store/apps/details?id=com.kunpo.loner&hl=en_US) (Google Play)
- [Inner Peace Studio](https://soundcloud.com/innerpeacestudio) - [Loner Game Soundtrack](https://soundcloud.com/innerpeacestudio/sets/loner-game-soundtrack) (Soundcloud)
- [Three.js](https://github.com/mrdoob/three.js)
- 

