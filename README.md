# Buy/Bye LQ45 Dashboard

Dashboard analisis saham dan simulasi alokasi portofolio untuk konstituen LQ45 di Bursa Efek Indonesia (IDX). Menggabungkan analisis fundamental, teknikal, sentimen berita, dan optimasi portofolio Modern Portfolio Theory (Markowitz).

---

## Fitur

- Market Overview: Ringkasan pergerakan IHSG (^JKSE) dan indeks LQ45 (^JKLQ45) secara real-time dari data bursa (Yahoo Finance/IDX), lengkap dengan persentase perubahan harian dan snapshot valuasi emiten utama.
- Multi-Pillar Analysis: Grafik candlestick interaktif harian 3 bulan riil (indikator EMA 20 dan SMA 50), metrik rasio valuasi fundamental, serta agregasi sentimen berita terkini via Google News RSS Indonesia.
- Multi-Factor Screener: Filter saham dinamis berdasarkan rasio valuasi pasar aktual (P/E, PBV) dan dividend yield.
- Markowitz Portfolio Optimizer: Simulasi Monte Carlo untuk menghitung alokasi bobot optimal (pilihan profil risiko: volatilitas minimal, rasio Sharpe maksimal, atau return maksimal) serta kalkulator lot saham riil sesuai modal investasi.
- Tombol Segarkan Data: Memungkinkan pembaruan cache harga dan pergerakan indeks bursa secara instan.

---

## Struktur File

```text
├── streamlit_app.py     # Aplikasi utama Streamlit
├── requirements.txt     # Daftar dependensi library Python
├── .streamlit/
│   └── config.toml      # Konfigurasi tema gelap & styling Streamlit
├── .gitignore           # Filter file rahasia & cache sistem
├── .env.example         # Template konfigurasi environment (tanpa secret key)
└── README.md            # Dokumentasi proyek
```

---

## Cara Menjalankan di Komputer Lokal

1. Prasyarat: Pastikan Python 3.9 atau versi yang lebih baru sudah terpasang.
2. Clone repositori ini atau download source code:
   ```bash
   git clone https://github.com/azizahalkhaer/repo.git
   cd repo
   ```
3. (Disarankan) Buat dan aktifkan virtual environment:
   ```bash
   # Di Windows:
   python -m venv venv
   venv\Scripts\activate

   # Di macOS / Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```
4. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```
5. Jalankan aplikasi:
   ```bash
   streamlit run streamlit_app.py
   ```
Aplikasi akan terbuka otomatis di browser pada alamat `http://localhost:8501`.

---

## Cara Deploy ke Streamlit Community Cloud

Jika ingin aplikasi bisa diakses publik secara online:

1. Buka https://share.streamlit.io dan login dengan akun GitHub.
2. Klik tombol "New app".
3. Sesuaikan form deployment:
   - Repository: `azizahalkhaer/repo` (sesuaikan dengan nama repo GitHub Anda)
   - Branch: `main` (Perhatian: jangan gunakan `master` jika branch default di GitHub adalah `main`)
   - Main file path: `streamlit_app.py`
4. Klik tombol "Deploy!". Tunggu proses instalasi dependensi sekitar 1-2 menit hingga dashboard tampil.

---

## Keamanan Data

- Repositori ini sudah dilengkapi file `.gitignore` agar file konfigurasi lokal (`.env`, secret token, atau credentials) tidak terunggah ke repositori publik.
- Jika di kemudian hari aplikasi membutuhkan API key eksternal, gunakan fitur "Secrets" bawaan Streamlit Cloud (menu Settings > Secrets), bukan ditulis langsung di dalam source code.

---

## Catatan

Aplikasi ini ditujukan untuk kebutuhan analisis dan referensi keputusan finansial mandiri. Keputusan transaksi dan risiko investasi sepenuhnya berada di tangan investor.
