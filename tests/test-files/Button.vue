<script lang="ts">
export default {
  name: 'Button',
  props: {
    href: {
      type: String,
      default: null,
    },
    target: {
      type: String,
      default: null,
    },
    style: {
      type: Object,
      default: () => ({}),
    },
    onClick: {
      type: Function,
      default: null,
    },
    variant: {
      type: String,
      default: 'primary',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    handleClick(event: MouseEvent): void {
      if (!this.disabled && this.onClick) {
        (this.onClick as (event: MouseEvent) => void)(event);
      }
    },
  },
  computed: {
    buttonStyle(): Record<string, string> {
      return {
        display: 'block',
        borderRadius: '5px',
        border: '1px solid var(--figma-color-border)',
        padding: '0 7px',
        lineHeight: '22px',
        textDecoration: 'none',
        color: 'var(--figma-color-text)',
        backgroundColor: this.variant === 'primary' ? 'var(--figma-color-bg-brand)' : 'var(--figma-color-bg-secondary)',
        cursor: this.disabled ? 'not-allowed' : 'pointer',
        opacity: this.disabled ? '0.6' : '1',
        ...this.style
      };
    },
  },
};
</script>

<template>
  <div>
    <a
      v-if="href"
      :class="`button button-${variant}`"
      :href="href"
      :target="target"
      :style="buttonStyle"
      @click="handleClick"
    >
      <slot />
    </a>
    <button
      v-else
      :class="`button button-${variant}`"
      :style="buttonStyle"
      :disabled="disabled"
      @click="handleClick"
    >
      <slot />
    </button>
  </div>
</template>

<style scoped>
.button {
  font-family: inherit;
  transition: all 0.2s ease;
}

.button:hover:not(:disabled) {
  opacity: 0.8;
}

.button:active:not(:disabled) {
  transform: translateY(1px);
}
</style>
