import { type NextRequest, NextResponse } from "next/server"
import { makeOutboundCall } from "@/lib/twilio"
import { isValidPhoneNumber, isValidEmail, generateSessionId } from "@/lib/utils"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const formData = await request.formData()
    const phoneNumber = formData.get("phoneNumber") as string
    const email = formData.get("email") as string
    const firstMessage = formData.get("firstMessage") as string
    const prompt = formData.get("prompt") as string
    const adSpend = formData.get("adSpend") as string

    // Validate inputs
    if (!phoneNumber || !email || !firstMessage || !prompt || !adSpend) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Generate a unique session ID for this call
    const sessionId = generateSessionId()

    // Store call data in session (in a real app, use a database)
    // For this example, we'll pass data via query parameters
    const callData = {
      sessionId,
      phoneNumber,
      email,
      firstMessage,
      prompt,
      adSpend: Number.parseInt(adSpend, 10),
      timestamp: new Date().toISOString(),
    }

    // Construct WebSocket URL with query parameters
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const websocketUrl =
      `${baseUrl.replace("http", "ws")}/api/stream?` +
      new URLSearchParams({
        sessionId,
        phoneNumber,
        email,
        firstMessage: encodeURIComponent(firstMessage),
        prompt: encodeURIComponent(prompt),
        adSpend,
      }).toString()

    logger.info("Initiating outbound call", {
      phoneNumber,
      email,
      sessionId,
    })

    // Make the outbound call
    const callResult = await makeOutboundCall(phoneNumber, websocketUrl)

    if (!callResult.success) {
      logger.error("Failed to initiate call", callResult.error)
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 })
    }

    logger.info("Call initiated successfully", {
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
    logger.error("Unexpected error in call API", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
