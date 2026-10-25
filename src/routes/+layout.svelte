<script lang="ts">
  // Each route group brings its own shell: (app) is the new UI, (classic) the original pages.
  let { children } = $props();
</script>

{@render children()}
