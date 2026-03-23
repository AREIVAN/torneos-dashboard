"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

// Variantes de animación predefinidas
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Transiciones predefinidas
export const defaultTransition = {
  duration: 0.3,
  ease: "easeOut" as const,
};

export const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Componente AnimatedCard para wrappear cards con animación
interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  variant?: "fadeInUp" | "fadeIn" | "scaleIn" | "slideInLeft" | "slideInRight";
  delay?: number;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

const variants = {
  fadeInUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
};

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ variant = "fadeInUp", delay = 0, duration = 0.3, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={variants[variant]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          ...defaultTransition,
          duration,
          delay,
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

// Componente para listas con stagger
interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({ children, className, staggerDelay = 0.05 }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Componente para items de lista animados
interface AnimatedListItemProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className, ...props }: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      variants={fadeInUp}
      transition={defaultTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Componente para hover effects en cards
interface HoverCardProps extends Omit<HTMLMotionProps<"div">, "whileHover" | "whileTap"> {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}

export function HoverCard({ 
  children, 
  className, 
  hoverScale = 1.02, 
  hoverY = -2,
  ...props 
}: HoverCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale: hoverScale, 
        y: hoverY,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Componente para page transitions
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Hook para crear animaciones de entrada con delay basado en índice
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}
