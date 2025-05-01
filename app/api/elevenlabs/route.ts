import { type NextRequest, NextResponse } from "next/server"
import { startConversation } from "@/lib/elevenlabs"
import { logger } from "@/lib/logger"

// API route for starting a conversation with ElevenLabs
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { firstMessage, prompt, callData } = body

    // Validate inputs
    if (!firstMessage || !prompt || !callData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Start the conversation
    const result = await startConversation(process.env.ELEVENLABS_AGENT_ID!, firstMessage, prompt, callData)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to start conversation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
    })
  } catch (error) {
    logger.error("Error starting conversation", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
