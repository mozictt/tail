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

    <!-- MODAL / DRAWER RIWAYAT CHAT PER KONTAK -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showHistoryModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
            <!-- Chat Modal Header -->
            <div class="px-6 py-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                  :class="(activeContactHistory?.chatType === 'GROUP' || activeContactHistory?.isGroup || activeContactHistory?.phoneNumber?.endsWith('@g.us'))
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : 'bg-purple-500/10 text-purple-600 border-purple-500/30'"
                >
                  <icons.Users v-if="activeContactHistory?.chatType === 'GROUP' || activeContactHistory?.isGroup || activeContactHistory?.phoneNumber?.endsWith('@g.us')" class="w-5 h-5" />
                  <icons.User v-else class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="font-bold text-base text-base-content leading-tight flex items-center gap-2">
                    <span>{{ activeContactHistory?.name || activeContactHistory?.pushName || 'Tanpa Nama' }}</span>
                    <span
                      class="badge badge-xs font-bold text-[10px] px-2 uppercase"
                      :class="(activeContactHistory?.chatType === 'GROUP' || activeContactHistory?.isGroup || activeContactHistory?.phoneNumber?.endsWith('@g.us'))
                        ? 'bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-300'
                        : 'bg-purple-500/20 text-purple-600 border-purple-500/30 dark:text-purple-300'"
                    >
                      {{ (activeContactHistory?.chatType === 'GROUP' || activeContactHistory?.isGroup || activeContactHistory?.phoneNumber?.endsWith('@g.us')) ? '👥 GRUP WHATSAPP' : '👤 PESAN PRIBADI' }}
                    </span>
                  </h3>
                  <p class="text-[11px] text-base-content/50 mt-0.5 flex items-center gap-1.5 font-mono">
                    <span>{{ formatPhoneNumber(activeContactHistory?.phoneNumber) }}</span>
                    <span>•</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Chat Sync</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="fetchContactChatLogs(false)"
                  :disabled="chatLogsLoading"
                  class="btn btn-ghost btn-xs gap-1 border border-base-content/10 hover:bg-base-200 rounded-lg"
                  title="Segarkan Chat"
                >
                  <icons.RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': chatLogsLoading }" />
                  <span>Refresh</span>
                </button>
                <button @click="closeHistoryModal" class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-xl">
                  <icons.X class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Chat Messages Container (Thread View) -->
            <div ref="chatContainerRef" class="flex-1 p-6 overflow-y-auto space-y-4 bg-base-200/20">
              <!-- Loading -->
              <div v-if="chatLogsLoading && chatLogs.length === 0" class="flex flex-col items-center justify-center py-12 text-base-content/40">
                <span class="loading loading-spinner loading-md text-emerald-500 mb-2"></span>
                <span class="text-xs font-semibold">Memuat riwayat chat...</span>
              </div>

              <!-- Empty State Chat -->
              <div v-else-if="!chatLogsLoading && chatLogs.length === 0" class="flex flex-col items-center justify-center py-12 text-base-content/40 text-center space-y-2">
                <icons.MessageSquareOff class="w-10 h-10 text-base-content/20" />
                <p class="text-xs font-bold">Belum ada riwayat percakapan dengan kontak ini</p>
                <p class="text-[10px] text-base-content/50 max-w-xs">Pesan yang Anda kirim atau pesan masuk darinya akan muncul otomatis di thread ini.</p>
              </div>

              <!-- Message Bubbles Thread (Sorted Chronologically: Oldest -> Newest) -->
              <template v-else>
                <div
                  v-for="msg in sortedChatLogs"
                  :key="msg.id"
                  :id="`wa-msg-${msg.messageId}`"
                  class="flex flex-col scroll-mt-4"
                  :class="msg.direction === 'OUT' ? 'items-end' : 'items-start'"
                >
                  <div
                    class="max-w-[80%] rounded-2xl p-3.5 shadow-xs text-xs space-y-1 relative group transition-all"
                    :class="msg.direction === 'OUT'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-base-100 border border-base-content/15 text-base-content rounded-bl-none shadow-sm'"
                  >
                    <!-- Header/Direction label -->
                    <div class="flex items-center justify-between text-[10px] opacity-80 gap-4 mb-1">
                      <span class="font-bold uppercase tracking-wider flex items-center gap-1">
                        <component :is="msg.direction === 'OUT' ? icons.ArrowUpRight : icons.ArrowDownLeft" class="w-3 h-3" />
                        {{ getMessageSenderLabel(msg) }}
                      </span>
                      <div class="flex items-center gap-2">
                        <span>{{ formatDateTime(msg.createdAt) }}</span>
                        <button
                          @click="setReplyTarget(msg)"
                          class="hover:underline flex items-center gap-0.5 opacity-90 hover:opacity-100 font-semibold cursor-pointer text-emerald-500 dark:text-emerald-300"
                          title="Kutip & Balas Pesan Ini"
                        >
                          <icons.Reply class="w-3 h-3" />
                          <span>Balas</span>
                        </button>
                      </div>
                    </div>

                    <!-- Quoted Reply Preview (pesan yang di-reply) -->
                    <div
                      v-if="msg.quotedMessageId && getQuotedMessage(msg.quotedMessageId)"
                      @click="scrollToQuotedMessage(msg.quotedMessageId)"
                      class="rounded-xl p-2.5 cursor-pointer border-l-[3px] transition-all hover:opacity-80 mb-1"
                      :class="msg.direction === 'OUT'
                        ? 'bg-emerald-700/50 border-white/50 hover:bg-emerald-700/70'
                        : 'bg-base-200/80 border-emerald-500 hover:bg-base-200'"
                    >
                      <div
                        class="text-[10px] font-bold flex items-center gap-1 mb-0.5"
                        :class="msg.direction === 'OUT' ? 'text-emerald-200' : 'text-emerald-600'"
                      >
                        <icons.Reply class="w-3 h-3" />
                        <span v-if="getQuotedMessage(msg.quotedMessageId)?.direction === 'OUT'">Anda</span>
                        <span v-else>{{ parseGroupSender(getQuotedMessage(msg.quotedMessageId)?.message || '').sender || activeContactHistory?.name || 'Pelanggan' }}</span>
                      </div>
                      <p
                        class="text-[11px] line-clamp-2 leading-snug"
                        :class="msg.direction === 'OUT' ? 'text-white/80' : 'text-base-content/70'"
                      >
                        {{ parseGroupSender(getQuotedMessage(msg.quotedMessageId)?.message || '').cleanText }}
                      </p>
                    </div>

                    <!-- Pratinjau Media Gambar/Video (Secure Fetch) -->
                    <div v-if="msg.mediaUrl" class="my-1.5 overflow-hidden rounded-xl border border-base-content/10 bg-black/5">
                      <div v-if="isImageOrVideo(msg.mediaUrl)" class="max-h-56 h-48 w-full relative">
                        <SecureMedia :filename="msg.mediaUrl" :type="getMediaType(msg.mediaUrl)" />
                      </div>
                      <div v-else class="p-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <icons.FileText class="w-4 h-4" />
                        <span>Dokumen Terlampir</span>
                      </div>
                    </div>

                    <!-- Message Body -->
                    <div>
                      <div
                        v-if="parseGroupSender(msg.message).sender"
                        class="text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 mb-1.5 border"
                        :class="msg.direction === 'OUT'
                          ? 'bg-white/20 text-white border-white/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'"
                      >
                        <icons.User class="w-3 h-3" />
                        <span>{{ parseGroupSender(msg.message).sender }}</span>
                      </div>
                      <p class="whitespace-pre-wrap leading-relaxed break-words font-sans">
                        {{ parseGroupSender(msg.message).cleanText }}
                      </p>
                    </div>

                    <!-- Status Footer for Outgoing -->
                    <div v-if="msg.direction === 'OUT'" class="flex items-center justify-end text-[9px] opacity-80 gap-1 pt-0.5">
                      <span v-if="msg.messageId && !msg.messageId.startsWith('INVALID')" class="font-mono">Terkirim ✓</span>
                      <span v-else-if="msg.messageId && msg.messageId.startsWith('INVALID')" class="text-red-200 font-bold">Gagal</span>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Quick Reply Footer Inside Chat Modal -->
            <div class="p-4 border-t border-base-content/10 bg-base-100 space-y-3">
              <!-- Notice Banner khusus Grup WhatsApp -->
              <div
                v-if="activeContactHistory?.phoneNumber?.endsWith('@g.us') || activeContactHistory?.phoneNumber?.includes('-')"
                class="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5"
              >
                <icons.Users class="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>Percakapan Grup WhatsApp. Balasan yang Anda kirim di sini akan terkirim ke seluruh anggota grup.</span>
              </div>

              <!-- Quoted / Reply Preview Banner -->
              <div v-if="replyingToMessage" class="flex items-center justify-between bg-emerald-500/10 border-l-4 border-emerald-500 p-2.5 rounded-r-xl text-xs">
                <div class="truncate space-y-0.5">
                  <div class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <icons.Reply class="w-3.5 h-3.5" />
                    <span>Membalas Pesan {{ replyingToMessage.direction === 'OUT' ? 'Anda' : (parseGroupSender(replyingToMessage.message).sender || 'Pelanggan') }}</span>
                  </div>
                  <div class="text-xs text-base-content/80 truncate font-mono">
                    "{{ parseGroupSender(replyingToMessage.message).cleanText || replyingToMessage.message }}"
                  </div>
                </div>
                <button @click="cancelReplyTarget" class="text-base-content/40 hover:text-base-content p-1 rounded-lg">
                  <icons.X class="w-3.5 h-3.5" />
                </button>
              </div>
              <!-- File Attachment indicator -->
              <div v-if="chatReplyFile" class="flex items-center justify-between bg-emerald-500/10 text-emerald-600 p-2 rounded-xl text-xs font-semibold">
                <span class="truncate">File: {{ chatReplyFile.name }} ({{ (chatReplyFile.size / 1024 / 1024).toFixed(2) }} MB)</span>
                <button @click="clearChatReplyFile" class="text-error hover:bg-error/10 p-1 rounded">
                  <icons.X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="flex items-center gap-2">
                <!-- File Input Trigger Button -->
                <label class="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-emerald-500 cursor-pointer" title="Lampirkan File Media (Foto/PDF)">
                  <icons.Paperclip class="w-4 h-4" />
                  <input
                    type="file"
                    ref="chatFileInput"
                    @change="handleChatFileChange"
                    accept="image/*,video/*,application/pdf"
                    class="hidden"
                  />
                </label>

                <!-- Input Textarea -->
                <input
                  v-model="chatReplyText"
                  @keyup.enter="submitChatReply"
                  type="text"
                  :placeholder="(activeContactHistory?.phoneNumber?.endsWith('@g.us') || activeContactHistory?.phoneNumber?.includes('-'))
                    ? 'Ketik balasan ke GRUP WhatsApp ini (Tekan Enter untuk kirim)...'
                    : 'Ketik balasan pesan pribadi ke kontak ini (Tekan Enter untuk kirim)...'"
                  class="input input-bordered input-sm flex-1 rounded-xl text-xs focus:border-emerald-500"
                />

                <!-- Send Button -->
                <button
                  @click="submitChatReply"
                  :disabled="(!chatReplyText.trim() && !chatReplyFile) || sendingChatReply"
                  class="btn btn-emerald btn-sm text-white rounded-xl gap-1 px-4 border-none shadow-md"
                >
                  <span v-if="sendingChatReply" class="loading loading-spinner loading-xs"></span>
                  <icons.Send v-else class="w-4 h-4" />
                  <span class="hidden sm:inline font-bold">Kirim</span>
                </button>
              </div>
            </div>

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
import * as icons from "lucide-vue-next";
import Swal from "sweetalert2";
import SecureMedia from "@/components/SecureMedia.vue";
import { WhatsappService } from "@/services/whatsapp.service";
import { useSlugRoute } from "@/composables/useSlugRoute";
import { useAuthStore } from "@/stores/auth";

