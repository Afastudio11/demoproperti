import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";

const landingCSS = `
  /* Reset & CSS Variable Definition */
  .landing-body * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .landing-body {
    font-family: 'Inter', sans-serif;
    background-color: #ffffff;
    color: #4a4a4a;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    width: 100%;
    min-height: 100vh;
  }

  /* Typography Utilities */
  .landing-body h1, 
  .landing-body h2, 
  .landing-body h3, 
  .landing-body h4, 
  .landing-body h5, 
  .landing-body h6 {
    font-family: 'Playfair Display', serif;
    color: #333333;
    font-weight: 700;
    line-height: 1.2;
  }

  .landing-body p {
    font-family: 'Inter', sans-serif;
    color: #4a4a4a;
  }

  /* Section & Container Rules */
  .landing-body .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Alternating Background Sections */
  .landing-body section {
    padding: 48px 0; /* Mobile spacing vertical */
  }

  .landing-body section.bg-putih {
    background-color: #ffffff;
  }

  .landing-body section.bg-stone {
    background-color: #f0f0f0;
  }

  /* Desktop Spacing override */
  @media (min-width: 768px) {
    .landing-body section {
      padding: 80px 0;
    }
  }

  /* Badges & Tags */
  .landing-body .badge {
    display: inline-block;
    background-color: #5e6a55;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 6px 12px;
    border-radius: 4px; /* Tag/badge border-radius */
    margin-bottom: 16px;
  }

  /* Buttons */
  .landing-body .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 4px; /* Tombol border-radius */
    transition: all 0.3s ease;
    cursor: pointer;
    text-align: center;
  }

  .landing-body .btn-wood {
    background-color: #8f513a;
    color: #ffffff;
    border: 1px solid #8f513a;
  }

  .landing-body .btn-wood:hover {
    background-color: #333333;
    border-color: #333333;
  }

  .landing-body .btn-outline {
    background-color: transparent;
    color: #333333;
    border: 1px solid #333333;
  }

  .landing-body .btn-outline:hover {
    background-color: #333333;
    color: #ffffff;
  }

  /* Cards generic */
  .landing-body .card {
    background-color: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 12px; /* Card border-radius */
    padding: 24px;
    transition: all 0.3s ease;
  }

  .landing-body .card:hover {
    transform: translateY(-4px);
    border-color: #8e8e8e;
  }

  /* Header & Navigation */
  .landing-body header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: #ffffff;
    border-bottom: 1px solid #f0f0f0;
  }

  .landing-body .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 80px;
  }

  .landing-body .logo {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #333333;
    text-decoration: none;
  }

  .landing-body .nav-menu {
    display: none;
  }

  .landing-body .nav-cta {
    display: none;
  }

  /* Mobile Menu Toggle Button */
  .landing-body .menu-toggle {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 18px;
    background: none;
    border: none;
    cursor: pointer;
  }

  .landing-body .menu-toggle span {
    display: block;
    width: 100%;
    height: 2px;
    background-color: #333333;
    transition: all 0.3s ease;
  }

  /* Mobile active navigation container */
  .landing-body .nav-menu.mobile-menu-active {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 80px;
    left: 0;
    width: 100%;
    background-color: #ffffff;
    border-bottom: 1px solid #f0f0f0;
    padding: 24px;
    gap: 16px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  }

  /* Desktop Navigation Style overrides */
  @media (min-width: 768px) {
    .landing-body .menu-toggle {
      display: none;
    }

    .landing-body .nav-menu {
      display: flex;
      gap: 32px;
    }

    .landing-body .nav-link {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #333333;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .landing-body .nav-link:hover {
      color: #8f513a;
    }

    .landing-body .nav-cta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  /* Hero Section CSS */
  .landing-body .hero-wrapper {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    align-items: center;
  }

  @media (min-width: 768px) {
    .landing-body .hero-wrapper {
      grid-template-columns: 1.1fr 0.9fr;
      gap: 64px;
    }
  }

  .landing-body .hero-content h1 {
    font-size: 32px;
    margin-bottom: 24px;
  }

  @media (min-width: 768px) {
    .landing-body .hero-content h1 {
      font-size: 48px;
      max-width: 580px;
    }
  }

  .landing-body .hero-content p {
    font-size: 16px;
    margin-bottom: 32px;
    color: #4a4a4a;
  }

  .landing-body .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 40px;
  }

  .landing-body .hero-illustration {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f0f0;
    border-radius: 12px;
    padding: 32px;
    border: 1px solid rgba(142, 142, 142, 0.2);
  }

  .landing-body .stats-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .landing-body .stats-container {
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
  }

  .landing-body .stat-card {
    background-color: #f0f0f0;
    border-radius: 12px;
    padding: 24px;
    border: 1px solid rgba(142, 142, 142, 0.2);
  }

  .landing-body .stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 36px;
    color: #8f513a;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 8px;
  }

  .landing-body .stat-lbl {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #4a4a4a;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Visi & Filosofi CSS */
  .landing-body .section-header {
    max-width: 650px;
    margin-bottom: 48px;
  }

  .landing-body .section-header h2 {
    font-size: 28px;
    margin-bottom: 16px;
  }

  @media (min-width: 768px) {
    .landing-body .section-header h2 {
      font-size: 36px;
    }
  }

  .landing-body .section-header p {
    color: #8e8e8e;
    font-size: 16px;
  }

  .landing-body .vision-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (min-width: 768px) {
    .landing-body .vision-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .landing-body .vision-card {
    background-color: #ffffff;
    border: 1px solid rgba(142, 142, 142, 0.3);
    border-radius: 12px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .landing-body .vision-card h3 {
    font-size: 20px;
    margin-bottom: 16px;
    margin-top: 8px;
  }

  .landing-body .vision-card p {
    font-size: 14px;
    color: #4a4a4a;
    flex-grow: 1;
  }

  /* Ekosistem Bisnis CSS */
  .landing-body .ekosistem-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;
    margin-bottom: 40px;
  }

  @media (min-width: 768px) {
    .landing-body .ekosistem-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .landing-body .ekosistem-card {
    background-color: #ffffff;
    border: 1px solid rgba(142, 142, 142, 0.3);
    border-radius: 12px;
    padding: 32px;
  }

  .landing-body .ekosistem-card h3 {
    font-size: 24px;
    margin-top: 8px;
    margin-bottom: 16px;
  }

  .landing-body .ekosistem-entities {
    list-style: none;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }

  .landing-body .ekosistem-entities li {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    margin-bottom: 12px;
    padding-left: 20px;
    position: relative;
  }

  .landing-body .ekosistem-entities li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 9px;
    width: 6px;
    height: 6px;
    background-color: #8f513a;
    border-radius: 50%;
  }

  .landing-body .expansion-card {
    background-color: #f0f0f0;
    border-radius: 8px; /* Component border-radius */
    padding: 24px;
    border: 1px solid rgba(142, 142, 142, 0.2);
  }

  .landing-body .expansion-card h4 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    margin-bottom: 12px;
  }

  .landing-body .expansion-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .landing-body .expansion-tag {
    background-color: #ffffff;
    color: #333333;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 4px; /* Tag/badge border-radius */
    border: 1px solid rgba(142, 142, 142, 0.3);
  }

  /* Portofolio Properti CSS */
  .landing-body .portfolio-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (min-width: 768px) {
    .landing-body .portfolio-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .landing-body .portfolio-card {
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border: 1px solid rgba(142, 142, 142, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }

  .landing-body .portfolio-visual {
    background-color: #f0f0f0;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
  }

  .landing-body .portfolio-info {
    padding: 32px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .landing-body .portfolio-info h3 {
    font-size: 22px;
    margin-top: 8px;
    margin-bottom: 16px;
  }

  .landing-body .portfolio-info p {
    font-size: 14px;
    color: #4a4a4a;
    margin-bottom: 24px;
    flex-grow: 1;
  }

  /* Framework Pengembangan Proyek CSS (Timeline) */
  .landing-body .timeline-container {
    position: relative;
    margin: 40px auto 0 auto;
    padding-left: 32px;
  }

  .landing-body .timeline-container::before {
    content: "";
    position: absolute;
    top: 0;
    left: 7px;
    bottom: 0;
    width: 2px;
    background-color: #f0f0f0;
  }

  .landing-body .timeline-step {
    position: relative;
    margin-bottom: 40px;
  }

  .landing-body .timeline-step:last-child {
    margin-bottom: 0;
  }

  .landing-body .timeline-node {
    position: absolute;
    left: -32px;
    top: 4px;
    width: 16px;
    height: 16px;
    background-color: #ffffff;
    border: 3px solid #8f513a;
    border-radius: 50%;
    z-index: 2;
  }

  .landing-body .timeline-content {
    background-color: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 8px; /* Component border-radius */
    padding: 20px;
    transition: all 0.3s ease;
  }

  .landing-body .timeline-content:hover {
    border-color: #8f513a;
    transform: translateX(4px);
  }

  .landing-body .timeline-num {
    font-family: 'Playfair Display', serif;
    font-size: 13px;
    font-weight: 700;
    color: #8f513a;
    margin-bottom: 4px;
  }

  .landing-body .timeline-content h3 {
    font-size: 18px;
    margin-bottom: 8px;
  }

  .landing-body .timeline-content p {
    font-size: 14px;
    color: #4a4a4a;
  }

  @media (min-width: 768px) {
    .landing-body .timeline-container {
      padding-left: 0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }

    .landing-body .timeline-container::before {
      display: none;
    }

    .landing-body .timeline-step {
      margin-bottom: 0;
    }

    .landing-body .timeline-node {
      position: relative;
      left: 0;
      top: 0;
      margin-bottom: 16px;
    }

    .landing-body .timeline-content {
      border-top: 3px solid #f0f0f0;
      border-radius: 8px;
      height: calc(100% - 32px);
    }

    .landing-body .timeline-content:hover {
      border-color: #8f513a;
      transform: translateY(-4px);
    }
  }

  /* Struktur Organisasi Holding CSS */
  .landing-body .structure-wrapper {
    background-color: #ffffff;
    border: 1px solid rgba(142, 142, 142, 0.3);
    border-radius: 12px;
    padding: 32px;
  }

  .landing-body .structure-info {
    text-align: center;
    max-width: 700px;
    margin: 0 auto 40px auto;
  }

  .landing-body .structure-info p {
    font-size: 14px;
    color: #4a4a4a;
  }

  .landing-body .structure-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }

  .landing-body .chart-node {
    background-color: #f0f0f0;
    border: 1px solid rgba(142, 142, 142, 0.3);
    border-radius: 8px;
    padding: 20px;
    width: 100%;
    max-width: 280px;
    text-align: center;
  }

  .landing-body .chart-node.ceo {
    background-color: #ffffff;
    border: 2px solid #8f513a;
  }

  .landing-body .node-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 700;
    color: #333333;
    margin-bottom: 4px;
  }

  .landing-body .node-name {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #4a4a4a;
  }

  .landing-body .chart-children {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    width: 100%;
  }

  @media (min-width: 768px) {
    .landing-body .chart-children {
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
  }

  /* Sistem Reporting & Kontrol CSS */
  .landing-body .control-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (min-width: 768px) {
    .landing-body .control-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .landing-body .control-card {
    background-color: #f0f0f0;
    border: 1px solid rgba(142, 142, 142, 0.2);
    border-radius: 12px;
    padding: 32px;
    transition: all 0.3s ease;
  }

  .landing-body .control-card:hover {
    border-color: #8f513a;
  }

  .landing-body .control-card h3 {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .landing-body .control-card p {
    font-size: 14px;
    color: #4a4a4a;
  }

  /* Roadmap Pertumbuhan CSS */
  .landing-body .roadmap-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (min-width: 768px) {
    .landing-body .roadmap-container {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .landing-body .roadmap-card {
    background-color: #ffffff;
    border: 1px solid rgba(142, 142, 142, 0.3);
    border-radius: 12px;
    padding: 32px;
    position: relative;
  }

  .landing-body .roadmap-phase {
    font-family: 'Playfair Display', serif;
    font-size: 13px;
    font-weight: 700;
    color: #8f513a;
    margin-bottom: 8px;
  }

  .landing-body .roadmap-card h3 {
    font-size: 20px;
    margin-bottom: 16px;
  }

  .landing-body .roadmap-card p {
    font-size: 14px;
    color: #4a4a4a;
  }

  /* CTA Penutup CSS */
  .landing-body .cta-card {
    background-color: #f0f0f0;
    border-radius: 12px;
    padding: 40px 24px;
    text-align: center;
    border: 1px solid rgba(142, 142, 142, 0.2);
  }

  @media (min-width: 768px) {
    .landing-body .cta-card {
      padding: 64px 48px;
      max-width: 800px;
      margin: 0 auto;
    }
  }

  .landing-body .cta-card h2 {
    font-size: 28px;
    margin-bottom: 16px;
  }

  @media (min-width: 768px) {
    .landing-body .cta-card h2 {
      font-size: 36px;
    }
  }

  .landing-body .cta-card p {
    font-size: 16px;
    color: #4a4a4a;
    max-width: 600px;
    margin: 0 auto 32px auto;
  }

  .landing-body .cta-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }

  /* Footer CSS */
  .landing-body footer {
    background-color: #333333;
    color: #8e8e8e;
    padding: 40px 0;
    border-top: 1px solid #333333;
  }

  .landing-body .footer-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    text-align: center;
  }

  @media (min-width: 768px) {
    .landing-body .footer-container {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
  }

  .landing-body .footer-logo {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 18px;
    color: #ffffff;
    letter-spacing: 0.5px;
  }

  .landing-body .footer-info {
    font-size: 13px;
    font-family: 'Inter', sans-serif;
  }

  .landing-body .footer-copy {
    font-size: 12px;
    color: #8e8e8e;
  }
`;

