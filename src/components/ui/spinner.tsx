"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const sizes = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-9 border-[3px]",
} as const

/**
 * Brand spinner: a hairline ring with a single dark arc riding it.
 *
 * Built from borders rather than an SVG so it costs nothing to render and
 * keeps spinning while the main thread is busy parsing a route payload —
 * which is exactly when it is on screen. Its label defaults to "Loading" in
 * the page's language; `null` means no label.
 */
function Spinner({
  size = "md",
  label,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  size?: keyof typeof sizes
  label?: string | null
}) {
  const text = label === undefined ? "Loading" : label
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "animate-spin rounded-full border-black/10 border-t-foreground/60",
          sizes[size]
        )}
      />
      {text ? <span className="sr-only">{text}</span> : null}
    </div>
  )
}

/** Spinner centred in its container with an optional caption underneath. */
function SpinnerBlock({
  label,
  caption,
  className,
}: {
  label?: string
  caption?: string
  className?: string
}) {
  const text = label ?? "Loading"
  return (
    <div
      className={cn(
        "flex min-h-[320px] w-full flex-col items-center justify-center gap-4",
        className
      )}
    >
      <Spinner size="lg" label={text} />
      <p className="text-[13px] text-muted-foreground">{caption ?? text}</p>
    </div>
  )
}

export { Spinner, SpinnerBlock }
