<template>
  <div class="space-y-6 pb-12">
    <!-- BREADCRUMB & HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-base-content/60 mb-1">
          <NuxtLink :to="slugPath('/dashboard')" class="hover:text-emerald-500 transition flex items-center gap-1">
            <icons.Home class="w-3.5 h-3.5" />
            Dashboard
          </NuxtLink>
          <span>/</span>
          <NuxtLink :to="slugPath('/whatsapp')" class="hover:text-emerald-500 transition">Integrasi WhatsApp</NuxtLink>
          <span>/</span>
          <span class="text-base-content/90 font-semibold">Master Kontak</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight flex items-center gap-2.5">
          <icons.Users class="w-7 h-7 text-emerald-500" />
          Master Kontak WhatsApp
        </h1>
        <p class="text-xs sm:text-sm text-base-content/60 mt-0.5">
          Kelola direktori kontak pelanggan & kolega serta lihat riwayat percakapan chat WhatsApp per kontak.
        </p>
      </div>

      <!-- Action Buttons Header -->
      <div class="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">

        <button
          @click="openAddModal"
          class="btn btn-sm text-white font-bold rounded-xl gap-2 shadow-sm border-none hover:opacity-90 transition cursor-pointer"
          style="background-color: #059669; color: #ffffff !important;"
        >
          <icons.UserPlus class="w-4 h-4 text-white" />
          <span>Tambah Kontak</span>
        </button>

        <button
          @click="fetchContacts"
          :disabled="loading"
          class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:bg-base-200"
          title="Segarkan Data"
        >
          <icons.RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>

    <!-- NAVIGATION TABS -->
    <div class="flex items-center gap-2 border-b border-base-content/10 pb-3 overflow-x-auto">
      <NuxtLink
        :to="slugPath('/whatsapp')"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-base-content/60 hover:text-base-content hover:bg-base-200/50 shrink-0"
      >
        <icons.Smartphone class="w-4 h-4" />
        Perangkat & Sesi
      </NuxtLink>

      <NuxtLink
        :to="slugPath('/whatsapp/contacts')"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0"
      >
        <icons.Users class="w-4 h-4" />
        Master Kontak WA
      </NuxtLink>

      <NuxtLink
        :to="slugPath('/whatsapp/history')"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-base-content/60 hover:text-base-content hover:bg-base-200/50 shrink-0"
      >
        <icons.History class="w-4 h-4" />
        Riwayat Log Pesan
      </NuxtLink>
    </div>

    <!-- STATS SUMMARY CARDS -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div v-for="stat in statCards" :key="stat.label" class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div :class="['p-2.5 rounded-xl', stat.bg]">
          <component :is="stat.icon" :class="['w-5 h-5', stat.color]" />
        </div>
        <div>
          <div class="text-xl font-extrabold text-base-content">{{ stat.value }}</div>
          <div class="text-[11px] text-base-content/50 font-medium">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB SWITCHER: KONTAK INDIVIDU vs GRUP WHATSAPP -->
    <div class="flex items-center gap-2 border-b border-base-content/10 pb-2">
      <button
        @click="activeTab = 'contacts'"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border"
        :class="activeTab === 'contacts'
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
          : 'bg-base-100 text-base-content/70 border-base-content/10 hover:bg-base-200'"
      >
        <icons.Users class="w-4 h-4" />
        <span>Kontak Pelanggan</span>
        <span
          class="badge badge-xs px-2 rounded-full font-bold"
          :class="activeTab === 'contacts' ? 'bg-white/20 text-white' : 'bg-base-200 text-base-content/70'"
        >
          {{ totalItems }}
        </span>
      </button>

      <button
        @click="switchTabToGroups"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border"
        :class="activeTab === 'groups'
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
          : 'bg-base-100 text-base-content/70 border-base-content/10 hover:bg-base-200'"
      >
        <icons.UsersRound class="w-4 h-4" />
        <span>Grup WhatsApp</span>
        <span
          class="badge badge-xs px-2 rounded-full font-bold"
          :class="activeTab === 'groups' ? 'bg-white/20 text-white' : 'bg-base-200 text-base-content/70'"
        >
          {{ groups.length }}
        </span>
      </button>
    </div>

    <!-- VIEW 1: KONTAK PELANGGAN INDIVIDU -->
    <template v-if="activeTab === 'contacts'">
      <!-- FILTER & SEARCH BAR -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div class="relative flex-1 min-w-[240px]">
          <icons.Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
          <input
            v-model="searchQuery"
            @input="debouncedFetch"
            type="text"
            placeholder="Cari nama atau nomor telepon kontak..."
            class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs focus:border-emerald-500"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
          >
            <icons.X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-base-content/50 font-medium hidden sm:inline">Tampilkan:</span>
          <select v-model="limit" @change="changeLimit" class="select select-bordered select-sm rounded-xl text-xs focus:border-emerald-500">
            <option :value="10">10 / hal</option>
            <option :value="20">20 / hal</option>
            <option :value="50">50 / hal</option>
            <option :value="100">100 / hal</option>
          </select>
        </div>
      </div>

      <!-- TABLE CARD -->
      <div class="bg-base-100 border border-base-content/10 rounded-3xl shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="loading && contacts.length === 0" class="p-12 flex flex-col items-center gap-3 text-base-content/40">
        <span class="loading loading-spinner loading-md text-emerald-500"></span>
        <span class="text-xs font-semibold">Memuat master kontak...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && contacts.length === 0" class="p-12 flex flex-col items-center gap-3 text-base-content/40 text-center">
        <icons.UserX class="w-12 h-12 text-base-content/20" />
        <p class="text-sm font-bold text-base-content/70">Belum Ada Data Kontak</p>
        <p class="text-xs text-base-content/50 max-w-sm">
          Kontak yang Anda tambahkan manual atau yang otomatis tersinkronisasi saat ada pesan masuk akan muncul di sini.
        </p>
        <button
          @click="openAddModal"
          class="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 mt-2"
        >
          <icons.UserPlus class="w-4 h-4" />
          Tambah Kontak Pertama
        </button>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="table table-sm w-full text-xs">
          <thead>
            <tr class="bg-base-200/50 border-b border-base-content/10 text-base-content/70">
              <th class="py-3 pl-5 font-bold">NAMA KONTAK</th>
              <th class="py-3 font-bold">NOMOR WHATSAPP</th>
              <th class="py-3 font-bold">STATUS WA</th>
              <th class="py-3 font-bold">TERAKHIR DIUPDATE</th>
              <th class="py-3 pr-5 font-bold text-right">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="contact in contacts"
              :key="contact.id"
              class="border-b border-base-content/5 hover:bg-base-200/20 transition-colors"
            >
              <!-- Nama Kontak -->
              <td class="py-3.5 pl-5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                    {{ getAvatarInitial(contact.name || contact.pushName || contact.phoneNumber) }}
                  </div>
                  <div>
                    <div class="font-bold text-base-content">
                      {{ contact.name || contact.pushName || 'Tanpa Nama' }}
                    </div>
                    <div v-if="contact.pushName && contact.name && contact.pushName !== contact.name" class="text-[10px] text-base-content/40">
                      ~{{ contact.pushName }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Nomor WA -->
              <td class="py-3.5 font-mono font-semibold text-base-content/80">
                {{ formatPhoneNumber(contact.phoneNumber) }}
              </td>

              <!-- Status WA -->
              <td class="py-3.5">
                <span
                  class="badge text-[10px] font-bold border-none px-2.5 py-1"
                  :class="contact.isRegistered !== false ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'"
                >
                  <icons.CheckCircle2 class="w-3 h-3 mr-1" />
                  Terdaftar
                </span>
              </td>

              <!-- Waktu Update -->
              <td class="py-3.5 text-base-content/60 font-medium whitespace-nowrap">
                {{ formatDateTime(contact.updatedAt || contact.createdAt) }}
              </td>

              <!-- Aksi -->
              <td class="py-3.5 pr-5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Tombol Lihat Riwayat Pesan / Chat per Kontak Pribadi -->
                  <button
                    @click="openContactHistoryModal({ ...contact, isGroup: false, chatType: 'PERSONAL' })"
                    class="btn btn-xs gap-1 bg-purple-500/10 text-purple-600 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg font-bold"
                    title="Lihat Riwayat Percakapan Chat Kontak Pribadi ini"
                  >
                    <icons.User class="w-3.5 h-3.5 text-purple-500" />
                    <span>Riwayat Chat</span>
                  </button>

                  <!-- Kirim Pesan Quick Action -->
                  <button
                    @click="openSendMessageModal(contact)"
                    class="btn btn-xs gap-1 bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 rounded-lg"
                    title="Kirim Pesan WA ke Kontak ini"
                  >
                    <icons.Send class="w-3 h-3" />
                    Kirim Pesan
                  </button>

                  <!-- Edit -->
                  <button
                    @click="openEditModal(contact)"
                    class="btn btn-xs btn-square bg-base-200 text-base-content/70 hover:text-base-content border-none rounded-lg"
                    title="Edit Kontak"
                  >
                    <icons.Edit2 class="w-3.5 h-3.5" />
                  </button>

                  <!-- Hapus -->
                  <button
                    @click="confirmDelete(contact)"
                    class="btn btn-xs btn-square bg-error/10 text-error hover:bg-error/20 border-none rounded-lg"
                    title="Hapus Kontak"
                  >
                    <icons.Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

        <!-- PAGINATION -->
        <div class="flex items-center justify-between px-5 py-4 border-t border-base-content/5">
          <span class="text-[11px] text-base-content/50">
            Total <span class="font-bold text-base-content/70">{{ totalItems }}</span> kontak •
            Halaman <span class="font-bold text-base-content/70">{{ page }}</span> dari
            <span class="font-bold text-base-content/70">{{ totalPages }}</span>
          </span>
          <div class="flex items-center gap-1">
            <button
              @click="changePage(page - 1)"
              :disabled="page <= 1 || loading"
              class="btn btn-ghost btn-xs border border-base-content/10 hover:bg-base-200 rounded-lg"
            >
              <icons.ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <template v-for="p in pageNumbers" :key="p">
              <button
                @click="changePage(p)"
                :class="[
                  'btn btn-xs rounded-lg min-w-[30px]',
                  p === page
                    ? 'bg-emerald-500 text-white border-none'
                    : 'btn-ghost border border-base-content/10 hover:bg-base-200'
                ]"
              >{{ p }}</button>
            </template>
            <button
              @click="changePage(page + 1)"
              :disabled="page >= totalPages || loading"
              class="btn btn-ghost btn-xs border border-base-content/10 hover:bg-base-200 rounded-lg"
            >
              <icons.ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- VIEW 2: GRUP WHATSAPP -->
    <template v-else-if="activeTab === 'groups'">
      <!-- SEARCH & REFRESH BAR GRUP -->
      <div class="bg-base-100 border border-base-content/10 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div class="relative flex-1 min-w-[240px]">
          <icons.Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
          <input
            v-model="groupSearchQuery"
            type="text"
            placeholder="Cari nama grup atau ID grup WhatsApp..."
            class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs focus:border-emerald-500"
          />
        </div>

        <button
          @click="fetchGroups"
          :disabled="loadingGroups"
          class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:bg-base-200"
        >
          <icons.RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loadingGroups }" />
          <span>Segarkan Grup</span>
        </button>
      </div>

      <!-- TABLE CARD GRUP WHATSAPP -->
      <div class="bg-base-100 border border-base-content/10 rounded-3xl shadow-sm overflow-hidden">
        <!-- Loading Skeleton -->
        <div v-if="loadingGroups" class="p-12 flex flex-col items-center gap-3 text-base-content/40">
          <span class="loading loading-spinner loading-md text-emerald-500"></span>
          <span class="text-xs font-semibold">Mengambil daftar grup WhatsApp dari perangkat...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loadingGroups && filteredGroups.length === 0" class="p-12 flex flex-col items-center gap-3 text-base-content/40 text-center">
          <icons.UsersRound class="w-12 h-12 text-base-content/20" />
          <p class="text-sm font-bold text-base-content/70">Tidak Ada Grup WhatsApp Ditemukan</p>
          <p class="text-xs text-base-content/50 max-w-sm">
            Perangkat WhatsApp terhubung belum memiliki atau bergabung di grup mana pun, atau sesi WhatsApp belum aktif.
          </p>
          <button @click="fetchGroups" class="btn btn-sm bg-emerald-600 text-white rounded-xl gap-2 mt-2">
            <icons.RefreshCw class="w-4 h-4" />
            Coba Muat Ulang
          </button>
        </div>

        <!-- Data Table Grup -->
        <div v-else class="overflow-x-auto">
          <table class="table table-sm w-full text-xs">
            <thead>
              <tr class="bg-base-200/50 border-b border-base-content/10 text-base-content/70">
                <th class="py-3 pl-5 font-bold">NAMA GRUP WHATSAPP</th>
                <th class="py-3 font-bold">PEMBUAT / OWNER</th>
                <th class="py-3 font-bold">JUMLAH ANGGOTA</th>
                <th class="py-3 font-bold">TANGGAL DIBUAT</th>
                <th class="py-3 pr-5 font-bold text-right">AKSI</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="group in filteredGroups"
                :key="group.id"
                class="border-b border-base-content/5 hover:bg-base-200/20 transition-colors"
              >
                <!-- Nama Grup -->
                <td class="py-3.5 pl-5">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20 shadow-xs">
                      <icons.UsersRound class="w-4 h-4" />
                    </div>
                    <div>
                      <div class="font-bold text-base-content text-sm">
                        {{ group.subject || 'Tanpa Judul' }}
                      </div>
                      <div class="text-[10px] text-base-content/40 font-mono">
                        {{ group.id }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Owner -->
                <td class="py-3.5 font-mono text-base-content/70 font-medium">
                  {{ group.owner ? group.owner.split('@')[0] : '-' }}
                </td>

                <!-- Jumlah Anggota -->
                <td class="py-3.5">
                  <span class="badge bg-emerald-500/10 text-emerald-600 font-bold border-none px-2.5 py-1">
                    <icons.Users class="w-3 h-3 mr-1" />
                    {{ group.participantsCount }} Anggota
                  </span>
                </td>

                <!-- Tanggal Dibuat -->
                <td class="py-3.5 text-base-content/60 font-medium whitespace-nowrap">
                  {{ group.creation ? formatDateTime(group.creation) : '-' }}
                </td>

                <!-- Aksi -->
                <td class="py-3.5 pr-5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      @click="openGroupDetailModal(group)"
                      class="btn btn-xs bg-base-200 hover:bg-base-300 text-base-content/80 rounded-lg gap-1 border-none font-semibold"
                      title="Lihat Rincian & Anggota"
                    >
                      <icons.Eye class="w-3.5 h-3.5" />
                      <span>Rincian</span>
                    </button>

                    <button
                      @click="openContactHistoryModal({ name: group.subject, phoneNumber: group.id, isGroup: true, chatType: 'GROUP' })"
                      class="btn btn-xs gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg font-bold"
                      title="Lihat & Balas Percakapan Chat Grup Ini"
                    >
                      <icons.Users class="w-3.5 h-3.5 text-amber-500" />
                      <span>Riwayat Chat Grup</span>
                    </button>

                    <button
                      @click="openSendToGroup(group)"
                      class="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 border-none font-bold"
                      title="Kirim Pesan ke Grup Ini"
                    >
                      <icons.Send class="w-3.5 h-3.5" />
                      <span>Kirim Pesan</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- MODAL FORM: TAMBAH / EDIT KONTAK -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showContactModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/40">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <icons.UserPlus v-if="!editingContact" class="w-5 h-5" />
                  <icons.Edit2 v-else class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="font-bold text-base text-base-content leading-tight">
                    {{ editingContact ? 'Edit Data Kontak' : 'Tambah Kontak Baru' }}
                  </h3>
                  <p class="text-xs text-base-content/50 mt-0.5">
                    {{ editingContact ? 'Perbarui informasi kontak pelanggan.' : 'Simpan nomor ke master kontak WhatsApp.' }}
                  </p>
                </div>
              </div>
              <button @click="closeContactModal" class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-xl">
                <icons.X class="w-4 h-4" />
              </button>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="submitSaveContact" class="p-6 space-y-4">
              <!-- Field Nomor Telepon -->
              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                  Nomor Telepon / WhatsApp <span class="text-error">*</span>
                </label>
                <div class="relative flex items-center">
                  <div class="absolute left-3.5 text-base-content/40 pointer-events-none">
                    <icons.Phone class="w-4 h-4" />
                  </div>
                  <input
                    v-model="contactForm.phoneNumber"
                    type="text"
                    required
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs font-semibold focus:border-emerald-500"
                  />
                </div>
                <p class="text-[10px] text-base-content/40">Sistem otomatis mengubah format nomor ke standar internasional (+62).</p>
              </div>

              <!-- Field Nama Kontak -->
              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                  Nama Kontak / Perusahaan
                </label>
                <div class="relative flex items-center">
                  <div class="absolute left-3.5 text-base-content/40 pointer-events-none">
                    <icons.User class="w-4 h-4" />
                  </div>
                  <input
                    v-model="contactForm.name"
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    class="input input-bordered input-sm w-full pl-10 rounded-xl text-xs focus:border-emerald-500"
                  />
                </div>
              </div>

              <!-- Field Push Name (Opsional) -->
              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                  Alias / Push Name (Opsional)
                </label>
                <input
                  v-model="contactForm.pushName"
                  type="text"
                  placeholder="Contoh: Budi (Klinik Sehat)"
                  class="input input-bordered input-sm w-full rounded-xl text-xs focus:border-emerald-500"
                />
              </div>

              <!-- Modal Footer -->
              <div class="pt-4 border-t border-base-content/10 flex items-center justify-end gap-2.5">
                <button type="button" @click="closeContactModal" class="btn btn-ghost btn-sm rounded-xl text-xs font-semibold hover:bg-base-200">
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="!contactForm.phoneNumber.trim() || savingContact"
                  class="btn btn-emerald text-white btn-sm rounded-xl text-xs font-bold gap-2 px-5 border-none shadow-md"
                >
                  <span v-if="savingContact" class="loading loading-spinner loading-xs"></span>
                  <icons.Save v-else class="w-4 h-4" />
                  <span>{{ editingContact ? 'Simpan Perubahan' : 'Tambah Kontak' }}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL QUICK SEND MESSAGE TO CONTACT -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSendModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/40">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <icons.Send class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="font-bold text-base text-base-content leading-tight">
                    Kirim Pesan WhatsApp
                  </h3>
                  <p class="text-xs text-base-content/50 mt-0.5">
                    Ke: <span class="font-bold text-emerald-600">{{ targetContactName }}</span> ({{ formatPhoneNumber(sendForm.to) }})
                  </p>
                </div>
              </div>
              <button @click="closeSendModal" class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-xl">
                <icons.X class="w-4 h-4" />
              </button>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="submitSendMessage" class="p-6 space-y-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                  Isi Pesan Teks
                </label>
                <textarea
                  v-model="sendForm.text"
                  rows="4"
                  placeholder="Ketik isi pesan WhatsApp yang ingin dikirim..."
                  class="textarea textarea-bordered w-full rounded-2xl text-xs focus:border-emerald-500 p-3.5 leading-relaxed"
                ></textarea>
              </div>

              <!-- Lampiran Media Opsional -->
              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                  Lampiran Media (Opsional)
                </label>
                <div class="flex items-center gap-2">
                  <input
                    type="file"
                    ref="sendFileInput"
                    @change="handleSendFileChange"
                    accept="image/*,video/*,application/pdf"
                    class="file-input file-input-bordered file-input-xs file-input-emerald w-full text-xs rounded-xl"
                  />
                  <button
                    v-if="sendForm.file"
                    @click="clearSendFile"
                    type="button"
                    class="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10 shrink-0"
                  >
                    <icons.X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <p v-if="sendForm.file" class="text-[10px] text-emerald-600 font-semibold">
                  {{ sendForm.file.name }} ({{ (sendForm.file.size / 1024 / 1024).toFixed(2) }} MB)
                </p>
              </div>

              <!-- Footer -->
              <div class="pt-4 border-t border-base-content/10 flex items-center justify-end gap-2.5">
                <button type="button" @click="closeSendModal" class="btn btn-ghost btn-sm rounded-xl text-xs font-semibold hover:bg-base-200">
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="(!sendForm.text.trim() && !sendForm.file) || sendingMessage"
                  class="btn btn-emerald text-white btn-sm rounded-xl text-xs font-bold gap-2 px-5 border-none shadow-md"
                >
                  <span v-if="sendingMessage" class="loading loading-spinner loading-xs"></span>
                  <icons.Send v-else class="w-4 h-4" />
                  <span>Kirim Pesan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- MODAL RINCIAN & METADATA GRUP WHATSAPP -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showGroupDetailModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/40 shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <icons.UsersRound class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="font-bold text-base text-base-content leading-tight">
                    {{ activeGroupDetail?.subject || 'Rincian Grup WhatsApp' }}
                  </h3>
                  <p class="text-xs text-base-content/50 font-mono mt-0.5">
                    {{ activeGroupDetail?.id }}
                  </p>
                </div>
              </div>
              <button
                @click="showGroupDetailModal = false"
                class="btn btn-sm btn-ghost btn-circle text-base-content/40 hover:text-base-content"
              >
                <icons.X class="w-4 h-4" />
              </button>
            </div>

            <!-- Modal Content (Scrollable) -->
            <div class="p-6 overflow-y-auto space-y-5 flex-1">
              <!-- Loading -->
              <div v-if="loadingGroupDetail" class="p-8 flex flex-col items-center gap-2 text-base-content/40">
                <span class="loading loading-spinner loading-md text-emerald-500"></span>
                <span class="text-xs font-semibold">Memuat rincian metadata grup...</span>
              </div>

              <template v-else>
                <!-- Group Info Card -->
                <div class="bg-base-200/50 rounded-2xl p-4 border border-base-content/5 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-base-content/50 font-medium">Pembuat / Owner:</span>
                    <span class="font-mono font-bold text-base-content">{{ activeGroupDetail?.owner ? activeGroupDetail.owner.split('@')[0] : '-' }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-base-content/50 font-medium">Jumlah Anggota:</span>
                    <span class="font-bold text-emerald-600">{{ activeGroupDetail?.participantsCount || 0 }} Anggota</span>
                  </div>
                  <div v-if="activeGroupDetail?.desc" class="pt-2 border-t border-base-content/10">
                    <div class="text-[11px] text-base-content/50 font-bold uppercase tracking-wider mb-1">Deskripsi Grup</div>
                    <div class="text-xs text-base-content/80 whitespace-pre-line leading-relaxed bg-base-100 p-2.5 rounded-xl border border-base-content/5">
                      {{ activeGroupDetail.desc }}
                    </div>
                  </div>
                </div>

                <!-- Participants List -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-2">
                      <icons.Users class="w-3.5 h-3.5 text-emerald-500" />
                      Daftar Anggota Grup ({{ activeGroupDetail?.participants?.length || 0 }})
                    </h4>
                  </div>

                  <div class="border border-base-content/10 rounded-2xl overflow-hidden">
                    <div class="max-h-60 overflow-y-auto">
                      <table class="table table-xs w-full">
                        <thead class="bg-base-200 sticky top-0">
                          <tr>
                            <th class="py-2.5 pl-4 font-bold">NOMOR WHATSAPP</th>
                            <th class="py-2.5 font-bold">PERAN ADMIN</th>
                            <th class="py-2.5 pr-4 text-right font-bold">AKSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="p in activeGroupDetail?.participants || []"
                            :key="p.id"
                            class="border-b border-base-content/5 hover:bg-base-200/40"
                          >
                            <td class="py-2 pl-4 font-mono font-semibold text-base-content/90">
                              {{ p.phoneNumber }}
                            </td>
                            <td class="py-2">
                              <span
                                v-if="p.admin === 'superadmin'"
                                class="badge badge-xs bg-purple-500/10 text-purple-600 font-bold border-none"
                              >
                                Superadmin
                              </span>
                              <span
                                v-else-if="p.admin === 'admin'"
                                class="badge badge-xs bg-emerald-500/10 text-emerald-600 font-bold border-none"
                              >
                                Admin Grup
                              </span>
                              <span v-else class="text-[10px] text-base-content/40 font-medium">Anggota</span>
                            </td>
                            <td class="py-2 pr-4 text-right">
                              <button
                                @click="openSendToGroupParticipant(p)"
                                class="btn btn-xs btn-ghost text-emerald-600 hover:bg-emerald-500/10 font-bold"
                              >
                                Chat Privat
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-base-content/10 bg-base-200/40 flex items-center justify-between shrink-0">
              <button
                @click="showGroupDetailModal = false"
                class="btn btn-sm btn-ghost text-base-content/60"
              >
                Tutup
              </button>
              <button
                @click="openSendToGroup(activeGroupDetail)"
                class="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-bold"
              >
                <icons.Send class="w-4 h-4" />
                Kirim Pesan ke Grup Ini
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useGlobalWhatsappChat } from "@/composables/useGlobalWhatsappChat";
import * as icons from "lucide-vue-next";
import Swal from "sweetalert2";
import SecureMedia from "@/components/SecureMedia.vue";
import { WhatsappService } from "@/services/whatsapp.service";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useAuthStore } from "@/stores/auth";

