import { type NextRequest, NextResponse } from "next/server"
import { makeOutboundCall } from "@/lib/twilio"
import { isValidPhoneNumber, isValidEmail, generateSessionId } from "@/lib/utils"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Parse request body from Go High Level webhook
    const body = await request.json()

    // Extract data from the webhook payload
    const {
      phoneNumber,
      email,
      firstMessage,
      prompt,
      adSpend = 0, // Default to 0 if not provided
      callbackUrl = process.env.GOHIGHLEVEL_WEBHOOK_URL, // Use env var as default
    } = body

    // Validate required fields
    if (!phoneNumber || !email || !firstMessage || !prompt) {
      logger.error("Missing required fields in webhook payload", { body })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate phone number and email
    if (!isValidPhoneNumber(phoneNumber)) {
      logger.error("Invalid phone number format", { phoneNumber })
      return NextResponse.json(
        { error: "Invalid phone number format. Use E.164 format (e.g., +44123456789)" },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      logger.error("Invalid email format", { email })
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Generate a unique session ID for this call
    const sessionId = generateSessionId()

    // Store call data
    const callData = {
      sessionId,
      phoneNumber,
      email,
      firstMessage,
      prompt,
      adSpend: typeof adSpend === "number" ? adSpend : Number.parseInt(adSpend as string, 10) || 0,
      timestamp: new Date().toISOString(),
      callbackUrl: callbackUrl || process.env.GOHIGHLEVEL_WEBHOOK_URL,
    }

    logger.info("Initiating outbound call from webhook", {
      phoneNumber,
      email,
      sessionId,
    })

    // Make the outbound call
    const callResult = await makeOutboundCall(phoneNumber, callData)

    if (!callResult.success) {
      logger.error("Failed to initiate call from webhook", callResult.error)
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 })
    }

    logger.info("Call initiated successfully from webhook", {
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
    logger.error("Unexpected error in webhook API", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
