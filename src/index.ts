import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { adapt } from './adapters'
import messageController from './controllers/message'
import userController from './controllers/user'

const app = new Hono()
    .get('/ping', (ctx) => ctx.text('pong!'))
    .route('/message', messageController)
    .route('/user', userController)
    .onError((err, ctx) => {
        console.error(err)

        const status = err instanceof HTTPException ? err.status : 500
        return ctx.json(
            { success: false, error: err.message || undefined, cause: 'cause' in err ? err.cause : undefined },
            status,
        )
    })

export const server = adapt(app)
