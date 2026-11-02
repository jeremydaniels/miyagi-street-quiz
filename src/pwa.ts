// Service worker registration for offline use and quiet background updates.
//
// A new version downloads in the background and waits. It takes effect the next
// time the app is opened fresh, or when New shoot is confirmed (applyWaitingUpdate).
// Nothing else may reload the app.

let registration: ServiceWorkerRegistration | undefined

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  const register = async () => {
    try {
      registration = await navigator.serviceWorker.register('/sw.js')
    } catch {
      return // Offline features unavailable; the app still works online.
    }
    // Check for a new version whenever the app comes back to the screen.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => {})
    })
  }

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}

// If a new version is waiting, switch to it and reload. Returns false if there's nothing to apply.
export function applyWaitingUpdate(): boolean {
  const waiting = registration?.waiting
  if (!waiting) return false
  waiting.addEventListener('statechange', () => {
    if (waiting.state === 'activated') window.location.reload()
  })
  waiting.postMessage({ type: 'SKIP_WAITING' })
  return true
}
