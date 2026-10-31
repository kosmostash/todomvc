<script setup lang="ts">
import "todomvc-common/base.css";
import "todomvc-app-css/index.css";

import { AppProvider } from "_/app";
</script>

<template>
  <AppProvider>
    <RouterView />
  </AppProvider>
</template>
