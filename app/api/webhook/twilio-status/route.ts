import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()

    // Extract call status information
    const callSid = formData.get("CallSid") as string
    const callStatus = formData.get("CallStatus") as string
    const callDuration = formData.get("CallDuration") as string

    logger.info("Received Twilio call status update", {
      callSid,
      callStatus,
      callDuration,
    })

    // Return a success response
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error processing Twilio status webhook", { error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
