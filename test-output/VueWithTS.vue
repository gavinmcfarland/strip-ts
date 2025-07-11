
<template>
	<button @click="handleClick">Click me</button>
</template>

<script>





export default {
  methods: {
    handleClick(event) {
      this.$emit('click', event);
    }
  }
};
</script>
