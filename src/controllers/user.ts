import { zValidator } from '@hono/zod-validator'
import { BlipClient, HttpSender } from '@whitewall/blip-sdk'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

export default new Hono().get(
    '/reset',
    zValidator(
        'query',
        z.object({
            phoneNumber: z.string(),
        }),
    ),
    async (ctx) => {
        const { phoneNumber } = ctx.req.valid('query')
        if (!phoneNumber.startsWith('55')) {
            throw new HTTPException(400, { message: 'Only brazilian numbers are allowed' })
        }

        const client = new BlipClient(new HttpSender(process.env.BOT_API_TOKEN, process.env.BOT_CONTRACT))
        const items = await client.account.getContexts(`${phoneNumber}@wa.gw.msging.net`)

        if (items) {
            for (const item of items) {
                await client.account.deleteContext(`${phoneNumber}@wa.gw.msging.net`, item)
            }
        }

        await client.account.deleteContact(`${phoneNumber}@wa.gw.msging.net`)

        return ctx.text('Contact reseted')
    },
)
