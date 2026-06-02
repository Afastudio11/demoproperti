export type Grade = "sangat_potensial" | "potensial" | "sedang" | "tidak_direkomendasikan";

export interface DesaScore {
  id: string;
  name: string;
  score: number;
  kepadatanPenduduk: number;
  pertumbuhanPenduduk: number;
  hargaTanah: number;
  aksesJalan: number;
  pln: number;
  pdam: number;
  internetFiber: number;
  kompetitor: number;
  potensiUnit: number;
  hargaTanahEst: string;
}

export interface KecamatanScore {
  id: string;
  name: string;
  score: number;
  lat: number;
  lng: number;
  jarakPusatKota: number;
  jalanNasional: number;
  kawasanIndustri: number;
  pasar: number;
  perkantoran: number;
  sekolah: number;
  rumahSakit: number;
  kompetitor: number;
  hargaTanah: number;
  topografi: number;
  desa: DesaScore[];
}

export interface KabupatenScore {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  grade: Grade;
  populasi: string;
  pertumbuhanPct: number;
  hargaTanahRange: string;
  kompetitorCount: number;
  infrastruktur: string[];
  potensiPasar: string;
  pertumbuhanPenduduk: number;
  rumahTanggaBaru: number;
  realisasiFLPP: number;
  pertumbuhanEkonomi: number;
  pdrbPerKapita: number;
  tingkatUrbanisasi: number;
  tingkatPengangguran: number;
  infrastrukturStrategis: number;
  jumlahKompetitor: number;
  hargaTanahScore: number;
  kecamatan: KecamatanScore[];
}

function grade(score: number): Grade {
  if (score >= 80) return "sangat_potensial";
  if (score >= 65) return "potensial";
  if (score >= 50) return "sedang";
  return "tidak_direkomendasikan";
}

function desa(id: string, name: string, score: number, hargaTanahEst: string, extras: Partial<DesaScore> = {}): DesaScore {
  const base = Math.round(score * 0.9);
  return {
    id, name, score, hargaTanahEst,
    kepadatanPenduduk: extras.kepadatanPenduduk ?? base,
    pertumbuhanPenduduk: extras.pertumbuhanPenduduk ?? base,
    hargaTanah: extras.hargaTanah ?? base,
    aksesJalan: extras.aksesJalan ?? base,
    pln: extras.pln ?? 90,
    pdam: extras.pdam ?? 75,
    internetFiber: extras.internetFiber ?? 60,
    kompetitor: extras.kompetitor ?? base,
    potensiUnit: extras.potensiUnit ?? base,
  };
}

