<script setup lang="ts" generic="T extends LinkProps">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { pageRouteMap, type LinkProps } from "_/core";

type Props = {
  to: T;
  query?: Record<string | number, unknown>;
  replace?: boolean;
  activeClass?: string;
  exactActiveClass?: string;
}

const props = defineProps<Props>();

const href = computed(() => {
  const [key, ...params] = props.to;
  return pageRouteMap[key]?.path(params as never, props.query, { prefix: false });
})

const linkProps = computed(() => ({
  ...(props.replace !== undefined ? { replace: props.replace } : {}),
  ...(props.activeClass !== undefined ? { activeClass: props.activeClass } : {}),
  ...(props.exactActiveClass !== undefined ? { exactActiveClass: props.exactActiveClass } : {}),
}))
</script>

<template>
  <RouterLink :to="href" v-bind="linkProps">
    <slot />
  </RouterLink>
</template>