definePageMeta({ layout: "admin" });

const isImageOrVideo = (url?: string) => {
  if (!url) return false;
  return Boolean(url.match(/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)$/i));
};

const getMediaType = (url?: string): 'photo' | 'video' => {
  if (!url) return 'photo';
  return url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'photo';
};

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

// STATE MODAL RIWAYAT CHAT PER KONTAK
const showHistoryModal = ref(false);
const activeContactHistory = ref<any>(null);
const chatLogs = ref<any[]>([]);
const chatLogsLoading = ref(false);
const chatReplyText = ref("");
const chatReplyFile = ref<File | null>(null);
const chatFileInput = ref<HTMLInputElement | null>(null);
const sendingChatReply = ref(false);
const replyingToMessage = ref<any>(null);
const chatContainerRef = ref<HTMLElement | null>(null);
let chatPollTimer: any = null;

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
const sortedChatLogs = computed(() => {
  return [...chatLogs.value].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
});

// Helper parsing pengirim pesan grup (Nama Pengguna & Nomor Telepon)
const parseGroupSender = (text: string) => {
  if (!text) return { sender: null, cleanText: '' };
  const match = text.match(/^\[([^\]]+)\]:\s*(.*)/s) || text.match(/^\[~([^\]]+)\]\s*(.*)/s);
  if (match) {
    return { sender: match[1], cleanText: match[2] };
  }
  return { sender: null, cleanText: text };
};

