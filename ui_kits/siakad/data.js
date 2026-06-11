/* Sample academic data for the SIAKAD UI kit (fictional). */
window.DATA = {
  student: {
    nama: "Aisyah Rahmawati",
    nim: "2023010142",
    prodi: "Sistem Informasi",
    angkatan: "2023",
    semester: 5,
    ipk: "3.78",
    sksTotal: 108,
    sksTarget: 144,
    dpa: "Dr. Hammam Faroni, M.Kom.",
    tagihan: "Lunas",
  },
  pengumuman: [
    { tag: "Akademik", judul: "Pengisian KRS Ganjil 2025/2026 dibuka", tgl: "4 Agu 2025", warna: "brand" },
    { tag: "Keuangan", judul: "Batas pembayaran UKT semester ganjil", tgl: "1 Agu 2025", warna: "warning" },
    { tag: "Kemahasiswaan", judul: "Pendaftaran asisten lab dibuka", tgl: "28 Jul 2025", warna: "accent" },
  ],
  jadwalHariIni: [
    { jam: "08:00–09:40", mk: "Pemrograman Web Lanjut", ruang: "Lab 305", dosen: "Hammam F." },
    { jam: "10:00–11:40", mk: "Basis Data Terdistribusi", ruang: "R. 212", dosen: "Siti A." },
    { jam: "13:00–14:40", mk: "Etika Profesi & Keislaman", ruang: "R. 108", dosen: "Ust. Yusuf" },
  ],
  // KRS — mata kuliah ditawarkan
  tawaran: [
    { kode: "IF-3101", mk: "Kecerdasan Buatan", sks: 3, kelas: "A", jadwal: "Sen 08:00", kuota: "32/40", wajib: true },
    { kode: "IF-3102", mk: "Rekayasa Perangkat Lunak", sks: 3, kelas: "A", jadwal: "Sel 10:00", kuota: "38/40", wajib: true },
    { kode: "SI-3201", mk: "Analisis & Desain Sistem", sks: 3, kelas: "B", jadwal: "Rab 13:00", kuota: "29/40", wajib: true },
    { kode: "SI-3203", mk: "Tata Kelola TI", sks: 2, kelas: "A", jadwal: "Kam 08:00", kuota: "24/40", wajib: false },
    { kode: "IF-3204", mk: "Komputasi Awan", sks: 3, kelas: "A", jadwal: "Kam 13:00", kuota: "31/40", wajib: false },
    { kode: "UN-3001", mk: "Ekonomi Syariah", sks: 2, kelas: "C", jadwal: "Jum 08:00", kuota: "40/40", wajib: true },
    { kode: "IF-3205", mk: "Keamanan Siber", sks: 3, kelas: "A", jadwal: "Sel 13:00", kuota: "18/40", wajib: false },
  ],
  // Jadwal mingguan (kolom: Senin..Jumat)
  sched: {
    times: ["08:00", "10:00", "13:00", "15:00"],
    days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    cells: {
      "Senin-08:00": { mk: "Kecerdasan Buatan", ruang: "Lab 305", c: "blue" },
      "Selasa-10:00": { mk: "Rekayasa PL", ruang: "R. 212", c: "green" },
      "Selasa-13:00": { mk: "Keamanan Siber", ruang: "Lab 301", c: "red" },
      "Rabu-13:00": { mk: "Analisis Sistem", ruang: "R. 108", c: "gold" },
      "Kamis-08:00": { mk: "Tata Kelola TI", ruang: "R. 210", c: "blue" },
      "Kamis-13:00": { mk: "Komputasi Awan", ruang: "Lab 305", c: "green" },
      "Jumat-08:00": { mk: "Ekonomi Syariah", ruang: "R. 401", c: "gold" },
    },
  },
  // KHS / transkrip
  nilai: [
    { kode: "IF-2101", mk: "Struktur Data", sks: 3, n: "A", bobot: "4.00", w: "success" },
    { kode: "IF-2103", mk: "Pemrograman Web", sks: 3, n: "A-", bobot: "3.70", w: "success" },
    { kode: "SI-2201", mk: "Sistem Informasi Manajemen", sks: 3, n: "B+", bobot: "3.30", w: "brand" },
    { kode: "MA-2001", mk: "Statistika", sks: 3, n: "B", bobot: "3.00", w: "brand" },
    { kode: "UN-2001", mk: "Bahasa Inggris", sks: 2, n: "A", bobot: "4.00", w: "success" },
    { kode: "UN-2002", mk: "Studi Islam Lanjut", sks: 2, n: "A", bobot: "4.00", w: "success" },
  ],
};
