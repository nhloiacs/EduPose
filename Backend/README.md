# Backend

Panduan singkat untuk menjalankan lingkungan pengembangan menggunakan Docker dan daftar tugas pengembangan.

## Cara Menjalankan Docker

Pastikan Docker dan Docker Compose sudah terinstal. Gunakan perintah berikut untuk mengelola kontainer:

### 1. Menjalankan Aplikasi
Perintah ini akan membangun (build) image dari Dockerfile dan menjalankan semua servis yang didefinisikan. Gunakan flag `--build` untuk memastikan perubahan kode terbaru diterapkan.

```bash
docker-compose up --build
```

### 2. Menghentikan dan Membersihkan
Perintah ini akan menghentikan semua kontainer yang berjalan serta menghapusnya bersama dengan **volume** (database/storage) agar lingkungan kembali bersih dari awal.

```bash
docker-compose down -v
```

> **Catatan:** Flag `-v` akan menghapus data persisten (volume). Gunakan dengan hati-hati jika ingin menyimpan data database.

---

## Dokumentasi API

Proyek ini menyediakan dua tampilan dokumentasi otomatis yang dapat diakses setelah aplikasi berjalan:

| Dokumentasi | Deskripsi | Link Akses |
| :--- | :--- | :--- |
| **Swagger UI** | Antarmuka interaktif untuk mencoba API langsung ("Try it out"). Cocok untuk testing & debugging. | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **ReDoc** | Tampilan dokumentasi statis yang rapi dan profesional (3-panel). Cocok untuk referensi & pembacaan. | [http://localhost:8000/redoc](http://localhost:8000/redoc) |

---

## ✅ Todo List

Berikut adalah status pengembangan fitur saat ini:

### Selesai Dibuat
- [x] Inisialisasi proyek dan struktur folder
- [x] Konfigurasi Docker & Docker Compose
- [x] Setup koneksi database dasar
- [x] Implementasi autentikasi user (Login/Register)
- [x] CRUD teachers untuk role principal
- [x] CRUD classrooms untuk role principal
- [x] CRUD students untuk role principal

### Belum Dibuat / Dalam Pengembangan
- [ ] Detail review classroom session untuk role teacher
- [ ] Detail review teachers untuk role principal
- [ ] Detail review classrooms untuk role principal
- [ ] Detail review students untuk role principal
- [ ] Create & Delete classroom session untuk role principal
- [ ] Buat classroom session untuk role teacher
- [ ] Absen classroom session untuk role teacher
- [ ] View classroom session untuk role teacher
- [ ] Absen ulang classroom session untuk role teacher
- [ ] Dashboard untuk role principal
- [ ] Live preview untuk role principal

