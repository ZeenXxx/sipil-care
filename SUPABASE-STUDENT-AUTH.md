# SIPIL CARE Student Login Lintas Device

Login mahasiswa sekarang memakai konsep akun pre-provisioned: mahasiswa tidak bisa membuat akun sendiri. Admin/HMS harus membuat akun terlebih dahulu berisi NIM, password awal acak, dan kode pemulihan. Saat memakai password awal, mahasiswa tidak dipaksa mengganti password, tetapi akan ditanya apakah ingin menggantinya.

## 1. Buat Project Supabase

1. Buka Supabase dan buat project baru.
2. Ambil `Project URL` dan `anon public key` dari Project Settings > API.
3. Masukkan ke `js/student-config.js`.

## 2. Buat Tabel `students`

Jalankan SQL ini di Supabase SQL Editor:

```sql
drop table if exists public.students;

create table public.students (
  nim text primary key,
  name text not null,
  password_hash text not null,
  recovery_code_hash text not null,
  must_change_password boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.students enable row level security;

create policy "students can login by nim"
on public.students
for select
to anon
using (true);

create policy "students can change own password"
on public.students
for update
to anon
using (true)
with check (true);
```

Tidak ada policy `insert` untuk anon. Artinya pengunjung website tidak bisa membuat akun sendiri dari halaman public.

## 3. Generate Hash Password Awal dan Kode Pemulihan

Password dan kode pemulihan tidak disimpan mentah. Gunakan SHA-256 hash.

Contoh di browser console atau Node.js:

```js
async function hash(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

await hash("A7K9Q2M1"); // password awal
await hash("R7C2-9QK1"); // kode pemulihan
```

## 4. Tambahkan Akun Mahasiswa

Contoh insert akun:

```sql
insert into public.students (nim, name, password_hash, recovery_code_hash, must_change_password)
values
('2350031020', 'Nama Mahasiswa 1', 'ISI_HASH_PASSWORD_AWAL', 'ISI_HASH_KODE_PEMULIHAN', true),
('2350031021', 'Nama Mahasiswa 2', 'ISI_HASH_PASSWORD_AWAL', 'ISI_HASH_KODE_PEMULIHAN', true);
```

Berikan NIM, password awal acak, dan kode pemulihan ke mahasiswa. Kode pemulihan dipakai jika mahasiswa lupa password dan ingin membuat password baru.

Jika tabel `students` sudah terlanjur dibuat tanpa kolom kode pemulihan, jalankan:

```sql
alter table public.students
add column if not exists recovery_code_hash text;
```

Lalu isi `recovery_code_hash` untuk setiap NIM sebelum fitur lupa password digunakan.

## 4B. Tambahkan Tracking Online dan Last Seen

Panel HMS dapat menampilkan mahasiswa yang sedang online, last seen, halaman terakhir, dan login terakhir. Jalankan SQL ini sekali di Supabase SQL Editor:

```sql
alter table public.students
add column if not exists last_seen_at timestamptz,
add column if not exists last_login_at timestamptz,
add column if not exists last_page text,
add column if not exists last_user_agent text;
```

Status `Online` dihitung dari `last_seen_at` yang masih berada dalam rentang sekitar 2 menit terakhir. Website akan memperbarui aktivitas mahasiswa maksimal setiap 60 detik agar database tidak terlalu sering menerima update.

## 5. Aktifkan Mode Supabase

Edit file:

```txt
js/student-config.js
```

Isi seperti ini:

```js
window.SIPILCARE_AUTH_CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "ISI_ANON_KEY",
  tableName: "students"
};
```

## Catatan Keamanan

Ini lebih baik daripada registrasi bebas, tetapi website static tetap bukan sistem keamanan final. Untuk perlindungan serius, resource sensitif sebaiknya disimpan di private storage dan aksesnya diberikan lewat backend/serverless function setelah login valid.
