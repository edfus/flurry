# Project: Flurry

---

*This repository is intended for educational purposes only.*

---

高内聚，低耦合！

### 流程规划

- scene、perspective camera
- static objects(基础隧道场景建模，飞机建模构造)
- dynamic objects(螺旋桨更新函数，场景行进感函数，粒子特效，喷气，雾气)
- light&shadow(光渲染、hemisphereLight、shadowLight、ambientLight)
- generate obstacles(位置、频率、变化、随机化)
- user control(输入设备处理，极端情况处理，屏幕大小适配，碰撞监测……)

![效果图](_参考/Screenshot_20200912-212610.png.webp)

- [x] 基础文档撰写，Github库配置，统一开发环境，统一代码、commit规范
- [x] 收集文献资料，收集参考，寻找效果图，寻找竞品
- [ ] 完成Three.js基础场景搭建（scene、perspective camera、static objects、hemisphereLight、shadowLight）
- [ ] 完成user control
- [ ] 完成dynamic objects
- [ ] 完成generate obstacles
- [ ] 阶段测试，痛点分析，代码梳理，结构重整
- [ ] 完成:checkered_flag:


### To-do list

*请自己添加、删改任务。*


---

z1042117441: 


---

naiziguai: 

- [ ] 安装Document this插件，查看`规范.md`内的相关内容。
- [ ] 查看他人的commit历史

---


cloudres: 

- [ ] 完成web worker - audio开发 
    https://www.html5rocks.com/en/tutorials/webaudio/fieldrunners/
    https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games
    https://developers.google.com/web/updates/2017/12/audio-worklet
    https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
    https://developers.google.com/web/updates/2018/06/audio-worklet-design-pattern
    https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet
- [ ] vertices的概念
- [ ] FIX: 手机端无法点击按钮（onclick无效？）

---

关于碰撞检测：
1. 用户行为驱动，当触发相关事件（如上下移动触发，旋转不触发，节流（比如碰撞边界需要一个至少的用户操作下界，下界以下节流检查，以上每帧检验））时，才直接用xxx.mesh.position.clone().sub(Vector3).length检测。
2. 维护一个碰撞数组，每次只对碰撞数组内的进行精确narrow phase检测。相关事件（障碍物移动/用户行为）对数组进行增添。
3. 精确narrow phase检测的方式。
    - 若两个物体没有发生碰撞，则总会存在一条直线，能将两个物体分离（SAT算法，凸多边形，投影）
    - 三个轴上都有重叠，则判断为相撞
    - GJK 物理引擎中计算碰撞的主流方案 http://www.dtecta.com/papers/jgt98convex.pdf
    - https://stackoverflow.com/questions/11473755/how-to-detect-collision-in-three-js
        > The idea is this: let's say that we want to check if a given mesh, called "Player", intersects any meshes contained in an array called "collidableMeshList". What we can do is create a set of rays which start at the coordinates of the Player mesh (Player.position), and extend towards each vertex in the geometry of the Player mesh. Each Ray has a method called "intersectObjects" which returns an array of objects that the Ray intersected with, and the distance to each of these objects (as measured from the origin of the Ray). If the distance to an intersection is less than the distance between the Player's position and the geometry's vertex, then the collision occurred on the interior of the player's mesh -- what we would probably call an "actual" collision.
```js
// http://stemkoski.github.io/Three.js/Collision-Detection.html
for (var vertexIndex = 0; vertexIndex < Player.geometry.vertices.length; vertexIndex++)
{       
    var localVertex = Player.geometry.vertices[vertexIndex].clone();
    var globalVertex = Player.matrix.multiplyVector3(localVertex);
    var directionVector = globalVertex.subSelf( Player.position );

    var ray = new THREE.Ray( Player.position, directionVector.clone().normalize() );
    var collisionResults = ray.intersectObjects( collidableMeshList );
    if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) 
    {
        // a collision occurred... do something...
    }
}

function rt(a,b) {
  let d = [b]; 
  let e = a.position.clone();
  let f = a.geometry.vertices.length;
  let g = a.position;
  let h = a.matrix;
  let i = a.geometry.vertices;
    for (var vertexIndex = f-1; vertexIndex >= 0; vertexIndex--) {      
        let localVertex = i[vertexIndex].clone();
        let globalVertex = localVertex.applyMatrix4(h);
        let directionVector = globalVertex.sub(g);
        
        let ray = new THREE.Raycaster(e,directionVector.clone().normalize());
        let collisionResults = ray.intersectObjects(d);
        if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) { 
            return true;
    }
    }
 return false;
}
```

关于移动：
    初定为用户不动，场景不动，相机和障碍物移动。相机旋转跟随飞机旋转，有一定延迟ease-in-out

---

### Credits

- [蓝飞互娱(kunpo)](https://kunpo.cc/) - [Loner](https://play.google.com/store/apps/details?id=com.kunpo.loner&hl=en_US) (Google Play)
- [Inner Peace Studio](https://soundcloud.com/innerpeacestudio) - [Loner Game Soundtrack](https://soundcloud.com/innerpeacestudio/sets/loner-game-soundtrack) (Soundcloud)
- [Three.js](https://github.com/mrdoob/three.js)
- 

