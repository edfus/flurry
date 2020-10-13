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
- [ ] vertices的概念
- [ ] FIX: 手机端无法点击按钮（onclick无效？）

---

关于碰撞检测：
1. 用户行为驱动，当触发相关事件（如上下移动触发，旋转不触发，节流（比如碰撞边界需要一个至少的用户操作下界，下界以下节流检查，以上每帧检验））时，才检测
2. 维护一个碰撞数组，每次只对碰撞数组内的检测，其他不管。class/障碍物生成函数自动shift push数组内容

关于移动：
    初定为用户不动，场景不动，相机和障碍物移动。相机旋转跟随飞机旋转，有一定延迟ease-in-out

---

### Credits

- [蓝飞互娱(kunpo)](https://kunpo.cc/) - [Loner](https://play.google.com/store/apps/details?id=com.kunpo.loner&hl=en_US) (Google Play)
- [Inner Peace Studio](https://soundcloud.com/innerpeacestudio) - [Loner Game Soundtrack](https://soundcloud.com/innerpeacestudio/sets/loner-game-soundtrack) (Soundcloud)
- [Three.js](https://github.com/mrdoob/three.js)
- 

