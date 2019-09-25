<template>
  <div id="app" @mousewheel="onScroll">
    <h2>Intra</h2>
    <frame :key="id" :id="id" v-for="id in frameStack" />
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
          children: [2],
          bounds: [[-17, 17], [-17, 17]],
          hue: 80
        },
        2: {
          name: "corner",
          parent: 1,
          children: [],
          bounds: [[-16, 0], [-16, 0]],
          hue: 120
        }
      },
      nextFrameId: 1,
      rootFrame: 0
    };
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
    frameStyle(id) {
      const frame = this.frames[id];
      const top = ft.from(this.view[1], frame.bounds[1][0]);
      const width = ft.duration(frame.bounds[0].map(ft.from(this.view[0])));
      const left = ft.from(this.view[0], frame.bounds[0][0]);
      const height = ft.duration(frame.bounds[1].map(ft.from(this.view[1])));
      const background = `hsla(${frame.hue}, 70%, 60%, 0.9)`;
      // 0 1px 1em hsla(0, 0%, 0%, 0.2)
      const boxShadow =
        `0 1em 1em -0.5em hsla(${frame.hue}, 80%, 20%, 0.2),` +
        `0 2em 2em -1em hsla(${frame.hue}, 80%, 20%, 0.3)`;
      return {
        boxShadow,
        background,
        top: top * 100 + "%",
        left: left * 100 + "%",
        width: width * 100 + "%",
        height: height * 100 + "%"
      };
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
          frame.children.forEach(scanFrame);
        }
      };
      scanFrame(this.rootFrame);
      return result;
    },
    screen() {
      return [[0, this.$el.scrollWidth], [0, this.$el.scrollHeight]];
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
.frame {
  font-weight: 900;
  font-size: 3em;
  text-align: left;
  border-radius: 2px;
  position: absolute;
}

.corner-title {
  line-height: 0.8em;
  margin: 4px;
  color: hsla(0, 0%, 100%, 0.7);
  text-shadow: 0px 2px 0.3em hsla(0, 0%, 100%, 0.2);
}
</style>
