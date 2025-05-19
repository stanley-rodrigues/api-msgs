import { zValidator } from '@hono/zod-validator'
import { BlipClient, HttpSender, type Identity } from '@whitewall/blip-sdk'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { createAudienceForBlipActiveCampaign } from '../util/blip.js'

export default new Hono().post(
    '/send',
    zValidator(
        'json',
        z.object({
            owner: z.string().email(),
            campaignName: z.string().optional(),
            scheduled: z.string().optional(),
            template: z.string(),
            language: z.string().optional(),
            messages: z.array(
                z.object({
                    phoneNumber: z.string(),
                    variables: z.array(z.string()),
                    buttonVariable: z.string().optional(),
                    mediaVariable: z.string().optional(),
                    additionalContactExtras: z.record(z.string(), z.string().or(z.null())),
                    metadata: z.record(z.string(), z.string()).optional(),
                }),
            ),
            redirect: z.object({
                flowId: z.string(),
                stateId: z.string().optional(),
                subbotIdentity: z.string(),
                agentEmail: z.string().optional(),
            }),
        }),
    ),
    async (ctx) => {
        const { owner, campaignName, messages, redirect, scheduled, template, language } = ctx.req.valid('json')
        const client = new BlipClient(new HttpSender(process.env.BOT_API_TOKEN, process.env.BOT_CONTRACT))
        const campaign = await client.activecampaign.createAndDispatchBatchCampaign(
            {
                name: campaignName || 'Campaign from API',
                campaignSender: owner,
                flowId: redirect?.flowId,
                stateId: redirect?.stateId || 'onboarding',
                subbotIdentity: redirect?.subbotIdentity as Identity,
                agentEmail: redirect?.agentEmail,
                scheduled: scheduled,
            },
            await createAudienceForBlipActiveCampaign(client, messages),
            {
                template: template,
                language: language!,
            },
        )

        if (campaign.status !== 'processing' && campaign.status !== 'scheduling') {
            throw new HTTPException(400, {
                message: `Campaign was not created successfully, status: ${campaign.status}`,
            })
        }

        return ctx.text('Campaign created successfully', 200)
    },
)
