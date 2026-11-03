export interface ShareTarget {
  id: "whatsapp" | "x" | "facebook" | "telegram" | "email" | "messages"
  label: string
  href: string
}

/**
 * Share links for each platform. They are normal web links: on a phone with the
 * app installed the OS opens the app, otherwise the site opens. `mailto:` and
 * `sms:` open the mail and messages apps. Every value is URL-encoded.
 */
export function shareTargets({ url, title, text }: { url: string; title: string; text?: string }): ShareTarget[] {
  const message = text ? `${text} ${url}` : `${title} ${url}`
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(text ?? title)
  const m = encodeURIComponent(message)
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${m}` },
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: "email", label: "Email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${m}` },
    { id: "messages", label: "Messages", href: `sms:?&body=${m}` },
  ]
}
