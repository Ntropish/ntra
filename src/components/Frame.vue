<template>
  <div class="frame" :class="{ collapsed: collapsed }" :style="styles">
    <div class="bounds" :style="boundsStyle"></div>
    <div ref="title" class="title">
      <div class="title-offset" v-hammer:pan="onPan" v-hammer:panstart="onPanStart">{{ frame.name }}</div>
    </div>
  </div>
</template>

<script>
import * as ft from "froto";

export default {
  name: "frame",
  props: ["view", "frame", "screen", "collapsed"],
  data() {
    return {
      boundsStart: {}
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
          : `4px solid ${frameColorBorder}`;

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
        result.textShadow = `0px 2px 4px hsla(0, 0%, 0%, 0.1),
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
    }
  },
  methods: {
    textOverflows() {
      return (
        !this.$el ||
        !this.$refs.title ||
        !this.$refs.title.scrollWidth ||
        this.$refs.title.clientWidth > this.$el.clientWidth
      );
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
</style>
