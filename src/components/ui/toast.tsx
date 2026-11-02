"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { CheckCircle, Info, X, XCircle } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Toasts. Figma: the "Uploading Popup" (caption text over a progress bar that
 * turns statusSuccess at 100%). Other variants follow the same card.
 *
 * Usage: wrap the app in <ToastProvider>, then
 *   const { toast, update, dismiss } = useToast()
 *   const id = toast({ title: "Your post is being uploaded", progress: 20 })
 *   update(id, { title: "Your post was successfully uploaded", progress: 100 })
 */

const toastVariants = cva(
  "pointer-events-auto flex w-full max-w-97.5 items-start gap-3 rounded-ui-md border bg-bgElevated px-5 py-2.5 text-textPrimary shadow-lg",
  {
    variants: {
      variant: {
        default: "border-borderDefault",
        success: "border-statusSuccess",
        error: "border-statusError",
        info: "border-statusInfo",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const variantIcon = {
  default: null,
  success: <CheckCircle aria-hidden="true" className="size-5 text-statusSuccess" />,
  error: <XCircle aria-hidden="true" className="size-5 text-statusError" />,
  info: <Info aria-hidden="true" className="size-5 text-statusInfo" />,
} as const

export interface ToastOptions extends VariantProps<typeof toastVariants> {
  title: string
  description?: string
  /** 0 to 100. Shows a progress bar; the toast stays until it reaches 100. */
  progress?: number
  /** Milliseconds before it closes. null keeps it open. Default 4000. */
  duration?: number | null
}

export interface ToastCardProps extends Omit<ToastOptions, "duration"> {
  className?: string
  onDismiss?: () => void
}

/** The visual toast. Used by the provider and by the /dev preview. */
function ToastCard({
  variant,
  title,
  description,
  progress,
  className,
  onDismiss,
}: ToastCardProps) {
  const resolved = variant ?? "default"
  const done = progress !== undefined && progress >= 100
  return (
    <div
      data-slot="toast"
      role={resolved === "error" ? "alert" : "status"}
      className={cn(toastVariants({ variant: resolved }), className)}
    >
      {variantIcon[resolved]}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <p className="text-caption wrap-break-word">{title}</p>
        {description ? (
          <p className="text-caption wrap-break-word text-textSecondary">{description}</p>
        ) : null}
        {progress !== undefined ? (
          <div
            role="progressbar"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(100, Math.max(0, progress)))}
            className="h-2 w-full overflow-hidden rounded-full bg-borderDefault"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                done ? "bg-statusSuccess" : "bg-accentDefault"
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-my-1.5 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-ui-md text-textSecondary outline-none transition-colors hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-accentDefault"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      ) : null}
    </div>
  )
}

type ToastItem = ToastOptions & { id: string }

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  update: (id: string, options: Partial<ToastOptions>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4000

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const counter = React.useRef(0)
  const reduceMotion = useReducedMotion()

  const dismiss = React.useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const schedule = React.useCallback(
    (id: string, options: Pick<ToastOptions, "duration" | "progress">) => {
      const existing = timers.current.get(id)
      if (existing) clearTimeout(existing)
      timers.current.delete(id)
      const inProgress = options.progress !== undefined && options.progress < 100
      if (inProgress || options.duration === null) return
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), options.duration ?? DEFAULT_DURATION)
      )
    },
    [dismiss]
  )

  const toast = React.useCallback(
    (options: ToastOptions) => {
      counter.current += 1
      const id = `toast-${counter.current}`
      setItems((current) => [...current, { ...options, id }])
      schedule(id, options)
      return id
    },
    [schedule]
  )

  const update = React.useCallback(
    (id: string, options: Partial<ToastOptions>) => {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) return item
          const next = { ...item, ...options }
          schedule(id, next)
          return next
        })
      )
    },
    [schedule]
  )

  React.useEffect(() => {
    const active = timers.current
    return () => {
      active.forEach((timer) => clearTimeout(timer))
      active.clear()
    }
  }, [])

  const value = React.useMemo(() => ({ toast, update, dismiss }), [toast, update, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 top-0 z-100 flex flex-col items-center gap-2 px-4 pt-4"
      >
        <AnimatePresence initial={false}>
          {items.map(({ id, ...item }) => (
            <motion.div
              key={id}
              layout={!reduceMotion}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="flex w-full justify-center"
            >
              <ToastCard {...item} onDismiss={() => dismiss(id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}

export { ToastCard, ToastProvider, useToast, toastVariants }
