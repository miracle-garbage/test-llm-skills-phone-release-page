# NOVA X1 Pro — 光，握于掌心

一个用于展示 Three.js + GSAP 能力的手机产品发布页。整部手机由代码程序化构建，滚动驱动相机与机身动画，配合 GLSL 着色器、Bloom 后处理与大量微交互。

## 运行

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 类型检查 + 生产构建
npm run preview   # 预览构建产物
```

## 技术栈

- Vite 7 + TypeScript
- Three.js r187（WebGLRenderer，EffectComposer 后处理）
- GSAP 3.15（ScrollTrigger、时间轴、matchMedia）
- Lenis 平滑滚动
- 程序化建模 / CanvasTexture / GLSL，无外部模型与图片依赖

## 页面结构

| 区块 | 内容 | 关键动画 |
| --- | --- | --- |
| 预加载 | 品牌显影 | 进度、字标、幕布揭开 |
| Hero | HOLD THE LIGHT | 3D 悬浮、鼠标视差、极光背景、文字逐字上浮 |
| 01 设计 | 钛金属一体成型 | 滚动旋转、相机推进、标注线、数据滚动 |
| 02 屏幕 | 全域光感屏 | 推近屏幕、动态壁纸 Shader、扫光、参数计数 |
| 03 影像 | 三摄系统 | 镜头依次点亮、光圈脉冲、样张视差 |
| 04 性能 | A19 仿生 | 爆炸视图、粒子流、数据可视化 |
| 05 配色 | 三种光线 | 液态金属变色、环境色温联动 |
| 06 画廊 | 横向影像 | Sticky 横向滚动、卡片视差、自定义光标 |
| 07 参数 | 规格表 | 逐行进入、手风琴 |
| 08 CTA | 现在，握住光 | 磁吸按钮、粒子爆发、跑马灯 |

## 调试舞台

打开 <http://localhost:5173/scene-lab.html> 可以单独查看 3D 手机与后处理：

- `?color=aurora` / `?color=lunar` 切换配色
- `?explode=1` 查看爆炸视图
- 键盘 `1/2/3` 切色、`E` 爆炸、`B` 粒子爆发、`L` 镜头脉冲

## 手动验收

本机不再运行任何无头浏览器截图（避免软件渲染把机器拖死）。请直接打开 dev server 用真实 GPU 浏览器检查：滚动是否顺滑、文字与手机是否遮挡、屏幕特写是否完整、配色/镜头/CTA 是否响应。若帧率偏低，可反馈，我会继续降 DPR / 精简后处理。

## 目录

```
src/
  main.ts            入口 / loader / Lenis / 集成
  scene/             WebGL 舞台（手机、材质、着色器、粒子、后处理）
  scroll/motion.ts   滚动叙事时间轴、区块揭示、横向画廊
  ui/                页面区块模板与微交互
  styles/            设计 token、基础样式、区块样式
```

## 验收

- 控制台 0 error、无横向溢出
- `prefers-reduced-motion` 下关闭滚动编排与微交互
- DPR 上限 2，低帧率自动降级

> 本页为演示项目，产品、参数与价格均为虚构。