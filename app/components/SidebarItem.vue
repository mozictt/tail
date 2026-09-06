<script setup lang="ts">
import { ref, computed, watch } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute } from "vue-router";
import { useSlugRoute } from "@/composables/useSlugRoute";

const props = defineProps<{
  item: any;
  depth: number;
  isOpenSidebar: boolean;
}>();

const emit = defineEmits(["menu-click"]);

const route = useRoute();
const { slugPath, currentSlug } = useSlugRoute();

const isExpanded = ref(false);
const hasChildren = computed(() => props.item.children && props.item.children.length > 0);

// Helper normalizer icon untuk Sidebar (Case-insensitive & Aliases)
const getMenuIcon = (iconName?: string | null, fallbackIcon: any = icons.Circle) => {
  if (!iconName || !iconName.trim()) return fallbackIcon;

  const raw = iconName.trim();
  const cleanName = raw.replace(/[-_]/g, "").toLowerCase();

  const aliases: Record<string, string> = {
    dashboard: "LayoutDashboard",
    layoutdashboard: "LayoutDashboard",
    users: "Users",
    user: "User",
    settings: "Settings",
    setting: "Settings",
    picture: "Image",
    gallery: "Images",
    image: "Image",
    photo: "Image",
    role: "ShieldCheck",
    roles: "ShieldCheck",
    menus: "Menu",
    menu: "Menu",
    boxicon: "Package",
    box: "Package",
    barang: "Package",
    plus: "Plus",
    folder: "Folder",
    layers: "Layers",
    company: "Building2",
    perusahaan: "Building2",
    document: "FileText",
    documents: "FileText",
    dokumen: "FileText",
    file: "FileText",
    track: "Route",
    roda: "Bike",
    motor: "Bike",
  };

  if (aliases[cleanName] && (icons as any)[aliases[cleanName]]) {
    return (icons as any)[aliases[cleanName]];
  }

  if ((icons as any)[raw]) {
    return (icons as any)[raw];
  }

  const foundKey = Object.keys(icons).find(
    (k) => k.toLowerCase() === cleanName || k.replace(/[-_]/g, "").toLowerCase() === cleanName
  );

  if (foundKey) {
    return (icons as any)[foundKey];
  }

  return fallbackIcon;
};

const isActive = (path: string) => {
  if (!path) return false;
  const currentPath = route.path.replace(`/${currentSlug.value}`, '') || '/';
  return currentPath === path || currentPath.startsWith(path + "/");
};

const isParentActive = (children: any[]): boolean =>
  children && children.some((c) => isActive(c.url || c.path) || (c.children && isParentActive(c.children)));

const handleItemClick = () => {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  }
  emit("menu-click", props.item);
};

// Auto expand when parent is active
watch(
  () => props.item,
  () => {
    if (hasChildren.value && isParentActive(props.item.children)) {
      isExpanded.value = true;
    }
  },
  { immediate: true, deep: true }
);

// Close when sidebar is collapsed
watch(
  () => props.isOpenSidebar,
  (val) => {
    if (!val) {
      isExpanded.value = false;
    } else if (hasChildren.value && isParentActive(props.item.children)) {
      isExpanded.value = true;
    }
  }
);
</script>

