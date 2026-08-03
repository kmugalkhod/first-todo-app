import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const subscribe = React.useCallback((notify: () => void) => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    media.addEventListener("change", notify)
    return () => media.removeEventListener("change", notify)
  }, [])
  const getSnapshot = React.useCallback(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches,
    [],
  )
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
