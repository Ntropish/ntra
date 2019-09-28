<template>
  <div
    class="app"
    @mousewheel="onScroll"
    v-hammer:pinchend="onPinchEnd"
    v-hammer:pinchstart="onPinchStart"
    v-hammer:pinch="onPinch"
    v-hammer:panend="onPanEnd"
    v-hammer:panstart="onPanStart"
    v-hammer:pan="onPan"
    v-hammer:swipe="onSwipe"
  >
    <navigating-mode
      @move-start="movingFrame = true"
      @move-end="onMoveEnd"
      :screen="screen"
      :stack="stack"
      v-if="mode === 'navigating'"
    />
    <wiring-mode :screen="screen" :stack="stack" v-if="mode === 'wiring'" />
  </div>
</template>

<script>
import * as ft from "froto";
import { from } from "froto";
// import Vue from "vue";
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
      screen: { x: [0, 0], y: [0, 0] },
      mode: "navigating",
      movingFrame: false,
      viewPinchStart: null,
      rootFrame: null
    };
  },
  mounted() {
    this.updateSize();
    window.addEventListener("resize", this.updateSize);
    const spawn = this.$store.spawnFrame;
    const _0 = spawn(null, { x: [-20, 20], y: [-20, 20] });
    const _1 = spawn(_0, { x: [-10, 17], y: [-17, 17] });
    spawn(_1, { x: [-9, 0], y: [-10, 0] });
    spawn(_1, { x: [1, 16], y: [-5, 16] });
    this.rootFrame = _0;
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
    updateSize() {
      this.screen = {
        x: [0, this.$el.clientWidth],
        y: [0, this.$el.clientHeight]
      };
    },

    onMoveEnd() {
      setTimeout(() => (this.movingFrame = false), 10);
    }
  },
  computed: {
    stack() {
      if (typeof this.rootFrame === "number") {
        let result = [];
        const view = this.view;
        const scanFrame = id => {
          const frame = this.$store.state.frames[id];
          const containsX = ft.containsRange(view.x, frame.bounds.x);
          const containsY = ft.containsRange(view.y, frame.bounds.y);
          if (containsX && containsY) {
            result.push(id);
            frame.children.forEach(scanFrame);
          }
        };
        scanFrame(this.rootFrame);
        return result;
      } else {
        return [];
      }
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
.app {
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