<template>
  <div class="w-full">
    <!-- SINGLE MENU (NO CHILDREN) -->
    <NuxtLink
      v-if="!hasChildren"
      :to="slugPath(item.url || item.path)"
      @click="handleItemClick"
      :title="item.name"
      class="group relative flex items-center rounded-xl transition-all duration-200 font-medium text-base-content/70 hover:bg-base-200 hover:text-base-content"
      :class="[
        isOpenSidebar ? (depth === 0 ? 'gap-2.5 px-3 py-2 text-sm' : depth === 1 ? 'gap-2 px-2.5 py-1.5 text-xs' : 'gap-2 px-2 py-1 text-xs') : 'justify-center py-2.5 px-0 w-full',
        isActive(item.url || item.path) ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary shadow-sm font-semibold' : '',
      ]"
    >
      <!-- Icon level 0/1 vs Bullet dot for Level 2+ -->
      <template v-if="depth < 2">
        <component
          :is="getMenuIcon(item.icon, icons.Circle)"
          class="shrink-0 transition-transform group-hover:scale-110"
          :class="[
            depth === 0 ? 'w-5 h-5' : 'w-4 h-4',
            isActive(item.url || item.path) ? 'text-primary' : 'text-base-content/40',
          ]"
        />
      </template>
      <template v-else>
        <span
          class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors ml-0.5"
          :class="isActive(item.url || item.path) ? 'bg-primary ring-2 ring-primary/20' : 'bg-base-content/30 group-hover:bg-base-content/60'"
        />
      </template>

      <span v-if="isOpenSidebar" class="truncate flex-1 min-w-0 leading-snug">{{ item.name }}</span>

      <!-- TOOLTIP WHEN MINIMIZED -->
      <div
        v-if="!isOpenSidebar"
        class="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] whitespace-nowrap transition-all duration-200 translate-x-1 group-hover:translate-x-0"
      >
        <div class="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
          <span>{{ item.name }}</span>
        </div>
        <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
      </div>
    </NuxtLink>

    <!-- PARENT MENU (WITH CHILDREN) -->
    <div v-else class="w-full">
      <div
        @click="handleItemClick"
        :title="item.name"
        class="group relative flex items-center rounded-xl cursor-pointer transition-all duration-200 font-medium text-base-content/70 hover:bg-base-200 hover:text-base-content"
        :class="[
          isOpenSidebar ? (depth === 0 ? 'gap-2.5 px-3 py-2 text-sm' : depth === 1 ? 'gap-2 px-2.5 py-1.5 text-xs' : 'gap-2 px-2 py-1 text-xs') : 'justify-center py-2.5 px-0 w-full',
          isParentActive(item.children) ? 'bg-base-200/50 text-base-content font-semibold' : '',
        ]"
      >
        <!-- Icon level 0/1 vs Bullet dot for Level 2+ -->
        <template v-if="depth < 2">
          <component
            :is="getMenuIcon(item.icon, icons.Folder)"
            class="shrink-0 transition-transform group-hover:scale-110"
            :class="[
              depth === 0 ? 'w-5 h-5' : 'w-4 h-4',
              isParentActive(item.children) ? 'text-primary' : 'text-base-content/40',
            ]"
          />
        </template>
        <template v-else>
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors ml-0.5"
            :class="isParentActive(item.children) ? 'bg-primary ring-2 ring-primary/20' : 'bg-base-content/30 group-hover:bg-base-content/60'"
          />
        </template>

        <span v-if="isOpenSidebar" class="flex-1 truncate min-w-0 leading-snug">{{ item.name }}</span>

        <icons.ChevronDown
          v-if="isOpenSidebar"
          :class="{ 'rotate-180 text-primary': isExpanded }"
          class="w-3.5 h-3.5 transition-transform text-base-content/40 shrink-0"
        />

        <!-- TOOLTIP WHEN MINIMIZED -->
        <div
          v-if="!isOpenSidebar"
          class="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] whitespace-nowrap transition-all duration-200 translate-x-1 group-hover:translate-x-0"
        >
          <div class="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
            <span>{{ item.name }}</span>
            <span v-if="item.children?.length" class="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {{ item.children.length }}
            </span>
          </div>
          <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
        </div>
      </div>

      <!-- CHILD SUBMENU LIST (OPTIMIZED ULTRA-COMPACT INDENTATION) -->
      <div
        v-if="isOpenSidebar && isExpanded"
        class="mt-0.5 space-y-0.5 relative"
        :class="[
          depth === 0 ? 'ml-3.5 pl-2 border-l border-base-content/10' : 'ml-2 pl-1.5 border-l border-base-content/10'
        ]"
      >
        <SidebarItem
          v-for="(child, i) in item.children"
          :key="i"
          :item="child"
          :depth="depth + 1"
          :isOpenSidebar="isOpenSidebar"
          @menu-click="(clickedItem) => emit('menu-click', clickedItem)"
        />
      </div>
    </div>
  </div>
</template>
