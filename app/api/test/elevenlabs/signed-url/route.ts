import { NextResponse } from "next/server"
import { getElevenLabsSignedUrl } from "@/lib/elevenlabs"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    logger.info("Testing ElevenLabs signed URL")

    // Get signed URL
    const signedUrl = await getElevenLabsSignedUrl()

    return NextResponse.json({
      success: true,
      message: "Successfully retrieved ElevenLabs signed URL",
      signedUrl: signedUrl.substring(0, 50) + "...", // Only show part of the URL for security
    })
  } catch (error) {
    logger.error("Error getting ElevenLabs signed URL", { error })
    return NextResponse.json(
      {
        success: false,
        message: "Error getting ElevenLabs signed URL",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
