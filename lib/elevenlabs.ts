import WebSocket from "ws"
import { logger } from "./logger"

// Get a signed URL for ElevenLabs conversation
export async function getElevenLabsSignedUrl() {
  try {
    logger.info("Getting ElevenLabs signed URL")

    // Verify environment variables
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY environment variable is not set")
    }

    if (!process.env.ELEVENLABS_AGENT_ID) {
      throw new Error("ELEVENLABS_AGENT_ID environment variable is not set")
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    const agentId = process.env.ELEVENLABS_AGENT_ID

    logger.info(`Using agent ID: ${agentId}`)

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to get ElevenLabs signed URL", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      throw new Error(`Failed to get signed URL: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.signed_url) {
      logger.error("ElevenLabs API returned no signed_url", { data })
      throw new Error("ElevenLabs API returned no signed_url")
    }

    logger.info("Successfully got ElevenLabs signed URL", {
      signedUrlPreview: data.signed_url.substring(0, 50) + "...",
    })

    return data.signed_url
  } catch (error) {
    logger.error("Error getting ElevenLabs signed URL", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}

// Test the ElevenLabs API key
export async function testElevenLabsApiKey() {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("ElevenLabs API key test failed", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      return { success: false, error: `API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    logger.info("ElevenLabs API key test successful", {
      subscription: data.subscription?.tier,
    })
    return { success: true, data }
  } catch (error) {
    logger.error("Error testing ElevenLabs API key", { error })
    return { success: false, error }
  }
}

// List available voices
export async function listElevenLabsVoices() {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to list ElevenLabs voices", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      return { success: false, error: `API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    logger.info("Successfully retrieved ElevenLabs voices", {
      voiceCount: data.voices?.length || 0,
    })
    return { success: true, voices: data.voices }
  } catch (error) {
    logger.error("Error listing ElevenLabs voices", { error })
    return { success: false, error }
  }
}

// Connect to ElevenLabs WebSocket
export async function connectToElevenLabs(ws: WebSocket, firstMessage: string, callData: any): Promise<WebSocket> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get signed URL for ElevenLabs
      const signedUrl = await getElevenLabsSignedUrl()
      logger.info("Got ElevenLabs signed URL", {
        sessionId: callData.sessionId,
        signedUrl: signedUrl.substring(0, 50) + "...",
      })

      // Connect to ElevenLabs using the signed URL
      const elevenLabsWs = new WebSocket(signedUrl)

      elevenLabsWs.on("open", () => {
        logger.info("Connected to ElevenLabs WebSocket", {
          sessionId: callData.sessionId,
        })

        // Send initial configuration with prompt and first message
        const initialConfig = {
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: {
              prompt: { prompt: callData.prompt },
              first_message: firstMessage,
            },
          },
        }

        // Send the configuration to ElevenLabs
        elevenLabsWs.send(JSON.stringify(initialConfig))
        logger.info("Sent initial configuration to ElevenLabs", {
          sessionId: callData.sessionId,
          prompt: callData.prompt.substring(0, 50) + (callData.prompt.length > 50 ? "..." : ""),
          firstMessage: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : ""),
        })

        resolve(elevenLabsWs)
      })

      elevenLabsWs.on("error", (error) => {
        logger.error("ElevenLabs WebSocket error", {
          error: error.message,
          stack: error.stack,
          sessionId: callData.sessionId,
        })
        reject(error)
      })

      elevenLabsWs.on("close", (code, reason) => {
        logger.info("ElevenLabs WebSocket closed", {
          code,
          reason: reason.toString(),
          sessionId: callData.sessionId,
        })
      })
    } catch (error) {
      logger.error("Error setting up ElevenLabs connection", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: callData.sessionId,
      })
      reject(error)
    }
  })
}

// Speak text using ElevenLabs WebSocket
export function speakText(elevenLabsWs: WebSocket, text: string, sessionId: string) {
  if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
    const textMessage = {
      text,
      flush: true,
    }
    elevenLabsWs.send(JSON.stringify(textMessage))
    logger.info("Sent text to ElevenLabs for speech synthesis", {
      sessionId,
      textPreview: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
    })
  } else {
    logger.warn("ElevenLabs WebSocket is not open, cannot send text", {
      sessionId,
      readyState: elevenLabsWs?.readyState,
    })
  }
}

// Start a conversation with ElevenLabs
export async function startConversation(agentId: string, firstMessage: string, prompt: string, callData: any) {
  try {
    logger.info("Starting ElevenLabs conversation", { agentId, firstMessage, prompt })

    // Construct the API endpoint URL
    const url = `https://api.elevenlabs.io/v1/conversation/${agentId}/start`

    // Prepare the request body
    const body = JSON.stringify({
      conversation_initiation_client_data: {
        prompt: prompt,
        first_message: firstMessage,
      },
    })

    // Make the API request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: body,
    })

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text()
      logger.error("ElevenLabs Conversational API test failed", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      }
    }

    // Parse the response
    const data = await response.json()
    logger.info("ElevenLabs Conversational API test successful", {
      conversationId: data.conversation_id,
    })

    // Return the result
    return {
      success: true,
      conversationId: data.conversation_id,
    }
  } catch (error) {
    logger.error("Error testing ElevenLabs Conversational API", { error })
    return { success: false, error }
  }
}
