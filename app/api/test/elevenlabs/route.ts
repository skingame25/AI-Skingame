import { NextResponse } from "next/server"
import { testElevenLabsApiKey } from "@/lib/elevenlabs"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Testing ElevenLabs API key")

    // Test the ElevenLabs API key
    const result = await testElevenLabsApiKey()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "ElevenLabs API key test failed",
          error: result.error,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "ElevenLabs API key is valid",
      data: result.data,
    })
  } catch (error) {
    logger.error("Error testing ElevenLabs API key", { error })
    return NextResponse.json(
      {
        success: false,
        message: "Error testing ElevenLabs API key",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
