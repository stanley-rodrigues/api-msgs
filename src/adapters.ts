import { type ServerType, getRequestListener, serve } from '@hono/node-server'
import { onRequest } from 'firebase-functions/v2/https'
import type { HttpsFunction } from 'firebase-functions/v2/https'
import type { Hono } from 'hono'

export const adapt = (app: Hono): HttpsFunction | ServerType => {
    if (process.env.FIREBASE_CONFIG) {
        return onRequest(
            {
                region: 'southamerica-east1',
                invoker: 'public',
                timeoutSeconds: 180,
            },
            getRequestListener(app.fetch),
        )
    } else {
        return serve(app, (info) => console.log(`Server started on ${info.address}:${info.port} (${info.family})`))
    }
}