export const KABUPATEN_DATA: KabupatenScore[] = [
  {
    id: "makassar", name: "Kota Makassar", lat: -5.133, lng: 119.417, score: 95, grade: grade(95),
    populasi: "1,5 Juta", pertumbuhanPct: 1.8, hargaTanahRange: "Rp2-15 Juta/m²",
    kompetitorCount: 120, infrastruktur: ["Bandara Internasional", "Pelabuhan Makassar", "Jalan Nasional", "Kawasan Industri KIMA"],
    potensiPasar: "Sangat Tinggi — pusat ekonomi Sulawesi",
    pertumbuhanPenduduk: 95, rumahTanggaBaru: 95, realisasiFLPP: 92, pertumbuhanEkonomi: 95, pdrbPerKapita: 98,
    tingkatUrbanisasi: 99, tingkatPengangguran: 70, infrastrukturStrategis: 100, jumlahKompetitor: 85, hargaTanahScore: 40,
    kecamatan: [
      { id: "mksr-btp", name: "Biringkanaya", score: 91, lat: -5.083, lng: 119.5, jarakPusatKota: 75, jalanNasional: 90, kawasanIndustri: 85, pasar: 88, perkantoran: 80, sekolah: 90, rumahSakit: 85, kompetitor: 88, hargaTanah: 72, topografi: 95,
        desa: [desa("btp-daya", "Daya", 93, "Rp3-6Jt/m²"), desa("btp-sudiang", "Sudiang", 91, "Rp4-8Jt/m²"), desa("btp-untia", "Untia", 88, "Rp2.5-5Jt/m²"), desa("btp-paccerakang", "Paccerakang", 86, "Rp3-7Jt/m²")] },
      { id: "mksr-tallo", name: "Tallo", score: 87, lat: -5.117, lng: 119.433, jarakPusatKota: 95, jalanNasional: 88, kawasanIndustri: 75, pasar: 90, perkantoran: 85, sekolah: 88, rumahSakit: 87, kompetitor: 82, hargaTanah: 55, topografi: 92,
        desa: [desa("tallo-bunga", "Bunga Ejaya", 88, "Rp5-10Jt/m²"), desa("tallo-kalukubodoa", "Kaluku Bodoa", 85, "Rp4-8Jt/m²"), desa("tallo-lakkang", "Lakkang", 82, "Rp3-6Jt/m²")] },
      { id: "mksr-tamalanrea", name: "Tamalanrea", score: 89, lat: -5.1, lng: 119.483, jarakPusatKota: 80, jalanNasional: 92, kawasanIndustri: 88, pasar: 85, perkantoran: 88, sekolah: 92, rumahSakit: 90, kompetitor: 85, hargaTanah: 60, topografi: 94,
        desa: [desa("tama-tamalanrea", "Tamalanrea", 90, "Rp4-9Jt/m²"), desa("tama-parang", "Parang Loe", 87, "Rp3.5-7Jt/m²"), desa("tama-kapasa", "Kapasa", 85, "Rp3-6Jt/m²")] },
    ],
  },
  {
    id: "bantaeng", name: "Bantaeng", lat: -5.533, lng: 119.933, score: 92, grade: grade(92),
    populasi: "195.000", pertumbuhanPct: 1.4, hargaTanahRange: "Rp200-600 Ribu/m²",
    kompetitorCount: 18, infrastruktur: ["Kawasan Industri KIMA 2", "Jalan Trans-Sulawesi", "Pelabuhan Bantaeng"],
    potensiPasar: "Sangat Tinggi — kawasan industri baru, FLPP tertinggi di Sulsel",
    pertumbuhanPenduduk: 88, rumahTanggaBaru: 90, realisasiFLPP: 96, pertumbuhanEkonomi: 92, pdrbPerKapita: 82,
    tingkatUrbanisasi: 78, tingkatPengangguran: 85, infrastrukturStrategis: 95, jumlahKompetitor: 88, hargaTanahScore: 95,
    kecamatan: [
      { id: "btn-bantaeng", name: "Bantaeng", score: 94, lat: -5.533, lng: 119.933, jarakPusatKota: 98, jalanNasional: 95, kawasanIndustri: 96, pasar: 92, perkantoran: 90, sekolah: 93, rumahSakit: 92, kompetitor: 88, hargaTanah: 94, topografi: 93,
        desa: [desa("btn-pallantikang", "Pallantikang", 96, "Rp250-500Rb/m²", {aksesJalan: 95, kompetitor: 90}), desa("btn-lamalaka", "Lamalaka", 93, "Rp200-450Rb/m²"), desa("btn-bontosunggu", "Bonto Sunggu", 91, "Rp180-380Rb/m²"), desa("btn-maccini", "Maccini Baji", 92, "Rp220-480Rb/m²", {potensiUnit: 95})] },
      { id: "btn-pa-jukukang", name: "Pa'jukukang", score: 89, lat: -5.567, lng: 119.883, jarakPusatKota: 85, jalanNasional: 92, kawasanIndustri: 90, pasar: 82, perkantoran: 75, sekolah: 85, rumahSakit: 80, kompetitor: 85, hargaTanah: 96, topografi: 91,
        desa: [desa("pjk-kampung", "Kampung Beru", 91, "Rp170-350Rb/m²"), desa("pjk-biring", "Biringere", 88, "Rp150-320Rb/m²"), desa("pjk-korong", "Korong", 86, "Rp140-300Rb/m²")] },
      { id: "btn-uluere", name: "Uluere", score: 85, lat: -5.45, lng: 119.9, jarakPusatKota: 70, jalanNasional: 80, kawasanIndustri: 75, pasar: 72, perkantoran: 65, sekolah: 80, rumahSakit: 70, kompetitor: 82, hargaTanah: 97, topografi: 78,
        desa: [desa("ul-ulugalung", "Ulu Galung", 87, "Rp120-250Rb/m²"), desa("ul-sinoa", "Sinoa", 84, "Rp110-230Rb/m²"), desa("ul-bonto-marannu", "Bonto Marannu", 82, "Rp100-220Rb/m²")] },
    ],
  },
  {
    id: "gowa", name: "Gowa", lat: -5.283, lng: 119.767, score: 89, grade: grade(89),
    populasi: "780.000", pertumbuhanPct: 2.1, hargaTanahRange: "Rp300 Ribu - 2 Juta/m²",
    kompetitorCount: 65, infrastruktur: ["Jalan Nasional Trans-Sulawesi", "Kawasan Perkotaan Mamminasata"],
    potensiPasar: "Sangat Tinggi — hinterland Makassar, pertumbuhan penduduk tertinggi",
    pertumbuhanPenduduk: 95, rumahTanggaBaru: 92, realisasiFLPP: 88, pertumbuhanEkonomi: 88, pdrbPerKapita: 78,
    tingkatUrbanisasi: 85, tingkatPengangguran: 80, infrastrukturStrategis: 90, jumlahKompetitor: 78, hargaTanahScore: 72,
    kecamatan: [
      { id: "gowa-sombaopu", name: "Somba Opu", score: 92, lat: -5.2, lng: 119.483, jarakPusatKota: 95, jalanNasional: 95, kawasanIndustri: 82, pasar: 92, perkantoran: 88, sekolah: 93, rumahSakit: 90, kompetitor: 82, hargaTanah: 68, topografi: 96,
        desa: [desa("so-batangkaluku", "Batang Kaluku", 93, "Rp600Rb-1.5Jt/m²"), desa("so-paccinongan", "Paccinongan", 91, "Rp500Rb-1.2Jt/m²"), desa("so-tombolo", "Tombolo", 89, "Rp450Rb-1Jt/m²"), desa("so-romangpolong", "Romang Polong", 90, "Rp500Rb-1.2Jt/m²")] },
      { id: "gowa-pallangga", name: "Pallangga", score: 90, lat: -5.233, lng: 119.517, jarakPusatKota: 90, jalanNasional: 93, kawasanIndustri: 80, pasar: 90, perkantoran: 82, sekolah: 90, rumahSakit: 85, kompetitor: 83, hargaTanah: 74, topografi: 95,
        desa: [desa("pa-mangalli", "Mangalli", 92, "Rp400-900Rb/m²"), desa("pa-bungaya", "Bungaya", 89, "Rp350-800Rb/m²"), desa("pa-panakkukang", "Panakkukang", 88, "Rp400-850Rb/m²")] },
      { id: "gowa-bajeng", name: "Bajeng", score: 86, lat: -5.317, lng: 119.633, jarakPusatKota: 80, jalanNasional: 88, kawasanIndustri: 72, pasar: 85, perkantoran: 74, sekolah: 87, rumahSakit: 82, kompetitor: 85, hargaTanah: 82, topografi: 93,
        desa: [desa("bj-limbung", "Limbung", 88, "Rp280-600Rb/m²"), desa("bj-tubajeng", "Tubajeng", 85, "Rp250-550Rb/m²"), desa("bj-bontosunggu", "Bonto Sunggu", 83, "Rp230-500Rb/m²")] },
    ],
  },
  {
    id: "barru", name: "Barru", lat: -4.408, lng: 119.617, score: 88, grade: grade(88),
    populasi: "175.000", pertumbuhanPct: 1.3, hargaTanahRange: "Rp150-500 Ribu/m²",
    kompetitorCount: 12, infrastruktur: ["Jalan Trans-Sulawesi", "Pelabuhan Garongkong", "Kawasan Industri"],
    potensiPasar: "Tinggi — jalur logistik utama Sulsel, harga tanah masih terjangkau",
    pertumbuhanPenduduk: 85, rumahTanggaBaru: 87, realisasiFLPP: 91, pertumbuhanEkonomi: 86, pdrbPerKapita: 80,
    tingkatUrbanisasi: 72, tingkatPengangguran: 82, infrastrukturStrategis: 92, jumlahKompetitor: 90, hargaTanahScore: 93,
    kecamatan: [
      { id: "barru-barru", name: "Barru", score: 94, lat: -4.408, lng: 119.617, jarakPusatKota: 98, jalanNasional: 95, kawasanIndustri: 90, pasar: 92, perkantoran: 88, sekolah: 92, rumahSakit: 90, kompetitor: 88, hargaTanah: 93, topografi: 92,
        desa: [desa("br-coppo", "Coppo", 95, "Rp200-450Rb/m²", {aksesJalan: 93}), desa("br-siawung", "Siawung", 92, "Rp180-400Rb/m²"), desa("br-mangempang", "Mangempang", 90, "Rp170-380Rb/m²")] },
      { id: "barru-balusu", name: "Balusu", score: 87, lat: -4.35, lng: 119.583, jarakPusatKota: 85, jalanNasional: 92, kawasanIndustri: 85, pasar: 82, perkantoran: 72, sekolah: 85, rumahSakit: 78, kompetitor: 88, hargaTanah: 94, topografi: 88,
        desa: [desa("bl-balusu", "Balusu", 88, "Rp150-350Rb/m²"), desa("bl-corawali", "Corawali", 85, "Rp140-320Rb/m²"), desa("bl-binuang", "Binuang", 84, "Rp130-300Rb/m²")] },
      { id: "barru-tanete-riaja", name: "Tanete Riaja", score: 82, lat: -4.467, lng: 119.667, jarakPusatKota: 78, jalanNasional: 85, kawasanIndustri: 75, pasar: 78, perkantoran: 65, sekolah: 82, rumahSakit: 72, kompetitor: 85, hargaTanah: 95, topografi: 85,
        desa: [desa("tr-harapan", "Harapan", 84, "Rp130-280Rb/m²"), desa("tr-lompo", "Lompo Tengah", 81, "Rp120-270Rb/m²"), desa("tr-anabanua", "Anabanua", 79, "Rp110-250Rb/m²")] },
      { id: "barru-tanete-rilau", name: "Tanete Rilau", score: 78, lat: -4.283, lng: 119.567, jarakPusatKota: 72, jalanNasional: 88, kawasanIndustri: 70, pasar: 74, perkantoran: 62, sekolah: 80, rumahSakit: 68, kompetitor: 82, hargaTanah: 94, topografi: 82,
        desa: [desa("trl-lalabata", "Lalabata Rilau", 80, "Rp120-260Rb/m²"), desa("trl-palanro", "Palanro", 77, "Rp110-240Rb/m²"), desa("trl-lipukasi", "Lipukasi", 75, "Rp100-220Rb/m²")] },
    ],
  },
  {
    id: "maros", name: "Maros", lat: -5.0, lng: 119.717, score: 87, grade: grade(87),
    populasi: "365.000", pertumbuhanPct: 1.9, hargaTanahRange: "Rp250-1.5 Juta/m²",
    kompetitorCount: 45, infrastruktur: ["Bandara Sultan Hasanuddin", "Jalan Tol Makassar", "Kawasan Industri KIMA"],
    potensiPasar: "Sangat Tinggi — dekat bandara & tol, pertumbuhan pesat",
    pertumbuhanPenduduk: 90, rumahTanggaBaru: 88, realisasiFLPP: 85, pertumbuhanEkonomi: 88, pdrbPerKapita: 82,
    tingkatUrbanisasi: 80, tingkatPengangguran: 78, infrastrukturStrategis: 96, jumlahKompetitor: 80, hargaTanahScore: 72,
    kecamatan: [
      { id: "maros-turikale", name: "Turikale", score: 91, lat: -5.0, lng: 119.567, jarakPusatKota: 92, jalanNasional: 95, kawasanIndustri: 90, pasar: 90, perkantoran: 85, sekolah: 92, rumahSakit: 88, kompetitor: 82, hargaTanah: 72, topografi: 95,
        desa: [desa("tk-turikale", "Turikale", 92, "Rp500Rb-1.2Jt/m²"), desa("tk-alliritengae", "Alliritengae", 89, "Rp400Rb-1Jt/m²"), desa("tk-rante", "Rante", 87, "Rp380-900Rb/m²")] },
      { id: "maros-mandai", name: "Mandai", score: 89, lat: -5.033, lng: 119.567, jarakPusatKota: 88, jalanNasional: 96, kawasanIndustri: 95, pasar: 87, perkantoran: 82, sekolah: 88, rumahSakit: 85, kompetitor: 80, hargaTanah: 68, topografi: 94,
        desa: [desa("md-hasanuddin", "Hasanuddin", 90, "Rp600Rb-1.5Jt/m²"), desa("md-bontoa", "Bontoa", 88, "Rp500Rb-1.2Jt/m²"), desa("md-pattontongan", "Pattontongan", 86, "Rp450Rb-1Jt/m²")] },
      { id: "maros-lau", name: "Lau", score: 84, lat: -4.917, lng: 119.7, jarakPusatKota: 80, jalanNasional: 85, kawasanIndustri: 78, pasar: 80, perkantoran: 70, sekolah: 83, rumahSakit: 78, kompetitor: 82, hargaTanah: 80, topografi: 90,
        desa: [desa("la-allepolea", "Allepolea", 85, "Rp300-700Rb/m²"), desa("la-mattiro", "Mattiro Baji", 83, "Rp280-650Rb/m²"), desa("la-nisombalia", "Nisombalia", 81, "Rp260-600Rb/m²")] },
    ],
  },
  {
    id: "sidrap", name: "Sidenreng Rappang", lat: -3.917, lng: 119.917, score: 84, grade: grade(84),
    populasi: "290.000", pertumbuhanPct: 1.2, hargaTanahRange: "Rp150-450 Ribu/m²",
    kompetitorCount: 14, infrastruktur: ["Jalan Trans-Sulawesi", "Bendungan Bili-Bili"],
    potensiPasar: "Tinggi — lumbung pangan Sulsel, permintaan perumahan subsidi tinggi",
    pertumbuhanPenduduk: 82, rumahTanggaBaru: 84, realisasiFLPP: 88, pertumbuhanEkonomi: 83, pdrbPerKapita: 76,
    tingkatUrbanisasi: 70, tingkatPengangguran: 83, infrastrukturStrategis: 82, jumlahKompetitor: 88, hargaTanahScore: 92,
    kecamatan: [
      { id: "sdr-maritengngae", name: "Maritengngae", score: 87, lat: -3.9, lng: 119.85, jarakPusatKota: 95, jalanNasional: 90, kawasanIndustri: 78, pasar: 88, perkantoran: 80, sekolah: 88, rumahSakit: 85, kompetitor: 85, hargaTanah: 91, topografi: 92,
        desa: [desa("mt-rappang", "Rappang", 89, "Rp180-400Rb/m²"), desa("mt-macorawalie", "Macorawalie", 86, "Rp160-360Rb/m²"), desa("mt-arateng", "Arateng", 84, "Rp150-340Rb/m²")] },
      { id: "sdr-panca-rijang", name: "Panca Rijang", score: 83, lat: -3.95, lng: 119.933, jarakPusatKota: 88, jalanNasional: 86, kawasanIndustri: 72, pasar: 82, perkantoran: 72, sekolah: 84, rumahSakit: 78, kompetitor: 84, hargaTanah: 92, topografi: 90,
        desa: [desa("pr-empagae", "Empagae", 85, "Rp160-360Rb/m²"), desa("pr-damai", "Damai", 82, "Rp150-330Rb/m²"), desa("pr-passeno", "Passeno", 80, "Rp140-310Rb/m²")] },
      { id: "sdr-watang-pulu", name: "Watang Pulu", score: 79, lat: -3.867, lng: 119.883, jarakPusatKota: 80, jalanNasional: 82, kawasanIndustri: 65, pasar: 76, perkantoran: 65, sekolah: 80, rumahSakit: 72, kompetitor: 82, hargaTanah: 93, topografi: 88,
        desa: [desa("wp-allesalewo", "Alle Salewo", 81, "Rp140-300Rb/m²"), desa("wp-duampanua", "Duampanua", 78, "Rp130-280Rb/m²"), desa("wp-lainungan", "Lainungan", 76, "Rp120-270Rb/m²")] },
    ],
  },
  {
    id: "parepare", name: "Kota Parepare", lat: -4.017, lng: 119.633, score: 83, grade: grade(83),
    populasi: "155.000", pertumbuhanPct: 1.1, hargaTanahRange: "Rp400 Ribu - 2 Juta/m²",
    kompetitorCount: 28, infrastruktur: ["Pelabuhan Parepare", "Jalan Nasional"],
    potensiPasar: "Tinggi — kota transit utama, infrastruktur pelabuhan",
    pertumbuhanPenduduk: 80, rumahTanggaBaru: 82, realisasiFLPP: 80, pertumbuhanEkonomi: 83, pdrbPerKapita: 86,
    tingkatUrbanisasi: 92, tingkatPengangguran: 78, infrastrukturStrategis: 88, jumlahKompetitor: 82, hargaTanahScore: 65,
    kecamatan: [
      { id: "prp-bacukiki-barat", name: "Bacukiki Barat", score: 87, lat: -4.0, lng: 119.617, jarakPusatKota: 90, jalanNasional: 88, kawasanIndustri: 80, pasar: 87, perkantoran: 83, sekolah: 88, rumahSakit: 87, kompetitor: 82, hargaTanah: 65, topografi: 90,
        desa: [desa("bb-lumpue", "Lumpue", 89, "Rp500Rb-1.2Jt/m²"), desa("bb-ujung-lare", "Ujung Lare", 86, "Rp450Rb-1Jt/m²"), desa("bb-cappa-galung", "Cappa Galung", 84, "Rp400-900Rb/m²")] },
      { id: "prp-soreang", name: "Soreang", score: 83, lat: -4.033, lng: 119.65, jarakPusatKota: 85, jalanNasional: 85, kawasanIndustri: 75, pasar: 85, perkantoran: 80, sekolah: 85, rumahSakit: 83, kompetitor: 80, hargaTanah: 62, topografi: 88,
        desa: [desa("sr-lemoe", "Lemoe", 84, "Rp400-950Rb/m²"), desa("sr-bukit-harapan", "Bukit Harapan", 82, "Rp380-880Rb/m²"), desa("sr-wattang-soreang", "Wattang Soreang", 80, "Rp360-830Rb/m²")] },
    ],
  },
  {
    id: "bone", name: "Bone", lat: -4.533, lng: 120.383, score: 81, grade: grade(81),
    populasi: "750.000", pertumbuhanPct: 0.9, hargaTanahRange: "Rp120-400 Ribu/m²",
    kompetitorCount: 22, infrastruktur: ["Jalan Trans-Sulawesi", "Pelabuhan Bajoe"],
    potensiPasar: "Tinggi — kabupaten terbesar, demand tinggi, harga terjangkau",
    pertumbuhanPenduduk: 78, rumahTanggaBaru: 80, realisasiFLPP: 82, pertumbuhanEkonomi: 79, pdrbPerKapita: 74,
    tingkatUrbanisasi: 65, tingkatPengangguran: 80, infrastrukturStrategis: 82, jumlahKompetitor: 85, hargaTanahScore: 94,
    kecamatan: [
      { id: "bone-tanete-riattang", name: "Tanete Riattang", score: 85, lat: -4.533, lng: 120.383, jarakPusatKota: 98, jalanNasional: 90, kawasanIndustri: 75, pasar: 90, perkantoran: 85, sekolah: 90, rumahSakit: 88, kompetitor: 83, hargaTanah: 92, topografi: 90,
        desa: [desa("tr-bajoe", "Bajoe", 87, "Rp150-350Rb/m²"), desa("tr-watampone", "Watampone", 85, "Rp180-400Rb/m²"), desa("tr-masumpu", "Masumpu", 83, "Rp140-320Rb/m²")] },
      { id: "bone-palakka", name: "Palakka", score: 80, lat: -4.45, lng: 120.35, jarakPusatKota: 85, jalanNasional: 85, kawasanIndustri: 68, pasar: 78, perkantoran: 72, sekolah: 82, rumahSakit: 78, kompetitor: 83, hargaTanah: 94, topografi: 87,
        desa: [desa("pk-palakka", "Palakka", 82, "Rp130-290Rb/m²"), desa("pk-kading", "Kading", 79, "Rp120-270Rb/m²"), desa("pk-pattiro", "Pattiro", 77, "Rp110-250Rb/m²")] },
    ],
  },
  {
    id: "pangkep", name: "Pangkajene Kepulauan", lat: -4.767, lng: 119.533, score: 79, grade: grade(79),
    populasi: "345.000", pertumbuhanPct: 1.0, hargaTanahRange: "Rp180-700 Ribu/m²",
    kompetitorCount: 20, infrastruktur: ["Jalan Trans-Sulawesi", "Pelabuhan Pangkajene", "Industri Semen"],
    potensiPasar: "Potensial — dekat Makassar, industri aktif",
    pertumbuhanPenduduk: 78, rumahTanggaBaru: 79, realisasiFLPP: 78, pertumbuhanEkonomi: 80, pdrbPerKapita: 78,
    tingkatUrbanisasi: 68, tingkatPengangguran: 78, infrastrukturStrategis: 85, jumlahKompetitor: 82, hargaTanahScore: 80,
    kecamatan: [
      { id: "pkp-pangkajene", name: "Pangkajene", score: 83, lat: -4.767, lng: 119.533, jarakPusatKota: 95, jalanNasional: 90, kawasanIndustri: 82, pasar: 87, perkantoran: 80, sekolah: 88, rumahSakit: 85, kompetitor: 80, hargaTanah: 80, topografi: 91,
        desa: [desa("pkj-mappasaile", "Mappasaile", 84, "Rp220-500Rb/m²"), desa("pkj-padoang", "Padoang-doang", 81, "Rp200-450Rb/m²"), desa("pkj-tumampua", "Tumampua", 79, "Rp180-420Rb/m²")] },
      { id: "pkp-bungoro", name: "Bungoro", score: 79, lat: -4.85, lng: 119.55, jarakPusatKota: 82, jalanNasional: 88, kawasanIndustri: 85, pasar: 78, perkantoran: 70, sekolah: 80, rumahSakit: 75, kompetitor: 80, hargaTanah: 82, topografi: 89,
        desa: [desa("bg-boriappaka", "Bori Appaka", 81, "Rp200-460Rb/m²"), desa("bg-kassi", "Kassi", 78, "Rp180-420Rb/m²"), desa("bg-bowong", "Bowong Cindea", 76, "Rp160-380Rb/m²")] },
    ],
  },
  {
    id: "wajo", name: "Wajo", lat: -4.0, lng: 120.367, score: 79, grade: grade(79),
    populasi: "410.000", pertumbuhanPct: 0.8, hargaTanahRange: "Rp100-350 Ribu/m²",
    kompetitorCount: 16, infrastruktur: ["Jalan Trans-Sulawesi", "Danau Tempe"],
    potensiPasar: "Potensial — penghasil sutra, ekonomi unik, harga tanah sangat terjangkau",
    pertumbuhanPenduduk: 76, rumahTanggaBaru: 78, realisasiFLPP: 78, pertumbuhanEkonomi: 77, pdrbPerKapita: 72,
    tingkatUrbanisasi: 62, tingkatPengangguran: 80, infrastrukturStrategis: 75, jumlahKompetitor: 85, hargaTanahScore: 96,
    kecamatan: [
      { id: "wj-tempe", name: "Tempe", score: 83, lat: -4.017, lng: 120.35, jarakPusatKota: 98, jalanNasional: 88, kawasanIndustri: 70, pasar: 90, perkantoran: 80, sekolah: 87, rumahSakit: 85, kompetitor: 83, hargaTanah: 94, topografi: 88,
        desa: [desa("tp-sengkang", "Sengkang", 84, "Rp130-300Rb/m²"), desa("tp-siengkang", "Siengkang", 81, "Rp120-280Rb/m²"), desa("tp-lapongkoda", "Lapong Koda", 79, "Rp110-260Rb/m²")] },
      { id: "wj-sabbangparu", name: "Sabbangparu", score: 77, lat: -3.95, lng: 120.33, jarakPusatKota: 85, jalanNasional: 82, kawasanIndustri: 62, pasar: 75, perkantoran: 65, sekolah: 80, rumahSakit: 72, kompetitor: 83, hargaTanah: 96, topografi: 86,
        desa: [desa("sb-sabbangparu", "Sabbangparu", 78, "Rp100-240Rb/m²"), desa("sb-paria", "Paria", 75, "Rp95-230Rb/m²"), desa("sb-patila", "Patila", 73, "Rp90-220Rb/m²")] },
    ],
  },
  {
    id: "palopo", name: "Kota Palopo", lat: -3.0, lng: 120.2, score: 77, grade: grade(77),
    populasi: "185.000", pertumbuhanPct: 1.5, hargaTanahRange: "Rp300 Ribu - 1.5 Juta/m²",
    kompetitorCount: 22, infrastruktur: ["Bandara Lagaligo", "Pelabuhan Tanjung Ringgit", "Jalan Nasional"],
    potensiPasar: "Potensial — kota utama Luwu Raya, gateway Sulawesi Tengah",
    pertumbuhanPenduduk: 82, rumahTanggaBaru: 80, realisasiFLPP: 76, pertumbuhanEkonomi: 78, pdrbPerKapita: 80,
    tingkatUrbanisasi: 90, tingkatPengangguran: 75, infrastrukturStrategis: 85, jumlahKompetitor: 80, hargaTanahScore: 68,
    kecamatan: [
      { id: "plp-telluwanua", name: "Telluwanua", score: 82, lat: -2.983, lng: 120.183, jarakPusatKota: 88, jalanNasional: 88, kawasanIndustri: 75, pasar: 85, perkantoran: 80, sekolah: 87, rumahSakit: 85, kompetitor: 78, hargaTanah: 68, topografi: 88,
        desa: [desa("tw-mancani", "Mancani", 83, "Rp350-800Rb/m²"), desa("tw-maroangin", "Maroangin", 80, "Rp320-750Rb/m²"), desa("tw-salubattang", "Salubattang", 78, "Rp300-700Rb/m²")] },
      { id: "plp-bara", name: "Bara", score: 78, lat: -3.017, lng: 120.217, jarakPusatKota: 92, jalanNasional: 86, kawasanIndustri: 70, pasar: 82, perkantoran: 78, sekolah: 85, rumahSakit: 82, kompetitor: 78, hargaTanah: 65, topografi: 86,
        desa: [desa("ba-temmalebba", "Temmalebba", 79, "Rp300-700Rb/m²"), desa("ba-pontap", "Pontap", 76, "Rp280-650Rb/m²"), desa("ba-rampoang", "Rampoang", 74, "Rp260-600Rb/m²")] },
    ],
  },
  {
    id: "takalar", name: "Takalar", lat: -5.433, lng: 119.483, score: 76, grade: grade(76),
    populasi: "295.000", pertumbuhanPct: 1.1, hargaTanahRange: "Rp150-600 Ribu/m²",
    kompetitorCount: 18, infrastruktur: ["Jalan Nasional", "KIMA Takalar"],
    potensiPasar: "Potensial — dekat Makassar, zona industri baru",
    pertumbuhanPenduduk: 78, rumahTanggaBaru: 76, realisasiFLPP: 75, pertumbuhanEkonomi: 76, pdrbPerKapita: 70,
    tingkatUrbanisasi: 68, tingkatPengangguran: 78, infrastrukturStrategis: 80, jumlahKompetitor: 82, hargaTanahScore: 85,
    kecamatan: [
      { id: "tkl-pattallassang", name: "Pattallassang", score: 80, lat: -5.433, lng: 119.483, jarakPusatKota: 92, jalanNasional: 88, kawasanIndustri: 82, pasar: 85, perkantoran: 75, sekolah: 85, rumahSakit: 80, kompetitor: 80, hargaTanah: 83, topografi: 90,
        desa: [desa("pt-pattallassang", "Pattallassang", 81, "Rp180-420Rb/m²"), desa("pt-bajeng", "Pa'baeng", 78, "Rp160-380Rb/m²"), desa("pt-bontolebang", "Bonto Lebang", 76, "Rp150-350Rb/m²")] },
      { id: "tkl-polombangkeng-utara", name: "Polombangkeng Utara", score: 75, lat: -5.383, lng: 119.517, jarakPusatKota: 80, jalanNasional: 82, kawasanIndustri: 75, pasar: 72, perkantoran: 62, sekolah: 78, rumahSakit: 70, kompetitor: 80, hargaTanah: 86, topografi: 88,
        desa: [desa("pu-palleko", "Palleko", 76, "Rp150-340Rb/m²"), desa("pu-bontokassi", "Bonto Kassi", 73, "Rp140-320Rb/m²"), desa("pu-sabintang", "Sabintang", 71, "Rp130-300Rb/m²")] },
    ],
  },
  {
    id: "luwu-timur", name: "Luwu Timur", lat: -2.533, lng: 121.383, score: 73, grade: grade(73),
    populasi: "295.000", pertumbuhanPct: 2.5, hargaTanahRange: "Rp100-500 Ribu/m²",
    kompetitorCount: 8, infrastruktur: ["PT Vale Indonesia", "Bandara Soroako", "Jalan Nasional"],
    potensiPasar: "Potensial — pertambangan nikel, populasi pendatang tinggi",
    pertumbuhanPenduduk: 88, rumahTanggaBaru: 80, realisasiFLPP: 70, pertumbuhanEkonomi: 82, pdrbPerKapita: 85,
    tingkatUrbanisasi: 65, tingkatPengangguran: 78, infrastrukturStrategis: 82, jumlahKompetitor: 88, hargaTanahScore: 90,
    kecamatan: [
      { id: "lt-malili", name: "Malili", score: 77, lat: -2.7, lng: 121.1, jarakPusatKota: 92, jalanNasional: 82, kawasanIndustri: 88, pasar: 80, perkantoran: 70, sekolah: 82, rumahSakit: 78, kompetitor: 85, hargaTanah: 88, topografi: 80,
        desa: [desa("ml-malili", "Malili", 78, "Rp130-300Rb/m²"), desa("ml-pongkeru", "Pongkeru", 75, "Rp120-280Rb/m²"), desa("ml-harapan", "Harapan", 73, "Rp110-260Rb/m²")] },
      { id: "lt-nuha", name: "Nuha", score: 74, lat: -2.55, lng: 121.35, jarakPusatKota: 78, jalanNasional: 76, kawasanIndustri: 90, pasar: 72, perkantoran: 65, sekolah: 78, rumahSakit: 72, kompetitor: 82, hargaTanah: 88, topografi: 76,
        desa: [desa("nu-soroako", "Soroako", 75, "Rp150-380Rb/m²"), desa("nu-nikel", "Nikkel", 72, "Rp130-340Rb/m²"), desa("nu-magani", "Magani", 70, "Rp120-300Rb/m²")] },
    ],
  },
  {
    id: "pinrang", name: "Pinrang", lat: -3.792, lng: 119.625, score: 72, grade: grade(72),
    populasi: "370.000", pertumbuhanPct: 0.8, hargaTanahRange: "Rp120-400 Ribu/m²",
    kompetitorCount: 10, infrastruktur: ["Jalan Trans-Sulawesi", "PLTA Bakaru"],
    potensiPasar: "Potensial — sentra pertanian, jalur Trans-Sulawesi",
    pertumbuhanPenduduk: 72, rumahTanggaBaru: 74, realisasiFLPP: 72, pertumbuhanEkonomi: 72, pdrbPerKapita: 68,
    tingkatUrbanisasi: 58, tingkatPengangguran: 78, infrastrukturStrategis: 76, jumlahKompetitor: 88, hargaTanahScore: 93,
    kecamatan: [
      { id: "prg-watang-sawitto", name: "Watang Sawitto", score: 76, lat: -3.792, lng: 119.625, jarakPusatKota: 96, jalanNasional: 88, kawasanIndustri: 65, pasar: 85, perkantoran: 75, sekolah: 85, rumahSakit: 82, kompetitor: 85, hargaTanah: 92, topografi: 88,
        desa: [desa("ws-maccorawalie", "Maccorawalie", 77, "Rp150-340Rb/m²"), desa("ws-penrang", "Penrang", 74, "Rp140-320Rb/m²"), desa("ws-laleng", "Laleng", 72, "Rp130-300Rb/m²")] },
    ],
  },
  {
    id: "bulukumba", name: "Bulukumba", lat: -5.565, lng: 120.195, score: 72, grade: grade(72),
    populasi: "415.000", pertumbuhanPct: 0.9, hargaTanahRange: "Rp100-350 Ribu/m²",
    kompetitorCount: 12, infrastruktur: ["Jalan Nasional", "Pelabuhan Bulukumba"],
    potensiPasar: "Potensial — pariwisata berkembang, pantai, harga tanah terjangkau",
    pertumbuhanPenduduk: 72, rumahTanggaBaru: 72, realisasiFLPP: 74, pertumbuhanEkonomi: 71, pdrbPerKapita: 66,
    tingkatUrbanisasi: 58, tingkatPengangguran: 77, infrastrukturStrategis: 72, jumlahKompetitor: 86, hargaTanahScore: 93,
    kecamatan: [
      { id: "blk-ujung-bulu", name: "Ujung Bulu", score: 76, lat: -5.565, lng: 120.195, jarakPusatKota: 96, jalanNasional: 85, kawasanIndustri: 62, pasar: 85, perkantoran: 72, sekolah: 83, rumahSakit: 80, kompetitor: 82, hargaTanah: 90, topografi: 88,
        desa: [desa("ub-kalumeme", "Kalumeme", 77, "Rp130-300Rb/m²"), desa("ub-caile", "Caile", 74, "Rp120-280Rb/m²"), desa("ub-terang", "Terang-Terang", 72, "Rp110-260Rb/m²")] },
      { id: "blk-gantarang", name: "Gantarang", score: 70, lat: -5.5, lng: 120.15, jarakPusatKota: 82, jalanNasional: 80, kawasanIndustri: 58, pasar: 72, perkantoran: 60, sekolah: 78, rumahSakit: 70, kompetitor: 83, hargaTanah: 94, topografi: 85,
        desa: [desa("gt-benteng", "Benteng", 71, "Rp100-240Rb/m²"), desa("gt-dampang", "Dampang", 68, "Rp95-230Rb/m²"), desa("gt-biangkeke", "Biangkeke", 66, "Rp90-220Rb/m²")] },
    ],
  },
  {
    id: "soppeng", name: "Soppeng", lat: -4.35, lng: 119.9, score: 69, grade: grade(69),
    populasi: "230.000", pertumbuhanPct: 0.5, hargaTanahRange: "Rp100-320 Ribu/m²",
    kompetitorCount: 8, infrastruktur: ["Jalan Nasional"],
    potensiPasar: "Potensial — pertanian produktif, kompetitor minim",
    pertumbuhanPenduduk: 65, rumahTanggaBaru: 68, realisasiFLPP: 70, pertumbuhanEkonomi: 68, pdrbPerKapita: 65,
    tingkatUrbanisasi: 52, tingkatPengangguran: 75, infrastrukturStrategis: 65, jumlahKompetitor: 90, hargaTanahScore: 94,
    kecamatan: [
      { id: "spg-lalabata", name: "Lalabata", score: 74, lat: -4.35, lng: 119.9, jarakPusatKota: 95, jalanNasional: 82, kawasanIndustri: 55, pasar: 80, perkantoran: 68, sekolah: 80, rumahSakit: 75, kompetitor: 88, hargaTanah: 93, topografi: 86,
        desa: [desa("lb-lalabata-riaja", "Lalabata Riaja", 75, "Rp120-280Rb/m²"), desa("lb-maccile", "Maccile", 72, "Rp110-260Rb/m²"), desa("lb-attang-salo", "Attang Salo", 70, "Rp100-240Rb/m²")] },
    ],
  },
  {
    id: "luwu", name: "Luwu", lat: -2.933, lng: 120.333, score: 67, grade: grade(67),
    populasi: "345.000", pertumbuhanPct: 0.7, hargaTanahRange: "Rp80-280 Ribu/m²",
    kompetitorCount: 6, infrastruktur: ["Jalan Trans-Sulawesi"],
    potensiPasar: "Potensial — kawasan penyangga Palopo, kompetitor sangat sedikit",
    pertumbuhanPenduduk: 65, rumahTanggaBaru: 67, realisasiFLPP: 65, pertumbuhanEkonomi: 65, pdrbPerKapita: 62,
    tingkatUrbanisasi: 50, tingkatPengangguran: 73, infrastrukturStrategis: 68, jumlahKompetitor: 90, hargaTanahScore: 96,
    kecamatan: [
      { id: "lw-belopa", name: "Belopa", score: 71, lat: -3.0, lng: 120.25, jarakPusatKota: 88, jalanNasional: 80, kawasanIndustri: 52, pasar: 75, perkantoran: 65, sekolah: 78, rumahSakit: 72, kompetitor: 88, hargaTanah: 95, topografi: 85,
        desa: [desa("be-belopa", "Belopa", 72, "Rp100-230Rb/m²"), desa("be-ulusalu", "Ulusalu", 69, "Rp90-210Rb/m²"), desa("be-noling", "Noling", 67, "Rp85-200Rb/m²")] },
    ],
  },
  {
    id: "jeneponto", name: "Jeneponto", lat: -5.633, lng: 119.717, score: 66, grade: grade(66),
    populasi: "365.000", pertumbuhanPct: 0.6, hargaTanahRange: "Rp80-250 Ribu/m²",
    kompetitorCount: 8, infrastruktur: ["Jalan Nasional"],
    potensiPasar: "Potensial — harga tanah sangat murah, mulai berkembang",
    pertumbuhanPenduduk: 63, rumahTanggaBaru: 65, realisasiFLPP: 67, pertumbuhanEkonomi: 64, pdrbPerKapita: 58,
    tingkatUrbanisasi: 50, tingkatPengangguran: 72, infrastrukturStrategis: 62, jumlahKompetitor: 88, hargaTanahScore: 96,
    kecamatan: [
      { id: "jnp-binamu", name: "Binamu", score: 70, lat: -5.633, lng: 119.717, jarakPusatKota: 93, jalanNasional: 80, kawasanIndustri: 50, pasar: 75, perkantoran: 62, sekolah: 76, rumahSakit: 70, kompetitor: 85, hargaTanah: 95, topografi: 84,
        desa: [desa("bn-empoang", "Empoang", 71, "Rp95-220Rb/m²"), desa("bn-tonrokassi", "Tonrokassi", 68, "Rp85-200Rb/m²"), desa("bn-bontosunggu", "Bontosunggu", 66, "Rp80-190Rb/m²")] },
    ],
  },
  {
    id: "luwu-utara", name: "Luwu Utara", lat: -2.567, lng: 120.383, score: 63, grade: grade(63),
    populasi: "310.000", pertumbuhanPct: 0.9, hargaTanahRange: "Rp70-220 Ribu/m²",
    kompetitorCount: 5, infrastruktur: ["Jalan Trans-Sulawesi"],
    potensiPasar: "Sedang — potensi di ibukota Masamba, kompetitor minim",
    pertumbuhanPenduduk: 65, rumahTanggaBaru: 63, realisasiFLPP: 60, pertumbuhanEkonomi: 62, pdrbPerKapita: 60,
    tingkatUrbanisasi: 48, tingkatPengangguran: 70, infrastrukturStrategis: 62, jumlahKompetitor: 92, hargaTanahScore: 97,
    kecamatan: [
      { id: "lu-masamba", name: "Masamba", score: 67, lat: -2.55, lng: 120.33, jarakPusatKota: 92, jalanNasional: 75, kawasanIndustri: 45, pasar: 72, perkantoran: 60, sekolah: 74, rumahSakit: 68, kompetitor: 90, hargaTanah: 96, topografi: 82,
        desa: [desa("ms-bone-subur", "Bone Subur", 68, "Rp80-190Rb/m²"), desa("ms-masamba", "Masamba", 65, "Rp75-180Rb/m²"), desa("ms-pombakka", "Pombakka", 63, "Rp70-170Rb/m²")] },
    ],
  },
  {
    id: "sinjai", name: "Sinjai", lat: -5.117, lng: 120.25, score: 63, grade: grade(63),
    populasi: "250.000", pertumbuhanPct: 0.5, hargaTanahRange: "Rp80-250 Ribu/m²",
    kompetitorCount: 7, infrastruktur: ["Jalan Nasional"],
    potensiPasar: "Sedang — potensi agrowisata, kompetitor sedikit",
    pertumbuhanPenduduk: 60, rumahTanggaBaru: 62, realisasiFLPP: 63, pertumbuhanEkonomi: 61, pdrbPerKapita: 60,
    tingkatUrbanisasi: 48, tingkatPengangguran: 72, infrastrukturStrategis: 60, jumlahKompetitor: 88, hargaTanahScore: 94,
    kecamatan: [
      { id: "sn-sinjai-utara", name: "Sinjai Utara", score: 67, lat: -5.117, lng: 120.25, jarakPusatKota: 93, jalanNasional: 78, kawasanIndustri: 45, pasar: 72, perkantoran: 60, sekolah: 73, rumahSakit: 68, kompetitor: 85, hargaTanah: 93, topografi: 82,
        desa: [desa("su-lappa", "Lappa", 68, "Rp90-210Rb/m²"), desa("su-balangnipa", "Balangnipa", 65, "Rp85-200Rb/m²"), desa("su-biringere", "Biringere", 63, "Rp80-190Rb/m²")] },
    ],
  },
  {
    id: "enrekang", name: "Enrekang", lat: -3.567, lng: 119.783, score: 61, grade: grade(61),
    populasi: "205.000", pertumbuhanPct: 0.6, hargaTanahRange: "Rp60-200 Ribu/m²",
    kompetitorCount: 5, infrastruktur: ["Jalan Trans-Sulawesi"],
    potensiPasar: "Sedang — agrowisata, bawang merah, harga tanah sangat murah",
    pertumbuhanPenduduk: 58, rumahTanggaBaru: 60, realisasiFLPP: 60, pertumbuhanEkonomi: 60, pdrbPerKapita: 58,
    tingkatUrbanisasi: 45, tingkatPengangguran: 70, infrastrukturStrategis: 60, jumlahKompetitor: 90, hargaTanahScore: 97,
    kecamatan: [
      { id: "er-enrekang", name: "Enrekang", score: 65, lat: -3.567, lng: 119.783, jarakPusatKota: 90, jalanNasional: 75, kawasanIndustri: 40, pasar: 70, perkantoran: 58, sekolah: 70, rumahSakit: 65, kompetitor: 88, hargaTanah: 96, topografi: 78,
        desa: [desa("er-galonta", "Galonta", 66, "Rp70-170Rb/m²"), desa("er-juppandang", "Juppandang", 63, "Rp65-160Rb/m²"), desa("er-tampo", "Tampo", 61, "Rp60-150Rb/m²")] },
    ],
  },
  {
    id: "tana-toraja", name: "Tana Toraja", lat: -3.033, lng: 119.883, score: 58, grade: grade(58),
    populasi: "230.000", pertumbuhanPct: 0.2, hargaTanahRange: "Rp50-200 Ribu/m²",
    kompetitorCount: 4, infrastruktur: ["Jalan Nasional Toraja"],
    potensiPasar: "Sedang — wisata budaya internasional, topografi sulit bangun",
    pertumbuhanPenduduk: 50, rumahTanggaBaru: 55, realisasiFLPP: 55, pertumbuhanEkonomi: 55, pdrbPerKapita: 58,
    tingkatUrbanisasi: 40, tingkatPengangguran: 65, infrastrukturStrategis: 60, jumlahKompetitor: 88, hargaTanahScore: 96,
    kecamatan: [
      { id: "tt-makale", name: "Makale", score: 63, lat: -3.083, lng: 119.85, jarakPusatKota: 88, jalanNasional: 72, kawasanIndustri: 35, pasar: 68, perkantoran: 55, sekolah: 68, rumahSakit: 62, kompetitor: 85, hargaTanah: 94, topografi: 65,
        desa: [desa("mk-makale", "Makale", 64, "Rp70-180Rb/m²"), desa("mk-borrong", "Borrong", 61, "Rp65-170Rb/m²"), desa("mk-tambunan", "Tambunan", 59, "Rp60-160Rb/m²")] },
    ],
  },
  {
    id: "kepulauan-selayar", name: "Kepulauan Selayar", lat: -6.117, lng: 120.467, score: 52, grade: grade(52),
    populasi: "135.000", pertumbuhanPct: 0.3, hargaTanahRange: "Rp50-180 Ribu/m²",
    kompetitorCount: 3, infrastruktur: ["Pelabuhan Pamatata", "Jalan Pulau"],
    potensiPasar: "Sedang — wisata bahari, terisolasi, akses terbatas",
    pertumbuhanPenduduk: 48, rumahTanggaBaru: 50, realisasiFLPP: 50, pertumbuhanEkonomi: 50, pdrbPerKapita: 52,
    tingkatUrbanisasi: 40, tingkatPengangguran: 62, infrastrukturStrategis: 52, jumlahKompetitor: 90, hargaTanahScore: 97,
    kecamatan: [
      { id: "sl-benteng", name: "Benteng", score: 57, lat: -6.133, lng: 120.417, jarakPusatKota: 90, jalanNasional: 62, kawasanIndustri: 30, pasar: 62, perkantoran: 50, sekolah: 62, rumahSakit: 55, kompetitor: 88, hargaTanah: 95, topografi: 75,
        desa: [desa("bt-bontobangun", "Bonto Bangun", 58, "Rp60-160Rb/m²"), desa("bt-benteng", "Benteng", 55, "Rp55-150Rb/m²"), desa("bt-bonto-lebang", "Bonto Lebang", 53, "Rp50-140Rb/m²")] },
    ],
  },
  {
    id: "toraja-utara", name: "Toraja Utara", lat: -2.967, lng: 119.9, score: 51, grade: grade(51),
    populasi: "215.000", pertumbuhanPct: 0.2, hargaTanahRange: "Rp45-180 Ribu/m²",
    kompetitorCount: 3, infrastruktur: ["Jalan Nasional Toraja"],
    potensiPasar: "Sedang — wisata Toraja, kontur pegunungan, sangat terbatas untuk perumahan",
    pertumbuhanPenduduk: 45, rumahTanggaBaru: 48, realisasiFLPP: 50, pertumbuhanEkonomi: 50, pdrbPerKapita: 52,
    tingkatUrbanisasi: 38, tingkatPengangguran: 62, infrastrukturStrategis: 55, jumlahKompetitor: 90, hargaTanahScore: 97,
    kecamatan: [
      { id: "tu-rantepao", name: "Rantepao", score: 56, lat: -2.967, lng: 119.9, jarakPusatKota: 90, jalanNasional: 68, kawasanIndustri: 28, pasar: 62, perkantoran: 50, sekolah: 65, rumahSakit: 58, kompetitor: 88, hargaTanah: 95, topografi: 60,
        desa: [desa("rp-rantepao", "Rantepao", 57, "Rp55-160Rb/m²"), desa("rp-tondon", "Tondon", 54, "Rp50-150Rb/m²"), desa("rp-tallunglipu", "Tallunglipu", 52, "Rp45-140Rb/m²")] },
    ],
  },
];

