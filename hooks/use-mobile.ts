import * as React from "react"

const MOBILE_BREAKPOINT = 800

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const subscribe = React.useCallback((notify: () => void) => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    media.addEventListener("change", notify)
    return () => media.removeEventListener("change", notify)
  }, [breakpoint])
  const getSnapshot = React.useCallback(
    () => window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
    [breakpoint],
  )
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