definePageMeta({ layout: "admin" });


const { slugPath } = useSlugRoute();
const authStore = useAuthStore();
const waService = WhatsappService();

const deviceId = computed(() => authStore.tenant_id || "main-session");

// STATE DATA KONTAK
const contacts = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(20);
const totalItems = ref(0);
const totalPages = ref(1);
const searchQuery = ref("");
let debounceTimer: any = null;

// STATE MODAL TAMBAH/EDIT KONTAK
const showContactModal = ref(false);
const editingContact = ref<any>(null);
const savingContact = ref(false);
const contactForm = reactive({
  phoneNumber: "",
  name: "",
  pushName: "",
});

// STATE MODAL QUICK SEND MESSAGE
const showSendModal = ref(false);
const targetContactName = ref("");
const sendingMessage = ref(false);
const sendFileInput = ref<HTMLInputElement | null>(null);
const sendForm = reactive({
  to: "",
  text: "",
  file: null as File | null,
});

// STATE & POLLING NOTIFIKASI PESAN MASUK
const toastNotification = ref<{
  isGroup: boolean;
  title: string;
  sender?: string;
  text: string;
  contact: any;
} | null>(null);

let toastTimer: any = null;
let globalMsgPollTimer: any = null;
const seenMessageIds = new Set<string>();
let isFirstPoll = true;

