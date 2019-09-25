<template>
  <div class="frame" :class="{ collapsed: collapsed }" :style="styles">
    <div
      class="bounds"
      v-hammer:pan="onDraw"
      v-hammer:panend="onDrawEnd"
      v-hammer:panstart="onDrawStart"
      :style="boundsStyle"
    ></div>
    <div class="drawing" :style="drawingStyle"></div>
    <div class="title">
      <div
        ref="title"
        class="title-offset"
        v-hammer:pan="onPan"
        v-hammer:panend="onPanEnd"
        v-hammer:panstart="onPanStart"
      >{{ frame.name }}</div>
    </div>
    <div
      class="resize"
      v-hammer:pan="onResize"
      v-hammer:panstart="onResizeStart"
      v-hammer:panend="onResizeEnd"
      :style="resizeStyle"
    >
      <div class="resize-dot"></div>
    </div>
  </div>
</template>

<script>
import * as ft from "froto";
import { from, to } from "froto";
import Vue from "vue";
export default {
  name: "frame",
  props: ["view", "frame", "screen", "collapsed", "parent", "depth"],
  data() {
    return {
      boundsStart: null,
      drawing: null
    };
  },
  computed: {
    styles() {
      const normalClamp = ft.clamp([0, 1]);
      const frame = this.frame;
      const top = ft.from(this.view[1], frame.bounds[1][0]);
      const left = ft.from(this.view[0], frame.bounds[0][0]);

      //  clamping needs to happen up here for width and height
      const width = ft.duration(
        frame.bounds[0].map(ft.from(this.view[0])).map(normalClamp)
      );
      const height = ft.duration(
        frame.bounds[1].map(ft.from(this.view[1])).map(normalClamp)
      );

      const frameColor = `hsla(${this.frame.hue}, 60%, 60%, 0.95)`;
      const frameColorBorder = `hsla(${this.frame.hue}, 60%, 60%, 0.45)`;
      // 0 1px 1em hsla(0, 0%, 0%, 0.2)
      const border =
        this.collapsed && !this.textOverflows()
          ? `4px solid ${frameColorBorder}`
          : `none`;

      const result = {
        border,
        // but top and left are 0-1
        top: normalClamp(top) * 100 + "%",
        left: normalClamp(left) * 100 + "%",
        width: width * 100 + "%",
        height: height * 100 + "%"
      };

      if (this.collapsed) {
        result.color = frameColor;
        result.textShadow = `0 0 4px hsla(0, 0%, 100%, 0.1),
                             0px 0px 8px ${frameColorBorder}`;
      } else {
        result.boxShadow =
          `0 1em 1em -0.5em hsla(${this.frame.hue}, 60%, 20%, 0.2),` +
          `0 2em 2em -1em hsla(${this.frame.hue}, 60%, 20%, 0.3)`;
      }

      return result;
    },

    boundsStyle() {
      const boxShadow =
        `0 1em 1em -0.5em hsla(${this.frame.hue}, 60%, 20%, 0.2),` +
        `0 2em 2em -1em hsla(${this.frame.hue}, 60%, 20%, 0.3)`;
      const background = `hsla(${this.frame.hue}, 60%, 60%, 0.95)`;
      return {
        boxShadow,
        background
      };
    },
    resizeStyle() {
      const boundsX = this.frame.bounds[0];
      const boundsY = this.frame.bounds[1];
      const screenX = this.screen[0];
      const screenY = this.screen[1];
      const viewX = this.view[0];
      const viewY = this.view[1];
      //
      const left = boundsX.map(from(viewX)).map(to(screenX))[1];
      const top = boundsY.map(from(viewY)).map(to(screenY))[1];
      return {
        left: `calc(${left}px - 0.3em)`,
        top: `calc(${top}px - 0.3em)`
      };
    },
    drawingStyle() {
      if (!this.drawing) {
        return {
          display: "none"
        };
      }
      const drawX = [...this.drawing[0]].sort();
      const drawY = [...this.drawing[1]].sort();
      const screenX = this.screen[0];
      const screenY = this.screen[1];
      const viewX = this.view[0];
      const viewY = this.view[1];
      //
      const drawScreenX = drawX.map(from(viewX)).map(to(screenX));
      const drawScreenY = drawY.map(from(viewY)).map(to(screenY));
      const width = Math.abs(ft.duration(drawScreenX));
      const height = Math.abs(ft.duration(drawScreenY));
      return {
        background: "hsla(0, 0%, 100%, 0.6)",
        left: Math.min(...drawScreenX) + "px",
        top: Math.min(...drawScreenY) + "px",
        height: height + "px",
        width: width + "px"
      };
    }
  },
  methods: {
    textOverflows() {
      if (!this.$el || !this.$refs.title) return true;
      const width = parseInt(getComputedStyle(this.$el).width);
      return this.$refs.title.clientWidth > width;
    },
    onPan(e) {
      const toViewX = ft.to(this.view[0]);
      const fromScreenX = ft.from(this.screen[0]);
      const deltaViewX = ft.duration(
        [0, e.deltaX].map(fromScreenX).map(toViewX)
      );
      const toViewY = ft.to(this.view[1]);
      const fromScreenY = ft.from(this.screen[1]);
      const deltaViewY = ft.duration(
        [0, e.deltaY].map(fromScreenY).map(toViewY)
      );
      const newBounds = [
        ft.add(this.boundsStart[0], [deltaViewX, deltaViewX]),
        ft.add(this.boundsStart[1], [deltaViewY, deltaViewY])
      ];
      this.$emit("updateBounds", newBounds);
    },
    onPanStart() {
      this.boundsStart = this.frame.bounds;
    },
    onPanEnd() {
      this.boundsStart = null;
    },
    onResize(e) {
      const startBoundsX = this.boundsStart[0];
      const startBoundsY = this.boundsStart[1];
      const screenX = this.screen[0];
      const screenY = this.screen[1];
      const viewX = this.view[0];
      const viewY = this.view[1];
      const deltaViewX = ft.duration(
        [0, e.deltaX].map(from(screenX)).map(to(viewX))
      );
      const deltaViewY = ft.duration(
        [0, e.deltaY].map(from(screenY)).map(to(viewY))
      );
      const xMax = this.parent ? this.parent.bounds[0][1] : Infinity;
      const yMax = this.parent ? this.parent.bounds[1][1] : Infinity;
      const xClamp = ft.clamp([startBoundsX[0], xMax]);
      const yClamp = ft.clamp([startBoundsY[0], yMax]);
      const newX = xClamp(this.boundsStart[0][1] + deltaViewX);
      const newY = yClamp(this.boundsStart[1][1] + deltaViewY);
      const newBounds = [[startBoundsX[0], newX], [startBoundsY[0], newY]];
      this.$emit("updateBounds", newBounds);
    },
    onResizeStart() {
      this.boundsStart = this.frame.bounds;
    },
    onResizeEnd() {
      this.boundsStart = null;
    },
    onDraw(e) {
      const x = ft.line(this.screen[0], this.view[0], e.pointers[0].clientX);
      const y = ft.line(this.screen[1], this.view[1], e.pointers[0].clientY);
      Vue.set(this.drawing[0], 1, x);
      Vue.set(this.drawing[1], 1, y);
    },
    onDrawStart(e) {
      const x = ft.line(this.screen[0], this.view[0], e.pointers[0].clientX);
      const y = ft.line(this.screen[1], this.view[1], e.pointers[0].clientY);
      Vue.set(this, "drawing", [[x, x], [y, y]]);
    },
    onDrawEnd() {
      if (this.drawing) {
        this.$emit("spawnFrame", this.drawing);
      }
      this.drawing = null;
    }
  }
};
</script>

