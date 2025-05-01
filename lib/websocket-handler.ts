import WebSocket from "ws"
import type { IncomingMessage } from "http"
import type { Socket } from "net"
import { connectToElevenLabs, speakText } from "@/lib/elevenlabs"
import { logger } from "@/lib/logger"

export class WebSocketHandler {
  private wss: WebSocket.Server
  private callData: any
  private audioBuffer: Buffer[] = []
  private elevenLabsWs: WebSocket | null = null
  private keepAliveInterval: NodeJS.Timeout | null = null
  private audioReceived = false

  constructor(callData: any) {
    this.wss = new WebSocket.Server({ noServer: true })
    this.callData = callData

    this.wss.on("connection", this.handleConnection.bind(this))
    logger.info("WebSocket server created", {
      sessionId: this.callData.sessionId,
    })
  }

  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    logger.info("Handling WebSocket upgrade", {
      sessionId: this.callData.sessionId,
    })

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit("connection", ws, request)
    })
  }

  private async handleConnection(ws: WebSocket) {
    logger.info("WebSocket connection established with Twilio", {
      sessionId: this.callData.sessionId,
    })

    // Set up a ping interval to keep the connection alive
    this.setupKeepAlive(ws)

    try {
      // First, connect to ElevenLabs WebSocket for audio streaming
      logger.info("Initiating ElevenLabs WebSocket connection", {
        sessionId: this.callData.sessionId,
        firstMessagePreview:
          this.callData.firstMessage.substring(0, 50) + (this.callData.firstMessage.length > 50 ? "..." : ""),
      })

      this.elevenLabsWs = await connectToElevenLabs(ws, this.callData.firstMessage, this.callData)

      logger.info("ElevenLabs WebSocket connection established", {
        sessionId: this.callData.sessionId,
      })

      // Set a timeout to check if we've received any audio
      setTimeout(() => {
        if (!this.audioReceived) {
          logger.warn("No audio received from ElevenLabs after 5 seconds", {
            sessionId: this.callData.sessionId,
          })

          // Try sending the message again
          if (this.elevenLabsWs && this.elevenLabsWs.readyState === WebSocket.OPEN) {
            logger.info("Attempting to resend first message", {
              sessionId: this.callData.sessionId,
            })
            speakText(this.elevenLabsWs, this.callData.firstMessage, this.callData.sessionId)
          }
        }
      }, 5000)

      // Handle incoming audio from Twilio
      ws.on("message", async (data) => {
        try {
          // Check if this is the first audio data we've received
          if (!this.audioReceived && data instanceof Buffer && data.length > 0) {
            this.audioReceived = true
            logger.info("Received first audio data from Twilio", {
              sessionId: this.callData.sessionId,
              dataSize: data.length,
            })
          }

          // Process the audio data (in a real implementation, this would analyze the audio)
          // For now, we'll just accumulate it
          if (data instanceof Buffer) {
            this.audioBuffer.push(data)

            // If we have enough audio data, we could process it
            // For example, transcribe it and generate a response
            if (this.audioBuffer.length >= 10) {
              this.audioBuffer = [] // Clear the buffer

              // In a real implementation, we would:
              // 1. Transcribe the audio
              // 2. Process the transcription
              // 3. Generate a response
              // 4. Send the response to ElevenLabs for speech synthesis

              // For now, just simulate a response after receiving enough audio
              if (this.elevenLabsWs && this.elevenLabsWs.readyState === WebSocket.OPEN) {
                const simulatedResponse = "I'm listening. Please continue."
                speakText(this.elevenLabsWs, simulatedResponse, this.callData.sessionId)
              }
            }
          }
        } catch (error) {
          logger.error("Error processing audio data from Twilio", {
            error,
            sessionId: this.callData.sessionId,
          })
        }
      })

      // Handle WebSocket close
      ws.on("close", (code, reason) => {
        logger.info("Twilio WebSocket connection closed", {
          code,
          reason: reason.toString(),
          sessionId: this.callData.sessionId,
        })

        this.cleanup()
      })

      // Handle WebSocket errors
      ws.on("error", (error) => {
        logger.error("Twilio WebSocket error", {
          error: error.message,
          sessionId: this.callData.sessionId,
        })
        this.cleanup()
      })
    } catch (error) {
      logger.error("Error in WebSocket connection handler", {
        error,
        sessionId: this.callData.sessionId,
      })
      this.cleanupAndClose(ws, "Error establishing connection")
    }
  }

  private setupKeepAlive(ws: WebSocket) {
    // Send a ping every 30 seconds to keep the connection alive
    this.keepAliveInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        logger.debug("Sending keep-alive ping", {
          sessionId: this.callData.sessionId,
        })
        ws.ping()
      } else {
        this.cleanup()
      }
    }, 30000) // 30 seconds
  }

  private cleanupAndClose(ws: WebSocket, reason: string) {
    logger.info(`Closing WebSocket connection: ${reason}`, {
      sessionId: this.callData.sessionId,
    })

    this.cleanup()

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, reason)
    }
  }

  private cleanup() {
    // Clear keep-alive interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }

    // Close ElevenLabs WebSocket if open
    if (this.elevenLabsWs && this.elevenLabsWs.readyState === WebSocket.OPEN) {
      this.elevenLabsWs.close()
      this.elevenLabsWs = null
    }

    logger.info("Cleaned up WebSocket resources", {
      sessionId: this.callData.sessionId,
    })
  }
}