// STATE TAB & GRUP WHATSAPP
const activeTab = ref<'contacts' | 'groups'>('contacts');
const groups = ref<any[]>([]);
const loadingGroups = ref(false);
const showGroupDetailModal = ref(false);
const activeGroupDetail = ref<any>(null);
const loadingGroupDetail = ref(false);
const groupSearchQuery = ref("");

const filteredGroups = computed(() => {
  if (!groupSearchQuery.value.trim()) return groups.value;
  const q = groupSearchQuery.value.toLowerCase().trim();
  return groups.value.filter(
    (g) =>
      (g.subject || "").toLowerCase().includes(q) ||
      (g.id || "").toLowerCase().includes(q) ||
      (g.desc || "").toLowerCase().includes(q)
  );
});

// COMPUTED STATS
const statCards = computed(() => [
  { label: "Total Kontak", value: totalItems.value, icon: icons.Users, bg: "bg-emerald-500/10", color: "text-emerald-500" },
  { label: "Grup WA", value: groups.value.length, icon: icons.UsersRound, bg: "bg-blue-500/10", color: "text-blue-500" },
  { label: "Halaman", value: `${page.value}/${totalPages.value}`, icon: icons.Layers, bg: "bg-purple-500/10", color: "text-purple-500" },
  { label: "Limit per Hal", value: limit.value, icon: icons.List, bg: "bg-slate-500/10", color: "text-slate-500" },
]);

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  const pages: number[] = [];
  const range = 2;
  for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
    pages.push(i);
  }
  return pages;
});

