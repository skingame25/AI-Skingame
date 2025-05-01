import { NextResponse } from "next/server"
import WebSocket from "ws"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Testing WebSocket connectivity")

    // Get the base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // Construct the WebSocket URL
    const wsUrl = `${baseUrl.replace("http", "ws")}/api/stream`

    logger.info(`Testing WebSocket connection to ${wsUrl}`)

    // Test the WebSocket connection
    const testResult = await testWebSocketConnection(wsUrl)

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: "WebSocket connection test successful",
        details: testResult.details,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "WebSocket connection test failed",
          error: testResult.error,
          details: testResult.details,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error("Error testing WebSocket connectivity", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        message: "Error testing WebSocket connectivity",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function testWebSocketConnection(url: string): Promise<{
  success: boolean
  error?: string
  details?: any
}> {
  return new Promise((resolve) => {
    try {
      logger.info(`Attempting to connect to WebSocket at ${url}`)

      const ws = new WebSocket(url)
      let connectionTimeout: NodeJS.Timeout

      // Set a timeout for the connection attempt
      connectionTimeout = setTimeout(() => {
        logger.error("WebSocket connection attempt timed out")
        ws.terminate()
        resolve({
          success: false,
          error: "Connection timed out after 5 seconds",
          details: {
            url,
            readyState: ws.readyState,
          },
        })
      }, 5000)

      // Handle successful connection
      ws.on("open", () => {
        logger.info("WebSocket connection established successfully")
        clearTimeout(connectionTimeout)

        // Send a test message
        ws.send(JSON.stringify({ type: "test", message: "Hello from test client" }))

        // Close the connection after a short delay
        setTimeout(() => {
          ws.close()
          resolve({
            success: true,
            details: {
              url,
              readyState: "OPEN (1)",
              message: "Connection established and test message sent",
            },
          })
        }, 1000)
      })

      // Handle connection errors
      ws.on("error", (error) => {
        logger.error("WebSocket connection error", {
          error: error.message,
          stack: error.stack,
        })
        clearTimeout(connectionTimeout)
        resolve({
          success: false,
          error: `Connection error: ${error.message}`,
          details: {
            url,
            readyState: ws.readyState,
          },
        })
      })

      // Handle connection close
      ws.on("close", (code, reason) => {
        logger.info("WebSocket connection closed", {
          code,
          reason: reason.toString(),
        })
      })
    } catch (error) {
      logger.error("Error in WebSocket test", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      resolve({
        success: false,
        error: `Test error: ${error instanceof Error ? error.message : String(error)}`,
        details: { url },
      })
    }
  })
}