<style>
* {
  box-sizing: border-box;
}
.frame {
  color: hsla(0, 0%, 100%, 0.7);
  text-shadow: 0px 2px 0.3em hsla(0, 0%, 100%, 0.2),
    0px 0px 0.1em hsla(0, 0%, 100%, 0.2);
  font-weight: 900;
  font-size: 3em;
  text-align: left;
  position: absolute;
}

.frame.collapsed {
  text-align: center;
  background: transparent;
}

.frame:not(.collapsed) {
  overflow: hidden;
}

.bounds {
  border-radius: 2px;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transition: opacity 0.1s;
}
.frame.collapsed > .bounds {
  opacity: 0;
}

.title {
  position: absolute;
  /* left: 50%; */
  line-height: 1em;
}

.title-offset {
  cursor: grab;
}

.frame.collapsed > .title {
  left: 50%;
  height: 1em;
  top: calc(50% - 0.5em);
}

.frame.collapsed .title-offset {
  position: relative;
  right: 50%;
}

.resize {
  position: fixed;
  width: 0.3em;
  cursor: grab;
}
.resize-dot {
  margin: 0.1em;
  width: 0.1em;
  height: 0.1em;
  border-radius: 1em;
  background: hsla(0, 0%, 100%, 0.3);
  transition: opacity 0.1s;
  opacity: 0;
}

.frame:hover .resize-dot {
  opacity: 1;
}
.resize:hover .resize-dot {
  background: hsla(0, 0%, 100%, 0.7);
}

.drawing {
  position: fixed;
  z-index: 11;
}
</style>
