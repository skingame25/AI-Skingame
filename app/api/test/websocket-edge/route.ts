import { logger } from "@/lib/logger"

// Use Edge Runtime to support WebSockets
export const runtime = "edge"

export async function GET(request: Request) {
  try {
    logger.info("Testing WebSocket connectivity (Edge)")

    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Construct the WebSocket URL
    const wsUrl = `${baseUrl.replace("http", "ws")}/api/stream`

    logger.info(`Testing WebSocket connection to ${wsUrl}`)

    // Create a WebSocket connection
    const ws = new WebSocket(wsUrl)

    // Set up a promise to handle the connection
    const connectionPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
      // Handle successful connection
      ws.addEventListener("open", () => {
        logger.info("WebSocket connection established successfully")

        // Send a test message
        ws.send(JSON.stringify({ type: "test", message: "Hello from test client" }))

        // Wait for a response or timeout
        setTimeout(() => {
          ws.close()
          resolve({
            success: true,
            message: "WebSocket connection established successfully",
          })
        }, 1000)
      })

      // Handle connection errors
      ws.addEventListener("error", () => {
        logger.error("WebSocket connection error")
        resolve({
          success: false,
          message: "Failed to establish WebSocket connection",
        })
      })

      // Set a timeout
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          resolve({
            success: false,
            message: "Connection timed out after 5 seconds",
          })
        }
      }, 5000)
    })

    // Wait for the connection result
    const result = await connectionPromise

    // Return the result
    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        testedUrl: wsUrl,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    logger.error("Error testing WebSocket connectivity", {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(
      JSON.stringify({
        success: false,
        message: "Error testing WebSocket connectivity",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
