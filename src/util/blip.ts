import type { BlipClient } from '@whitewall/blip-sdk'
import { logger } from 'firebase-functions/v2'

type MessageFragment = {
    phoneNumber: string
    variables: Array<string>
    buttonVariable?: string
    mediaVariable?: string
    additionalContactExtras: Record<string, string | null>
    metadata?: Record<string, string>
}

export const createAudienceForBlipActiveCampaign = async (blipClient: BlipClient, messages: Array<MessageFragment>) => {
    const audience: Parameters<typeof blipClient.activecampaign.createAndDispatchBatchCampaign>[1] = []
    const mediaCache = new Map<string, string>()

    for (const message of messages) {
        if (message.mediaVariable) {
            let processedMedia = mediaCache.get(message.mediaVariable) || message.mediaVariable

            if (!mediaCache.has(message.mediaVariable)) {
                try {
                    const mediaUrl = new URL(processedMedia)

                    if (mediaUrl.hostname === 'scontent.whatsapp.net') {
                        const mediaResponse = await fetch(processedMedia)
                        if (mediaResponse.ok) {
                            const uploadMediaUri = await blipClient.media.getMediaUploadUrl()
                            const uploadMediaResponse = await fetch(uploadMediaUri, {
                                method: 'POST',
                                headers: { 'Content-Type': mediaResponse.headers.get('Content-Type')! },
                                body: mediaResponse.body,
                                // @ts-expect-error: TypeScript is not aware of duplex requests
                                duplex: 'half',
                            })

                            if (uploadMediaResponse.ok) {
                                const { mediaUri } = await uploadMediaResponse.json()
                                processedMedia = mediaUri
                            }
                        }
                    }
                } catch (err) {
                    logger.error(`Error uploading media ${message.mediaVariable}`, err)
                }

                mediaCache.set(message.mediaVariable, processedMedia)
            }

            message.mediaVariable = processedMedia
        }

        audience.push({
            recipient: message.phoneNumber,
            buttonVariable: message.buttonVariable,
            mediaVariable: message.mediaVariable,
            bodyVariables: message.variables,
            additionalContactExtras: message.additionalContactExtras,
        })
    }

    return audience
}
