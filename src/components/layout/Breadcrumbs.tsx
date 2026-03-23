"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  currentLabel?: string;
}

// Mapeo de rutas a nombres legibles
const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "robots": "Robots",
  "new": "Nuevo Robot",
  "mine": "Mis Robots",
  "torneos": "Torneos",
  "calendar": "Calendario",
  "teams": "Equipos",
};

function ChevronIcon() {
  return (
    <svg 
      className="w-3.5 h-3.5 text-brand-muted/50" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function Breadcrumbs({ items, currentLabel }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Si se proporcionan items custom, usarlos
  if (items && items.length > 0) {
    return (
      <nav className="flex items-center gap-1.5 text-sm mb-3">
        <Link 
          href="/" 
          className="text-brand-muted hover:text-brand-neon transition-colors"
        >
          Dashboard
        </Link>
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-1.5">
            <ChevronIcon />
            {item.href ? (
              <Link 
                href={item.href} 
                className="text-brand-muted hover:text-brand-neon transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-brand-text font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    );
  }

  // Auto-generar breadcrumbs basado en la ruta actual
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments.length === 0) {
    return null; // No mostrar breadcrumbs en la página principal
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Verificar si es un ID dinámico (número o string corto)
    const isDynamicSegment = /^\d+$/.test(segment) || segment.length <= 6;
    
    let label = routeLabels[segment];
    
    if (!label) {
      if (isDynamicSegment && segments[index - 1] === "robots") {
        label = `#${segment}`;
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    }

    breadcrumbs.push({
      label: currentLabel && isLast ? currentLabel : label,
      href: isLast ? undefined : currentPath,
    });
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
      <Link 
        href="/" 
        className="text-brand-muted hover:text-brand-neon transition-colors"
      >
        Dashboard
      </Link>
      {breadcrumbs.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronIcon />
          {item.href ? (
            <Link 
              href={item.href} 
              className="text-brand-muted hover:text-brand-neon transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-brand-text font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
