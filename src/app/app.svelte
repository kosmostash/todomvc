<script lang="ts">
  import "todomvc-common/base.css";
  import "todomvc-app-css/index.css";

  import { AppProvider } from "_/app";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<AppProvider>
  {@render children()}
</AppProvider>
