let timerTimeout = null

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('message', event => {
  if (event.data?.type === 'TIMER_START') {
    if (timerTimeout) clearTimeout(timerTimeout)
    const { endTime, title, body } = event.data
    const delay = endTime - Date.now()
    if (delay <= 0) return
    timerTimeout = setTimeout(async () => {
      timerTimeout = null
      try {
        await self.registration.showNotification(title || 'Rest done!', {
          body: body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'rest-timer',
          renotify: true,
          vibrate: [500, 150, 500, 150, 500, 150, 800, 200, 800, 200, 800],
          silent: false,
          requireInteraction: true,
        })
      } catch {}
    }, delay)
  }

  if (event.data?.type === 'TIMER_CANCEL') {
    if (timerTimeout) {
      clearTimeout(timerTimeout)
      timerTimeout = null
    }
    self.registration.getNotifications({ tag: 'rest-timer' })
      .then(ns => ns.forEach(n => n.close()))
      .catch(() => {})
  }
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const c = cs.find(c => 'focus' in c)
      if (c) return c.focus()
      return self.clients.openWindow('/')
    })
  )
})
