import Link from "next/link"

/**
 * Shown where people create an account (the sign-in page is also the sign-up
 * page, and the welcome page's Google button creates accounts too).
 */
function PortfolioNote() {
  return (
    <p className="text-center text-caption text-textSecondary">
      Gamora is a portfolio project, not a real service. Everything you post is public. By continuing you accept the{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-textPrimary">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-textPrimary">
        Privacy policy
      </Link>
      .
    </p>
  )
}

export { PortfolioNote }
