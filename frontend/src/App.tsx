import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import SurveyPage from './pages/SurveyPage';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <header className="topbar">
        <Link to="/" aria-label="Sahi-Sahi surveys home">
          <img src="/assets/sahi-sahi-logo.png" alt="Sahi-Sahi - Fresh. Fair. Sahi." className="topbar-logo" />
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/customer" element={<SurveyPage kind="customer" />} />
          <Route path="/partner" element={<SurveyPage kind="partner" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} Sahi-Sahi · Fresh. Fair. Sahi.</span>
        <span lang="hi">मंडी के दाम, गुणवत्ता के साथ</span>
        <span>A Product &amp; Service of <strong>Kartavya Ventures</strong></span>
      </footer>
    </>
  );
}
