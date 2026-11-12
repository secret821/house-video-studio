/** Deliberately fictional listing paired with labeled, locally cached demonstration photos. */
import {
  EMPTY_PROJECT,
  Motion,
  type Project,
} from '../../src/services/definition/project';

export const DEMO_PROJECT: Project = {
  ...EMPTY_PROJECT,
  name: '把日子住成喜欢的样子',
  location: '城市花园 · 演示房源',
  area: '约 120㎡',
  layout: '三室两厅',
  price: '价格面议',
  contact: '演示素材，仅用于体验视频制作',
  demo: true,
  music: {
    src: '/demo/music.wav',
    duration: 16,
    name: '轻柔氛围 · 原创演示音乐',
    text: null,
  },
  opening: null,
  scenes: [
    {
      id: 'demo-living',
      src: '/demo/living.jpg',
      title: '从客厅，开启家的想象',
      narration:
        '今天带你看一套演示房源。先从客厅开始，感受这个空间的布局与氛围。',
      seconds: 6,
      motion: Motion.Push,
      voiceover: null,
    },
    {
      id: 'demo-bedroom',
      src: '/demo/bedroom.jpg',
      title: '留一处安静，给自己',
      narration:
        '接着看看卧室。家具如何摆放，空间是否适合自己，都值得仔细看看。',
      seconds: 6,
      motion: Motion.Left,
      voiceover: null,
    },
    {
      id: 'demo-kitchen',
      src: '/demo/kitchen.jpg',
      title: '一餐一饭，皆是日常',
      narration: '来到厨房，看看操作台与收纳空间，想象一下每天在这里准备三餐。',
      seconds: 6,
      motion: Motion.Pull,
      voiceover: null,
    },
    {
      id: 'demo-dining',
      src: '/demo/dining.jpg',
      title: '让相聚，有一个位置',
      narration: '再看看用餐空间。一张餐桌，也能承载一家人的日常与相聚。',
      seconds: 6,
      motion: Motion.Right,
      voiceover: null,
    },
    {
      id: 'demo-closing',
      src: '/demo/living.jpg',
      title: '下一站，实地看看',
      narration:
        '以上是照片探盘的演示效果。具体房源信息与现场情况，请以实际核实为准。',
      seconds: 6,
      motion: Motion.Pull,
      voiceover: null,
    },
  ],
};
