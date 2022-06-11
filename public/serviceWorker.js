self.addEventListener('install', function () {
  return self.skipWaiting()
})

self.addEventListener('activate', async function (event) {
  return self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (
    event.request.mode === 'navigation' ||
    !event.request.url.includes('/foo')
  ) {
    return
  }

  event.respondWith(
    new Promise(async (resolve) => {
      const client = await self.clients.get(event.clientId)
      console.log('[worker] request from client:', client.id)

      let ctrl
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          ctrl = controller
        },
      })

      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => {
        if (event.data === 'DONE') {
          console.warn('[worker] stream done!')
          ctrl.close()
          return
        }

        console.log('[worker] sending:', event.data)
        /**
         * @note Encoding to Uint8Array it essential. Without this,
         * response stream will throw an error.
         */
        ctrl.enqueue(encoder.encode(event.data))
      }
      client.postMessage('give-me-response', [channel.port2])

      const response = new Response(stream, {
        headers: {
          'Content-Type': 'text/plain',
        },
      })
      return resolve(response)
    })
  )
})