// Sorted Chat Logs (Oldest -> Newest) untuk Thread View

// FETCH DATA
const fetchContacts = async () => {
  loading.value = true;
  try {
    const res = await waService.getContacts(page.value, limit.value, searchQuery.value);
    contacts.value = res?.items || [];
    totalItems.value = res?.meta?.totalItems || 0;
    totalPages.value = res?.meta?.totalPages || 1;
  } catch (err) {
    console.error("Gagal memuat kontak:", err);
  } finally {
    loading.value = false;
  }
};

const fetchGroups = async () => {
  loadingGroups.value = true;
  try {
    const res = await waService.getGroups(deviceId.value);
    groups.value = res || [];
  } catch (err: any) {
    console.error("Gagal memuat grup WhatsApp:", err);
  } finally {
    loadingGroups.value = false;
  }
};

const switchTabToGroups = () => {
  activeTab.value = 'groups';
  if (groups.value.length === 0) {
    fetchGroups();
  }
};

const openGroupDetailModal = async (group: any) => {
  activeGroupDetail.value = group;
  showGroupDetailModal.value = true;
  loadingGroupDetail.value = true;
  try {
    const detail = await waService.getGroupMetadata(deviceId.value, group.id);
    if (detail) {
      activeGroupDetail.value = detail;
    }
  } catch (err: any) {
    console.error("Gagal mengambil rincian metadata grup:", err);
  } finally {
    loadingGroupDetail.value = false;
  }
};

