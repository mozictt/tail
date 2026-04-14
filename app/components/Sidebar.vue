<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as icons from "lucide-vue-next";
import { useRoute } from "vue-router";
import { useUIStore } from "@/stores/ui";

const ui = useUIStore();
const route = useRoute();
const emit = defineEmits(["update-active"]);
const config = useRuntimeConfig();

// ===== STATE =====
const activeMenuName = ref<string>("");
const menu = ref<any[]>([]);
const openSubmenu = ref<string | null>(null);
const isMobile = ref(false);

// ===== RESPONSIVE =====
const checkScreen = () => {
  isMobile.value = window.innerWidth < 768;
};

// 👉 FIX: mobile selalu full
const isOpen = computed(() => {
  return isMobile.value ? true : ui.isDesktopSidebarOpen;
});

const isMobileOpen = computed(() => ui.isMobileSidebarOpen);

// ===== HELPERS =====
const isActive = (path: string) =>
  route.path === path || route.path.startsWith(path + "/");

const isParentActive = (children: any[]) =>
  children.some((c) => isActive(c.path));

const findActiveMenu = (items: any[]): any | null => {
  for (const item of items) {
    if (item.path && isActive(item.path)) return item;

    if (item.children) {
      const child = findActiveMenu(item.children);
      if (child) return child;
    }
  }
  return null;
};

// ===== ACTIVE MENU =====
const updateActiveMenu = () => {
  const active = findActiveMenu(menu.value);

  if (active) {
    activeMenuName.value = active.name;
    emit("update-active", active);

    const parent = menu.value.find((m) =>
      m.children?.some((c: any) => c.path === active.path)
    );

    if (parent) {
      openSubmenu.value = parent.name;
    }
  } else {
    activeMenuName.value = "";
    emit("update-active", null);
  }
};

// ===== ACTIONS =====
const toggleSubmenu = (name: string) => {
  openSubmenu.value = openSubmenu.value === name ? null : name;
};

const handleMenuClick = (item: any) => {
  if (item.children) {
    toggleSubmenu(item.name);
    activeMenuName.value = item.name;
    emit("update-active", item);
  } else if (item.path) {
    activeMenuName.value = item.name;
    emit("update-active", item);

    // 👉 UX mobile: auto close
    if (isMobile.value) {
      ui.closeMobileSidebar();
    }
  }
};

// ===== LIFECYCLE =====
onMounted(async () => {
  menu.value = await $fetch("/api/menu");

  checkScreen(); // initial
  window.addEventListener("resize", checkScreen); // 👉 FIX

  updateActiveMenu();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreen);
});

// ===== WATCH ROUTE =====
watch(
  () => route.path,
  () => {
    updateActiveMenu();

    if (isMobile.value) {
      ui.closeMobileSidebar();
    }
  }
);

// ===== TITLE =====
useHead(() => ({
  title: activeMenuName.value
    ? `${activeMenuName.value} | ${config.public.appName}`
    : config.public.appName,
}));
</script><template>
  <!-- OVERLAY -->
  <div
    v-if="isMobileOpen"
    class="fixed inset-0 bg-black/50 z-30 md:hidden"
    @click="ui.closeMobileSidebar()"
  ></div>

  <!-- SIDEBAR -->
  <aside
    :class="[
      'fixed md:static h-screen bg-gradient-to-b from-[#e0f7fa] to-[#d0f0fd] z-40 transition-all duration-300',
      
      // 👉 FIX WIDTH
      isMobile ? 'w-64' : (isOpen ? 'w-64' : 'w-20'),

      // 👉 SLIDE MOBILE
      isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
  >
    <!-- HEADER -->
    <div class="flex items-center justify-between p-4 bg-blue-900 text-white">
      <span v-if="isOpen" class="font-bold">Admin Panel</span>

      <!-- Desktop toggle -->
      <button class="hidden md:inline-flex" @click="ui.toggleDesktopSidebar()">
        <icons.Menu class="w-5 h-5" />
      </button>
    </div>

    <!-- MENU -->
    <nav class="flex flex-col gap-1 p-4 overflow-y-auto">
      <div v-for="(item, idx) in menu" :key="idx">

        <!-- SINGLE -->
        <NuxtLink
          v-if="!item.children"
          :to="item.path"
          @click="handleMenuClick(item)"
          class="flex items-center gap-3 px-3 py-2 rounded-lg transition"
          :class="
            isActive(item.path)
              ? 'bg-blue-500 text-white'
              : 'hover:bg-blue-100'
          "
        >
          <component :is="icons[item.icon]" class="w-5 h-5" />
          <span v-if="isOpen">{{ item.name }}</span>
        </NuxtLink>

        <!-- PARENT -->
        <div
          v-else
          @click="handleMenuClick(item)"
          class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
          :class="
            isParentActive(item.children)
              ? 'bg-blue-500 text-white'
              : 'hover:bg-blue-100'
          "
        >
          <component :is="icons[item.icon]" class="w-5 h-5" />
          <span v-if="isOpen" class="flex-1">{{ item.name }}</span>

          <icons.ChevronDown
            v-if="isOpen"
            :class="{ 'rotate-180': openSubmenu === item.name }"
            class="w-4 h-4 transition-transform"
          />
        </div>

        <!-- SUBMENU -->
        <div
          v-if="item.children && openSubmenu === item.name && isOpen"
          class="pl-8 mt-1 space-y-1"
        >
          <NuxtLink
            v-for="(child, i) in item.children"
            :key="i"
            :to="child.path"
            @click="handleMenuClick(child)"
            class="block py-1 text-sm rounded px-2 transition"
            :class="
              isActive(child.path)
                ? 'bg-blue-500 text-white'
                : 'hover:text-blue-600'
            "
          >
            {{ child.name }}
          </NuxtLink>
        </div>

      </div>
    </nav>
  </aside>
</template>