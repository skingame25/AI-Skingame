import { logger } from "@/lib/logger"

// Use Edge Runtime to support WebSockets
export const runtime = "edge"

export async function GET(request: Request) {
  try {
    logger.info("WebSocket connection requested", {
      url: request.url,
    })

    // Verify environment variables
    if (!process.env.ELEVENLABS_API_KEY) {
      logger.error("ELEVENLABS_API_KEY is not set")
      return new Response("Server configuration error: ELEVENLABS_API_KEY is not set", { status: 500 })
    }

    if (!process.env.ELEVENLABS_AGENT_ID) {
      logger.error("ELEVENLABS_AGENT_ID is not set")
      return new Response("Server configuration error: ELEVENLABS_AGENT_ID is not set", { status: 500 })
    }

    // Check if it's a WebSocket request
    const upgradeHeader = request.headers.get("upgrade")
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      logger.error("Not a WebSocket upgrade request", { upgradeHeader })
      return new Response("Expected WebSocket request", { status: 426 })
    }

    // Create WebSocket pair
    const { 0: clientSocket, 1: serverSocket } = new WebSocketPair()

    // Handle the WebSocket connection
    handleWebSocket(serverSocket)

    // Return the client socket as the response
    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    })
  } catch (error) {
    logger.error("Error in WebSocket stream route", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return new Response("Internal server error in WebSocket handling", { status: 500 })
  }
}

function handleWebSocket(webSocket: WebSocket) {
  let streamSid: string | null = null
  let callSid: string | null = null
  let elevenLabsWs: WebSocket | null = null
  let callData: any = null
  let connectionClosed = false
  let elevenLabsConnectionAttempted = false

  logger.info("WebSocket connection established")

  // Send an initial message to confirm connection
  webSocket.send(
    JSON.stringify({
      type: "connection_acknowledgment",
      message: "WebSocket server connected",
    }),
  )

  // Handle incoming messages
  webSocket.addEventListener("message", async (event) => {
    try {
      const message = JSON.parse(event.data)
      logger.info(`Received event: ${message.event}`, {
        event: message.event,
      })

      switch (message.event) {
        case "start":
          // Extract call data from custom parameters
          streamSid = message.start.streamSid
          callSid = message.start.callSid

          logger.info(`Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}`, {
            streamSid,
            callSid,
          })

          // Extract custom parameters
          const customParameters = message.start.customParameters || {}

          callData = {
            sessionId: customParameters.sessionId || `session_${Date.now()}`,
            phoneNumber: customParameters.phoneNumber || "unknown",
            email: customParameters.email || "unknown",
            firstMessage: customParameters.firstMessage || "Hello, how can I help you?",
            prompt: customParameters.prompt || "You are a helpful assistant.",
            adSpend: Number.parseInt(customParameters.adSpend || "0", 10),
            callbackUrl: customParameters.callbackUrl || process.env.GOHIGHLEVEL_WEBHOOK_URL,
            timestamp: new Date().toISOString(),
          }

          logger.info("Extracted call data from parameters", {
            callData: JSON.stringify({
              sessionId: callData.sessionId,
              phoneNumber: callData.phoneNumber,
              email: callData.email,
            }),
          })

          // Connect to ElevenLabs
          elevenLabsConnectionAttempted = true
          await connectToElevenLabs(webSocket, callData)
          break

        case "media":
          if (!elevenLabsWs) {
            logger.warn("Received media but ElevenLabs WebSocket not connected")

            // Try to connect if we haven't already
            if (!elevenLabsConnectionAttempted && callData) {
              elevenLabsConnectionAttempted = true
              await connectToElevenLabs(webSocket, callData)
            }
          }

          // Forward audio to ElevenLabs
          if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
            const audioMessage = {
              user_audio_chunk: message.media.payload,
            }
            elevenLabsWs.send(JSON.stringify(audioMessage))
            logger.debug("Sent audio chunk to ElevenLabs")
          }
          break

        case "stop":
          logger.info(`Stream ${streamSid} ended`)
          cleanup()
          break
      }
    } catch (error) {
      logger.error("Error processing message", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Handle WebSocket close
  webSocket.addEventListener("close", () => {
    logger.info("WebSocket connection closed")
    connectionClosed = true
    cleanup()
  })

  // Handle WebSocket errors
  webSocket.addEventListener("error", (event) => {
    logger.error("WebSocket error", {
      error: "WebSocket error event",
    })
    cleanup()
  })

  // Connect to ElevenLabs WebSocket
  async function connectToElevenLabs(ws: WebSocket, callData: any) {
    try {
      logger.info("Connecting to ElevenLabs")

      // Get signed URL for ElevenLabs
      const signedUrl = await getElevenLabsSignedUrl()

      // Connect to ElevenLabs
      elevenLabsWs = new WebSocket(signedUrl)

      elevenLabsWs.addEventListener("open", () => {
        logger.info("Connected to ElevenLabs WebSocket")

        // Send initial configuration
        const initialConfig = {
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: {
              prompt: { prompt: callData.prompt },
              first_message: callData.firstMessage,
            },
          },
        }

        elevenLabsWs.send(JSON.stringify(initialConfig))
        logger.info("Sent initial configuration to ElevenLabs")
      })

      elevenLabsWs.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data)
          logger.info(`Received message from ElevenLabs: ${message.type}`)

          switch (message.type) {
            case "audio":
              if (streamSid) {
                if (message.audio?.chunk) {
                  const audioData = {
                    event: "media",
                    streamSid,
                    media: {
                      payload: message.audio.chunk,
                    },
                  }
                  ws.send(JSON.stringify(audioData))
                  logger.info("Sent audio chunk to Twilio")
                } else if (message.audio_event?.audio_base_64) {
                  const audioData = {
                    event: "media",
                    streamSid,
                    media: {
                      payload: message.audio_event.audio_base_64,
                    },
                  }
                  ws.send(JSON.stringify(audioData))
                  logger.info("Sent audio event to Twilio")
                }
              }
              break

            case "interruption":
              if (streamSid) {
                ws.send(
                  JSON.stringify({
                    event: "clear",
                    streamSid,
                  }),
                )
                logger.info("Sent clear event to Twilio")
              }
              break

            case "ping":
              if (message.ping_event?.event_id) {
                elevenLabsWs?.send(
                  JSON.stringify({
                    type: "pong",
                    event_id: message.ping_event.event_id,
                  }),
                )
                logger.debug("Sent pong to ElevenLabs")
              }
              break
          }
        } catch (error) {
          logger.error("Error processing message from ElevenLabs", {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })

      elevenLabsWs.addEventListener("error", () => {
        logger.error("ElevenLabs WebSocket error")
      })

      elevenLabsWs.addEventListener("close", () => {
        logger.info("ElevenLabs WebSocket closed")
        elevenLabsWs = null
      })
    } catch (error) {
      logger.error("Error connecting to ElevenLabs", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Get signed URL for ElevenLabs
  async function getElevenLabsSignedUrl() {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.status}`)
    }

    const data = await response.json()
    return data.signed_url
  }

  // Cleanup function
  function cleanup() {
    if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
      elevenLabsWs.close()
      elevenLabsWs = null
    }

    logger.info("Cleaned up WebSocket resources")
  }
}

// Define WebSocketPair for TypeScript
declare class WebSocketPair {
  0: WebSocket
  1: WebSocket
}
