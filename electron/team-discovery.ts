import os from 'os'

const SERVICE_NAME = '_moment-todo._ws._tcp.local'

function getLocalIPs(): string[] {
  const ips: string[] = []
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const net = interfaces[name]
    if (!net) continue
    for (const iface of net) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address)
      }
    }
  }
  return ips
}

export function publishServer(port: number): () => void {
  let mdns: { destroy: () => void } | null = null

  import('multicast-dns').then(({ default: createMdns }) => {
    const m = createMdns()
    const ips = getLocalIPs()
    if (ips.length === 0) return
    const txt = JSON.stringify({ port, ip: ips[0] })

    m.on('query', (query: { type: string; name: string }) => {
      if (query.type === 'PTR' && query.name === SERVICE_NAME) {
        m.respond({
          answers: [{
            name: SERVICE_NAME,
            type: 'PTR',
            data: SERVICE_NAME,
            ttl: 300,
          }, {
            name: SERVICE_NAME,
            type: 'SRV',
            data: { priority: 0, weight: 0, port: port, target: os.hostname() + '.local' },
            ttl: 300,
          }, {
            name: SERVICE_NAME,
            type: 'TXT',
            data: Buffer.from(txt),
            ttl: 300,
          }],
        })
      }
    })
    mdns = m
  }).catch((e) => {
    console.warn('[Discovery] mDNS failed to start:', e)
  })

  return () => {
    if (mdns) mdns.destroy()
  }
}

export function discoverServer(timeout = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout)

    import('multicast-dns').then(({ default: createMdns }) => {
      const m = createMdns()

      m.on('response', (response: { answers?: Array<{ name: string; type: string; data: unknown }> }) => {
        if (!response.answers) return
        for (const answer of response.answers) {
          if (answer.type === 'SRV' && answer.name === SERVICE_NAME) {
            const srv = answer.data as { port: number }
            const port = srv.port
            for (const a of response.answers) {
              if (a.type === 'TXT') {
                try {
                  const txt = JSON.parse((a.data as Buffer).toString())
                  clearTimeout(timer)
                  try { m.destroy() } catch {}
                  resolve(`${txt.ip}:${port}`)
                  return
                } catch {}
              }
            }
          }
        }
      })

      m.query({ questions: [{ name: SERVICE_NAME, type: 'PTR' }] })
    }).catch(() => {
      clearTimeout(timer)
      resolve(null)
    })
  })
}