const getMessageSenderLabel = (msg: any) => {
  if (!msg) return '-';
  if (msg.direction === 'OUT') return 'Anda / Sistem';

  const parsed = parseGroupSender(msg.message || '');
  if (parsed.sender) return parsed.sender;

  if (msg.participantJid) {
    const rawNum = msg.participantJid.split('@')[0];
    const contact = findContactInCache(rawNum);
    return contact?.name || formatPhoneNumber(rawNum);
  }

  const isGroup = activeContactHistory.value?.phoneNumber?.endsWith('@g.us') || activeContactHistory.value?.phoneNumber?.includes('-');
  if (isGroup) {
    return 'Anggota Grup';
  }

  return activeContactHistory.value?.name || activeContactHistory.value?.pushName || formatPhoneNumber(activeContactHistory.value?.phoneNumber);
};

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
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
};

const openContactHistoryModal = (contact: any) => {
  activeContactHistory.value = contact;
  chatLogs.value = [];
  chatReplyText.value = "";
  clearChatReplyFile();
  showHistoryModal.value = true;
  fetchContactChatLogs(false);

  // Auto polling setiap 3 detik ketika modal chat sedang terbuka
  clearInterval(chatPollTimer);
  chatPollTimer = setInterval(() => {
    if (showHistoryModal.value && activeContactHistory.value) {
      fetchContactChatLogs(true);
    }
  }, 3000);
};

