<template>
  <div
    id="app"
    @mousewheel="onScroll"
    v-hammer:pinchend="onPinchEnd"
    v-hammer:pinchstart="onPinchStart"
    v-hammer:pinch="onPinch"
    v-hammer:panend="onPanEnd"
    v-hammer:panstart="onPanStart"
    v-hammer:pan="onPan"
    v-hammer:swipe="onSwipe"
  >
    <navigating-mode v-if="mode === 'navigating'" />
    <wiring-mode v-if="mode === 'wiring'" />
  </div>
</template>

<script>
import * as ft from "froto";
import { from } from "froto";
import Vue from "vue";
import WiringMode from "./components/WiringMode";
import NavigatingMode from "./components/NavigatingMode";
export default {
  name: "app",
  components: {
    NavigatingMode,
    WiringMode
  },
  data() {
    return {
      mode: "navigating",
      movingFrame: false,
      collapsedStore: {},
      viewPinchStart: null
    };
  },
  mounted() {
    // 0: {
    //   parent: null,
    //   children: [1],
    //   bounds: { x: [-20, 20], y: [-20, 20] },
    //   hue: 280,
    //   // optional frame properties:
    //   // type: null // default/null type is just a basic frame
    //   // tags: [] // searchable strings for users to locate frames
    //   // data: {} // storage for details about this node
    // },
    // 1: {
    //   parent: 0,
    //   children: [2, 3],
    //   bounds: { x: [-10, 17], y: [-17, 17] },
    //   hue: 80,
    // },
    // 2: {
    //   parent: 1,
    //   children: [],
    //   bounds: { x: [-9, 0], y: [-10, 0] },
    //   hue: 160,
    // },
    // 3: {
    //   parent: 1,
    //   children: [],
    //   bounds: { x: [1, 16], y: [-5, 16] },
    //   hue: 190,
    // },
    this.updateSize();
    window.addEventListener("resize", this.updateSize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.updateSize);
  },
  methods: {
    onPinchStart() {
      this.viewPinchStart = { ...this.view };
    },
    onPinchEnd() {
      this.viewPinchStart = null;
    },
    onPinch(e) {
      // TODO: New pinch will keep fingers stationary in the view
      const { center, scale } = e;
      const xOrigin = ft.from(this.screen.x, center.x);
      const yOrigin = ft.from(this.screen.y, center.y);

      const x = ft.scale(1 / scale, xOrigin, this.viewPinchStart.x);
      const y = ft.scale(1 / scale, yOrigin, this.viewPinchStart.y);

      this.$store.setView({ x, y });
    },
    onPanStart() {
      setTimeout(() => {
        this.viewPanStart = { ...this.view };
      }, 10);
    },
    onPanEnd() {
      this.viewPanStart = null;
    },
    onPan(e) {
      if (this.movingFrame) {
        // cancel current pan because the frame is moving. If
        // the pan is just mitigated and not canceled then events
        // at the end may go through and pan the view after the user
        // only wanted to move a frame
        this.viewPanStart = null;
      }
      if (!this.viewPanStart) return;

      const deltaX = ft.duration(this.view.x) * from(this.screen.x, e.deltaX);
      const deltaY = ft.duration(this.view.y) * from(this.screen.y, e.deltaY);
      const x = ft.sub(this.viewPanStart.x, [deltaX, deltaX]);
      const y = ft.sub(this.viewPanStart.y, [deltaY, deltaY]);

      this.$store.setView({ x, y });
    },
    onSwipe(e) {
      if (this.movingFrame) return;
      this.$store.swipe(e.velocityX, e.velocityY);
    },
    onScroll(e) {
      const change = (0.05 * e.deltaY) / 100;
      const currentDurationX = ft.duration(this.view.x);
      const currentDurationY = ft.duration(this.view.y);
      const xOrigin = ft.from(this.screen.x, e.clientX);
      const yOrigin = ft.from(this.screen.y, e.clientY);
      const x = ft.grow(currentDurationX * change, xOrigin, this.view.x);
      const y = ft.grow(currentDurationY * change, yOrigin, this.view.y);
      this.$store.setView({ x, y });
    },
    getFrameParent(id) {
      return (this.frames[id] && this.frames[this.frames[id].parent]) || null;
    },
    updateSize() {
      this.screen = {
        x: [0, this.$el.clientWidth],
        y: [0, this.$el.clientHeight]
      };
    },
    // detect the visible frame at a coordinate [x, y]
    scanCoordinate([x, y], id = -1) {
      if (id === -1) id = this.rootFrame;
      const containsX = ft.contains(this.frames[id].bounds.x, x);
      const containsY = ft.contains(this.frames[id].bounds.y, y);
      if (containsX && containsY) {
        // give children a chance to intercept because they are in front
        if (!this.collapsedStore[id]) {
          return this.frames[id].children.reduce((result, candidate) => {
            const found = this.scanCoordinate([x, y], candidate);
            return found !== undefined ? found : result;
          }, id);
        } else {
          return id;
        }
      }
    },
    onMoveEnd() {
      setTimeout(() => (this.movingFrame = false), 10);
    }
  },
  computed: {
    frameStack() {
      let result = [];
      const view = this.view;
      const scanFrame = id => {
        const frame = this.frames[id];
        const containsX = ft.containsRange(view.x, frame.bounds.x);
        const containsY = ft.containsRange(view.y, frame.bounds.y);
        if (containsX && containsY) {
          result.push(id);
          // 0-1 of how much of the view this takes up
          const viewRatio = ft.duration(
            frame.bounds.x.map(ft.from(this.view.x))
          );
          if (viewRatio > 0.2) {
            frame.children.forEach(scanFrame);
            Vue.set(this.collapsedStore, id, false);
          } else {
            Vue.set(this.collapsedStore, id, true);
          }
        }
      };
      scanFrame(this.rootFrame);
      return result;
    },
    view() {
      return this.$store.state.view;
    }
  }
};
</script>

<style>
@import url("https://fonts.googleapis.com/css?family=Rajdhani&display=swap");
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
body {
  background: #1c1e20;
}
#app {
  overflow: hidden;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  font-size: 1.4em;
  font-family: "Rajdhani", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #a598bd;
  font-weight: 200;
}
</style>
