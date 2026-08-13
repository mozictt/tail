<template>
  <div class="space-y-6 pb-12">
    <!-- BREADCRUMB & HEADER ACTION -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-base-content/60 mb-1">
          <NuxtLink :to="slugPath('/dashboard')" class="hover:text-primary transition flex items-center gap-1">
            <icons.Home class="w-3.5 h-3.5" />
            Dashboard
          </NuxtLink>
          <span>/</span>
          <span class="text-base-content/90 font-semibold">Profil Perusahaan</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight flex items-center gap-2.5">
          <icons.Building2 class="w-7 h-7 text-primary" />
          Profil Perusahaan
        </h1>
        <p class="text-xs sm:text-sm text-base-content/60 mt-0.5">
          Kelola informasi identitas, legalitas, alamat, dan kontak resmi perusahaan Anda.
        </p>
      </div>

      <!-- Action Header Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="fetchData"
          :disabled="loading"
          class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:bg-base-200"
          title="Muat ulang data"
        >
          <icons.RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">Refresh</span>
        </button>

        <template v-if="profile">
          <button
            @click="openLogoModal"
            class="btn btn-outline btn-sm gap-2 border-base-content/20 hover:border-primary hover:text-primary"
          >
            <icons.Camera class="w-4 h-4" />
            <span class="hidden sm:inline">Ubah Logo</span>
          </button>

          <button
            @click="openEditModal"
            class="btn btn-primary btn-sm gap-2 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition"
          >
            <icons.Edit3 class="w-4 h-4" />
            <span>Edit Profil</span>
          </button>
        </template>
      </div>
    </div>

    <!-- SKELETON LOADING STATE -->
    <div v-if="loading && !profile" class="space-y-6 animate-pulse">
      <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start">
        <div class="w-32 h-32 rounded-2xl bg-base-200 shrink-0"></div>
        <div class="w-full space-y-3">
          <div class="h-8 bg-base-200 rounded-lg w-1/3"></div>
          <div class="h-4 bg-base-200 rounded-lg w-1/2"></div>
          <div class="h-16 bg-base-200 rounded-lg w-full"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="h-48 bg-base-100 border border-base-content/10 rounded-2xl p-6"></div>
        <div class="h-48 bg-base-100 border border-base-content/10 rounded-2xl p-6"></div>
        <div class="h-48 bg-base-100 border border-base-content/10 rounded-2xl p-6"></div>
      </div>
    </div>

    <!-- EMPTY STATE (PROFIL BELUM DIBUAT) -->
    <div
      v-else-if="!loading && !profile"
      class="bg-base-100 border border-base-content/10 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 shadow-sm"
    >
      <div class="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
        <icons.Building2 class="w-10 h-10" />
      </div>
      <h3 class="text-xl sm:text-2xl font-bold text-base-content tracking-tight mb-2">
        Profil Perusahaan Belum Dikonfigurasi
      </h3>
      <p class="text-sm text-base-content/60 max-w-md mx-auto mb-6 leading-relaxed">
        Tenant Anda belum memiliki data profil perusahaan. Silakan lengkapi profil perusahaan untuk keperluan identitas dan sistem.
      </p>
      <button
        @click="openCreateModal"
        class="btn btn-primary text-white gap-2 px-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition"
      >
        <icons.Plus class="w-5 h-5" />
        Buat Profil Perusahaan
      </button>
    </div>

    <!-- MAIN CONTENT VIEW (PROFIL TERSEDIA) -->
    <div v-else-if="profile" class="space-y-6">
      <!-- HERO BRANDING CARD -->
      <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all duration-300">
        <!-- Background Decorative Accent -->
        <div class="absolute -top-16 -right-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <!-- Logo Display with Hover Action -->
          <div class="relative group shrink-0">
            <div class="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-base-200 border-2 border-base-content/10 overflow-hidden flex items-center justify-center shadow-md">
              <SecureCompanyLogo
                :logo-filename="profile.logoFilename"
                :logo-path="profile.logoPath"
                :alt="profile.name"
                img-class="max-w-full max-h-full w-auto h-auto object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <!-- Overlay Button to change/preview logo -->
            <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl flex items-center justify-center gap-2 backdrop-blur-xs">
              <button
                @click="openLogoModal"
                class="p-2 bg-white/20 hover:bg-white/40 text-white rounded-xl transition"
                title="Ganti Logo"
              >
                <icons.Camera class="w-5 h-5" />
              </button>
              <button
                v-if="profile.logoFilename || profile.logoPath"
                @click="confirmRemoveLogo"
                class="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-xl transition"
                title="Hapus Logo"
              >
                <icons.Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Main Info Header -->
          <div class="flex-1 text-center md:text-left space-y-3 w-full">
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 class="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight">
                {{ profile.name }}
              </h2>
              <span v-if="profile.shortName" class="badge badge-primary badge-outline font-semibold px-3 py-1 text-xs rounded-lg">
                {{ profile.shortName }}
              </span>
              <span class="badge badge-success text-white gap-1.5 text-xs font-medium py-1 px-2.5 rounded-lg">
                <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                Aktif
              </span>
            </div>

            <p class="text-sm text-base-content/70 leading-relaxed max-w-3xl">
              {{ profile.description || 'Belum ada deskripsi singkat perusahaan.' }}
            </p>

            <!-- Quick Badges Grid -->
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-base-content/70">
              <div class="flex items-center gap-1.5 bg-base-200/60 px-3 py-1.5 rounded-xl border border-base-content/5">
                <icons.Mail class="w-4 h-4 text-primary" />
                <a :href="`mailto:${profile.email}`" class="hover:underline font-medium text-base-content/80">{{ profile.email }}</a>
              </div>

              <div class="flex items-center gap-1.5 bg-base-200/60 px-3 py-1.5 rounded-xl border border-base-content/5">
                <icons.Phone class="w-4 h-4 text-emerald-500" />
                <a :href="`tel:${profile.phone}`" class="hover:underline font-medium text-base-content/80">{{ profile.phone }}</a>
              </div>

              <div v-if="profile.website" class="flex items-center gap-1.5 bg-base-200/60 px-3 py-1.5 rounded-xl border border-base-content/5">
                <icons.Globe class="w-4 h-4 text-blue-500" />
                <a :href="formatUrl(profile.website)" target="_blank" class="hover:underline font-medium text-base-content/80 flex items-center gap-1">
                  {{ cleanWebsiteUrl(profile.website) }}
                  <icons.ExternalLink class="w-3 h-3 opacity-60" />
                </a>
              </div>

              <div v-if="profile.city || profile.province" class="flex items-center gap-1.5 bg-base-200/60 px-3 py-1.5 rounded-xl border border-base-content/5">
                <icons.MapPin class="w-4 h-4 text-rose-500" />
                <span class="font-medium text-base-content/80">
                  {{ [profile.city, profile.province].filter(Boolean).join(', ') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABS NAVIGATION -->
      <div class="flex border-b border-base-content/10 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-3 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2',
            activeTab === tab.id
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50 rounded-t-xl'
          ]"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- TAB 1: INFORMASI UMUM & IDENTITAS -->
      <div v-if="activeTab === 'general'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Detail Card Identitas -->
        <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex items-center gap-2 pb-3 border-b border-base-content/10">
            <icons.Info class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-base-content text-base">Identitas Perusahaan</h3>
          </div>

          <div class="space-y-3.5 text-sm">
            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Nama Lengkap</span>
              <span class="col-span-2 font-semibold text-base-content">{{ profile.name }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Nama Singkat</span>
              <span class="col-span-2 font-medium text-base-content">{{ profile.shortName || '-' }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Tanggal Berdiri</span>
              <span class="col-span-2 font-medium text-base-content flex items-center gap-1.5">
                <icons.Calendar class="w-4 h-4 text-base-content/40" />
                {{ formatDate(profile.foundedAt) }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Deskripsi</span>
              <p class="col-span-2 text-base-content/80 leading-relaxed text-xs sm:text-sm">
                {{ profile.description || '-' }}
              </p>
            </div>
          </div>
        </div>

        <!-- System & Audit Metadata -->
        <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex items-center gap-2 pb-3 border-b border-base-content/10">
            <icons.ShieldCheck class="w-5 h-5 text-indigo-500" />
            <h3 class="font-bold text-base-content text-base">Informasi System & Tenant</h3>
          </div>

          <div class="space-y-3.5 text-sm">
            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Tenant ID</span>
              <span class="col-span-2 font-mono text-xs bg-base-200 px-2 py-1 rounded-md text-base-content/90 truncate">
                {{ profile.tenantId || '-' }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Dibuat Pada</span>
              <span class="col-span-2 font-medium text-base-content">
                {{ formatDateTime(profile.createdAt) }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <span class="text-base-content/60 font-medium">Terakhir Diubah</span>
              <span class="col-span-2 font-medium text-base-content">
                {{ formatDateTime(profile.updatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: KONTAK & ALAMAT -->
      <div v-if="activeTab === 'contact'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Card Alamat -->
        <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex items-center gap-2 pb-3 border-b border-base-content/10">
            <icons.MapPin class="w-5 h-5 text-rose-500" />
            <h3 class="font-bold text-base-content text-base">Alamat Lengkap</h3>
          </div>

          <div class="space-y-3.5 text-sm">
            <div>
              <span class="text-xs text-base-content/50 uppercase tracking-wider font-semibold block mb-1">Alamat Jalan</span>
              <p class="font-medium text-base-content leading-relaxed bg-base-200/40 p-3 rounded-xl border border-base-content/5">
                {{ profile.address }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-xs text-base-content/50 uppercase tracking-wider font-semibold block mb-1">Kota / Kabupaten</span>
                <span class="font-medium text-base-content">{{ profile.city || '-' }}</span>
              </div>
              <div>
                <span class="text-xs text-base-content/50 uppercase tracking-wider font-semibold block mb-1">Provinsi</span>
                <span class="font-medium text-base-content">{{ profile.province || '-' }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-xs text-base-content/50 uppercase tracking-wider font-semibold block mb-1">Kode Pos</span>
                <span class="font-medium text-base-content">{{ profile.postalCode || '-' }}</span>
              </div>
              <div>
                <span class="text-xs text-base-content/50 uppercase tracking-wider font-semibold block mb-1">Negara</span>
                <span class="font-medium text-base-content">{{ profile.country || 'Indonesia' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Kontak Resmi -->
        <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex items-center gap-2 pb-3 border-b border-base-content/10">
            <icons.PhoneCall class="w-5 h-5 text-emerald-500" />
            <h3 class="font-bold text-base-content text-base">Kontak Resmi</h3>
          </div>

          <div class="space-y-3.5 text-sm">
            <div class="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-content/5">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-primary/10 text-primary">
                  <icons.Mail class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs text-base-content/50 font-semibold block">Email Utama</span>
                  <span class="font-bold text-base-content">{{ profile.email }}</span>
                </div>
              </div>
              <a :href="`mailto:${profile.email}`" class="btn btn-xs btn-ghost text-primary hover:bg-primary/10">Kirim Email</a>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-content/5">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <icons.Phone class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs text-base-content/50 font-semibold block">Telepon</span>
                  <span class="font-bold text-base-content">{{ profile.phone }}</span>
                </div>
              </div>
              <a :href="`tel:${profile.phone}`" class="btn btn-xs btn-ghost text-emerald-600 hover:bg-emerald-500/10">Panggil</a>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-content/5">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <icons.Printer class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs text-base-content/50 font-semibold block">Fax</span>
                  <span class="font-bold text-base-content">{{ profile.fax || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-content/5">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <icons.Globe class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs text-base-content/50 font-semibold block">Website Resmi</span>
                  <span class="font-bold text-base-content">{{ profile.website || '-' }}</span>
                </div>
              </div>
              <a
                v-if="profile.website"
                :href="formatUrl(profile.website)"
                target="_blank"
                class="btn btn-xs btn-ghost text-blue-600 hover:bg-blue-500/10 gap-1"
              >
                Kunjungi
                <icons.ExternalLink class="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: LEGALITAS & BISNIS -->
      <div v-if="activeTab === 'legal'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex items-center gap-2 pb-3 border-b border-base-content/10">
            <icons.FileCheck class="w-5 h-5 text-amber-500" />
            <h3 class="font-bold text-base-content text-base">Dokumen Legalitas</h3>
          </div>

          <div class="space-y-4">
            <div class="p-4 rounded-2xl bg-base-200/40 border border-base-content/5 space-y-1">
              <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">NPWP (Nomor Pokok Wajib Pajak)</span>
              <div class="flex items-center justify-between">
                <span class="font-mono font-bold text-base sm:text-lg text-base-content">
                  {{ profile.npwp || 'Belum diisi' }}
                </span>
                <span v-if="profile.npwp" class="badge badge-success badge-sm text-white">Tercatat</span>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-base-200/40 border border-base-content/5 space-y-1">
              <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">NIB (Nomor Induk Berusaha)</span>
              <div class="flex items-center justify-between">
                <span class="font-mono font-bold text-base sm:text-lg text-base-content">
                  {{ profile.nib || 'Belum diisi' }}
                </span>
                <span v-if="profile.nib" class="badge badge-success badge-sm text-white">Tercatat</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-base-100 border border-base-content/10 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 pb-3 border-b border-base-content/10 mb-4">
              <icons.Award class="w-5 h-5 text-purple-500" />
              <h3 class="font-bold text-base-content text-base">Status Kelengkapan Profil</h3>
            </div>
            <p class="text-sm text-base-content/70 mb-4">
              Tingkat kelengkapan profil perusahaan Anda berguna untuk validasi dokumen resmi dan integrasi cetak laporan.
            </p>

            <!-- Progress Bar -->
            <div class="space-y-2">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-base-content/70">Kemajuan Data</span>
                <span class="text-primary font-bold">{{ completionPercentage }}%</span>
              </div>
              <div class="w-full h-2.5 bg-base-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full transition-all duration-500"
                  :style="{ width: `${completionPercentage}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-base-content/5 flex justify-end">
            <button
              @click="confirmDeleteProfile"
              class="btn btn-ghost btn-sm text-red-500 hover:bg-red-500/10 hover:text-red-600 gap-1.5"
            >
              <icons.Trash2 class="w-4 h-4" />
              Hapus Profil Perusahaan
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 4: MEDIA SOSIAL -->
      <div v-if="activeTab === 'social'" class="bg-base-100 border border-base-content/10 rounded-2xl p-6 shadow-sm space-y-6">
        <div class="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div class="flex items-center gap-2">
            <icons.Share2 class="w-5 h-5 text-blue-500" />
            <h3 class="font-bold text-base-content text-base">Tautan Media Sosial Resmi</h3>
          </div>
          <button @click="openEditModal" class="btn btn-ghost btn-xs text-primary">Edit Media Sosial</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Instagram -->
          <div class="p-4 rounded-2xl border border-base-content/10 bg-base-200/30 flex flex-col justify-between space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-sm">
                <icons.Instagram class="w-5 h-5" />
              </div>
              <div>
                <span class="font-bold text-sm text-base-content block">Instagram</span>
                <span class="text-xs text-base-content/50 truncate block max-w-[140px]">
                  {{ profile.instagram || 'Belum diatur' }}
                </span>
              </div>
            </div>
            <a
              v-if="profile.instagram"
              :href="formatUrl(profile.instagram)"
              target="_blank"
              class="btn btn-sm btn-outline border-base-content/20 hover:border-rose-500 hover:bg-rose-500 hover:text-white w-full gap-1"
            >
              Buka Profil
              <icons.ExternalLink class="w-3.5 h-3.5" />
            </a>
          </div>

          <!-- Facebook -->
          <div class="p-4 rounded-2xl border border-base-content/10 bg-base-200/30 flex flex-col justify-between space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                <icons.Facebook class="w-5 h-5" />
              </div>
              <div>
                <span class="font-bold text-sm text-base-content block">Facebook</span>
                <span class="text-xs text-base-content/50 truncate block max-w-[140px]">
                  {{ profile.facebook || 'Belum diatur' }}
                </span>
              </div>
            </div>
            <a
              v-if="profile.facebook"
              :href="formatUrl(profile.facebook)"
              target="_blank"
              class="btn btn-sm btn-outline border-base-content/20 hover:border-blue-600 hover:bg-blue-600 hover:text-white w-full gap-1"
            >
              Buka Halaman
              <icons.ExternalLink class="w-3.5 h-3.5" />
            </a>
          </div>

          <!-- Twitter / X -->
          <div class="p-4 rounded-2xl border border-base-content/10 bg-base-200/30 flex flex-col justify-between space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-slate-900 text-white shadow-sm">
                <icons.Twitter class="w-5 h-5" />
              </div>
              <div>
                <span class="font-bold text-sm text-base-content block">Twitter / X</span>
                <span class="text-xs text-base-content/50 truncate block max-w-[140px]">
                  {{ profile.twitter || 'Belum diatur' }}
                </span>
              </div>
            </div>
            <a
              v-if="profile.twitter"
              :href="formatUrl(profile.twitter)"
              target="_blank"
              class="btn btn-sm btn-outline border-base-content/20 hover:border-slate-800 hover:bg-slate-800 hover:text-white w-full gap-1"
            >
              Buka Twitter
              <icons.ExternalLink class="w-3.5 h-3.5" />
            </a>
          </div>

          <!-- LinkedIn -->
          <div class="p-4 rounded-2xl border border-base-content/10 bg-base-200/30 flex flex-col justify-between space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-blue-700 text-white shadow-sm">
                <icons.Linkedin class="w-5 h-5" />
              </div>
              <div>
                <span class="font-bold text-sm text-base-content block">LinkedIn</span>
                <span class="text-xs text-base-content/50 truncate block max-w-[140px]">
                  {{ profile.linkedin || 'Belum diatur' }}
                </span>
              </div>
            </div>
            <a
              v-if="profile.linkedin"
              :href="formatUrl(profile.linkedin)"
              target="_blank"
              class="btn btn-sm btn-outline border-base-content/20 hover:border-blue-700 hover:bg-blue-700 hover:text-white w-full gap-1"
            >
              Buka LinkedIn
              <icons.ExternalLink class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL FORM CREATE / EDIT PROFIL PERUSAHAAN -->
    <Transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
        <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto animate-scale-up">
          <!-- Modal Header -->
          <div class="p-6 border-b border-base-content/10 flex items-center justify-between bg-base-200/30 shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <icons.Building2 class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-extrabold text-lg sm:text-xl text-base-content">
                  {{ isEditMode ? 'Edit Profil Perusahaan' : 'Buat Profil Perusahaan Baru' }}
                </h3>
                <p class="text-xs text-base-content/60">
                  Lengkapi seluruh informasi data profil di bawah ini secara akurat.
                </p>
              </div>
            </div>
            <button
              @click="closeModal"
              class="p-2 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-200 transition"
            >
              <icons.X class="w-5 h-5" />
            </button>
          </div>

          <!-- Modal Body Form -->
          <form @submit.prevent="submitForm" class="p-6 overflow-y-auto space-y-6 flex-1">
            <!-- Section 1: Identitas -->
            <div class="space-y-4">
              <h4 class="font-bold text-sm text-primary uppercase tracking-wider border-b border-base-content/10 pb-2 flex items-center gap-2">
                <icons.Info class="w-4 h-4" />
                1. Identitas & Branding Perusahaan
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Nama Perusahaan <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    placeholder="Contoh: PT. Maju Bersama Teknologi"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Nama Singkat / Akronim
                  </label>
                  <input
                    v-model="form.shortName"
                    type="text"
                    placeholder="Contoh: MBT"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-base-content mb-1">
                  Deskripsi Perusahaan
                </label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="Jelaskan bidang usaha, visi, atau deskripsi singkat perusahaan..."
                  class="textarea textarea-bordered w-full rounded-xl focus:border-primary text-sm"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Tanggal Berdiri
                  </label>
                  <input
                    v-model="form.foundedAt"
                    type="date"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>

                <!-- File Upload Logo -->
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Upload File Logo (JPG, PNG, WEBP, SVG - Max 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    @change="handleLogoSelect"
                    class="file-input file-input-bordered file-input-primary w-full rounded-xl text-xs"
                  />
                </div>
              </div>

              <!-- Preview Uploaded Image -->
              <div v-if="logoPreviewUrl" class="flex items-center gap-4 bg-base-200/50 p-3 rounded-2xl border border-base-content/10">
                <img :src="logoPreviewUrl" class="w-14 h-14 object-contain rounded-xl bg-white border border-base-content/10 p-1" />
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-semibold text-base-content block truncate">{{ selectedLogoFile?.name || 'Preview Logo Baru' }}</span>
                  <span class="text-[11px] text-base-content/50">Siap diunggah saat disimpan</span>
                </div>
                <button type="button" @click="clearLogoSelection" class="btn btn-ghost btn-xs text-red-500">Batal</button>
              </div>
            </div>

            <!-- Section 2: Kontak & Alamat -->
            <div class="space-y-4">
              <h4 class="font-bold text-sm text-primary uppercase tracking-wider border-b border-base-content/10 pb-2 flex items-center gap-2">
                <icons.PhoneCall class="w-4 h-4" />
                2. Informasi Kontak & Alamat
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Email Perusahaan <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    placeholder="info@perusahaan.co.id"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Nomor Telepon <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.phone"
                    type="text"
                    required
                    placeholder="021-12345678"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    Nomor Fax
                  </label>
                  <input
                    v-model="form.fax"
                    type="text"
                    placeholder="021-87654321"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    URL Website
                  </label>
                  <input
                    v-model="form.website"
                    type="text"
                    placeholder="https://perusahaan.co.id"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-base-content mb-1">
                  Alamat Lengkap <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="form.address"
                  rows="2"
                  required
                  placeholder="Jl. Jendral Sudirman No. 99..."
                  class="textarea textarea-bordered w-full rounded-xl focus:border-primary text-sm"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Kota</label>
                  <input v-model="form.city" type="text" placeholder="Jakarta Pusat" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Provinsi</label>
                  <input v-model="form.province" type="text" placeholder="DKI Jakarta" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Kode Pos</label>
                  <input v-model="form.postalCode" type="text" placeholder="10220" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Negara</label>
                  <input v-model="form.country" type="text" placeholder="Indonesia" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
              </div>
            </div>

            <!-- Section 3: Legalitas -->
            <div class="space-y-4">
              <h4 class="font-bold text-sm text-primary uppercase tracking-wider border-b border-base-content/10 pb-2 flex items-center gap-2">
                <icons.FileCheck class="w-4 h-4" />
                3. Legalitas & Nomor Izin
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    NPWP (Nomor Pokok Wajib Pajak)
                  </label>
                  <input
                    v-model="form.npwp"
                    type="text"
                    placeholder="01.234.567.8-901.000"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm font-mono"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">
                    NIB (Nomor Induk Berusaha)
                  </label>
                  <input
                    v-model="form.nib"
                    type="text"
                    placeholder="1234567890123"
                    class="input input-bordered w-full rounded-xl focus:border-primary text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Section 4: Sosial Media -->
            <div class="space-y-4">
              <h4 class="font-bold text-sm text-primary uppercase tracking-wider border-b border-base-content/10 pb-2 flex items-center gap-2">
                <icons.Share2 class="w-4 h-4" />
                4. Tautan Media Sosial
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Instagram URL</label>
                  <input v-model="form.instagram" type="text" placeholder="https://instagram.com/perusahaan" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Facebook URL</label>
                  <input v-model="form.facebook" type="text" placeholder="https://facebook.com/perusahaan" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">Twitter / X URL</label>
                  <input v-model="form.twitter" type="text" placeholder="https://twitter.com/perusahaan" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-base-content mb-1">LinkedIn URL</label>
                  <input v-model="form.linkedin" type="text" placeholder="https://linkedin.com/company/perusahaan" class="input input-bordered w-full rounded-xl text-sm" />
                </div>
              </div>
            </div>
          </form>

          <!-- Modal Footer -->
          <div class="p-6 border-t border-base-content/10 bg-base-200/30 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              @click="closeModal"
              :disabled="submitting"
              class="btn btn-ghost rounded-xl text-sm"
            >
              Batal
            </button>
            <button
              type="button"
              @click="submitForm"
              :disabled="submitting"
              class="btn btn-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/35 min-w-[140px]"
            >
              <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
              <span v-else>{{ isEditMode ? 'Simpan Perubahan' : 'Buat Profil' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- MODAL QUICK UPLOAD LOGO -->
    <Transition name="fade">
      <div v-if="showLogoModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
        <div class="bg-base-100 border border-base-content/10 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-base-content/10 pb-4">
            <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
              <icons.Camera class="w-5 h-5 text-primary" />
              Kelola Logo Perusahaan
            </h3>
            <button @click="showLogoModal = false" class="btn btn-ghost btn-xs btn-circle">
              <icons.X class="w-4 h-4" />
            </button>
          </div>

          <!-- Preview & Upload Box -->
          <div class="space-y-4 text-center">
            <div class="w-36 h-36 mx-auto rounded-2xl bg-base-200 border-2 border-dashed border-base-content/20 flex items-center justify-center overflow-hidden relative">
              <img
                v-if="logoModalPreview"
                :src="logoModalPreview"
                class="w-full h-full object-contain p-2"
              />
              <SecureCompanyLogo
                v-else-if="profile?.logoFilename || profile?.logoPath"
                :logo-filename="profile.logoFilename"
                :logo-path="profile.logoPath"
                :alt="profile.name"
                img-class="max-w-full max-h-full w-auto h-auto object-contain p-2"
              />
              <icons.Building2 v-else class="w-12 h-12 text-base-content/30" />
            </div>

            <div class="text-xs text-base-content/60">
              Format yang didukung: <span class="font-semibold">JPG, PNG, WEBP, SVG</span> (Maksimal 5MB).
            </div>

            <input
              type="file"
              ref="logoFileInput"
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              @change="handleLogoModalSelect"
              class="file-input file-input-bordered file-input-primary w-full text-xs rounded-xl"
            />
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-base-content/10">
            <button
              v-if="profile?.logoFilename || profile?.logoPath"
              @click="confirmRemoveLogo"
              :disabled="submittingLogo"
              class="btn btn-ghost btn-xs text-red-500 hover:bg-red-500/10"
            >
              Hapus Logo Saat Ini
            </button>
            <div v-else></div>

            <div class="flex items-center gap-2">
              <button @click="showLogoModal = false" :disabled="submittingLogo" class="btn btn-ghost btn-sm">Batal</button>
              <button
                @click="submitLogoOnly"
                :disabled="!selectedLogoModalFile || submittingLogo"
                class="btn btn-primary btn-sm text-white shadow-md"
              >
                <span v-if="submittingLogo" class="loading loading-spinner loading-xs"></span>
                <span v-else>Unggah Logo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import * as icons from "lucide-vue-next";
import Swal from "sweetalert2";
import { CompanyProfileService, type CompanyProfile } from "@/services/company-profile.service";
import { useCompanyProfileStore } from "@/stores/company-profile";
import { useSlugRoute } from "@/composables/useSlugRoute";

definePageMeta({
  layout: "admin",
});

const { slugPath } = useSlugRoute();
const companyService = CompanyProfileService();
const companyProfileStore = useCompanyProfileStore();

// ===== STATE =====
const profile = ref<CompanyProfile | null>(null);
const loading = ref(true);
const submitting = ref(false);
const submittingLogo = ref(false);

const activeTab = ref<"general" | "contact" | "legal" | "social">("general");

const showModal = ref(false);
const isEditMode = ref(false);

const showLogoModal = ref(false);
const selectedLogoFile = ref<File | null>(null);
const logoPreviewUrl = ref<string | null>(null);

const selectedLogoModalFile = ref<File | null>(null);
const logoModalPreview = ref<string | null>(null);
const logoFileInput = ref<HTMLInputElement | null>(null);

// ===== TABS CONFIGURATION =====
const tabs = [
  { id: 'general', label: 'Ringkasan & Profil', icon: icons.Info },
  { id: 'contact', label: 'Alamat & Kontak', icon: icons.MapPin },
  { id: 'legal', label: 'Legalitas & Dokumen', icon: icons.FileCheck },
  { id: 'social', label: 'Media Sosial', icon: icons.Share2 },
];

// ===== FORM STATE =====
const form = reactive({
  name: "",
  shortName: "",
  description: "",
  email: "",
  phone: "",
  fax: "",
  website: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Indonesia",
  npwp: "",
  nib: "",
  foundedAt: "",
  instagram: "",
  facebook: "",
  twitter: "",
  linkedin: "",
});

// ===== COMPUTED PROPERTIES =====
const logoUrl = computed(() => {
  if (!profile.value) return "";
  return companyService.getLogoUrl(profile.value.logoPath, profile.value.logoFilename);
});

const completionPercentage = computed(() => {
  if (!profile.value) return 0;
  const fields = [
    profile.value.name,
    profile.value.email,
    profile.value.phone,
    profile.value.address,
    profile.value.shortName,
    profile.value.description,
    profile.value.city,
    profile.value.province,
    profile.value.postalCode,
    profile.value.npwp,
    profile.value.nib,
    profile.value.foundedAt,
    profile.value.website,
    profile.value.logoPath || profile.value.logoFilename,
  ];

  const filled = fields.filter((f) => Boolean(f) && String(f).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
});

// ===== METHODS =====
const fetchData = async () => {
  loading.value = true;
  try {
    const data = await companyService.getProfile();
    profile.value = data;
    companyProfileStore.setProfile(data);
  } catch (err: any) {
    console.error("Fetch profile error:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal Memuat Data",
      text: err?.data?.message || "Terjadi kesalahan saat memuat profil perusahaan.",
      confirmButtonText: "Tutup",
    });
  } finally {
    loading.value = false;
  }
};

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  if (target) {
    target.style.display = 'none';
  }
};

const openCreateModal = () => {
  isEditMode.value = false;
  resetForm();
  showModal.value = true;
};

const openEditModal = () => {
  if (!profile.value) return;
  isEditMode.value = true;
  resetForm();

  // Populate form values from profile
  form.name = profile.value.name || "";
  form.shortName = profile.value.shortName || "";
  form.description = profile.value.description || "";
  form.email = profile.value.email || "";
  form.phone = profile.value.phone || "";
  form.fax = profile.value.fax || "";
  form.website = profile.value.website || "";
  form.address = profile.value.address || "";
  form.city = profile.value.city || "";
  form.province = profile.value.province || "";
  form.postalCode = profile.value.postalCode || "";
  form.country = profile.value.country || "Indonesia";
  form.npwp = profile.value.npwp || "";
  form.nib = profile.value.nib || "";
  form.foundedAt = profile.value.foundedAt ? profile.value.foundedAt.substring(0, 10) : "";
  form.instagram = profile.value.instagram || "";
  form.facebook = profile.value.facebook || "";
  form.twitter = profile.value.twitter || "";
  form.linkedin = profile.value.linkedin || "";

  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  clearLogoSelection();
};

const resetForm = () => {
  form.name = "";
  form.shortName = "";
  form.description = "";
  form.email = "";
  form.phone = "";
  form.fax = "";
  form.website = "";
  form.address = "";
  form.city = "";
  form.province = "";
  form.postalCode = "";
  form.country = "Indonesia";
  form.npwp = "";
  form.nib = "";
  form.foundedAt = "";
  form.instagram = "";
  form.facebook = "";
  form.twitter = "";
  form.linkedin = "";
  clearLogoSelection();
};

const handleLogoSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "File Terlalu Besar",
        text: "Ukuran logo maksimal adalah 5MB.",
      });
      target.value = "";
      return;
    }
    selectedLogoFile.value = file;
    logoPreviewUrl.value = URL.createObjectURL(file);
  }
};

const clearLogoSelection = () => {
  selectedLogoFile.value = null;
  if (logoPreviewUrl.value) {
    URL.revokeObjectURL(logoPreviewUrl.value);
    logoPreviewUrl.value = null;
  }
};

const submitForm = async () => {
  const missingFields: string[] = [];

  if (!form.name || !form.name.trim()) missingFields.push("Nama Perusahaan");
  if (!form.email || !form.email.trim()) missingFields.push("Email Perusahaan");
  if (!form.phone || !form.phone.trim()) missingFields.push("Nomor Telepon");
  if (!form.address || !form.address.trim()) missingFields.push("Alamat Lengkap");

  if (missingFields.length > 0) {
    const listItemsHtml = missingFields
      .map((field) => `<li class="flex items-center gap-2 text-sm text-left"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span><span><strong>${field}</strong></span></li>`)
      .join("");

    Swal.fire({
      icon: "warning",
      title: "Bidang Wajib Belum Lengkap",
      html: `
        <div class="text-left text-xs text-slate-500 mb-3">
          Silakan lengkapi bidang wajib yang masih kosong di bawah ini:
        </div>
        <ul class="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-amber-900">
          ${listItemsHtml}
        </ul>
      `,
      confirmButtonText: "Mengerti & Lengkapi",
      confirmButtonColor: "#f59e0b",
      customClass: {
        popup: "rounded-2xl border border-slate-200",
      },
    });
    return;
  }

  submitting.value = true;
  try {
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== "") {
        formData.append(key, val);
      }
    });

    if (selectedLogoFile.value) {
      formData.append("logo", selectedLogoFile.value);
    }

    if (isEditMode.value && profile.value?.id) {
      const updated = await companyService.updateProfile(profile.value.id, formData);
      profile.value = updated;
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Profil perusahaan berhasil diperbarui.",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      const created = await companyService.createProfile(formData);
      profile.value = created;
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Profil perusahaan berhasil dibuat.",
        timer: 2000,
        showConfirmButton: false,
      });
    }

    closeModal();
    fetchData();
  } catch (err: any) {
    console.error("Submit profile error:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan",
      text: err?.data?.message || err?.message || "Terjadi kesalahan saat menyimpan data profil.",
    });
  } finally {
    submitting.value = false;
  }
};

// ===== QUICK LOGO MODAL METHODS =====
const openLogoModal = () => {
  selectedLogoModalFile.value = null;
  logoModalPreview.value = null;
  showLogoModal.value = true;
};

const handleLogoModalSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "File Terlalu Besar",
        text: "Ukuran logo maksimal adalah 5MB.",
      });
      target.value = "";
      return;
    }
    selectedLogoModalFile.value = file;
    logoModalPreview.value = URL.createObjectURL(file);
  }
};

const submitLogoOnly = async () => {
  if (!profile.value?.id || !selectedLogoModalFile.value) return;

  submittingLogo.value = true;
  try {
    const res = await companyService.uploadLogo(profile.value.id, selectedLogoModalFile.value);
    profile.value = res;
    showLogoModal.value = false;
    Swal.fire({
      icon: "success",
      title: "Logo Diperbarui",
      text: "Logo perusahaan berhasil diperbarui.",
      timer: 2000,
      showConfirmButton: false,
    });
    fetchData();
  } catch (err: any) {
    console.error("Upload logo error:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal Upload Logo",
      text: err?.data?.message || "Terjadi kesalahan saat mengunggah file logo.",
    });
  } finally {
    submittingLogo.value = false;
  }
};

