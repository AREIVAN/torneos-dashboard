"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenu } from "./MobileMenu";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Robots", href: "/robots/mine" },
  { label: "Torneos", href: "/torneos" },
  { label: "Calendario", href: "/calendar" },
  { label: "Equipos", href: "/teams" },
];

export function Topbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex items-center justify-between gap-3 my-2 mb-4">
      {/* Logo */}
      <Link 
        href="/" 
        className="flex items-center gap-2.5 px-3 py-2.5 border border-brand-stroke/35 bg-gradient-to-b from-brand-panel/85 to-brand-panel2/55 rounded-full shadow-[inset_0_0_0_1px_rgba(122,63,255,0.08)] hover:brightness-110 transition-all"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[conic-gradient(from_210deg,var(--color-brand-neon),var(--color-brand-neon2),var(--color-brand-hot),var(--color-brand-neon))] drop-shadow-[0_0_10px_rgba(122,63,255,0.6)]" />
        <span className="font-extrabold tracking-wide text-sm">APEX</span>
        <span className="hidden sm:inline font-extrabold tracking-wide text-sm">ROBOT ID</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-full border border-brand-neon/25 bg-brand-panel2/55">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive(item.href)
                ? "bg-brand-neon/20 text-brand-text"
                : "text-brand-muted hover:text-brand-text hover:bg-brand-neon/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right section: Quick action + Mobile menu */}
      <div className="flex items-center gap-2.5">
        {/* Register robot button (desktop only) */}
        <Link
          href="/robots/new"
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-neon/45 bg-gradient-to-r from-brand-neon/20 to-brand-neon2/10 text-brand-text text-sm font-extrabold tracking-wide hover:brightness-110 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden lg:inline">Registrar</span>
        </Link>

        {/* Mobile menu */}
        <MobileMenu />
      </div>
    </div>
  );
}
