import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { sendToGoHighLevel } from "@/lib/gohighlevel"

// Webhook endpoint for receiving call status updates from Twilio
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()

    // Extract call data
    const callSid = body.CallSid
    const callStatus = body.CallStatus
    const sessionId = body.sessionId

    logger.info("Received webhook from Twilio", {
      callSid,
      callStatus,
      sessionId,
    })

    // If call is completed, send data to Go High Level
    if (callStatus === "completed") {
      // In a real application, you would retrieve call data from a database
      // For this example, we'll just send basic information
      await sendToGoHighLevel({
        callSid,
        callStatus,
        sessionId,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error processing webhook", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
