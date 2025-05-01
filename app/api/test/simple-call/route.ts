import { type NextRequest, NextResponse } from "next/server"
import { makeOutboundCall } from "@/lib/twilio"
import { isValidPhoneNumber, isValidEmail, generateSessionId } from "@/lib/utils"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { phoneNumber, email, firstMessage, prompt } = body

    // Validate inputs
    if (!phoneNumber || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use E.164 format (e.g., +447404898380)" },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Generate a unique session ID for this call
    const sessionId = generateSessionId()

    // Store call data
    const callData = {
      sessionId,
      phoneNumber,
      email,
      firstMessage: firstMessage || "This is a test call.",
      prompt: prompt || "You are a helpful assistant.",
      adSpend: 0,
      timestamp: new Date().toISOString(),
    }

    logger.info("Initiating test call", {
      phoneNumber,
      email,
      sessionId,
    })

    // Make the outbound call
    const callResult = await makeOutboundCall(phoneNumber, callData)

    if (!callResult.success) {
      logger.error("Failed to initiate test call", callResult.error)
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 })
    }

    logger.info("Test call initiated successfully", {
      callSid: callResult.callSid,
      sessionId,
    })

    return NextResponse.json({
      success: true,
      message: "Call initiated successfully",
      callSid: callResult.callSid,
      sessionId,
    })
  } catch (error) {
    logger.error("Unexpected error in test call API", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
