import { NextResponse } from "next/server"
import { listElevenLabsVoices } from "@/lib/elevenlabs"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Listing ElevenLabs voices")

    // List available voices
    const result = await listElevenLabsVoices()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to list ElevenLabs voices",
          error: result.error,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Successfully retrieved ElevenLabs voices",
      voices: result.voices,
    })
  } catch (error) {
    logger.error("Error listing ElevenLabs voices", { error })
    return NextResponse.json(
      {
        success: false,
        message: "Error listing ElevenLabs voices",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
