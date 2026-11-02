import { notFound } from "next/navigation"
import { ComponentsDemo } from "./components-demo"

// TEMPORARY review page. Delete src/app/dev when the components are approved.
export const metadata = { title: "Components (dev)" }

export default function DevComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <ComponentsDemo />
}
