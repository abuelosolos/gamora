import { PhoneFrame } from "@/components/layout/phone-frame"

// Auth and onboarding screens: the phone frame without the bottom nav.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>
}
