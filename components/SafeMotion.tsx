"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"

// Wrapper components with error boundaries for Framer Motion
// These prevent animation crashes on older/low-end devices

interface SafeMotionProps {
  children: React.ReactNode
  [key: string]: any
}

class MotionErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Motion animation error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>{this.props.children}</div>
    }

    return this.props.children
  }
}

// Safe motion.div wrapper
export const SafeMotionDiv: React.FC<SafeMotionProps> = ({ children, ...props }) => {
  // Check if device can handle animations
  const prefersReducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  if (prefersReducedMotion) {
    // Return plain div for devices that prefer reduced motion
    return <div {...props}>{children}</div>
  }

  return (
    <MotionErrorBoundary fallback={<div {...props}>{children}</div>}>
      <motion.div {...props}>{children}</motion.div>
    </MotionErrorBoundary>
  )
}

// Safe AnimatePresence wrapper
export const SafeAnimatePresence: React.FC<{ children: React.ReactNode; [key: string]: any }> = ({
  children,
  ...props
}) => {
  const prefersReducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  if (prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <MotionErrorBoundary fallback={<>{children}</>}>
      <AnimatePresence {...props}>{children}</AnimatePresence>
    </MotionErrorBoundary>
  )
}

// Export motion button wrapper
export const SafeMotionButton = SafeMotionDiv