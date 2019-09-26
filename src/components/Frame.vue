<template>
  <div class="frame" :class="{ collapsed: collapsed }" :style="styles">
    <div class="bounds" v-hammer:tap="onBoundsTap" :style="boundsStyle"></div>
    <div class="drawing" :style="drawingStyle"></div>
    <div class="title">
      <div
        ref="title"
        class="title-offset"
        v-hammer:pan="onPan"
        v-hammer:panend="onPanEnd"
        v-hammer:panstart="onPanStart"
        v-hammer:tap="onTap"
      >
        {{ title }}
        <div v-if="!title" class="drag-handle">
          <font-awesome-icon icon="arrows-alt" />
        </div>
      </div>
    </div>
    <div
      class="resize"
      v-hammer:pan="onResize"
      v-hammer:panstart="onResizeStart"
      v-hammer:panend="onResizeEnd"
      v-hammer:tap="onTap"
      :style="resizeStyle"
    >
      <div class="resize-dot"></div>
    </div>
    <!-- <svg>
      <clipPath id="clipping">
        <polygon points="" />
      </clipPath>
    </svg>-->
  </div>
</template>

<script>
import * as ft from "froto";
import { from, to } from "froto";
export default {
  name: "frame",
  props: ["view", "frame", "screen", "collapsed", "parent", "depth"],
  data() {
    return {
      boundsStart: null,
      drawing: null,
      boundsTapTimer: null
    };
  },
  computed: {
    title() {
      return this.frame.name;
    },
    clipPath() {
      // const textHeight = 50;
      // const textOffset = this.depth * 40;
      return "";
      // return `0,${textHeight} ${textOffset},${textHeight}, ${textOffset},0 ${}`
    },
    styles() {
      const normalClamp = ft.clamp([0, 1]);
      const frame = this.frame;
      const left = ft.from(this.view.x, frame.bounds.x[0]);
      const top = ft.from(this.view.y, frame.bounds.y[0]);

      //  clamping needs to happen up here for width and height
      const width = ft.duration(
        frame.bounds.x.map(ft.from(this.view.x)).map(normalClamp)
      );
      const height = ft.duration(
        frame.bounds.y.map(ft.from(this.view.y)).map(normalClamp)
      );

      const frameColor = `hsla(${this.frame.hue}, 90%, 70%, 0.95)`;
      const frameColorBorder = `hsla(${this.frame.hue}, 60%, 60%, 0.45)`;
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
      const background = `hsla(${this.frame.hue}, 90%, 70%, 0.95)`;
      return {
        boxShadow,
        background
      };
    },
    resizeStyle() {
      const left = this.frame.bounds.x
        .map(from(this.view.x))
        .map(to(this.screen.x))[1];
      const top = this.frame.bounds.y
        .map(from(this.view.y))
        .map(to(this.screen.y))[1];
      return {
        left: `calc(${left}px - 0.9em)`,
        top: `calc(${top}px - 0.9em)`
      };
    },
    drawingStyle() {
      if (!this.drawing) {
        return {
          display: "none"
        };
      }
      const drawX = [...this.drawing.x].sort();
      const drawY = [...this.drawing.y].sort();
      const drawScreenX = drawX.map(from(this.view.x)).map(to(this.screen.x));
      const drawScreenY = drawY.map(from(this.view.y)).map(to(this.screen.y));
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
    onTap() {
      this.$emit("focus");
    },
    onBoundsTap(e) {
      if (this.boundsTapTimer) {
        clearTimeout(this.boundsTapTimer);
        this.boundsTapTimer = null;
        const x = to(this.view.x, from(this.screen.x, e.pointers[0].clientX));
        const y = to(this.view.y, from(this.screen.y, e.pointers[0].clientY));
        const xRadius = ft.duration(this.frame.bounds.x) / 9;
        const yRadius = ft.duration(this.frame.bounds.y) / 9;
        const xRange = [x - xRadius, x + xRadius];
        const yRange = [y - yRadius, y + yRadius];
        const bounds = {
          x: ft.clampRange(this.frame.bounds.x, xRange),
          y: ft.clampRange(this.frame.bounds.y, yRange)
        };
        this.$emit("spawnFrame", bounds);
      } else {
        this.boundsTapTimer = setTimeout(() => {
          this.$emit("focus");
          this.boundsTapTimer = null;
        }, 300);
      }
    },
    textOverflows() {
      if (!this.$el || !this.$refs.title) return false;
      const width = parseInt(getComputedStyle(this.$el).width);
      return this.$refs.title.clientWidth > width;
    },
    onPan(e) {
      const deltaViewX = ft.duration(
        [0, e.deltaX].map(from(this.screen.x)).map(to(this.view.x))
      );
      const deltaViewY = ft.duration(
        [0, e.deltaY].map(ft.from(this.screen.y)).map(ft.to(this.view.y))
      );
      const newBounds = {
        x: ft.add(this.boundsStart.x, [deltaViewX, deltaViewX]),
        y: ft.add(this.boundsStart.y, [deltaViewY, deltaViewY])
      };
      this.$emit("updateBounds", newBounds);
    },
    onPanStart() {
      this.$emit("moveStart");
      this.boundsStart = this.frame.bounds;
    },
    onPanEnd() {
      this.$emit("moveEnd");
      this.boundsStart = null;
    },
    onResize(e) {
      const boundsStart = this.boundsStart;
      const view = this.view;
      const parent = this.parent;
      const deltaViewX = ft.duration(
        [0, e.deltaX].map(from(this.screen.x)).map(to(view.x))
      );
      const deltaViewY = ft.duration(
        [0, e.deltaY].map(from(this.screen.y)).map(to(view.y))
      );
      const xMax = parent ? parent.bounds.x[1] : Infinity;
      const yMax = parent ? parent.bounds.y[1] : Infinity;
      const xClamp = ft.clamp([boundsStart.x[0], xMax]);
      const yClamp = ft.clamp([boundsStart.y[0], yMax]);
      const newX = xClamp(boundsStart.x[1] + deltaViewX);
      const newY = yClamp(boundsStart.y[1] + deltaViewY);
      const newBounds = {
        x: [boundsStart.x[0], newX],
        y: [boundsStart.y[0], newY]
      };
      this.$emit("updateBounds", newBounds);
    },
    onResizeStart() {
      this.$emit("moveStart");
      this.boundsStart = this.frame.bounds;
    },
    onResizeEnd() {
      this.$emit("moveEnd");
      this.boundsStart = null;
    }
    // onDraw(e) {
    //   const x = ft.line(this.screen.x, this.view.x, e.pointers[0].clientX);
    //   const y = ft.line(this.screen.y, this.view.y, e.pointers[0].clientY);
    //   Vue.set(this.drawing.x, 1, ft.clamp(this.frame.bounds.x, x));
    //   Vue.set(this.drawing.y, 1, ft.clamp(this.frame.bounds.y, y));
    // },
    // onDrawStart(e) {
    //   const x = ft.line(this.screen.x, this.view.x, e.pointers[0].clientX);
    //   const y = ft.line(this.screen.y, this.view.y, e.pointers[0].clientY);
    //   Vue.set(this, "drawing", { x: [x, x], y: [y, y] });
    // },
    // onDrawEnd() {
    //   if (this.drawing) {
    //     this.$emit("spawnFrame", {
    //       x: this.drawing.x.sort((a, b) => a - b),
    //       y: this.drawing.y.sort((a, b) => a - b)
    //     });
    //   }
    //   this.drawing = null;
    // }
  }
};
</script>

<style>
* {
  box-sizing: border-box;
}
.frame {
  color: hsla(0, 0%, 0%, 0.3);
  text-shadow: 0px 2px 0.3em hsla(0, 0%, 100%, 0.2),
    0px 0px 0.1em hsla(0, 0%, 0%, 0.2);
  font-weight: 900;
  font-size: 2em;
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
  width: 0.9em;
  cursor: grab;
}
.resize-dot {
  margin: 0.3em;
  width: 0.3em;
  height: 0.3em;
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

.drag-handle {
  font-size: 0.5em;
  padding: 0.1em;
}
</style>
