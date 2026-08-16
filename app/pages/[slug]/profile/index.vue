<script setup lang="ts">
import { ref, onMounted } from "vue";
import { UserService } from "@/services/user.service";
import Swal from "sweetalert2";
import { 
  User, 
  KeyRound, 
  Upload, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar,
  Sparkles,
  Save,
  Lock,
  Info
} from "lucide-vue-next";

definePageMeta({
  layout: 'admin'
});

const { showToast } = useToast();
const userService = UserService();

const profile = ref<any>(null);
const loading = ref(true);
const submitLoading = ref(false);

const profileForm = ref({
  name: "",
  email: "",
  phoneNumber: "",
  bio: "",
  address: "",
});

const passwordForm = ref({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const fileInput = ref<HTMLInputElement | null>(null);

const fetchProfile = async () => {
  loading.value = true;
  try {
    const res = await userService.getProfile();
    profile.value = res?.data || res;
    
    // Populate form
    if (profile.value?.pegawai) {
      profileForm.value = {
        name: profile.value.pegawai.name || "",
        email: profile.value.pegawai.email || "",
        phoneNumber: profile.value.pegawai.phoneNumber || "",
        bio: profile.value.pegawai.bio || "",
        address: profile.value.pegawai.address || "",
      };
    }
  } catch (err: any) {
    console.error("Gagal mengambil profil:", err);
    showToast("Gagal memuat profil pengguna", "error");
  } finally {
    loading.value = false;
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  submitLoading.value = true;
  try {
    await userService.uploadAvatar(file);
    showToast("Foto profil berhasil diperbarui", "success");
    await fetchProfile();
    // Reload to refresh sidebar avatar
    window.location.reload();
  } catch (err: any) {
    console.error("Gagal mengupload avatar:", err);
    showToast(err?.data?.message || err?.message || "Gagal mengunggah foto profil", "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleUpdateProfile = async () => {
  if (!profileForm.value.name.trim()) {
    showToast("Nama pegawai wajib diisi", "error");
    return;
  }

  submitLoading.value = true;
  try {
    await userService.updateProfile({
      name: profileForm.value.name.trim(),
      email: profileForm.value.email.trim(),
      phoneNumber: profileForm.value.phoneNumber.trim(),
      bio: profileForm.value.bio.trim(),
      address: profileForm.value.address.trim(),
    });
    showToast("Profil berhasil diperbarui", "success");
    await fetchProfile();
  } catch (err: any) {
    console.error("Gagal memperbarui profil:", err);
    showToast(err?.data?.message || err?.message || "Gagal memperbarui profil", "error");
  } finally {
    submitLoading.value = false;
  }
};

const handleChangePassword = async () => {
  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword) {
    showToast("Kata sandi lama dan baru wajib diisi", "error");
    return;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    showToast("Konfirmasi kata sandi baru tidak cocok", "error");
    return;
  }

  submitLoading.value = true;
  try {
    await userService.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword,
    });
    showToast("Kata sandi berhasil diubah", "success");
    passwordForm.value = {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  } catch (err: any) {
    console.error("Gagal mengubah kata sandi:", err);
    showToast(err?.data?.message || err?.message || "Gagal mengubah kata sandi", "error");
  } finally {
    submitLoading.value = false;
  }
};

const getAvatarUrl = () => {
  if (profile.value?.pegawai?.avatar) {
    return useRuntimeConfig().public.apiBase + '/users/profile/avatar-stream/' + profile.value.pegawai.avatar;
  }
  return null;
};

onMounted(() => {
  fetchProfile();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- ======================================================== -->
    <!-- HEADER SECTION -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-3xl border border-primary/15 shadow-2xs">
      <div>
        <h1 class="text-2xl font-black text-base-content tracking-tight mb-1 flex items-center gap-2">
          <span>Pengaturan Profil</span>
          <Sparkles class="w-5 h-5 text-primary animate-pulse" />
        </h1>
        <p class="text-xs text-base-content/60 font-semibold leading-relaxed">
          Kelola informasi pribadi, ubah foto profil, dan tingkatkan keamanan akun Anda.
        </p>
      </div>
    </div>

    <!-- SKELETON LOADER -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 bg-base-200 h-64 rounded-3xl animate-pulse"></div>
      <div class="lg:col-span-2 bg-base-200 h-96 rounded-3xl animate-pulse"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- ======================================================== -->
      <!-- CARD 1: AVATAR & ACCOUNT SUMMARY -->
      <!-- ======================================================== -->
      <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
        <div class="relative group">
          <div class="w-32 h-32 rounded-3xl overflow-hidden ring-4 ring-primary/10">
            <SecureAvatar
              :avatar-path="profile?.pegawai?.avatar"
              :name="profileForm.name"
              img-class="w-full h-full object-cover"
              fallback-class="w-full h-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-3xl uppercase"
            />
          </div>
          
          <button 
            @click="triggerFileInput"
            class="absolute -bottom-2 -right-2 btn btn-primary btn-circle btn-sm shadow-md hover:scale-105 transition"
            title="Upload Foto Profil"
            :disabled="submitLoading"
          >
            <Upload class="w-4 h-4 text-white" />
          </button>
          
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden" 
            accept="image/*" 
            @change="handleAvatarUpload" 
          />
        </div>

        <div>
          <h2 class="font-extrabold text-lg text-base-content">{{ profileForm.name }}</h2>
          <p class="text-xs font-semibold text-primary mb-1">{{ profile?.role?.name || 'Tanpa Role' }}</p>
          <span class="badge badge-neutral text-[10px] font-bold">NIP: {{ profile?.pegawai?.nip || '-' }}</span>
        </div>

        <div class="w-full border-t border-base-content/5 pt-4 space-y-2.5 text-left">
          <div class="flex items-center gap-2 text-xs text-base-content/70">
            <User class="w-4 h-4 text-base-content/40 shrink-0" />
            <span>Username: <strong class="text-base-content">{{ profile?.username }}</strong></span>
          </div>
          <div class="flex items-center gap-2 text-xs text-base-content/70">
            <Briefcase class="w-4 h-4 text-base-content/40 shrink-0" />
            <span>Jabatan: <strong class="text-base-content">{{ profile?.pegawai?.position || '-' }}</strong></span>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- CARD 2: DETAIL PROFILE & CHANGE PASSWORD -->
      <!-- ======================================================== -->
      <div class="lg:col-span-2 space-y-6">
        <!-- DETAIL PEGAWAI FORM -->
        <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 class="font-extrabold text-base-content text-lg flex items-center gap-2 pb-3 border-b border-base-content/5">
            <User class="w-5 h-5 text-primary" />
            <span>Detail Informasi Pribadi</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Nama Lengkap -->
            <div class="md:col-span-2">
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Nama Lengkap Pegawai</label>
              <input 
                v-model="profileForm.name" 
                class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 font-semibold text-sm"
                placeholder="Nama Lengkap"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Alamat Email</label>
              <div class="relative">
                <input 
                  v-model="profileForm.email" 
                  type="email"
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 font-medium text-sm pl-10"
                  placeholder="name@company.com"
                />
                <Mail class="w-4 h-4 text-base-content/40 absolute left-3.5 top-4" />
              </div>
            </div>

            <!-- Phone Number -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Nomor Telepon / WhatsApp</label>
              <div class="relative">
                <input 
                  v-model="profileForm.phoneNumber" 
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 font-medium text-sm pl-10"
                  placeholder="0812..."
                />
                <Phone class="w-4 h-4 text-base-content/40 absolute left-3.5 top-4" />
              </div>
            </div>

            <!-- Bio -->
            <div class="md:col-span-2">
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Bio / Informasi Singkat</label>
              <textarea 
                v-model="profileForm.bio" 
                class="textarea textarea-bordered w-full rounded-2xl p-3 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 resize-none h-24 font-medium text-sm"
                placeholder="Ceritakan sedikit tentang latar belakang Anda..."
              />
            </div>

            <!-- Address -->
            <div class="md:col-span-2">
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
              <textarea 
                v-model="profileForm.address" 
                class="textarea textarea-bordered w-full rounded-2xl p-3 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 resize-none h-24 font-medium text-sm"
                placeholder="Alamat domisili saat ini..."
              />
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button 
              @click="handleUpdateProfile" 
              class="btn btn-primary rounded-2xl font-bold px-6 shadow-md shadow-primary/25 flex items-center gap-2"
              :disabled="submitLoading"
            >
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              <Save class="w-4 h-4" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </div>

        <!-- CHANGE PASSWORD FORM -->
        <div class="bg-base-100 border border-base-content/10 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 class="font-extrabold text-base-content text-lg flex items-center gap-2 pb-3 border-b border-base-content/5">
            <Lock class="w-5 h-5 text-primary" />
            <span>Keamanan & Kata Sandi</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Old Password -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Kata Sandi Lama</label>
              <div class="relative">
                <input 
                  v-model="passwordForm.oldPassword" 
                  type="password"
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 font-medium text-sm pr-10"
                  placeholder="••••••••"
                />
                <KeyRound class="w-4 h-4 text-base-content/40 absolute right-3.5 top-4" />
              </div>
            </div>

            <!-- New Password -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Kata Sandi Baru</label>
              <div class="relative">
                <input 
                  v-model="passwordForm.newPassword" 
                  type="password"
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 font-medium text-sm pr-10"
                  placeholder="••••••••"
                />
                <KeyRound class="w-4 h-4 text-base-content/40 absolute right-3.5 top-4" />
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label class="block text-base-content/80 text-xs font-bold uppercase tracking-wider mb-1.5">Konfirmasi Sandi Baru</label>
              <div class="relative">
                <input 
                  v-model="passwordForm.confirmPassword" 
                  type="password"
                  class="input input-bordered w-full rounded-2xl h-12 focus:ring-4 focus:ring-primary/20 focus:border-primary transition bg-base-100 font-medium text-sm pr-10"
                  placeholder="••••••••"
                />
                <KeyRound class="w-4 h-4 text-base-content/40 absolute right-3.5 top-4" />
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button 
              @click="handleChangePassword" 
              class="btn btn-warning rounded-2xl font-bold px-6 shadow-md shadow-warning/25 flex items-center gap-2"
              :disabled="submitLoading"
            >
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              <Lock class="w-4 h-4" />
              <span>Perbarui Kata Sandi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
