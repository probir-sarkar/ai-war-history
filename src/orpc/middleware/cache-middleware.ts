import { os } from '@orpc/server'
import { env } from 'cloudflare:workers'

type CacheOptions = {
  ttl?: number
}
export const cacheMiddleware = (options: CacheOptions = { ttl: 60 }) =>
  os.middleware(async ({ next, path }, input, output) => {
    const cacheKey = path.join('/') + JSON.stringify(input)
    const cached = await env.KV.get(cacheKey)
    if (cached) {
      return output(JSON.parse(cached))
    }
    const result = await next({})
    await env.KV.put(cacheKey, JSON.stringify(result.output), {
      expirationTtl: options.ttl,
    })
    return result
  })
