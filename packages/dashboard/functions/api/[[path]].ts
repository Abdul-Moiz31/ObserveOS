// Cloudflare Pages Function — proxies dashboard API calls to the Worker.
// Keeps the Worker API key server-side only; it is never bundled into the
// static client output (unlike the old NEXT_PUBLIC_API_KEY approach).
//
// Configure these as Pages project environment variables/secrets:
//   WORKER_URL      e.g. https://observeos-worker.<subdomain>.workers.dev
//   WORKER_API_KEY  a per-tenant key minted via POST /v1/keys on the Worker
//   WORKER_TENANT_ID (optional, defaults to "default")

interface Env {
  WORKER_URL: string
  WORKER_API_KEY: string
  WORKER_TENANT_ID?: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context

  if (!env.WORKER_URL || !env.WORKER_API_KEY) {
    return new Response(JSON.stringify({ error: 'Dashboard proxy is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const pathParam = params.path
  const path = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam ?? '')
  const incomingUrl = new URL(request.url)
  const target = `${env.WORKER_URL.replace(/\/$/, '')}/v1/${path}${incomingUrl.search}`

  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${env.WORKER_API_KEY}`)
  headers.set('X-Tenant-Id', env.WORKER_TENANT_ID ?? 'default')

  const init: RequestInit = { method: request.method, headers }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  const upstream = await fetch(target, init)
  const body = await upstream.text()

  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
