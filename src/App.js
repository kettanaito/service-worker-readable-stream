import { ResponseStream } from 'isomorphic-response'
import './App.css'

async function registerWorker() {
  const registration = await navigator.serviceWorker.register(
    './serviceWorker.js'
  )
  const ref =
    registration.installing || registration.waiting || registration.active
  await new Promise((resolve) => {
    if (ref.state === 'activated') {
      return resolve()
    }
    ref.addEventListener('statechange', (event) => {
      if (ref.state === 'activated') {
        resolve()
      }
    })
  })

  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('[client] from worker:', event.data)

    const response = new ResponseStream(
      new ReadableStream({
        async start(controller) {
          controller.enqueue('hello')
          await new Promise((r) => setTimeout(r, 1000))
          controller.enqueue('from')
          await new Promise((r) => setTimeout(r, 1000))
          controller.enqueue('server')
          controller.close()
        },
      })
    )

    response.read(function (chunk, done) {
      if (done) {
        event.ports[0].postMessage('DONE')
        return
      }

      event.ports[0].postMessage(chunk)
    })
  })
}
registerWorker()

function App() {
  const handleButtonClick = () => {
    fetch('/foo').then(async (res) => {
      console.log('fetch response:', await res.text())
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={handleButtonClick}>Make request</button>
      </header>
    </div>
  )
}

export default App
