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
      class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm text-base-content/70 hover:bg-base-200 hover:text-base-content"
      :class="[
        isActive(item.url || item.path) ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary shadow-sm font-semibold' : '',
      ]"
      :style="{ paddingLeft: isOpenSidebar ? `${depth * 12 + 12}px` : '12px' }"
    >
      <component
        :is="getMenuIcon(item.icon, icons.Circle)"
        class="w-5 h-5 shrink-0"
        :class="isActive(item.url || item.path) ? 'text-primary' : 'text-base-content/40'"
      />
      <span v-if="isOpenSidebar" class="truncate">{{ item.name }}</span>
    </NuxtLink>

    <!-- PARENT MENU (WITH CHILDREN) -->
    <div v-else class="w-full">
      <div
        @click="handleItemClick"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 font-medium text-sm text-base-content/70 hover:bg-base-200 hover:text-base-content"
        :class="[
          isParentActive(item.children) ? 'bg-base-200/50 text-base-content font-semibold' : '',
        ]"
        :style="{ paddingLeft: isOpenSidebar ? `${depth * 12 + 12}px` : '12px' }"
      >
        <component
          :is="getMenuIcon(item.icon, icons.Folder)"
          class="w-5 h-5 shrink-0"
          :class="isParentActive(item.children) ? 'text-primary' : 'text-base-content/40'"
        />
        <span v-if="isOpenSidebar" class="flex-1 truncate">{{ item.name }}</span>

        <icons.ChevronDown
          v-if="isOpenSidebar"
          :class="{ 'rotate-180 text-primary': isExpanded }"
          class="w-4 h-4 transition-transform text-base-content/40 shrink-0"
        />
      </div>

      <!-- CHILD SUBMENU LIST (RECURSIVE CALL) -->
      <div
        v-if="isOpenSidebar && isExpanded"
        class="mt-1 space-y-1 relative"
        :class="[
          depth === 0 ? 'pl-4 border-l border-base-content/10 ml-5' : 'pl-2'
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
