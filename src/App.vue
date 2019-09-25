<template>
  <div id="app" @mousewheel="onScroll">
    <frame
      :key="id"
      :collapsed="collapsedStore[id]"
      :frame="frames[id]"
      :parent="getFrameParent(id)"
      :view="view"
      :screen="screen"
      @updateBounds="updateBounds(id, $event)"
      v-for="id in frameStack"
    />
  </div>
</template>

<script>
import * as ft from "froto";
import Vue from "vue";
import Frame from "./components/Frame";
export default {
  name: "app",
  components: {
    Frame
  },
  data() {
    return {
      // [ [xRange], [yRange] ]
      view: [[-21, 21], [-21, 21]],
      screen: [[0, 0], [0, 0]],
      frames: {
        // actual implementation will need uuids, maybe urls too
        0: {
          name: "root",
          parent: null,
          children: [1],
          bounds: [[-20, 20], [-20, 20]],
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
          bounds: [[-10, 17], [-17, 17]],
          hue: 80
        },
        2: {
          name: "cornerizer",
          parent: 1,
          children: [],
          bounds: [[-9, 0], [-10, 0]],
          hue: 160
        },
        3: {
          name: "formalizer",
          parent: 1,
          children: [],
          bounds: [[1, 16], [-5, 16]],
          hue: 190
        }
      },
      nextFrameId: 1,
      rootFrame: 0,
      collapsedStore: {}
    };
  },
  mounted() {
    this.screen = [[0, this.$el.clientWidth], [0, this.$el.clientHeight]];
  },
  methods: {
    onScroll(e) {
      const change = (0.05 * e.deltaY) / 100;
      const currentDurationX = ft.duration(this.view[0]);
      const xOrigin = ft.from(this.screen[0], e.clientX);
      const yOrigin = ft.from(this.screen[1], e.clientY);
      const currentDurationY = ft.duration(this.view[1]);

      const newXRange = ft.grow(
        currentDurationX * change,
        xOrigin,
        this.view[0]
      );
      Vue.set(this.view, 0, newXRange);

      const newYRange = ft.grow(
        currentDurationY * change,
        yOrigin,
        this.view[1]
      );
      Vue.set(this.view, 1, newYRange);
    },
    updateBounds(id, [x, y]) {
      const frame = this.frames[id];
      const parent = this.frames[frame.parent];
      let newBounds = [x, y];
      if (parent) {
        newBounds = [
          ft.clampRange(parent.bounds[0], x),
          ft.clampRange(parent.bounds[1], y)
        ];
      }
      Vue.set(frame, "bounds", newBounds);
    },
    getFrameParent(id) {
      return (this.frames[id] && this.frames[this.frames[id].parent]) || null;
    }
  },
  computed: {
    frameStack() {
      let result = [];
      const scanFrame = id => {
        const frame = this.frames[id];
        const containsX = ft.containsRange(this.view[0], frame.bounds[0]);
        const containsY = ft.containsRange(this.view[1], frame.bounds[1]);
        if (containsX && containsY) {
          result.push(id);
          // 0-1 of how much of the view this takes up
          const viewRatio = ft.duration(
            frame.bounds[0].map(ft.from(this.view[0]))
          );
          if (viewRatio > 0.33) {
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