export default function LandingPage() {
  const { user } = useAuth();
  const [menuActive, setMenuActive] = useState(false);

  function toggleMenu() {
    setMenuActive(!menuActive);
  }

  return (
    <div className="landing-body">
      <style dangerouslySetInnerHTML={{ __html: landingCSS }} />

      {/* 1. NAVIGASI */}
      <header>
        <div className="container nav-container">
          <a href="#" className="logo">SATARA GROUP</a>
          
          <nav className={`nav-menu ${menuActive ? "mobile-menu-active" : ""}`} id="navMenu">
            <a href="#ekosistem" className="nav-link" onClick={() => setMenuActive(false)}>Ekosistem</a>
            <a href="#proyek" className="nav-link" onClick={() => setMenuActive(false)}>Proyek</a>
            <a href="#struktur" className="nav-link" onClick={() => setMenuActive(false)}>Struktur</a>
            <a href="#roadmap" className="nav-link" onClick={() => setMenuActive(false)}>Roadmap</a>
            {/* Nav link visible only on mobile inside toggle menu */}
            {menuActive && (
              user ? (
                <Link href="/dashboard" className="nav-link" onClick={() => setMenuActive(false)}>Dashboard</Link>
              ) : (
                <Link href="/dashboard" className="nav-link" onClick={() => setMenuActive(false)}>Masuk</Link>
              )
            )}
          </nav>

          <div className="nav-cta">
            {user ? (
              <Link href="/dashboard" className="btn btn-outline">Dashboard</Link>
            ) : (
              <Link href="/dashboard" className="btn btn-outline">Masuk</Link>
            )}
            <a href="#hubungi" className="btn btn-wood">Hubungi Kami</a>
          </div>

          <button className="menu-toggle" id="menuToggle" aria-label="Toggle Menu" onClick={toggleMenu}>
            <span style={menuActive ? { transform: "rotate(45deg) translate(5px, 5px)" } : undefined}></span>
            <span style={menuActive ? { opacity: "0" } : undefined}></span>
            <span style={menuActive ? { transform: "rotate(-45deg) translate(5px, -5px)" } : undefined}></span>
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="bg-putih">
        <div className="container">
          <div className="hero-wrapper">
            <div className="hero-content">
              <h1>Membangun Ekosistem Bisnis yang Bertumbuh di Atas Aset Nyata</h1>
              <p>Satara Group mengintegrasikan pengembangan properti strategis dan industri kreatif fashion untuk menghasilkan pertumbuhan modal berkelanjutan. Melalui tata kelola holding yang disiplin, kami mentransformasikan aset fisik menjadi ekosistem bisnis yang menghasilkan arus kas berulang dan nilai jangka panjang.</p>
              <div className="hero-actions">
                <a href="#proyek" className="btn btn-wood">Jelajahi Proyek</a>
                <a href="#hubungi" className="btn btn-outline">Unduh Company Profile</a>
              </div>
            </div>
            
            <div className="hero-illustration">
              <svg width="100%" height="320" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: "100%" }}>
                {/* Grid background lines */}
                <path d="M 0,40 L 400,40 M 0,80 L 400,80 M 0,120 L 400,120 M 0,160 L 400,160 M 0,200 L 400,200 M 0,240 L 400,240 M 0,280 L 400,280" stroke="#ffffff" strokeWidth="1" />
                <path d="M 40,0 L 40,320 M 80,0 L 80,320 M 120,0 L 120,320 M 160,0 L 160,320 M 200,0 L 200,320 M 240,0 L 240,320 M 280,0 L 280,320 M 320,0 L 320,320 M 360,0 L 360,320" stroke="#ffffff" strokeWidth="1" />
                
                {/* Isometric architectural/fashion blocks */}
                <rect x="70" y="100" width="120" height="150" rx="8" stroke="#333333" strokeWidth="2" fill="#ffffff" />
                <rect x="130" y="60" width="140" height="190" rx="8" stroke="#5e6a55" strokeWidth="2" fill="#ffffff" fillOpacity="0.95" />
                <rect x="210" y="140" width="100" height="110" rx="8" stroke="#8f513a" strokeWidth="2" fill="#ffffff" fillOpacity="0.95" />
                
                {/* Curve flow line representing fashion */}
                <path d="M 40,210 C 120,170 200,270 360,150" stroke="#8f513a" strokeWidth="3" strokeLinecap="round" />
                <path d="M 50,230 C 130,190 210,290 370,170" stroke="#8e8e8e" strokeWidth="1.5" strokeDasharray="4 4" />
                
                {/* Window details */}
                <line x1="90" y1="130" x2="160" y2="130" stroke="#8e8e8e" strokeWidth="1.5" />
                <line x1="90" y1="160" x2="160" y2="160" stroke="#8e8e8e" strokeWidth="1.5" />
                <line x1="90" y1="190" x2="160" y2="190" stroke="#8e8e8e" strokeWidth="1.5" />
                
                <line x1="150" y1="90" x2="250" y2="90" stroke="#8e8e8e" strokeWidth="1.5" />
                <line x1="150" y1="120" x2="250" y2="120" stroke="#8e8e8e" strokeWidth="1.5" />
                <line x1="150" y1="150" x2="250" y2="150" stroke="#8e8e8e" strokeWidth="1.5" />
                
                {/* Focal points */}
                <circle cx="270" cy="100" r="16" stroke="#8f513a" strokeWidth="1.5" strokeDasharray="2 2" />
                <circle cx="270" cy="100" r="4" fill="#8f513a" />
              </svg>
            </div>
          </div>
          
          {/* Key Statistics Horizontal Grid */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-val">24</div>
              <div className="stat-lbl">Kabupaten Target Ekspansi Sulawesi Selatan</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">±34%</div>
              <div className="stat-lbl">Target Rasio Profitabilitas Margin Developer</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">1.000</div>
              <div className="stat-lbl">Target Unit per Tahun pada Fase Jangka Menengah</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VISI & FILOSOFI */}
      <section className="bg-stone" id="filosofi">
        <div className="container">
          <div className="section-header">
            <span className="badge">Visi dan Filosofi</span>
            <h2>Landasan Fundamental Operasional Kami</h2>
            <p>Prinsip bisnis jangka panjang yang menyeimbangkan antara ekspansi agresif dengan kehati-hatian finansial.</p>
          </div>

          <div className="vision-grid">
            {/* Kartu 1: Vision Statement */}
            <div className="vision-card">
              <span className="badge" style={{ alignSelf: "flex-start" }}>Pilar Utama</span>
              <h3>Vision Statement</h3>
              <p>Menjadi holding company terkemuka yang membangun ekosistem bisnis terintegrasi melalui pilar properti, fashion, dan manajemen aset guna menghasilkan pendapatan berulang (recurring income) yang kokoh dan berkelanjutan.</p>
            </div>

            {/* Kartu 2: Core Philosophy */}
            <div className="vision-card">
              <span className="badge" style={{ alignSelf: "flex-start" }}>Metodologi</span>
              <h3>Core Philosophy</h3>
              <p>Pembangunan berkelanjutan (sustainable development) didukung oleh efisiensi modal yang disiplin dan mitigasi risiko yang ketat pada setiap tahap akuisisi serta pengembangan aset.</p>
            </div>

            {/* Kartu 3: Corporate Values */}
            <div className="vision-card">
              <span className="badge" style={{ alignSelf: "flex-start" }}>Kriteria Utama</span>
              <h3>Corporate Values</h3>
              <p>Membangun bisnis yang scalable (dapat ditingkatkan), systemized (terstandardisasi dengan SOP ketat), dan integrated (saling mendukung dalam ekosistem Satara Group) untuk menjamin keberlanjutan usaha jangka panjang.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. EKOSISTEM BISNIS */}
      <section className="bg-putih" id="ekosistem">
        <div className="container">
          <div className="section-header">
            <span className="badge">Struktur Bisnis</span>
            <h2>Ekosistem Dua Pilar Satara Group</h2>
            <p>Sinergi strategis antara infrastruktur fisik dan industri kreatif untuk mengoptimalkan potensi pasar.</p>
          </div>

          <div className="ekosistem-grid">
            {/* Satara Development */}
            <div className="ekosistem-card">
              <span className="badge">Property Pilar</span>
              <h3>Satara Development</h3>
              <p>Pilar utama pengembangan properti yang berfokus pada penyediaan hunian berkualitas tinggi, kawasan komersial terpadu, dan pengelolaan aset strategis di Sulawesi Selatan.</p>
              <ul className="ekosistem-entities">
                <li>PT Berkah Bintang Pratama</li>
                <li>PT Satara Property</li>
              </ul>
            </div>

            {/* Satara Fashion */}
            <div className="ekosistem-card">
              <span className="badge">Creative Pilar</span>
              <h3>Satara Fashion</h3>
              <p>Divisi industri kreatif yang bergerak di bidang retail fashion modern dengan pendekatan desain kontemporer dan sistem distribusi berbasis teknologi.</p>
              <ul className="ekosistem-entities">
                <li>Sekala</li>
                <li>Senada</li>
              </ul>
            </div>
          </div>

          {/* Future Expansion */}
          <div className="expansion-card">
            <h4>Future Expansion</h4>
            <p style={{ fontSize: "14px", marginBottom: "16px" }}>Jalur pertumbuhan masa depan kami mencakup ekspansi ke sektor berikut guna memperkuat portofolio pendapatan berulang:</p>
            <div className="expansion-tags">
              <span className="expansion-tag">Hospitality</span>
              <span className="expansion-tag">Commercial Area</span>
              <span className="expansion-tag">Asset Management</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PORTOFOLIO PROPERTI */}
      <section className="bg-stone" id="proyek">
        <div className="container">
          <div className="section-header">
            <span className="badge">Portofolio</span>
            <h2>Aset Nyata yang Telah Dikembangkan</h2>
            <p>Infrastruktur properti yang menjawab kebutuhan perumahan rakyat, hiburan komersial, dan instrumen investasi.</p>
          </div>

          <div className="portfolio-grid">
            {/* Proyek 1 */}
            <div className="portfolio-card">
              <div className="portfolio-visual">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 110H110" stroke="#8f513a" strokeWidth="2" strokeLinecap="round" />
                  <path d="M20 110V50L60 20L100 50V110" stroke="#333333" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M45 110V80H75V110" stroke="#8e8e8e" strokeWidth="2" strokeLinejoin="round" />
                  <rect x="35" y="55" width="16" height="16" stroke="#8e8e8e" strokeWidth="2" />
                  <rect x="69" y="55" width="16" height="16" stroke="#8e8e8e" strokeWidth="2" />
                </svg>
              </div>
              <div className="portfolio-info">
                <span className="badge" style={{ alignSelf: "flex-start" }}>Flagship Project</span>
                <h3>SN Residence 1-4 {"&"} SHM Project</h3>
                <p>Proyek perumahan flagship kami yang berlokasi strategis di Kabupaten Bantaeng. Dirancang khusus untuk mendukung skema pembiayaan MBR (Masyarakat Berpenghasilan Rendah) dengan legalitas Sertifikat Hak Milik (SHM) yang lengkap sejak awal.</p>
              </div>
            </div>

            {/* Proyek 2 */}
            <div className="portfolio-card">
              <div className="portfolio-visual">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 110H115" stroke="#8f513a" strokeWidth="2" strokeLinecap="round" />
                  <path d="M15 110V65L40 45L65 65V110" stroke="#333333" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M65 110V75L85 60L105 75V110" stroke="#5e6a55" strokeWidth="2" strokeLinejoin="round" />
                  <rect x="30" y="75" width="16" height="20" stroke="#8e8e8e" strokeWidth="2" />
                  <rect x="77" y="85" width="12" height="14" stroke="#8e8e8e" strokeWidth="2" />
                </svg>
              </div>
              <div className="portfolio-info">
                <span className="badge" style={{ alignSelf: "flex-start" }}>Community Housing</span>
                <h3>Roemah Warga</h3>
                <p>Konsep hunian komunitas berdensitas sedang yang dirancang khusus untuk perluasan regional di wilayah Sulawesi Selatan. Mengutamakan integrasi tata ruang sosial, jalan lingkungan yang memadai, dan akses fasilitas dasar bersama.</p>
              </div>
            </div>

            {/* Proyek 3 */}
            <div className="portfolio-card">
              <div className="portfolio-visual">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 110H110" stroke="#8f513a" strokeWidth="2" strokeLinecap="round" />
                  <path d="M25 110V40H95V110" stroke="#333333" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M25 40L60 15L95 40" stroke="#8f513a" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M50 110V85H70V110" stroke="#8e8e8e" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="60" cy="55" r="8" stroke="#8e8e8e" strokeWidth="2" />
                </svg>
              </div>
              <div className="portfolio-info">
                <span className="badge" style={{ alignSelf: "flex-start" }}>Leisure {"&"} Hospitality</span>
                <h3>Villa Sinoa</h3>
                <p>Destinasi peristirahatan privat yang berlokasi di dataran tinggi Sinoa. Mengusung konsep arsitektur tropis yang menyatu dengan bentang alam sekitar, dikelola secara profesional untuk memaksimalkan yield pendapatan berulang.</p>
              </div>
            </div>

            {/* Proyek 4 */}
            <div className="portfolio-card">
              <div className="portfolio-visual">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 110H115" stroke="#8f513a" strokeWidth="2" strokeLinecap="round" />
                  <rect x="15" y="30" width="40" height="80" stroke="#333333" strokeWidth="2" />
                  <rect x="65" y="50" width="40" height="60" stroke="#5e6a55" strokeWidth="2" />
                  <path d="M30 110V95H40V110" stroke="#8e8e8e" strokeWidth="2" />
                  <path d="M80 110V95H90V110" stroke="#8e8e8e" strokeWidth="2" />
                  <rect x="25" y="45" width="20" height="15" stroke="#8e8e8e" strokeWidth="2" />
                  <rect x="25" y="70" width="20" height="15" stroke="#8e8e8e" strokeWidth="2" />
                  <rect x="75" y="65" width="20" height="15" stroke="#8e8e8e" strokeWidth="2" />
                </svg>
              </div>
              <div className="portfolio-info">
                <span className="badge" style={{ alignSelf: "flex-start" }}>Commercial Asset</span>
                <h3>Rumah Bernyanyi {"&"} Kost/Rental</h3>
                <p>Pengembangan properti komersial bernilai ekonomi tinggi di pusat kota. Menggabungkan sarana hiburan keluarga sehat dengan kompleks hunian sewa (kost eksekutif) untuk mengamankan arus kas operasional harian dan bulanan secara stabil.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FRAMEWORK PENGEMBANGAN PROYEK */}
      <section className="bg-putih" id="framework">
        <div className="container">
          <div className="section-header">
            <span className="badge">Metodologi Kerja</span>
            <h2>Framework Pembangunan Proyek</h2>
            <p>Siklus operasional delapan tahap yang sistematis dari proses akuisisi lahan hingga manajemen purna jual.</p>
          </div>

          <div className="timeline-container">
            {/* Tahap 1 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 01</div>
                <h3>Pencarian Lahan</h3>
                <p>Land banking taktis, negosiasi langsung dengan pemilik lahan, serta pemetaan potensi lokasi strategis.</p>
              </div>
            </div>

            {/* Tahap 2 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 02</div>
                <h3>Feasibility Study</h3>
                <p>Pembuatan masterplan, siteplan terperinci, proyeksi keuangan (forecasting), dan penganggaran ketat.</p>
              </div>
            </div>

            {/* Tahap 3 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 03</div>
                <h3>Legal {"&"} Perizinan</h3>
                <p>Pengurusan Sertifikat Hak Milik (SHM), Akta Jual Beli (AJB), Persetujuan Bangunan Gedung (PBG), kerja sama legal perbankan, dan dukungan proses akad.</p>
              </div>
            </div>

            {/* Tahap 4 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 04</div>
                <h3>Marketing Opening</h3>
                <p>Strategi perolehan prospek konsumen (lead generation), pengelolaan corong penjualan (sales funnel), and pembukaan pemesanan unit (booking).</p>
              </div>
            </div>

            {/* Tahap 5 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 05</div>
                <h3>Pembangunan</h3>
                <p>Kontrol kualitas konstruksi (quality control), pengawasan kemajuan fisik di lapangan, serta manajemen mandor yang terukur.</p>
              </div>
            </div>

            {/* Tahap 6 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 06</div>
                <h3>Akad</h3>
                <p>Titik krusial masuknya arus kas (cash inflow) dan percepatan siklus konversi kas (cash conversion cycle).</p>
              </div>
            </div>

            {/* Tahap 7 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 07</div>
                <h3>Serah Terima</h3>
                <p>Penyerahan unit properti secara resmi kepada konsumen (handover unit) dilengkapi dokumentasi berita acara akhir.</p>
              </div>
            </div>

            {/* Tahap 8 */}
            <div className="timeline-step">
              <div className="timeline-node"></div>
              <div className="timeline-content">
                <div className="timeline-num">Tahap 08</div>
                <h3>After Sales</h3>
                <p>Pengelolaan keluhan konsumen, pemberian garansi konstruksi fisik, dan pelayanan purna jual yang berkelanjutan.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. STRUKTUR ORGANISASI HOLDING */}
      <section className="bg-stone" id="struktur">
        <div className="container">
          <div className="section-header">
            <span className="badge">Tata Kelola</span>
            <h2>Struktur Organisasi Holding</h2>
            <p>Penyelarasan peran strategis untuk memastikan tata kelola terpadu dan efisiensi pengambilan keputusan.</p>
          </div>

          <div className="structure-wrapper">
            <div className="structure-info">
              <p>Holding company Satara Group berfokus penuh pada fungsi governance (tata kelola perusahaan) dan scaling (peningkatan skala bisnis secara strategis), sementara aktivitas operasional taktis didelegasikan secara mandiri kepada anak perusahaan.</p>
            </div>

            <div className="structure-chart">
              {/* CEO */}
              <div className="chart-node ceo">
                <div className="node-title">CEO / Founder</div>
                <div className="node-name">A. Arya Setiawan Junior</div>
              </div>

              {/* Tiga Garis Hubung Vertikal & Horizontal via CSS Grid */}
              <div className="chart-children">
                {/* Fungsi 1 */}
                <div className="chart-node">
                  <div className="node-title">HRGA</div>
                  <div className="node-name">Gilang</div>
                </div>

                {/* Fungsi 2 */}
                <div className="chart-node">
                  <div className="node-title">Finance</div>
                  <div className="node-name">Zaskia {"&"} Annisa</div>
                </div>

                {/* Fungsi 3 */}
                <div className="chart-node">
                  <div className="node-title">Branding</div>
                  <div className="node-name">Mahdi</div>
                </div>

                {/* Fungsi 4 */}
                <div className="chart-node">
                  <div className="node-title">Strategic Control</div>
                  <div className="node-name">Holding Oversight</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SISTEM REPORTING & KONTROL */}
      <section className="bg-putih">
        <div className="container">
          <div className="section-header">
            <span className="badge">Sistem Kontrol</span>
            <h2>Mekanisme Pengendalian Kinerja</h2>
            <p>Disiplin reporting yang ketat untuk menjamin transparansi data keuangan dan operasional secara periodik.</p>
          </div>

          <div className="control-grid">
            {/* Card 1 */}
            <div className="control-card">
              <span className="badge" style={{ backgroundColor: "#8f513a" }}>Mingguan</span>
              <h3>Weekly Report</h3>
              <p>Evaluasi mingguan terpadu di seluruh divisi operasional anak perusahaan untuk memantau kemajuan pembangunan fisik, pencapaian penjualan harian, dan penyelesaian administrasi legal secara real-time.</p>
            </div>

            {/* Card 2 */}
            <div className="control-card">
              <span className="badge" style={{ backgroundColor: "#8f513a" }}>Bulanan</span>
              <h3>Monthly Board Review</h3>
              <p>Penilaian bulanan jajaran direksi terhadap kesehatan arus kas (cashflow), pergerakan siklus konversi kas, kemajuan target perizinan daerah, serta evaluasi komparatif performa antardivisi.</p>
            </div>

            {/* Card 3 */}
            <div className="control-card">
              <span className="badge" style={{ backgroundColor: "#8f513a" }}>Terintegrasi</span>
              <h3>Cross-Division KPI Dashboard</h3>
              <p>Papan instrumen digital terpusat yang mengintegrasikan data Key Performance Indicator lintas divisi utama (Sales, Produksi, Legal, dan Finance) guna mengantisipasi hambatan operasional sedini mungkin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ROADMAP PERTUMBUHAN */}
      <section className="bg-stone" id="roadmap">
        <div className="container">
          <div className="section-header">
            <span className="badge">Rencana Kerja</span>
            <h2>Roadmap Pertumbuhan Satara Group</h2>
            <p>Tahapan strategis jangka pendek hingga panjang untuk merealisasikan dominasi pasar dan perluasan portofolio.</p>
          </div>

          <div className="roadmap-container">
            {/* Fase 1 */}
            <div className="roadmap-card">
              <div className="roadmap-phase">Fase 01</div>
              <h3>Stabilisasi {"&"} Sistem</h3>
              <p style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "12px", fontWeight: "600" }}>JANGKA PENDEK (1-2 TAHUN)</p>
              <p>Fokus pada stabilisasi tata kelola manajemen internal, penyusunan Standar Operasional Prosedur (SOP) terstandardisasi di seluruh anak perusahaan, peluncuran KPI dashboard terpadu, serta inisiasi ekspansi awal proyek perumahan regional di kabupaten sekitar.</p>
            </div>

            {/* Fase 2 */}
            <div className="roadmap-card">
              <div className="roadmap-phase">Fase 02</div>
              <h3>Akselerasi {"&"} Dominasi</h3>
              <p style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "12px", fontWeight: "600" }}>JANGKA MENENGAH (3-5 TAHUN)</p>
              <p>Mencapai kapasitas pembangunan dan penjualan 1.000 unit per tahun, memperkuat dominasi pasar properti residensial di regional Sulawesi Selatan, serta meningkatkan volume pendapatan berulang (recurring income) secara signifikan dari portofolio komersial.</p>
            </div>

            {/* Fase 3 */}
            <div className="roadmap-card">
              <div className="roadmap-phase">Fase 03</div>
              <h3>Ekspansi {"&"} Integrasi</h3>
              <p style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "12px", fontWeight: "600" }}>JANGKA PANJANG (5-10 TAHUN)</p>
              <p>Transformasi menyeluruh menjadi pengembang regional berskala nasional, merintis pengembangan kawasan kota mandiri terintegrasi (integrated township), serta memposisikan Satara Group sebagai asset holding company yang terdiversifikasi kuat.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CTA PENUTUP */}
      <section className="bg-putih" id="hubungi">
        <div className="container">
          <div className="cta-card">
            <h2>Kolaborasi Strategis untuk Pertumbuhan Bersama</h2>
            <p>Satara Group mengundang para pemilik lahan potensial, lembaga keuangan, dan mitra strategis untuk bersama-sama menciptakan nilai tambah di atas aset nyata melalui sistem manajemen proyek yang terukur.</p>
            <div className="cta-buttons">
              <a href="#" className="btn btn-wood">Ajukan Kerjasama</a>
              <a href="#" className="btn btn-outline">Pertanyaan Umum</a>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer>
        <div className="container footer-container">
          <div>
            <div className="footer-logo">SATARA GROUP</div>
            <div className="footer-info" style={{ marginTop: "8px" }}>Membangun Ekosistem Bisnis yang Bertumbuh di Atas Aset Nyata</div>
          </div>
          
          <div style={{ marginTop: "20px", marginBottom: "20px", textAlign: "center", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
            Kantor Pusat: Bantaeng, Sulawesi Selatan, Indonesia
          </div>

          <div>
            <div className="footer-copy">© {new Date().getFullYear()} Satara Group. Semua Hak Dilindungi.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
