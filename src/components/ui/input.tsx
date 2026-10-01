import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Plain native controls styled to the house light system. Base UI is used
 * for the composite primitives (Button, Tabs, Switch…) but form fields here are
 * simple enough that native elements keep the value plumbing obvious.
 */

const fieldBase =
  "w-full min-w-0 rounded-xl border border-black/10 bg-white text-[14px] text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[color,box-shadow,border-color] outline-none placeholder:text-black/35 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:ring-3 aria-invalid:ring-destructive/20"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(fieldBase, "h-10 px-3.5 py-2", className)}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldBase,
        "min-h-20 resize-y px-3.5 py-2.5 leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          fieldBase,
          "h-10 appearance-none py-2 pe-9 ps-3.5 [&>option]:bg-white [&>option]:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 inset-e-3 size-3.5 -translate-y-1/2 text-black/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "block text-[12.5px] font-medium tracking-[-0.01em] text-foreground/70",
        className
      )}
      {...props}
    />
  )
}

/** Label + control + optional hint, the shape used on every form in the app. */
function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string
  hint?: string
  /** Validation message; replaces the hint while present. */
  error?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-[11.5px] text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export { Input, Textarea, Select, Label, Field }
