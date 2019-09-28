<template>
  <div class="frame" :class="{ collapsed: collapsed }" :style="styles">
    <div class="bounds" v-hammer:tap="onBoundsTap" :style="boundsStyle"></div>
    <div class="drawing" :style="drawingStyle"></div>
    <div
      class="north-west"
      v-hammer:pan="onNorthWestPan"
      v-hammer:panend="onNorthWestPanEnd"
      v-hammer:panstart="onNorthWestPanStart"
      v-hammer:tap="onTap"
      :style="northWestStyle"
    >
      <font-awesome-icon icon="ellipsis-v" />
    </div>
    <div
      class="south-east"
      v-hammer:pan="onSouthEastPan"
      v-hammer:panstart="onSouthEastPanStart"
      v-hammer:panend="onSouthEastPanEnd"
      v-hammer:tap="onTap"
      :style="southEastStyle"
    >
      <font-awesome-icon icon="ellipsis-v" />
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

      const paneHeight = ft.duration(this.screen.y) * height;

      const fontSize = paneHeight * 0.05 + "px";

      const result = {
        fontSize,
        lineHeight: fontSize,
        // but top and left are 0-1
        top: normalClamp(top) * 100 + "%",
        left: normalClamp(left) * 100 + "%",
        width: width * 100 + "%",
        height: height * 100 + "%",
        boxShadow:
          `0 1em 1em -0.5em hsla(${this.frame.hue}, 60%, 20%, 0.2),` +
          `0 2em 2em -1em hsla(${this.frame.hue}, 60%, 20%, 0.3)`
      };

      return result;
    },
    boundsStyle() {
      const background = `hsla(${this.frame.hue}, 90%, 70%, 0.95)`;
      return {
        background
      };
    },
    southEastStyle() {
      return {};
    },
    northWestStyle() {
      return {};
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
    onNorthWestPan(e) {
      const view = this.view;
      const boundsStart = this.boundsStart;
      const xBlock = ft.duration(view.x) / 100;
      const yBlock = ft.duration(view.y) / 100;
      const parent = this.parent;
      const deltaViewX = ft.duration(
        [0, e.deltaX].map(from(this.screen.x)).map(to(view.x))
      );
      const deltaViewY = ft.duration(
        [0, e.deltaY].map(from(this.screen.y)).map(to(view.y))
      );
      const xMin = parent ? parent.bounds.x[0] : -Infinity;
      const yMin = parent ? parent.bounds.y[0] : -Infinity;
      const xClamp = ft.clamp([xMin, boundsStart.x[1] - xBlock]);
      const yClamp = ft.clamp([yMin, boundsStart.y[1] - yBlock]);
      const newX = xClamp(boundsStart.x[0] + deltaViewX);
      const newY = yClamp(boundsStart.y[0] + deltaViewY);
      const newBounds = {
        x: [newX, boundsStart.x[1]],
        y: [newY, boundsStart.y[1]]
      };

      this.$emit("updateBounds", newBounds);
    },
    onNorthWestPanStart() {
      this.$emit("moveStart");
      this.boundsStart = this.frame.bounds;
    },
    onNorthWestPanEnd() {
      this.$emit("moveEnd");
      this.boundsStart = null;
    },
    onSouthEastPan(e) {
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
    onSouthEastPanStart() {
      this.$emit("moveStart");
      this.boundsStart = this.frame.bounds;
    },
    onSouthEastPanEnd() {
      this.$emit("moveEnd");
      this.boundsStart = null;
    }
  }
};
</script>

<style>
* {
  box-sizing: border-box;
}
.frame {
  text-shadow: 0px 2px 0.3em hsla(0, 0%, 100%, 0.2),
    0px 0px 0.1em hsla(0, 0%, 0%, 0.2);
  font-weight: 900;
  font-size: 2em;
  text-align: left;
  position: absolute;
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

.north-west {
  color: hsla(0, 0%, 0%, 0.1);
  position: absolute;
  left: 0.25em;
  top: 2.5%;
  width: 10%;
  height: 10%;
  cursor: grab;
  text-align: left;
}

.north-west:hover {
  color: hsla(0, 0%, 0%, 0.3);
}

.south-east {
  color: hsla(0, 0%, 0%, 0.1);
  right: 0.25em;
  bottom: -2.5%;
  position: absolute;
  cursor: grab;
  text-align: right;
  width: 10%;
  height: 10%;
}

.south-east:hover {
  color: hsla(0, 0%, 0%, 0.3);
}
</style>