const confirmRemoveLogo = async () => {
  if (!profile.value?.id) return;

  const result = await Swal.fire({
    title: "Hapus Logo Perusahaan?",
    text: "Logo perusahaan akan dihapus dari server.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Hapus Logo",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      const res = await companyService.removeLogo(profile.value.id);
      profile.value = res;
      showLogoModal.value = false;
      Swal.fire({
        icon: "success",
        title: "Logo Dihapus",
        text: "Logo perusahaan berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchData();
    } catch (err: any) {
      console.error("Remove logo error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Menghapus Logo",
        text: err?.data?.message || "Terjadi kesalahan saat menghapus logo.",
      });
    }
  }
};

const confirmDeleteProfile = async () => {
  if (!profile.value?.id) return;

  const result = await Swal.fire({
    title: "Nonaktifkan Profil Perusahaan?",
    text: "Data profil akan dinonaktifkan (soft delete). Anda dapat membuatnya kembali jika diperlukan.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Nonaktifkan",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      await companyService.deleteProfile(profile.value.id);
      profile.value = null;
      Swal.fire({
        icon: "success",
        title: "Profil Dinonaktifkan",
        text: "Profil perusahaan berhasil dinonaktifkan.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Delete profile error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Nonaktifkan",
        text: err?.data?.message || "Terjadi kesalahan saat menonaktifkan profil.",
      });
    }
  }
};

// ===== HELPER FORMATTERS =====
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
};

const formatUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};

const cleanWebsiteUrl = (url: string) => {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

// ===== LIFECYCLE =====
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
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

.animate-scale-up {
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
