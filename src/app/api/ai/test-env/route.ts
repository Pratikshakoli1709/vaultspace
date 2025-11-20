import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify environment variables are loaded
 * Access at: /api/ai/test-env
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const apiKeyLength = apiKey?.length || 0;
  const apiKeyStart = apiKey?.substring(0, 10) || 'NOT FOUND';
  
  return NextResponse.json({
    success: true,
    hasApiKey: !!apiKey,
    apiKeyLength,
    apiKeyStart,
    allGeminiEnvVars: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE')),
    nodeEnv: process.env.NODE_ENV,
  });
}