export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case "sangat_potensial": return "#16a34a";
    case "potensial": return "#d97706";
    case "sedang": return "#ea580c";
    case "tidak_direkomendasikan": return "#dc2626";
  }
}

export function getGradeLabel(grade: Grade): string {
  switch (grade) {
    case "sangat_potensial": return "Sangat Potensial";
    case "potensial": return "Potensial";
    case "sedang": return "Sedang";
    case "tidak_direkomendasikan": return "Tidak Direkomendasikan";
  }
}

export function getGradeBg(grade: Grade): string {
  switch (grade) {
    case "sangat_potensial": return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "potensial": return "bg-amber-50 border-amber-200 text-amber-700";
    case "sedang": return "bg-orange-50 border-orange-200 text-orange-700";
    case "tidak_direkomendasikan": return "bg-red-50 border-red-200 text-red-700";
  }
}

export const KAB_WEIGHTS = { pertumbuhanPenduduk: 15, rumahTanggaBaru: 10, realisasiFLPP: 15, pertumbuhanEkonomi: 10, pdrbPerKapita: 10, tingkatUrbanisasi: 5, tingkatPengangguran: 5, infrastrukturStrategis: 10, jumlahKompetitor: 10, hargaTanahScore: 10 };
export const KEC_WEIGHTS = { jarakPusatKota: 15, jalanNasional: 10, kawasanIndustri: 10, pasar: 10, perkantoran: 5, sekolah: 5, rumahSakit: 5, kompetitor: 15, hargaTanah: 15, topografi: 10 };
export const DESA_WEIGHTS = { kepadatanPenduduk: 10, pertumbuhanPenduduk: 10, hargaTanah: 20, aksesJalan: 15, pln: 5, pdam: 5, internetFiber: 5, kompetitor: 15, potensiUnit: 15 };
