import { redirect } from "next/navigation"

// Hirer side (no hirer accounts yet): sends the visitor to the Coming soon screen.
export default function PostJobPage() {
  redirect("/unavailable/hirer")
}
