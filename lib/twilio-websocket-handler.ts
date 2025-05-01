import WebSocket from "ws"
import { logger } from "./logger"
import { getElevenLabsSignedUrl } from "./elevenlabs"

// Handle Twilio WebSocket connection
export async function handleTwilioWebSocket(ws: WebSocket) {
  let streamSid: string | null = null
  let callSid: string | null = null
  let elevenLabsWs: WebSocket | null = null
  let keepAliveInterval: NodeJS.Timeout | null = null
  let callData: any = null
  let connectionClosed = false
  let elevenLabsConnectionAttempted = false

  logger.info("Handling Twilio WebSocket connection - ENHANCED LOGGING ENABLED")

  // Set up a ping interval to keep the connection alive
  keepAliveInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping()
      logger.debug("Sent ping to Twilio WebSocket")
    } else if (!connectionClosed) {
      logger.warn("Twilio WebSocket not open during ping, cleaning up")
      cleanup()
    }
  }, 30000) // 30 seconds

  // Send an initial acknowledgment to confirm the connection is working
  if (ws.readyState === WebSocket.OPEN) {
    try {
      // This is just for debugging - Twilio won't process this message
      ws.send(JSON.stringify({ type: "connection_acknowledgment", message: "WebSocket server connected" }))
      logger.info("Sent connection acknowledgment")
    } catch (error) {
      logger.error("Error sending connection acknowledgment", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Handle messages from Twilio
  ws.on("message", async (message) => {
    try {
      // Log the raw message for debugging
      logger.debug("Received raw message from Twilio", {
        messagePreview: typeof message === "string" ? message.substring(0, 100) : "binary data",
        messageLength: typeof message === "string" ? message.length : (message as Buffer).length,
      })

      const msg = JSON.parse(message.toString())
      logger.info(`Received event from Twilio: ${msg.event}`, {
        event: msg.event,
        messageDetails: JSON.stringify(msg).substring(0, 500),
      })

      switch (msg.event) {
        case "start":
          // Extract call data from custom parameters
          streamSid = msg.start.streamSid
          callSid = msg.start.callSid

          logger.info(`Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}`, {
            streamSid,
            callSid,
            customParameters: JSON.stringify(msg.start.customParameters || {}),
          })

          // Extract custom parameters
          const customParameters = msg.start.customParameters || {}

          // Log all received parameters for debugging
          logger.info("Received custom parameters from Twilio", {
            customParameters: JSON.stringify(customParameters),
          })

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
              firstMessagePreview: callData.firstMessage.substring(0, 50) + "...",
              promptPreview: callData.prompt.substring(0, 50) + "...",
              adSpend: callData.adSpend,
            }),
          })

          // Now that we have the streamSid and call data, connect to ElevenLabs
          elevenLabsConnectionAttempted = true
          await connectToElevenLabs()
          break

        case "media":
          if (!elevenLabsWs) {
            logger.warn("Received media from Twilio but ElevenLabs WebSocket not connected", {
              sessionId: callData?.sessionId,
              elevenLabsConnectionAttempted,
            })

            // If we haven't attempted to connect to ElevenLabs yet, try now
            if (!elevenLabsConnectionAttempted && callData) {
              logger.info("Attempting to connect to ElevenLabs after receiving media")
              elevenLabsConnectionAttempted = true
              await connectToElevenLabs()
            }
          }

          if (elevenLabsWs?.readyState === WebSocket.OPEN) {
            const audioMessage = {
              user_audio_chunk: msg.media.payload, // Already base64 encoded from Twilio
            }
            elevenLabsWs.send(JSON.stringify(audioMessage))
            logger.debug("Sent audio chunk to ElevenLabs", {
              sessionId: callData?.sessionId,
              payloadSize: msg.media.payload.length,
            })
          }
          break

        case "stop":
          logger.info(`Stream ${streamSid} ended`, {
            sessionId: callData?.sessionId,
          })
          cleanup()
          break

        default:
          logger.debug(`Unhandled event from Twilio: ${msg.event}`, {
            sessionId: callData?.sessionId,
          })
      }
    } catch (error) {
      logger.error("Error processing message from Twilio", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        message: typeof message === "string" ? message.substring(0, 100) : "binary data",
      })
    }
  })

  // Handle WebSocket close
  ws.on("close", (code, reason) => {
    logger.info("Twilio WebSocket connection closed", {
      code,
      reason: reason.toString(),
      sessionId: callData?.sessionId,
    })
    connectionClosed = true
    cleanup()
  })

  // Handle WebSocket errors
  ws.on("error", (error) => {
    logger.error("Twilio WebSocket error", {
      error: error.message,
      stack: error.stack,
      sessionId: callData?.sessionId,
    })
    cleanup()
  })

  // Connect to ElevenLabs WebSocket
  async function connectToElevenLabs() {
    if (!callData) {
      logger.error("Cannot connect to ElevenLabs - No call data available")
      return
    }

    try {
      logger.info("Attempting to connect to ElevenLabs", {
        sessionId: callData.sessionId,
      })

      // Get signed URL for ElevenLabs
      const signedUrl = await getElevenLabsSignedUrl()
      logger.info("Got ElevenLabs signed URL", {
        sessionId: callData.sessionId,
        signedUrlPreview: signedUrl.substring(0, 50) + "...",
      })

      // Connect to ElevenLabs using the signed URL
      elevenLabsWs = new WebSocket(signedUrl)

      logger.info("ElevenLabs WebSocket created, waiting for connection", {
        sessionId: callData.sessionId,
      })

      // Handle ElevenLabs WebSocket open
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
              first_message: callData.firstMessage,
            },
          },
        }

        // Send the configuration to ElevenLabs
        elevenLabsWs.send(JSON.stringify(initialConfig))
        logger.info("Sent initial configuration to ElevenLabs", {
          sessionId: callData.sessionId,
          config: JSON.stringify({
            type: "conversation_initiation_client_data",
            promptPreview: callData.prompt.substring(0, 50) + "...",
            firstMessagePreview: callData.firstMessage.substring(0, 50) + "...",
          }),
        })
      })

      // Handle messages from ElevenLabs
      elevenLabsWs.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString())
          logger.info("Received message from ElevenLabs", {
            sessionId: callData.sessionId,
            messageType: message.type,
            messageDetails: JSON.stringify(message).substring(0, 200) + "...",
          })

          switch (message.type) {
            case "conversation_initiation_metadata":
              logger.info("Received initiation metadata from ElevenLabs", {
                sessionId: callData.sessionId,
                metadata: JSON.stringify(message).substring(0, 200) + "...",
              })
              break

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
                  logger.info("Sent audio chunk to Twilio", {
                    sessionId: callData.sessionId,
                    chunkSize: message.audio.chunk.length,
                  })
                } else if (message.audio_event?.audio_base_64) {
                  const audioData = {
                    event: "media",
                    streamSid,
                    media: {
                      payload: message.audio_event.audio_base_64,
                    },
                  }
                  ws.send(JSON.stringify(audioData))
                  logger.info("Sent audio event to Twilio", {
                    sessionId: callData.sessionId,
                    audioSize: message.audio_event.audio_base_64.length,
                  })
                }
              } else {
                logger.warn("Received audio from ElevenLabs but no StreamSid yet", {
                  sessionId: callData.sessionId,
                })
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
                logger.info("Sent clear event to Twilio due to interruption", {
                  sessionId: callData.sessionId,
                })
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
                logger.debug("Sent pong to ElevenLabs", {
                  sessionId: callData.sessionId,
                  eventId: message.ping_event.event_id,
                })
              }
              break

            default:
              logger.debug(`Unhandled message type from ElevenLabs: ${message.type}`, {
                sessionId: callData.sessionId,
                message: JSON.stringify(message).substring(0, 200) + "...",
              })
          }
        } catch (error) {
          logger.error("Error processing message from ElevenLabs", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            sessionId: callData?.sessionId,
            data: typeof data === "string" ? data.substring(0, 100) : "binary data",
          })
        }
      })

      // Handle ElevenLabs WebSocket errors
      elevenLabsWs.on("error", (error) => {
        logger.error("ElevenLabs WebSocket error", {
          error: error.message,
          stack: error.stack,
          sessionId: callData.sessionId,
        })
      })

      // Handle ElevenLabs WebSocket close
      elevenLabsWs.on("close", (code, reason) => {
        logger.info("ElevenLabs WebSocket closed", {
          code,
          reason: reason.toString(),
          sessionId: callData.sessionId,
        })
        elevenLabsWs = null
      })
    } catch (error) {
      logger.error("Error setting up ElevenLabs connection", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: callData.sessionId,
      })
    }
  }

  // Cleanup function
  function cleanup() {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
      keepAliveInterval = null
    }

    if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
      elevenLabsWs.close()
      elevenLabsWs = null
    }

    logger.info("Cleaned up WebSocket resources", {
      sessionId: callData?.sessionId,
    })
  }
}
