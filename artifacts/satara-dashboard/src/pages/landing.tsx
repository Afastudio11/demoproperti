import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { AnimatedHeading } from '../components/AnimatedHeading';
import { FadeIn } from '../components/FadeIn';

const landingCSS = `
  /* Reset & Custom Styles inside landing-body */
  .landing-body {
    position: relative;
    min-height: 100vh;
    background-color: #ffffff;
    color: #000000;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .landing-body .font-display {
    font-family: 'Montserrat', sans-serif;
  }

  .landing-body .text-concrete {
    color: #666666;
  }

  .landing-body .bg-stone {
    background-color: #f5f5f5;
  }

  /* Custom Liquid Glass Glassmorphism Class */
  .landing-body .liquid-glass {
    background: rgba(0, 0, 0, 0.4);
    background-blend-mode: luminosity;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }

  .landing-body .liquid-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(180deg,
      rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 20%,
      rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
      rgba(255,255,255,0.1) 80%, rgba(255,255,255,0.3) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll handler for anchor links
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-body">
      <style dangerouslySetInnerHTML={{ __html: landingCSS }} />
      
      {/* 1. NAVIGASI (Floating Liquid Glass Header) */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 md:px-12 lg:px-16 pt-6 pointer-events-none">
        <div className="container mx-auto">
          <div className="liquid-glass border border-white/20 rounded-xl px-6 py-3 flex items-center justify-between pointer-events-auto">
            {/* Logo */}
            <a href="#" className="flex items-center gap-3.5 text-2xl font-bold tracking-tight text-white font-display">
              <img src="/logo.png" className="h-7 w-auto shrink-0" alt="Satara Group Logo" />
              <span>SATARA GROUP</span>
            </a>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#ekosistem"
                onClick={(e) => handleScroll(e, 'ekosistem')}
                className="text-sm font-normal text-white/90 hover:text-white hover:scale-105 transition-all duration-200"
              >
                Ekosistem
              </a>
              <a
                href="#proyek"
                onClick={(e) => handleScroll(e, 'proyek')}
                className="text-sm font-normal text-white/90 hover:text-white hover:scale-105 transition-all duration-200"
              >
                Proyek
              </a>
              <a
                href="#struktur"
                onClick={(e) => handleScroll(e, 'struktur')}
                className="text-sm font-normal text-white/90 hover:text-white hover:scale-105 transition-all duration-200"
              >
                Struktur
              </a>
              <a
                href="#roadmap"
                onClick={(e) => handleScroll(e, 'roadmap')}
                className="text-sm font-normal text-white/90 hover:text-white hover:scale-105 transition-all duration-200"
              >
                Roadmap
              </a>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <Link
                  href="/teamwork"
                  className="bg-white text-black hover:bg-transparent hover:text-white border border-white/20 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm font-display"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/teamwork"
                  className="bg-white text-black hover:bg-transparent hover:text-white border border-white/20 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm font-display"
                >
                  Masuk
                </Link>
              )}
              <a
                href="#hubungi"
                onClick={(e) => handleScroll(e, 'hubungi')}
                className="text-white hover:bg-white/10 border border-white/20 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm font-display"
              >
                Hubungi Kami
              </a>
            </div>

            {/* Mobile Burger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col justify-between w-6 h-4 bg-transparent border-none cursor-pointer focus:outline-none"
              aria-label="Toggle Menu"
            >
              <span className={`block w-full h-[2px] bg-white transition-transform duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
              <span className={`block w-full h-[2px] bg-white transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`block w-full h-[2px] bg-white transition-transform duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 liquid-glass border border-white/20 rounded-xl p-6 flex flex-col gap-4 pointer-events-auto">
              <a
                href="#ekosistem"
                onClick={(e) => handleScroll(e, 'ekosistem')}
                className="text-sm font-medium text-white/90 hover:text-white py-1"
              >
                Ekosistem
              </a>
              <a
                href="#proyek"
                onClick={(e) => handleScroll(e, 'proyek')}
                className="text-sm font-medium text-white/90 hover:text-white py-1"
              >
                Proyek
              </a>
              <a
                href="#struktur"
                onClick={(e) => handleScroll(e, 'struktur')}
                className="text-sm font-medium text-white/90 hover:text-white py-1"
              >
                Struktur
              </a>
              <a
                href="#roadmap"
                onClick={(e) => handleScroll(e, 'roadmap')}
                className="text-sm font-medium text-white/90 hover:text-white py-1"
              >
                Roadmap
              </a>
              {user ? (
                <Link
                  href="/teamwork"
                  className="bg-white text-black text-center py-2.5 rounded-lg text-sm font-medium hover:bg-transparent hover:text-white border border-white/20 transition-all duration-300 mt-2 font-display"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/teamwork"
                  className="bg-white text-black text-center py-2.5 rounded-lg text-sm font-medium hover:bg-transparent hover:text-white border border-white/20 transition-all duration-300 mt-2 font-display"
                >
                  Masuk
                </Link>
              )}
              <a
                href="#hubungi"
                onClick={(e) => handleScroll(e, 'hubungi')}
                className="border border-white/20 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-white hover:text-black transition-all duration-300 font-display"
              >
                Hubungi Kami
              </a>
            </div>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden bg-black text-white px-6 md:px-12 lg:px-16 pb-12 lg:pb-16 pt-32">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            willChange: 'transform'
          }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
        />

        {/* Hero Left-aligned Bottom Container */}
        <div className="relative z-10 container mx-auto">
          <div className="max-w-6xl w-full flex flex-col items-start justify-end">
            <AnimatedHeading
              text={"Membangun Ekosistem\nBisnis di Atas Aset Nyata."}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-display mb-6 tracking-tight text-white"
            />
            
            <FadeIn delay={800} duration={1000}>
              <p className="text-base md:text-lg text-gray-300 mb-8 max-w-2xl leading-relaxed">
                Satara Group mengintegrasikan pengembangan properti strategis dan industri kreatif fashion untuk menghasilkan pertumbuhan modal berkelanjutan. Melalui tata kelola holding yang disiplin, kami mentransformasikan aset fisik menjadi ekosistem bisnis yang menghasilkan arus kas berulang.
              </p>
            </FadeIn>

            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#proyek"
                  onClick={(e) => handleScroll(e, 'proyek')}
                  className="bg-white text-black px-8 py-3.5 rounded-lg font-medium hover:bg-transparent hover:text-white border border-white/20 transition-all duration-300 shadow-md font-display"
                >
                  Jelajahi Proyek
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. VISI & FILOSOFI (Asymmetrical Editorial Style - White Section) */}
      <section className="bg-white py-24 px-6 md:px-12 lg:px-16 border-t border-black/10" id="filosofi">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column (3/12) */}
            <div className="lg:col-span-3 flex flex-col items-start">
              <span className="inline-block text-xs font-bold text-black uppercase tracking-wider border-b border-black pb-1 mb-6 font-display">
                Visi &amp; Filosofi.
              </span>

              <p className="text-concrete text-sm leading-relaxed max-w-[240px]">
                Menjamin keberlanjutan usaha melalui manajemen aset nyata secara disiplin.
              </p>
            </div>

            {/* Center Column: Large Vision Statement (6/12) */}
            <div className="lg:col-span-6 flex flex-col items-start pt-2 lg:pt-0">
              <p className="text-xl md:text-2xl lg:text-3xl font-bold text-black font-display leading-relaxed">
                Menjadi holding company terkemuka yang membangun ekosistem bisnis terintegrasi melalui pilar properti, fashion, dan manajemen aset guna menghasilkan pendapatan berulang yang kokoh dan berkelanjutan.
              </p>
              
              <div className="w-full h-[1px] bg-black/10 my-8"></div>
              
              <a
                href="#ekosistem"
                onClick={(e) => handleScroll(e, 'ekosistem')}
                className="inline-flex items-center text-sm font-bold text-black hover:opacity-70 transition-opacity group font-display"
              >
                Selengkapnya <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            {/* Right Column (3/12) */}
            <div className="lg:col-span-3 flex flex-col items-start pt-4 lg:pt-0">
              <span className="text-[11px] font-bold text-concrete uppercase tracking-wider block mb-4">
                Pembangunan Berkelanjutan
              </span>

              <p className="text-concrete text-sm leading-relaxed">
                Pembangunan berkelanjutan didukung oleh efisiensi modal yang disiplin dan mitigasi risiko yang ketat pada setiap tahap akuisisi serta pengembangan aset.
              </p>
            </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* ANAK PERUSAHAAN (Marquee Logo Scroll) */}
      <section className="bg-white py-14 border-t border-black/10 overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track {
            display: flex;
            width: max-content;
            animation: marquee 18s linear infinite;
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
        `}} />
        <div className="marquee-track">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-20 px-10">
              <img src="/logo-roemah-warga.png" alt="Roemah Warga" className="h-20 w-auto object-contain mix-blend-multiply opacity-100 transition-opacity duration-300" />
              <img src="/logo-sekala.png"        alt="Sekala"          className="h-11 w-auto object-contain mix-blend-multiply opacity-100 transition-opacity duration-300" />
              <img src="/logo-sn-residence.png"  alt="SN Residence"    className="h-14 w-auto object-contain mix-blend-multiply opacity-100 transition-opacity duration-300" />
              {/* spacer between sets */}
              <span className="w-16 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. EKOSISTEM BISNIS (Service List Row Style - Black Section) */}
      <section className="bg-black py-24 px-6 md:px-12 lg:px-16 border-t border-white/10 text-white" id="ekosistem">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-16">
              <div className="max-w-2xl">
                <span className="inline-block text-xs font-bold text-white uppercase tracking-wider border-b border-white pb-1 mb-6 font-display">
                  Ekosistem Bisnis.
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
                  Integrasi Infrastruktur Fisik &amp; Industri Kreatif
                </h2>
              </div>
              {/* Large Diagonal Arrow */}
              <div className="hidden lg:block shrink-0 mb-2">
                <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 37.5L37.5 12.5M37.5 12.5H18.75M37.5 12.5V31.25" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Rows */}
            <div className="flex flex-col border-t border-white/20 text-white">
              
              {/* Row 01: Satara Development */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-10 border-b border-white/20 items-center">
                {/* Left Column: Photo Visual (2/12) */}
                <div className="lg:col-span-2 hidden lg:flex justify-center">
                  <div className="rounded-lg overflow-hidden w-52 h-52 border border-white/10 shadow-sm">
                    <img src="/foto-sn-residence.jpg" alt="SN Residence" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Middle Column: Details (8/12) */}
                <div className="lg:col-span-8 flex flex-col items-start">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-bold text-white font-display">01.</span>
                    <span className="border border-white/30 text-white text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded">
                      PT Berkah Bintang Pratama + PT Satara Property
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white font-display mb-3">Satara Development</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                    Pilar utama pengembangan properti yang berfokus pada penyediaan hunian berkualitas tinggi, kawasan komersial terpadu, dan pengelolaan aset strategis di Sulawesi Selatan.
                  </p>
                </div>

                {/* Right Column: CTA (2/12) */}
                <div className="lg:col-span-2 flex justify-start lg:justify-end">
                  <a
                    href="#proyek"
                    onClick={(e) => handleScroll(e, 'proyek')}
                    className="bg-white text-black hover:bg-transparent hover:text-white border border-white px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wider transition-all duration-300 font-display"
                  >
                    Lihat Proyek
                  </a>
                </div>
              </div>

              {/* Row 02: Satara Fashion */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-10 border-b border-white/20 items-center">
                {/* Left Column: Photo Visual (2/12) */}
                <div className="lg:col-span-2 hidden lg:flex justify-center">
                  <div className="rounded-lg overflow-hidden w-52 h-52 border border-white/10 shadow-sm">
                    <img src="/foto-sekala.jpg" alt="Sekala" className="w-full h-full object-cover object-top" />
                  </div>
                </div>

                {/* Middle Column: Details (8/12) */}
                <div className="lg:col-span-8 flex flex-col items-start">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-bold text-white font-display">02.</span>
                    <span className="border border-white/30 text-white text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded">
                      Sekala + Senada
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white font-display mb-3">Satara Fashion</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                    Divisi industri kreatif yang bergerak di bidang retail fashion modern dengan pendekatan desain kontemporer dan sistem distribusi berbasis teknologi.
                  </p>
                </div>

                {/* Right Column: Placeholder (2/12) */}
                <div className="lg:col-span-2 flex justify-start lg:justify-end">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Pilar</span>
                </div>
              </div>

              {/* Row 03: Future Expansion */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-10 border-b border-white/20 items-center">
                {/* Left Column: Photo Visual (2/12) */}
                <div className="lg:col-span-2 hidden lg:flex justify-center">
                  <div className="rounded-lg overflow-hidden w-52 h-52 border border-white/10 shadow-sm">
                    <img src="/foto-roemah-warga.jpg" alt="Roemah Warga" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Middle Column: Details (8/12) */}
                <div className="lg:col-span-8 flex flex-col items-start">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-bold text-white font-display">03.</span>
                    <span className="border border-white/30 text-white text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded">
                      Hospitality, Commercial Area, Asset Management
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white font-display mb-3">Future Expansion</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                    Jalur pertumbuhan masa depan kami mencakup ekspansi ke sektor perhotelan, area komersial, dan manajemen aset secara berkelanjutan untuk memperkokoh diversifikasi arus pendapatan.
                  </p>
                </div>

                {/* Right Column: Tags (2/12) */}
                <div className="lg:col-span-2 flex justify-start lg:justify-end">
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Future Roadmap</span>
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 5. PORTOFOLIO PROPERTI (Asymmetric Grid & Large Blueprint Style - White Section) */}
      <section className="bg-white py-24 px-6 md:px-12 lg:px-16" id="proyek">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            {/* Header */}
            <div className="max-w-2xl mb-16">
              <span className="inline-block text-xs font-bold text-black uppercase tracking-wider border-b border-black pb-1 mb-6 font-display">
                Portofolio Properti.
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-black font-display mb-4">
                Aset Nyata dengan Yield Berkelanjutan
              </h2>
              <p className="text-concrete text-sm md:text-base">
                Infrastruktur properti yang menjawab kebutuhan perumahan rakyat, hiburan komersial, dan instrumen investasi.
              </p>
            </div>

            {/* Grid Layout (4/12 Blueprint, 8/12 Proyek Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              
              {/* Left Photo Grid Column (4/12) */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                <div className="overflow-hidden rounded-tl-xl aspect-square">
                  <img src="/foto-sn-residence2.jpg" alt="SN Residence 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden rounded-tr-xl aspect-square">
                  <img src="/foto-sn-rumah.jpg" alt="SN Rumah" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden rounded-bl-xl aspect-square">
                  <img src="/foto-ruko.jpg" alt="Ruko" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden rounded-br-xl aspect-square">
                  <img src="/foto-proyek4.jpg" alt="Proyek Residensial" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              </div>

              {/* Right Proyek 2x2 Grid Column (8/12) */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Proyek 1 */}
                <div className="border-b border-black/10 pb-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-black uppercase tracking-wider block mb-2">Bantaeng - Flagship</span>
                    <h4 className="text-xl font-bold text-black font-display mb-2">SN Residence 1-4 &amp; SHM Project</h4>
                    <p className="text-concrete text-sm leading-relaxed mb-4">
                      Proyek perumahan flagship kami yang dirancang khusus untuk mendukung program KPR dan MBR (Masyarakat Berpenghasilan Rendah) dengan legalitas Sertifikat Hak Milik penuh.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-black font-display">100% Sertifikat Hak Milik</span>
                </div>

                {/* Proyek 2 */}
                <div className="border-b border-black/10 pb-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-black uppercase tracking-wider block mb-2">Ekspansi Regional - Komunitas</span>
                    <h4 className="text-xl font-bold text-black font-display mb-2">Roemah Warga</h4>
                    <p className="text-concrete text-sm leading-relaxed mb-4">
                      Konsep hunian komunitas berdensitas sedang yang mengedepankan aspek kebersamaan, ruang publik hijau, dan aksesibilitas tinggi untuk ekspansi di Sulawesi Selatan.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-black font-display">Ruang Komunitas Terpadu</span>
                </div>

                {/* Proyek 3 */}
                <div className="border-b border-black/10 pb-6 md:border-none md:pb-0 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-black uppercase tracking-wider block mb-2">Sinoa - Leisure &amp; Hospitality</span>
                    <h4 className="text-xl font-bold text-black font-display mb-2">Villa Sinoa</h4>
                    <p className="text-concrete text-sm leading-relaxed mb-4">
                      Proyek peristirahatan eksklusif di dataran tinggi yang dirancang untuk menghasilkan yield sewa berulang melalui pengelolaan villa jangka pendek.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-black font-display">Recurring Yield</span>
                </div>

                {/* Proyek 4 */}
                <div className="pb-6 md:pb-0 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-black uppercase tracking-wider block mb-2">Pusat Kota - Komersial</span>
                    <h4 className="text-xl font-bold text-black font-display mb-2">Rumah Bernyanyi &amp; Kost/Rental</h4>
                    <p className="text-concrete text-sm leading-relaxed mb-4">
                      Pengembangan properti komersial yang menggabungkan pusat hiburan keluarga dengan hunian sewa (kost eksekutif) untuk mengamankan arus kas masuk.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-black font-display">Daily &amp; Monthly Arus Kas</span>
                </div>

              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 7. FRAMEWORK PENGEMBANGAN PROYEK (Grid Ramping - Black Section) */}
      <section className="bg-black py-24 px-6 md:px-12 lg:px-16 border-t border-white/10 text-white" id="framework">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            {/* Header */}
            <div className="max-w-2xl mb-16">
              <span className="inline-block text-xs font-bold text-white uppercase tracking-wider border-b border-white pb-1 mb-6 font-display">
                Metodologi Kerja.
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">
                Framework Pembangunan Proyek
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                Siklus operasional delapan tahap yang sistematis dari proses akuisisi lahan hingga manajemen purna jual.
              </p>
            </div>

            {/* Grid Layout (4 Columns on Desktop, 1 on Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              
              {/* Tahap 1 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">01.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Pencarian Lahan</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Land banking taktis, negosiasi langsung dengan pemilik lahan, serta pemetaan potensi lokasi strategis.
                </p>
              </div>

              {/* Tahap 2 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">02.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Feasibility Study</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Pembuatan masterplan, siteplan terperinci, proyeksi keuangan (forecasting), and penganggaran ketat.
                </p>
              </div>

              {/* Tahap 3 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">03.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Legal &amp; Perizinan</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Pengurusan Sertifikat Hak Milik (SHM), Akta Jual Beli (AJB), Persetujuan Bangunan Gedung (PBG), kerja sama legal perbankan, dan dukungan proses akad.
                </p>
              </div>

              {/* Tahap 4 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">04.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Marketing Opening</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Strategi perolehan prospek konsumen (lead generation), pengelolaan corong penjualan (sales funnel), and pembukaan pemesanan unit (booking).
                </p>
              </div>

              {/* Tahap 5 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">05.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Pembangunan</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Kontrol kualitas konstruksi (quality control), pengawasan kemajuan fisik di lapangan, serta manajemen mandor yang terukur.
                </p>
              </div>

              {/* Tahap 6 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">06.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Akad</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Titik krusial masuknya arus kas (cash inflow) dan percepatan siklus konversi kas (cash conversion cycle).
                </p>
              </div>

              {/* Tahap 7 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">07.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">Serah Terima</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Penyerahan unit properti secara resmi kepada konsumen (handover unit) dilengkapi dokumentasi berita acara akhir.
                </p>
              </div>

              {/* Tahap 8 */}
              <div className="border-t border-white/20 pt-6 flex flex-col">
                <span className="text-xs font-bold text-white font-display mb-2">08.</span>
                <h3 className="text-base font-bold text-white font-display mb-2">After Sales</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Pengelolaan keluhan konsumen, pemberian garansi konstruksi fisik, dan pelayanan purna jual yang berkelanjutan.
                </p>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 7. STRUKTUR ORGANISASI HOLDING (List Asimetris Style - White Section) */}
      <section className="bg-white py-24 px-6 md:px-12 lg:px-16 border-t border-black/10" id="struktur">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column Description (4/12) */}
            <div className="lg:col-span-4 flex flex-col items-start">
              <span className="inline-block text-xs font-bold text-black uppercase tracking-wider border-b border-black pb-1 mb-6 font-display">
                Tata Kelola Holding.
              </span>
              <h2 className="text-3xl font-bold text-black font-display mb-6">
                Struktur Organisasi Holding
              </h2>
              <p className="text-concrete text-sm leading-relaxed mb-6">
                Holding company Satara Group berfokus penuh pada fungsi tata kelola (governance) dan peningkatan skala bisnis secara strategis (scaling), sementara aktivitas operasional harian diserahkan secara mandiri kepada anak perusahaan.
              </p>
            </div>

            {/* Right Column List (8/12) */}
            <div className="lg:col-span-8 flex flex-col border-t border-black/10">
              
              {/* CEO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 py-6 border-b border-black/10 items-center gap-4">
                <span className="text-xs font-bold text-black font-display uppercase tracking-wider">CEO / Founder</span>
                <span className="text-lg font-bold text-black font-display sm:col-span-2">A. Arya Setiawan Junior</span>
              </div>

              {/* HRGA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 py-6 border-b border-black/10 items-center gap-4">
                <span className="text-xs font-bold text-concrete uppercase tracking-wider">HRGA Function</span>
                <span className="text-lg font-bold text-black font-display sm:col-span-2">Gilang</span>
              </div>

              {/* Finance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 py-6 border-b border-black/10 items-center gap-4">
                <span className="text-xs font-bold text-concrete uppercase tracking-wider">Finance &amp; Accounts</span>
                <span className="text-lg font-bold text-black font-display sm:col-span-2">Zaskia &amp; Annisa</span>
              </div>

              {/* Branding */}
              <div className="grid grid-cols-1 sm:grid-cols-3 py-6 border-b border-black/10 items-center gap-4">
                <span className="text-xs font-bold text-concrete uppercase tracking-wider">Branding &amp; Communication</span>
                <span className="text-lg font-bold text-black font-display sm:col-span-2">Mahdi</span>
              </div>

              {/* Strategic Control */}
              <div className="grid grid-cols-1 sm:grid-cols-3 py-6 border-b border-black/10 items-center gap-4">
                <span className="text-xs font-bold text-concrete uppercase tracking-wider">Strategic Control</span>
                <span className="text-lg font-bold text-black font-display sm:col-span-2">Holding Oversight</span>
              </div>

            </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 8. SISTEM REPORTING & KONTROL (Card Ramping Style - Black Section) */}
      <section className="bg-black py-24 px-6 md:px-12 lg:px-16 border-t border-white/10 text-white">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            {/* Header */}
            <div className="max-w-2xl mb-16">
              <span className="inline-block text-xs font-bold text-white uppercase tracking-wider border-b border-white pb-1 mb-6 font-display">
                Sistem Kontrol.
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">
                Mekanisme Pengendalian Kinerja
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                Disiplin reporting yang ketat untuk menjamin transparansi data keuangan dan operasional secara periodik.
              </p>
            </div>

            {/* 3 Columns Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Card 1 */}
              <div className="liquid-glass border border-white/20 p-8 rounded-xl">
                <span className="inline-block bg-white text-black text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded mb-4">
                  Evaluasi Mingguan
                </span>
                <h3 className="text-lg font-bold text-white font-display mb-3">Weekly Report</h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Evaluasi mingguan terpadu di seluruh divisi operasional anak perusahaan untuk memantau kemajuan pembangunan fisik, pencapaian penjualan harian, dan penyelesaian administrasi legal secara real-time.
                </p>
              </div>

              {/* Card 2 */}
              <div className="liquid-glass border border-white/20 p-8 rounded-xl">
                <span className="inline-block bg-white text-black text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded mb-4">
                  Penilaian Bulanan
                </span>
                <h3 className="text-lg font-bold text-white font-display mb-3">Monthly Board Review</h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Penilaian bulanan jajaran direksi terhadap kesehatan arus kas (cashflow), pergerakan siklus konversi kas, kemajuan target perizinan daerah, serta evaluasi komparatif performa antardivisi.
                </p>
              </div>

              {/* Card 3 */}
              <div className="liquid-glass border border-white/20 p-8 rounded-xl">
                <span className="inline-block bg-white text-black text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded mb-4">
                  Pusat Kontrol Digital
                </span>
                <h3 className="text-lg font-bold text-white font-display mb-3">Cross-Division KPI Dashboard</h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Papan instrumen digital terpusat yang mengintegrasikan data Key Performance Indicator lintas divisi utama (Sales, Produksi, Legal, dan Finance) guna mengantisipasi hambatan operasional sedini mungkin.
                </p>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 9. ROADMAP PERTUMBUHAN (White Section) */}
      <section className="bg-white py-24 px-6 md:px-12 lg:px-16 border-t border-black/10" id="roadmap">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            {/* Header */}
            <div className="max-w-2xl mb-16">
              <span className="inline-block text-xs font-bold text-black uppercase tracking-wider border-b border-black pb-1 mb-6 font-display">
                Rencana Kerja.
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-black font-display mb-4">
                Roadmap Pertumbuhan Satara Group
              </h2>
              <p className="text-concrete text-sm md:text-base">
                Tahapan strategis jangka pendek hingga panjang untuk merealisasikan dominasi pasar dan perluasan portofolio.
              </p>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Fase 1 */}
              <div className="border-t border-black/10 pt-8 flex flex-col">
                <div className="text-xs font-bold text-black font-display uppercase mb-1">Fase 01</div>
                <h3 className="text-lg font-bold text-black font-display mb-4">Stabilisasi &amp; Sistem</h3>
                <div className="text-[10px] font-semibold text-concrete uppercase tracking-wider mb-4">Jangka Pendek (1-2 Tahun)</div>
                <p className="text-concrete text-xs leading-relaxed">
                  Fokus pada stabilisasi tata kelola manajemen internal, penyusunan Standar Operasional Prosedur (SOP) terstandardisasi di seluruh anak perusahaan, peluncuran KPI dashboard terpadu, serta inisiasi ekspansi awal proyek perumahan regional di kabupaten sekitar.
                </p>
              </div>

              {/* Fase 2 */}
              <div className="border-t border-black/10 pt-8 flex flex-col">
                <div className="text-xs font-bold text-black font-display uppercase mb-1">Fase 02</div>
                <h3 className="text-lg font-bold text-black font-display mb-4">Akselerasi &amp; Dominasi</h3>
                <div className="text-[10px] font-semibold text-concrete uppercase tracking-wider mb-4">Jangka Menengah (3-5 Tahun)</div>
                <p className="text-concrete text-xs leading-relaxed">
                  Mencapai kapasitas pembangunan dan penjualan 1.000 unit per tahun, memperkuat dominasi pasar properti residensial di regional Sulawesi Selatan, serta meningkatkan volume pendapatan berulang (recurring income) secara signifikan dari portofolio komersial.
                </p>
              </div>

              {/* Fase 3 */}
              <div className="border-t border-black/10 pt-8 flex flex-col">
                <div className="text-xs font-bold text-black font-display uppercase mb-1">Fase 03</div>
                <h3 className="text-lg font-bold text-black font-display mb-4">Ekspansi &amp; Integrasi</h3>
                <div className="text-[10px] font-semibold text-concrete uppercase tracking-wider mb-4">Jangka Panjang (5-10 Tahun)</div>
                <p className="text-concrete text-xs leading-relaxed">
                  Transformasi menyeluruh menjadi pengembang regional berskala nasional, merintis pengembangan kawasan kota mandiri terintegrasi (integrated township), serta memposisikan Satara Group sebagai asset holding company yang terdiversifikasi kuat.
                </p>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 10. CTA PENUTUP (Black Section) */}
      <section className="bg-black py-24 px-6 md:px-12 lg:px-16 border-t border-white/10" id="hubungi">
        <div className="container mx-auto">
          <FadeIn duration={1000} direction="up">
            <div className="bg-white text-black rounded-xl p-8 md:p-16 text-center max-w-4xl mx-auto border border-black/10 shadow-sm">
              <h2 className="text-3xl md:text-4xl font-bold text-black font-display mb-4">
                Kolaborasi Strategis untuk Pertumbuhan Bersama
              </h2>
              <p className="text-concrete text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
                Satara Group mengundang para pemilik lahan potensial, lembaga keuangan, dan mitra strategis untuk bersama-sama menciptakan nilai tambah di atas aset nyata melalui sistem manajemen proyek yang terukur.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="#"
                  className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-transparent hover:text-black border border-black transition-all duration-300 shadow-sm font-display"
                >
                  Ajukan Kerjasama
                </a>
                <a
                  href="#"
                  className="border border-black text-black bg-transparent px-8 py-3 rounded-lg font-medium hover:bg-black hover:text-white transition-all duration-300 font-display"
                >
                  Pertanyaan Umum
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 11. FOOTER (Black Section) */}
      <footer className="bg-black text-gray-400 py-12 px-6 md:px-12 lg:px-16 border-t border-white/10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3.5 mb-2">
              <img src="/logo.png" className="h-7 w-auto shrink-0" alt="Satara Group Logo" />
              <div className="text-xl font-bold text-white font-display">SATARA GROUP</div>
            </div>
            <div className="text-xs text-gray-500">Membangun Ekosistem Bisnis yang Bertumbuh di Atas Aset Nyata</div>
          </div>

          <div className="text-xs text-center md:text-right">
            <div className="mb-2 text-gray-400">Kantor Pusat: Bantaeng, Sulawesi Selatan, Indonesia</div>
            <div className="text-[11px] text-gray-600">&copy; {new Date().getFullYear()} Satara Group. Semua Hak Dilindungi.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
