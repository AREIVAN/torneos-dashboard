import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function Topbar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 my-2 mb-4">
      <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 border border-brand-stroke/35 bg-linear-to-b from-brand-panel/85 to-brand-panel2/55 rounded-full shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08)]">
        <div className="w-2.5 h-2.5 rounded-full bg-[conic-gradient(from_210deg,var(--color-brand-neon),var(--color-brand-neon2),var(--color-brand-hot),var(--color-brand-neon))] drop-shadow-[0_0_10px_rgba(122,63,255,0.6)]" />
        <span className="font-extrabold tracking-wide text-sm">APEX ROBOT ID QR</span>
      </Link>

      <div className="flex flex-wrap items-center gap-2.5 px-3 py-2 rounded-full border border-brand-neon/25 bg-brand-panel2/55 text-brand-muted text-sm">
        <b className="text-brand-text capitalize">dashboard</b>
        <span>· Next.js 16 + Supabase</span>
        <span className="opacity-90 ml-1 truncate max-w-[150px]" id="mini-status"></span>
      </div>
    </div>
  );
}
