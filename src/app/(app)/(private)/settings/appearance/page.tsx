import { TopNavbar } from "@/components/layout/top-navbar"
import { AppearancePicker } from "@/components/settings/appearance-picker"

// No Figma frame: composed from the Settings frame's top bar and card style.
// The choice is stored in the gamora-theme cookie, not the database, so there
// is nothing to load and no loading state beyond the page itself.
export const metadata = { title: "Appearance" }

export default function AppearancePage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar variant="page" backHref="/settings" title="Appearance" />
      <p className="px-5 pt-2 pb-2.5 text-caption text-textSecondary">Pick how Gamora looks. It applies right away.</p>
      <AppearancePicker />
    </main>
  )
}
