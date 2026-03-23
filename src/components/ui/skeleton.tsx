import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "card";
}

export function Skeleton({ 
  className, 
  variant = "default",
  ...props 
}: SkeletonProps) {
  const variantClasses = {
    default: "rounded-xl",
    circular: "rounded-full",
    text: "rounded-md h-4",
    card: "rounded-[18px]",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-brand-bg/40 border border-brand-stroke/10",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-brand-neon/10 before:to-transparent",
        "before:animate-shimmer",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

// Skeleton específico para stats cards
export function SkeletonStatCard() {
  return (
    <div className="rounded-[18px] border border-brand-neon/20 bg-brand-bg/25 p-4 min-h-[100px]">
      <Skeleton variant="text" className="w-20 h-3 mb-3" />
      <Skeleton variant="text" className="w-16 h-8 mb-2" />
      <Skeleton variant="text" className="w-24 h-3" />
    </div>
  );
}

// Skeleton para robot cards
export function SkeletonRobotCard() {
  return (
    <div className="rounded-[18px] border border-brand-neon/20 bg-brand-bg/25 p-4 min-h-[120px]">
      <div className="flex justify-between items-start mb-3">
        <Skeleton variant="text" className="w-32 h-5" />
        <Skeleton className="w-12 h-6 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-24 h-3" />
        <Skeleton variant="text" className="w-28 h-3" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
    </div>
  );
}

// Skeleton para team items
export function SkeletonTeamItem() {
  return (
    <div className="rounded-[14px] bg-brand-panel2/55 border border-brand-neon/10 p-2.5">
      <Skeleton variant="text" className="w-28 h-4 mb-1.5" />
      <Skeleton variant="text" className="w-20 h-3" />
    </div>
  );
}

// Skeleton para event cards
export function SkeletonEventCard() {
  return (
    <div className="rounded-[18px] border border-brand-neon/20 bg-brand-bg/25 p-4">
      <div className="flex gap-4">
        <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4 h-5" />
          <Skeleton variant="text" className="w-1/2 h-3" />
          <Skeleton variant="text" className="w-2/3 h-3" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="w-16 h-6 rounded-full" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic card skeleton (for tournament cards, etc.)
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-brand-stroke/30 bg-brand-panel2/60 p-4 min-h-[180px]">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="w-16 h-5 rounded" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <Skeleton variant="text" className="w-3/4 h-5 mb-3" />
      <div className="space-y-2 mb-4">
        <Skeleton variant="text" className="w-2/3 h-3" />
        <Skeleton variant="text" className="w-1/2 h-3" />
        <Skeleton variant="text" className="w-3/5 h-3" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="w-24 h-6 rounded" />
        <Skeleton variant="text" className="w-20 h-4" />
      </div>
    </div>
  );
}

// Skeleton para robot profile completo
export function SkeletonRobotProfile() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
      <div className="flex flex-col gap-6">
        {/* Datos Principales */}
        <div>
          <Skeleton variant="text" className="w-32 h-3 mb-3" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                <Skeleton variant="text" className="w-16 h-2.5 mb-2" />
                <Skeleton variant="text" className="w-24 h-5" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Especificaciones */}
        <div>
          <Skeleton variant="text" className="w-28 h-3 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                <Skeleton variant="text" className="w-20 h-2.5 mb-2 mx-auto" />
                <Skeleton variant="text" className="w-16 h-4 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Control */}
        <div>
          <Skeleton variant="text" className="w-36 h-3 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                <Skeleton variant="text" className="w-24 h-2.5 mb-2 mx-auto" />
                <Skeleton variant="text" className="w-20 h-4 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Inspección */}
        <div>
          <div className="flex justify-between mb-3">
            <Skeleton variant="text" className="w-20 h-3" />
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>
          <Skeleton variant="card" className="h-24 w-full" />
        </div>
      </div>

      {/* Sidebar: foto + QR */}
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-full aspect-square rounded-2xl" />
        <Skeleton className="w-full h-[220px] rounded-2xl" />
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>
    </div>
  );
}