const openSendToGroup = (group: any) => {
  showSendModal.value = true;
  targetContactName.value = group.subject || group.id;
  sendForm.to = group.id;
  sendForm.text = "";
  sendForm.file = null;
  if (sendFileInput.value) sendFileInput.value.value = "";
  showGroupDetailModal.value = false;
};

const openSendToGroupParticipant = (participant: any) => {
  showSendModal.value = true;
  targetContactName.value = participant.phoneNumber;
  sendForm.to = participant.phoneNumber;
  sendForm.text = "";
  sendForm.file = null;
  if (sendFileInput.value) sendFileInput.value.value = "";
  showGroupDetailModal.value = false;
};

const debouncedFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchContacts();
  }, 400);
};

const clearSearch = () => {
  searchQuery.value = "";
  page.value = 1;
  fetchContacts();
};

const changePage = (p: number) => {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  fetchContacts();
};

const changeLimit = () => {
  page.value = 1;
  fetchContacts();
};

// MODAL HANDLERS FOR CONTACT CRUD
const openAddModal = () => {
  editingContact.value = null;
  contactForm.phoneNumber = "";
  contactForm.name = "";
  contactForm.pushName = "";
  showContactModal.value = true;
};

const openEditModal = (contact: any) => {
  editingContact.value = contact;
  contactForm.phoneNumber = contact.phoneNumber || "";
  contactForm.name = contact.name || "";
  contactForm.pushName = contact.pushName || "";
  showContactModal.value = true;
};