const closeHistoryModal = () => {
  clearInterval(chatPollTimer);
  showHistoryModal.value = false;
  activeContactHistory.value = null;
  chatLogs.value = [];
  chatReplyText.value = "";
  clearChatReplyFile();
  cancelReplyTarget();
};

const fetchContactChatLogs = async (isSilent = false) => {
  if (!activeContactHistory.value) return;
  if (!isSilent) chatLogsLoading.value = true;
  try {
    const rawPhone = activeContactHistory.value.phoneNumber || '';
    const cleanPhone = rawPhone.trim().replace(/^[\s+]+/, '');
    const chatType = activeContactHistory.value.chatType || (
      (rawPhone.endsWith('@g.us') || rawPhone.includes('@g.us') || activeContactHistory.value.isGroup) ? 'GROUP' : 'PERSONAL'
    );
    const res = await waService.getMessageLogs(1, 100, {
      phoneNumber: cleanPhone,
      chatType,
    });
    const newItems = res?.items || [];
    const prevCount = chatLogs.value.length;
    chatLogs.value = newItems;

    // Scroll ke bawah jika ada pesan baru atau saat pertama kali dibuka
    if (!isSilent || newItems.length !== prevCount) {
      scrollToBottom();
    }
  } catch (err) {
    console.error("Gagal mengambil riwayat pesan kontak:", err);
  } finally {
    if (!isSilent) chatLogsLoading.value = false;
  }
};

const handleChatFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    chatReplyFile.value = target.files[0];
  }
};

const clearChatReplyFile = () => {
  chatReplyFile.value = null;
  if (chatFileInput.value) chatFileInput.value.value = "";
};

const setReplyTarget = (msg: any) => {
  replyingToMessage.value = msg;
};

/**
 * Mencari pesan yang dikutip berdasarkan messageId dari daftar chat logs
 */
const getQuotedMessage = (quotedMsgId: string) => {
  if (!quotedMsgId || !sortedChatLogs.value.length) return null;
  return sortedChatLogs.value.find((m: any) => m.messageId === quotedMsgId) || null;
};

/**
 * Scroll dan highlight pesan yang dikutip saat kotak kutipan di-klik
 */
const scrollToQuotedMessage = (quotedMsgId: string) => {
  const el = document.getElementById(`wa-msg-${quotedMsgId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('wa-highlight-flash');
    setTimeout(() => el.classList.remove('wa-highlight-flash'), 2000);
  }
};

const cancelReplyTarget = () => {
  replyingToMessage.value = null;
};

const submitChatReply = async () => {
  if (!activeContactHistory.value || (!chatReplyText.value.trim() && !chatReplyFile.value)) return;
  sendingChatReply.value = true;
  try {
    await waService.sendMessage(
      deviceId.value,
      activeContactHistory.value.phoneNumber,
      chatReplyText.value.trim(),
      chatReplyFile.value,
      replyingToMessage.value?.messageId || undefined
    );

    chatReplyText.value = "";
    clearChatReplyFile();
    cancelReplyTarget();
    await fetchContactChatLogs(false);
    scrollToBottom();
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Gagal Mengirim Balasan",
      text: err?.data?.message || "Gagal mengirimkan pesan balasan.",
    });
  } finally {
    sendingChatReply.value = false;
  }
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

onMounted(async () => {
  await fetchContacts();

  // Jika diakses dari tombol notifikasi global (dengan query parameter phone)
  const phoneQuery = route.query.phone as string;
  if (phoneQuery) {
    const targetContact = contacts.value.find((c: any) => c.phoneNumber === phoneQuery) || {
      phoneNumber: phoneQuery,
      name: phoneQuery.endsWith('@g.us') ? 'Grup WhatsApp' : phoneQuery,
    };
    openContactHistoryModal(targetContact);
  }
});

onUnmounted(() => {
  clearInterval(chatPollTimer);
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
