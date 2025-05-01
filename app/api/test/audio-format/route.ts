import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Testing audio format compatibility")

    // Get ElevenLabs voice settings
    const response = await fetch("https://api.elevenlabs.io/v1/voices/settings/default", {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to get ElevenLabs voice settings", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      return NextResponse.json(
        {
          success: false,
          message: "Failed to get ElevenLabs voice settings",
          error: `API error: ${response.status} - ${errorText}`,
        },
        { status: 400 },
      )
    }

    const data = await response.json()

    // Return information about audio format compatibility
    return NextResponse.json({
      success: true,
      message: "Audio format information",
      twilioFormat: {
        format: "μ-law",
        sampleRate: "8kHz",
        encoding: "base64",
      },
      elevenLabsFormat: {
        format: "MP3", // ElevenLabs typically uses MP3
        sampleRate: "24kHz", // ElevenLabs typically uses 24kHz
        encoding: "base64",
      },
      compatibility: "ElevenLabs automatically handles format conversion for Twilio compatibility",
      voiceSettings: data,
    })
  } catch (error) {
    logger.error("Error testing audio format compatibility", { error })
    return NextResponse.json(
      {
        success: false,
        message: "Error testing audio format compatibility",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