const closeContactModal = () => {
  showContactModal.value = false;
  editingContact.value = null;
};

const submitSaveContact = async () => {
  if (!contactForm.phoneNumber.trim()) return;
  savingContact.value = true;
  try {
    await waService.saveContact({
      phoneNumber: contactForm.phoneNumber.trim(),
      name: contactForm.name.trim() || undefined,
      pushName: contactForm.pushName.trim() || undefined,
    });

    Swal.fire({
      icon: "success",
      title: editingContact.value ? "Kontak Diperbarui" : "Kontak Ditambahkan",
      text: `Data kontak ${contactForm.name || contactForm.phoneNumber} telah berhasil disimpan.`,
      timer: 2000,
      showConfirmButton: false,
    });

    closeContactModal();
    fetchContacts();
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan",
      text: err?.data?.message || "Terjadi kesalahan saat menyimpan data kontak.",
    });
  } finally {
    savingContact.value = false;
  }
};

const confirmDelete = (contact: any) => {
  Swal.fire({
    title: "Hapus Kontak ini?",
    text: `Anda akan menghapus kontak "${contact.name || contact.phoneNumber}" dari master data.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await waService.deleteContact(contact.id);
        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Kontak berhasil dihapus.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchContacts();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Gagal Menghapus",
          text: err?.data?.message || "Gagal menghapus kontak.",
        });
      }
    }
  });
};

// QUICK SEND MESSAGE MODAL
const openSendMessageModal = (contact: any) => {
  targetContactName.value = contact.name || contact.pushName || contact.phoneNumber;
  sendForm.to = contact.phoneNumber;
  sendForm.text = "";
  sendForm.file = null;
  if (sendFileInput.value) sendFileInput.value.value = "";
  showSendModal.value = true;
};

const closeSendModal = () => {
  showSendModal.value = false;
  sendForm.to = "";
  sendForm.text = "";
  sendForm.file = null;
};

const handleSendFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    sendForm.file = target.files[0];
  }
};

const clearSendFile = () => {
  sendForm.file = null;
  if (sendFileInput.value) sendFileInput.value.value = "";
};

const submitSendMessage = async () => {
  if (!sendForm.to || (!sendForm.text.trim() && !sendForm.file)) return;
  sendingMessage.value = true;
  try {
    await waService.sendMessage(
      deviceId.value,
      sendForm.to,
      sendForm.text.trim(),
      sendForm.file
    );

    Swal.fire({
      icon: "success",
      title: "Pesan Terkirim",
      text: `Pesan WhatsApp berhasil dikirimkan ke ${targetContactName.value}.`,
      confirmButtonColor: "#059669",
      timer: 2000,
      showConfirmButton: false,
    });

    closeSendModal();
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Gagal Kirim Pesan",
      text: err?.data?.message || "Terjadi kesalahan saat mengirim pesan WhatsApp.",
    });
  } finally {
    sendingMessage.value = false;
  }
};

// CHAT HISTORY MODAL FOR A SPECIFIC CONTACT (WITH LIVE POLLING & AUTO-SCROLL)
const { openChat } = useGlobalWhatsappChat();
const openContactHistoryModal = (contact: any) => {
  openChat(contact);
};
// UTILS
const getAvatarInitial = (name?: string) => {
  if (!name) return "K";
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return clean ? clean[0] : "K";
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return "-";
  return phone.startsWith("62") ? `+${phone}` : phone;
};

// Synthesizer Beep Notifikasi dengan Web Audio API
const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Graceful fallback jika audio diblokir browser
  }
};

// Meminta Izin Notifikasi Browser Native
const requestNotificationPermission = () => {
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    } else if (Notification.permission === "granted") {
      // Tes notifikasi kecil untuk konfirmasi ke pengguna
      try {
        new Notification("🔔 Notifikasi WhatsApp Aktif", {
          body: "Notifikasi pesan masuk mandiri dan grup telah aktif.",
          icon: "/favicon.ico",
        });
      } catch (e) {}
    }
  }
};


const route = useRoute();
const router = useRouter();

const handleQueryNavigation = async () => {
  const phoneQuery = route.query.phone as string;
  const typeQuery = route.query.type as string;
  const nameQuery = route.query.name as string;
  
  if (phoneQuery) {
    if (typeQuery === 'GROUP' || phoneQuery.endsWith('@g.us')) {
      activeTab.value = 'groups';
      if (groups.value.length === 0) {
        await fetchGroups();
      }
      const targetGroup = groups.value.find((g: any) => g.id === phoneQuery) || {
        id: phoneQuery,
        subject: nameQuery || 'Grup WhatsApp'
      };
      
      openContactHistoryModal({ 
        phoneNumber: targetGroup.id, 
        name: targetGroup.subject || targetGroup.name || targetGroup.id,
        isGroup: true,
        chatType: 'GROUP'
      });
    } else {
      activeTab.value = 'contacts';
      const targetContact = contacts.value.find((c: any) => c.phoneNumber === phoneQuery) || {
        phoneNumber: phoneQuery,
        name: nameQuery || phoneQuery,
      };
      
      openContactHistoryModal({
        ...targetContact,
        isGroup: false,
        chatType: 'PERSONAL'
      });
    }
    
    router.replace({ path: slugPath('/whatsapp/contacts'), query: {} });
  }
};

onMounted(async () => {
  await fetchContacts();
  handleQueryNavigation();

  // Jika diakses dari tombol notifikasi global (dengan query parameter phone)
  clearInterval(chatPollTimer);
});

watch(() => route.query, () => {
  handleQueryNavigation();
});
</script>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Efek highlight flash kuning saat scroll ke pesan yang dikutip */
.wa-highlight-flash {
  animation: highlightFlash 2s ease-out;
}

@keyframes highlightFlash {
  0% {
    background-color: rgba(234, 179, 8, 0.35);
    box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.25);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}
</style>
