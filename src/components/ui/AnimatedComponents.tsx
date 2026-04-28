"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

export const motionEase = [0.22, 1, 0.36, 1] as const;
export const moveEase = [0.25, 1, 0.5, 1] as const;

// Variantes de animación predefinidas
export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
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
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 16 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

// Transiciones predefinidas
export const defaultTransition = {
  duration: 0.22,
  ease: motionEase,
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
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        variants={shouldReduceMotion ? undefined : variants[variant]}
        initial={shouldReduceMotion ? false : "initial"}
        animate={shouldReduceMotion ? undefined : "animate"}
        exit={shouldReduceMotion ? undefined : "exit"}
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
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : "initial"}
      animate={shouldReduceMotion ? undefined : "animate"}
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
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
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={shouldReduceMotion ? undefined : fadeInUp}
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
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={
        shouldReduceMotion
          ? undefined
          : { scale: hoverScale, y: hoverY, transition: { duration: 0.18, ease: motionEase } }
      }
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
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
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease: motionEase }}
    >
      {children}
    </motion.div>
  );
}

// Hook para crear animaciones de entrada con delay basado en índice
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}
