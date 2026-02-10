"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  // Scroll handler for nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll(".anim").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w: number, h: number;
    let af: number | null = null;
    let time = 0;
    interface Shape {
      x: number; y: number; size: number; speed: number;
      angle: number; rotSpeed: number; opacity: number; type: string;
    }
    let shapes: Shape[] = [];

    function resize() {
      w = canvas!.width = canvas!.offsetWidth;
      h = canvas!.height = canvas!.offsetHeight;
      shapes = [];
      const n = Math.min(Math.floor((w * h) / 25000), 40);
      for (let i = 0; i < n; i++) {
        shapes.push({
          x: Math.random() * w, y: Math.random() * h,
          size: Math.random() * 20 + 10, speed: Math.random() * 0.3 + 0.1,
          angle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.005,
          opacity: Math.random() * 0.08 + 0.02, type: Math.random() > 0.5 ? "rect" : "diamond",
        });
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      time += 0.01;
      shapes.forEach((s) => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        s.angle += s.rotSpeed;
        if (s.type === "rect") {
          ctx.strokeStyle = `rgba(123, 47, 247, ${s.opacity})`;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
          const inner = s.size * 0.3;
          ctx.fillStyle = `rgba(255, 47, 237, ${s.opacity * 0.5})`;
          ctx.fillRect(-inner / 2, -inner / 2, inner, inner);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -s.size / 2);
          ctx.lineTo(s.size / 2, 0);
          ctx.lineTo(0, s.size / 2);
          ctx.lineTo(-s.size / 2, 0);
          ctx.closePath();
          ctx.strokeStyle = `rgba(255, 47, 237, ${s.opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.restore();
        s.y -= s.speed;
        s.x += Math.sin(time + s.size) * 0.2;
        if (s.y < -s.size) { s.y = h + s.size; s.x = Math.random() * w; }
      });
      const scanY = (Math.sin(time * 0.5) * 0.5 + 0.5) * h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, "rgba(123, 47, 247, 0)");
      scanGrad.addColorStop(0.5, "rgba(123, 47, 247, 0.03)");
      scanGrad.addColorStop(1, "rgba(123, 47, 247, 0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, w, 60);
      af = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    const heroObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { if (!af) draw(); }
          else { if (af) cancelAnimationFrame(af); af = null; }
        });
      },
      { threshold: 0 }
    );
    if (heroRef.current) heroObs.observe(heroRef.current);

    return () => {
      window.removeEventListener("resize", resize);
      if (af) cancelAnimationFrame(af);
      heroObs.disconnect();
    };
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: "smooth" });
    setMenuOpen(false);
  }, []);

  const navLinks = [
    { label: "El problema", id: "problem" },
    { label: "Cómo funciona", id: "how" },
    { label: "Funciones", id: "features" },
    { label: "Seguridad", id: "security" },
    { label: "Contacto", id: "contact" },
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-[#8a8aa0] font-sans overflow-x-hidden" style={{ lineHeight: 1.7 }}>
      {/* ═══ NAV ═══ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-500 ${
          scrolled
            ? "bg-[#050508]/80 backdrop-blur-[20px] border-b border-white/[0.06] py-2.5"
            : "py-4"
        }`}
      >
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[1.1rem] text-[#f0f0f5]">
            <div className="w-[30px] h-[30px]">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="url(#lgNav)" strokeWidth="1.5" fill="none"/>
                <path d="M15 17L20 13L25 17V23L20 27L15 23Z" fill="url(#lgNav)"/>
                <defs><linearGradient id="lgNav" x1="6" y1="4" x2="34" y2="36"><stop stopColor="#7b2ff7"/><stop offset="1" stopColor="#ff2fed"/></linearGradient></defs>
              </svg>
            </div>
            <span>Nova<em className="not-italic text-[#ff2fed]">Pay</em></span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex gap-7">
            {navLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-[0.875rem] text-[#8a8aa0] hover:text-[#f0f0f5] transition-colors relative group"
              >
                {l.label}
                <span className="absolute bottom-[-4px] left-0 w-0 h-[1px] bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-[0.85rem] text-[#8a8aa0] hover:text-[#f0f0f5] transition-colors">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-[0.85rem] font-medium px-5 py-2 rounded-[10px] text-white transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #7b2ff7, #ff2fed)" }}
            >
              Registrar negocio
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="flex md:hidden flex-col gap-[5px] p-2 z-[1001]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={`block w-[22px] h-[2px] bg-[#f0f0f5] rounded-sm transition-all ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block w-[22px] h-[2px] bg-[#f0f0f5] rounded-sm transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-[22px] h-[2px] bg-[#f0f0f5] rounded-sm transition-all ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fixed inset-0 bg-[#050508]/95 backdrop-blur-[20px] flex flex-col justify-center items-center gap-7 z-[999] md:hidden">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="text-[1.2rem] text-[#8a8aa0] hover:text-[#f0f0f5]">
                {l.label}
              </button>
            ))}
            <Link href="/login" className="text-[1rem] text-[#8a8aa0]" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
            <Link href="/register" className="btn-primary !py-3 !px-8" onClick={() => setMenuOpen(false)}>Registrar negocio</Link>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="min-h-screen flex items-center justify-center relative overflow-hidden pt-[120px] pb-20 px-5" id="hero">
        <div className="absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30" />
          <div className="absolute w-[450px] h-[450px] rounded-full blur-[120px] bg-[rgba(123,47,247,0.07)] top-[10%] right-[20%] animate-float-slow" />
          <div className="absolute w-[350px] h-[350px] rounded-full blur-[120px] bg-[rgba(255,47,237,0.05)] bottom-[15%] left-[15%] animate-float" />
        </div>
        <div className="relative z-10 text-center max-w-[720px]">
          <div className="anim inline-flex items-center gap-2 font-mono text-[0.72rem] tracking-[0.06em] text-[#ff2fed] bg-[rgba(255,47,237,0.06)] border border-[rgba(255,47,237,0.1)] px-[18px] py-[7px] rounded-full mb-7">
            <span className="w-[6px] h-[6px] bg-[#ff2fed] rounded-full animate-pulse-glow" />
            Pasarela de pagos crypto
          </div>
          <h1 className="anim text-[clamp(2.4rem,5.5vw,4.2rem)] font-extrabold text-[#f0f0f5] leading-[1.1] tracking-[-0.04em] mb-5">
            Tu negocio acepta crypto.<br />
            <span className="bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent">Tú recibes pesos.</span>
          </h1>
          <p className="anim text-[clamp(1rem,1.6vw,1.15rem)] text-[#8a8aa0] max-w-[540px] mx-auto mb-9">
            Tus clientes pagan con criptomonedas y tú recibes pesos mexicanos directamente en tu cuenta bancaria. Sin volatilidad. Sin complicaciones.
          </p>
          <div className="anim flex items-center justify-center gap-3.5 flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[0.9375rem] font-medium text-white transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #7b2ff7, #ff2fed)" }}
            >
              <span>Registrar mi negocio</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <button
              onClick={() => scrollTo("how")}
              className="px-7 py-3.5 rounded-xl text-[0.9375rem] font-medium text-[#8a8aa0] border border-white/[0.06] bg-white/[0.025] backdrop-blur-xl hover:border-white/[0.12] hover:text-[#f0f0f5] hover:-translate-y-0.5 transition-all"
            >
              Ver cómo funciona
            </button>
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM / SOLUTION ═══ */}
      <section className="py-[clamp(80px,12vw,160px)]" id="problem">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(32px,5vw,64px)]">
            <div className="anim">
              <span className="inline-block font-mono text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[#55556a] bg-white/[0.03] border border-white/[0.06] px-3.5 py-[5px] rounded-full mb-4">El problema</span>
              <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#f0f0f5] leading-[1.2] tracking-[-0.02em] mb-3">Tus clientes quieren pagar con crypto...</h2>
              <p className="text-[0.95rem] mb-5 leading-[1.8]">Cada vez más personas en México tienen criptomonedas. Quieren usarlas para pagar, pero los comercios no tienen forma fácil de aceptarlas.</p>
              <ul className="flex flex-col gap-2.5">
                {["Manejar wallets es complicado", "La volatilidad asusta", "Convertir crypto a pesos es un proceso manual", "No hay punto de venta que lo soporte"].map((item) => (
                  <li key={item} className="text-[0.875rem] pl-5 relative before:content-['✕'] before:absolute before:left-0 before:top-0 before:text-red-500 before:text-[0.7rem] before:opacity-60">{item}</li>
                ))}
              </ul>
            </div>
            <div className="anim">
              <span className="inline-block font-mono text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[#7b2ff7] bg-[rgba(123,47,247,0.08)] border border-[rgba(123,47,247,0.1)] px-3.5 py-[5px] rounded-full mb-4">La solución</span>
              <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#f0f0f5] leading-[1.2] tracking-[-0.02em] mb-3">
                NovaPay lo hace <span className="bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent">automático</span>
              </h2>
              <p className="text-[0.95rem] mb-5 leading-[1.8]">NovaPay se encarga de todo. Genera un cobro, tu cliente paga con crypto, y tú recibes pesos en tu banco. Así de simple.</p>
              <ul className="flex flex-col gap-2.5">
                {["Sin necesidad de entender wallets", "Sin riesgo de volatilidad", "Conversión y depósito automático", "Punto de venta integrado con QR"].map((item) => (
                  <li key={item} className="text-[0.875rem] pl-5 relative before:content-['✓'] before:absolute before:left-0 before:top-0 before:text-[#7b2ff7] before:text-[0.7rem]">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-[clamp(80px,12vw,160px)] bg-[#0a0a10]" id="how">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10">
          <div className="text-center max-w-[600px] mx-auto mb-[clamp(48px,7vw,80px)] anim">
            <span className="inline-block font-mono text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[#7b2ff7] bg-[rgba(123,47,247,0.08)] border border-[rgba(123,47,247,0.1)] px-3.5 py-[5px] rounded-full mb-4">Cómo funciona</span>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-[#f0f0f5] leading-[1.15] tracking-[-0.03em]">
              Cuatro pasos.<br /><span className="bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent">Cero fricción.</span>
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-5 md:gap-0">
            {[
              { num: "1", title: "Regístrate", desc: "Crea tu cuenta de negocio y recibe una wallet crypto asignada automáticamente.", icon: <svg viewBox="0 0 48 48" fill="none"><rect x="12" y="8" width="24" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><circle cx="24" cy="22" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M16 34c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5"/></svg> },
              { num: "2", title: "Genera un cobro", desc: "Ingresa el monto en pesos, el sistema calcula el equivalente en crypto y genera un código QR.", icon: <svg viewBox="0 0 48 48" fill="none"><rect x="10" y="10" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><rect x="16" y="16" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="20" y="20" width="8" height="8" fill="currentColor" opacity="0.2" rx="1"/></svg> },
              { num: "3", title: "Tu cliente paga", desc: "Escanea el QR y paga con su wallet crypto. NovaPay detecta y confirma el pago al instante.", icon: <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><path d="M16 24l5 5 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              { num: "4", title: "Recibes pesos", desc: "Retira pesos mexicanos directo a tu cuenta bancaria cuando quieras, vía SPEI.", icon: <svg viewBox="0 0 48 48" fill="none"><rect x="8" y="14" width="32" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/><path d="M8 22h32" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/><path d="M14 30h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/></svg> },
            ].map((step, i) => (
              <div key={step.num} className="contents">
                {i > 0 && (
                  <div className="hidden md:block w-10 h-[1px] mt-[72px] flex-shrink-0" style={{ background: "linear-gradient(90deg, rgba(123,47,247,0.3), rgba(255,47,237,0.1))" }} />
                )}
                {i > 0 && (
                  <div className="md:hidden w-[1px] h-7" style={{ background: "linear-gradient(180deg, rgba(123,47,247,0.3), rgba(255,47,237,0.1))" }} />
                )}
                <div className="anim flex-1 text-center max-w-[220px] px-3">
                  <div className="font-mono text-[2rem] font-extrabold bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent opacity-30 mb-3">{step.num}</div>
                  <div className="w-14 h-14 mx-auto mb-4 bg-[rgba(123,47,247,0.06)] border border-[rgba(123,47,247,0.1)] rounded-2xl flex items-center justify-center text-[#7b2ff7] p-2.5">
                    {step.icon}
                  </div>
                  <h3 className="text-[1rem] font-semibold text-[#f0f0f5] mb-2">{step.title}</h3>
                  <p className="text-[0.8rem] leading-[1.7]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="py-[clamp(80px,12vw,160px)]" id="features">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10">
          <div className="text-center max-w-[600px] mx-auto mb-[clamp(48px,7vw,80px)] anim">
            <span className="inline-block font-mono text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[#7b2ff7] bg-[rgba(123,47,247,0.08)] border border-[rgba(123,47,247,0.1)] px-3.5 py-[5px] rounded-full mb-4">Funciones</span>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-[#f0f0f5] leading-[1.15] tracking-[-0.03em]">
              Todo lo que tu<br /><span className="bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent">negocio necesita</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Big card - POS */}
            <div className="anim md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/[0.025] border border-white/[0.06] rounded-2xl p-8 md:p-10 items-center hover:border-white/[0.12] hover:bg-white/[0.045] transition-all">
              <div>
                <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[#7b2ff7] mb-2.5">Punto de Venta</div>
                <h3 className="text-[1.15rem] font-semibold text-[#f0f0f5] mb-2.5">Cobrar es así de fácil</h3>
                <p className="text-[0.875rem] leading-[1.75]">La pantalla de cobro funciona como una calculadora. Ingresa el monto en pesos, NovaPay calcula el equivalente en USDT al tipo de cambio del momento, genera un QR y espera el pago. Cuando tu cliente paga, la pantalla se actualiza con la confirmación. También soporta propinas.</p>
              </div>
              <div>
                {/* POS Mock */}
                <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 text-center max-w-[280px] mx-auto">
                  <div className="text-[0.75rem] text-[#55556a] mb-4 uppercase tracking-[0.1em]">Cobrar</div>
                  <div className="text-[2rem] font-extrabold text-[#f0f0f5] tracking-[-0.03em]">$1,250<span className="text-[0.8rem] font-normal text-[#55556a]">.00 MXN</span></div>
                  <div className="font-mono text-[0.75rem] text-[#7b2ff7] my-2 mb-5">≈ 68.49 USDT</div>
                  <div className="flex justify-center mb-4">
                    <div
                      className="w-[100px] h-[100px] rounded-lg border-2 border-[rgba(123,47,247,0.2)]"
                      style={{
                        background: "repeating-conic-gradient(rgba(123,47,247,0.15) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px",
                        animation: "qrPulse 3s ease-in-out infinite",
                      }}
                    />
                  </div>
                  <div className="text-[0.7rem] text-[#ff2fed] font-mono animate-pulse">Esperando pago...</div>
                </div>
              </div>
            </div>

            {/* Regular feature cards */}
            {[
              { title: "Control de tu equipo", desc: "Crea empleados con acceso limitado al punto de venta mediante un PIN. Cada cobro queda vinculado a quien lo generó, así sabes exactamente quién cobró qué y cuándo." },
              { title: "Dashboard completo", desc: "Ve tu balance en pesos mexicanos, historial de pagos recibidos, retiros realizados y wallets asignadas. Todo en tiempo real, desde cualquier dispositivo." },
              { title: "Detección automática", desc: "Un sistema vigila la blockchain 24/7 esperando los pagos de tus clientes. Cuando llega uno, se confirma y acredita automáticamente. No tienes que hacer nada." },
              { title: "Retiro a tu banco", desc: "Cuando quieras, solicita un retiro desde el dashboard. Los pesos llegan a tu cuenta bancaria por SPEI. Sin esperar días, sin comisiones sorpresa." },
            ].map((feat) => (
              <div key={feat.title} className="anim bg-white/[0.025] border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] hover:bg-white/[0.045] transition-all">
                <h3 className="text-[1.15rem] font-semibold text-[#f0f0f5] mb-2.5">{feat.title}</h3>
                <p className="text-[0.875rem] leading-[1.75]">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECURITY ═══ */}
      <section className="py-[clamp(80px,12vw,160px)] bg-[#0a0a10]" id="security">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10">
          <div className="anim grid grid-cols-1 md:grid-cols-2 gap-[clamp(32px,5vw,64px)] items-start">
            <div>
              <span className="inline-block font-mono text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[#7b2ff7] bg-[rgba(123,47,247,0.08)] border border-[rgba(123,47,247,0.1)] px-3.5 py-[5px] rounded-full mb-4">Seguridad</span>
              <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-[#f0f0f5] leading-[1.15] tracking-[-0.03em] mb-4">
                Tu dinero está<br /><span className="bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent">protegido</span>
              </h2>
              <p className="text-[0.95rem] leading-[1.8] mt-2">NovaPay está construido con seguridad de nivel financiero. Cada transacción, cada wallet y cada peso están protegidos.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Wallets seguras", desc: "Cada negocio tiene su propia wallet generada con tecnología HD. Las llaves privadas nunca se almacenan en bases de datos." },
                { title: "Monitoreo blockchain", desc: "Sistema dedicado vigilando la red 24/7. Cada transacción se verifica directamente en la blockchain antes de acreditarse." },
                { title: "Sin custodia de fondos", desc: "Los pesos se acreditan en tu balance y tú decides cuándo retirarlos. NovaPay no retiene tu dinero." },
                { title: "Autenticación segura", desc: "Acceso protegido con contraseñas robustas y roles de usuario diferenciados para cada nivel de tu equipo." },
              ].map((card) => (
                <div key={card.title} className="bg-white/[0.025] border border-white/[0.06] rounded-[14px] p-6 hover:border-white/[0.12] transition-all">
                  <h4 className="text-[0.9rem] font-semibold text-[#f0f0f5] mb-1.5">{card.title}</h4>
                  <p className="text-[0.8rem] leading-[1.7]">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-[clamp(80px,12vw,160px)]" id="contact">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10">
          <div className="anim relative text-center bg-white/[0.025] border border-white/[0.06] rounded-[28px] py-[clamp(48px,8vw,80px)] px-[clamp(24px,5vw,60px)] overflow-hidden">
            <div className="absolute w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(123,47,247,0.06), transparent 70%)" }} />
            <h2 className="relative z-10 text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-[#f0f0f5] leading-[1.15] tracking-[-0.03em] mb-4">
              Acepta el futuro<br /><span className="bg-gradient-to-r from-[#7b2ff7] to-[#ff2fed] bg-clip-text text-transparent">de los pagos</span>
            </h2>
            <p className="relative z-10 text-[clamp(0.95rem,1.4vw,1.1rem)] text-[#8a8aa0] max-w-[440px] mx-auto mb-8">Registra tu negocio en NovaPay y empieza a recibir pagos crypto hoy mismo.</p>
            <div className="relative z-10 flex items-center justify-center gap-3.5 flex-wrap">
              <a
                href="https://wa.me/5215512345678"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-[14px] text-[1rem] font-medium text-white transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #7b2ff7, #ff2fed)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span>Registrar mi negocio</span>
              </a>
              <a href="mailto:novapay@novacoin.mx" className="px-8 py-4 rounded-[14px] text-[1rem] font-medium text-[#8a8aa0] border border-white/[0.06] bg-white/[0.025] backdrop-blur-xl hover:border-white/[0.12] hover:text-[#f0f0f5] hover:-translate-y-0.5 transition-all">
                novapay@novacoin.mx
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="pt-12 pb-7 border-t border-white/[0.06] bg-[#0a0a10]">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
            <div>
              <Link href="/" className="flex items-center gap-2.5 font-bold text-[1.1rem] text-[#f0f0f5] mb-3">
                <div className="w-[30px] h-[30px]">
                  <svg viewBox="0 0 40 40" fill="none">
                    <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="url(#lgFt)" strokeWidth="1.5" fill="none"/>
                    <path d="M15 17L20 13L25 17V23L20 27L15 23Z" fill="url(#lgFt)"/>
                    <defs><linearGradient id="lgFt" x1="6" y1="4" x2="34" y2="36"><stop stopColor="#7b2ff7"/><stop offset="1" stopColor="#ff2fed"/></linearGradient></defs>
                  </svg>
                </div>
                <span>NovaCoin</span>
              </Link>
              <p className="text-[0.85rem] text-[#55556a] max-w-[260px] leading-[1.7]">NovaPay — Pasarela de pagos crypto para comercios en México.</p>
            </div>
            <div>
              <h4 className="text-[0.78rem] font-semibold text-[#f0f0f5] uppercase tracking-[0.06em] mb-3.5">NovaPay</h4>
              <div className="flex flex-col gap-1">
                <button onClick={() => scrollTo("how")} className="text-left text-[0.85rem] text-[#55556a] py-0.5 hover:text-[#8a8aa0] transition-colors">Cómo funciona</button>
                <button onClick={() => scrollTo("features")} className="text-left text-[0.85rem] text-[#55556a] py-0.5 hover:text-[#8a8aa0] transition-colors">Funciones</button>
                <button onClick={() => scrollTo("contact")} className="text-left text-[0.85rem] text-[#55556a] py-0.5 hover:text-[#8a8aa0] transition-colors">Contacto</button>
              </div>
            </div>
            <div>
              <h4 className="text-[0.78rem] font-semibold text-[#f0f0f5] uppercase tracking-[0.06em] mb-3.5">Cuenta</h4>
              <div className="flex flex-col gap-1">
                <Link href="/login" className="text-[0.85rem] text-[#55556a] py-0.5 hover:text-[#8a8aa0] transition-colors">Iniciar sesión</Link>
                <Link href="/register" className="text-[0.85rem] text-[#55556a] py-0.5 hover:text-[#8a8aa0] transition-colors">Registrarse</Link>
              </div>
            </div>
          </div>
          <div className="pt-5 border-t border-white/[0.06] text-[0.78rem] text-[#55556a]">
            &copy; 2026 NovaCoin. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Keyframe for QR pulse */}
      <style jsx>{`
        @keyframes qrPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(123,47,247,0.1); }
          50% { box-shadow: 0 0 20px 5px rgba(123,47,247,0.08); }
        }
        .anim {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .anim.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .anim:nth-child(2) { transition-delay: 0.07s; }
        .anim:nth-child(3) { transition-delay: 0.14s; }
        .anim:nth-child(4) { transition-delay: 0.21s; }
      `}</style>
    </div>
  );
}
