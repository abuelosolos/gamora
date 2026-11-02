"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

/**
 * Bottom sheet. A thin layer over the vaul drawer (drawer.tsx), so focus
 * trapping, Escape, drag to dismiss and the overlay all come from vaul.
 * On desktop it stays inside the 390px phone frame width.
 *
 * Always render a <SheetTitle> (it can be visually hidden with className="sr-only")
 * so screen readers can name the sheet.
 */
const Sheet = Drawer
const SheetTrigger = DrawerTrigger
const SheetClose = DrawerClose

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerContent>) {
  return (
    <DrawerContent
      data-slot="sheet-content"
      className={cn(
        "mx-auto w-full border-borderDefault bg-bgDefault pb-4 md:max-w-97.5",
        className
      )}
      {...props}
    >
      {children}
    </DrawerContent>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<typeof DrawerHeader>) {
  return <DrawerHeader data-slot="sheet-header" className={cn("px-5", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<typeof DrawerFooter>) {
  return <DrawerFooter data-slot="sheet-footer" className={cn("px-5", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DrawerTitle>) {
  return (
    <DrawerTitle
      data-slot="sheet-title"
      className={cn("font-display text-title-s font-semibold text-textPrimary", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerDescription>) {
  return (
    <DrawerDescription
      data-slot="sheet-description"
      className={cn("text-caption text-textSecondary", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
