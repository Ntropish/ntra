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
    <frame
      :key="id"
      :collapsed="collapsedStore[id]"
      :frame="frames[id]"
      :parent="getFrameParent(id)"
      :view="view"
      :screen="screen"
      :depth="index"
      @updateBounds="updateBounds(id, $event)"
      @spawnFrame="spawnFrame(id, $event)"
      @focus="focusFrame(id)"
      @moveStart="movingFrame = true"
      @moveEnd="onMoveEnd"
      v-for="(id, index) in frameStack"
    />
  </div>
</template>

<script>
import * as ft from "froto";
import { from, to } from "froto";

import Vue from "vue";
import Frame from "./components/Frame";
export default {
  name: "app",
  components: {
    Frame
  },
  data() {
    return {
      movingFrame: false,
      view: { x: [-21, 21], y: [-21, 21] },
      screen: { x: [0, 0], y: [0, 0] },
      frames: {
        // actual implementation will need uuids, maybe urls too
        0: {
          name: "",
          parent: null,
          children: [1],
          bounds: { x: [-20, 20], y: [-20, 20] },
          hue: 280
          // optional frame properties:
          // type: null // default/null type is just a basic frame
          // tags: [] // searchable strings for users to locate frames
          // data: {} // storage for details about this node
        },
        1: {
          name: "right",
          parent: 0,
          children: [2, 3],
          bounds: { x: [-10, 17], y: [-17, 17] },
          hue: 80
        },
        2: {
          name: "cornerizer",
          parent: 1,
          children: [],
          bounds: { x: [-9, 0], y: [-10, 0] },
          hue: 160
        },
        3: {
          name: "formalizer",
          parent: 1,
          children: [],
          bounds: { x: [1, 16], y: [-5, 16] },
          hue: 190
        }
      },
      nextFrameId: 4,
      rootFrame: 0,
      collapsedStore: {},
      viewPinchStart: null
    };
  },
  mounted() {
    this.updateSize();
    window.addEventListener("resize", this.updateSize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.updateSize);
  },
  methods: {
    spawnFrame(parentId, bounds) {
      const id = this.nextFrameId++;
      Vue.set(this.frames, id, {
        name: "",
        parent: parentId,
        children: [],
        bounds: { ...bounds },
        hue: (this.frames[parentId].hue + 30 + Math.random() * 90) % 360
      });
      const parent = this.frames[parentId];
      Vue.set(parent, "children", parent.children.concat(id));
    },
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

      const newXRange = ft.scale(1 / scale, xOrigin, this.viewPinchStart.x);
      const newYRange = ft.scale(1 / scale, yOrigin, this.viewPinchStart.y);

      Vue.set(this.view, "x", newXRange);
      Vue.set(this.view, "y", newYRange);
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

      const newXRange = ft.sub(this.viewPanStart.x, [deltaX, deltaX]);
      const newYRange = ft.sub(this.viewPanStart.y, [deltaY, deltaY]);

      Vue.set(this.view, "x", newXRange);
      Vue.set(this.view, "y", newYRange);
    },
    onSwipe(e) {
      if (this.movingFrame) return;
      const xChange =
        to(this.view.x, from(this.screen.x, e.velocityX * 100)) -
        to(this.view.x, 0);
      const yChange =
        to(this.view.y, from(this.screen.y, e.velocityY * 100)) -
        to(this.view.y, 0);
      const newXRange = ft.sub(this.view.x, [xChange, xChange]);
      const newYRange = ft.sub(this.view.y, [yChange, yChange]);
      const ms = 300;
      const startTime = Date.now();
      function ease(r) {
        return r ** 1;
      }
      const xTween = ratio => [
        to([this.view.x[0], newXRange[0]], ease(ratio)),
        to([this.view.x[1], newXRange[1]], ease(ratio))
      ];
      const yTween = ratio => [
        to([this.view.y[0], newYRange[0]], ease(ratio)),
        to([this.view.y[1], newYRange[1]], ease(ratio))
      ];
      const update = () => {
        const time = Date.now() - startTime;
        const ratio = time / ms;
        Vue.set(this.view, "x", xTween(ratio));
        Vue.set(this.view, "y", yTween(ratio));
        if (time < ms) {
          requestAnimationFrame(update);
        }
      };
      update();
    },
    onScroll(e) {
      // const coordinate = [
      //   to(this.view.x, from(this.screen.x, e.clientX)),
      //   to(this.view.y, from(this.screen.y, e.clientY))
      // ];
      // const target = this.scanCoordinate(coordinate);
      const change = (0.05 * e.deltaY) / 100;
      const currentDurationX = ft.duration(this.view.x);
      const currentDurationY = ft.duration(this.view.y);
      const xOrigin = ft.from(this.screen.x, e.clientX);
      const yOrigin = ft.from(this.screen.y, e.clientY);

      const newXRange = ft.grow(
        currentDurationX * change,
        xOrigin,
        this.view.x
      );

      const newYRange = ft.grow(
        currentDurationY * change,
        yOrigin,
        this.view.y
      );
      Vue.set(this.view, "x", newXRange);
      Vue.set(this.view, "y", newYRange);
    },
    focusFrame(id) {
      const newXRange = this.frames[id].bounds.x;
      const newYRange = this.frames[id].bounds.y;
      const ms = 100;
      const startTime = Date.now();
      const xTween = ratio => [
        to([this.view.x[0], newXRange[0]], ratio),
        to([this.view.x[1], newXRange[1]], ratio)
      ];
      const yTween = ratio => [
        to([this.view.y[0], newYRange[0]], ratio),
        to([this.view.y[1], newYRange[1]], ratio)
      ];
      const update = () => {
        const time = Date.now() - startTime;
        const ratio = time / ms;
        Vue.set(this.view, "x", xTween(ratio));
        Vue.set(this.view, "y", yTween(ratio));
        if (time < ms) {
          requestAnimationFrame(update);
        }
      };
      update();
    },
    updateBounds(id, newBounds) {
      const frame = this.frames[id];
      const originalBounds = frame.bounds;
      const parent = this.frames[frame.parent];
      if (parent) {
        // parent will be null for the root node but
        // all others need to be clamped down
        newBounds = {
          x: ft.clampRange(parent.bounds.x, newBounds.x),
          y: ft.clampRange(parent.bounds.y, newBounds.y)
        };
      }
      // these convert from the previous bounds space to the equivalent
      // in the new bounds space
      const mapX = ft.line(originalBounds.x, newBounds.x);
      const mapY = ft.line(originalBounds.y, newBounds.y);
      frame.children.forEach(id => {
        const frame = this.frames[id];
        const x = frame.bounds.x.map(mapX);
        const y = frame.bounds.y.map(mapY);
        this.updateBounds(id, { x, y });
      });
      Vue.set(frame, "bounds", newBounds);
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
