import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Testing ElevenLabs Conversational API")

    // Test the ElevenLabs Conversational API
    const response = await fetch(`https://api.elevenlabs.io/v1/conversation/${process.env.ELEVENLABS_AGENT_ID}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        conversation_initiation_client_data: {
          prompt: "You are a helpful assistant.",
          first_message: "Hello, how can I help you today?",
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("ElevenLabs Conversational API test failed", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      return NextResponse.json(
        {
          success: false,
          message: "ElevenLabs Conversational API test failed",
          error: `API error: ${response.status} - ${errorText}`,
        },
        { status: 400 },
      )
    }

    const data = await response.json()
    logger.info("ElevenLabs Conversational API test successful", {
      conversationId: data.conversation_id,
    })

    return NextResponse.json({
      success: true,
      message: "ElevenLabs Conversational API test successful",
      data,
    })
  } catch (error) {
    logger.error("Error testing ElevenLabs Conversational API", { error })
    return NextResponse.json(
      {
        success: false,
        message: "Error testing ElevenLabs Conversational API",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
