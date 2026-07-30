"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-10 w-20 items-center rounded-full border p-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
        isDark ? "border-border bg-background" : "border-zinc-800 bg-zinc-800"
      }`}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${
          isDark
            ? "translate-x-10 bg-zinc-950 text-white"
            : "translate-x-0 bg-white text-zinc-950"
        }`}
      >
        {isDark ? <MoonIcon className="size-5" /> : <SunIcon className="size-5" />}
      </span>
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
