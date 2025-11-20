import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { answerQuestion } from '@/lib/ai-service';

// Force load environment variables at module level (Next.js should do this automatically, but this ensures it)
if (typeof process !== 'undefined' && process.env) {
  // Log on module load to verify env vars are available
  console.log('[AI Assistant Route] Module loaded. GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
}

/**
 * AI Assistant API Route
 * Uses Gemini v1beta API with models/text-bison-001 model
 * - Accepts questions from users
 * - Performs text search to find relevant files
 * - Builds prompt with retrieved context
 * - Calls answerQuestion (which uses askGemini)
 * - Returns answer + file references
 * 
 * API key is loaded from GEMINI_API_KEY in .env.local
 * Response is returned as JSON with { success, answer, referencedFiles }
 * 
 * TO UPGRADE TO NEW SDK FOR "gemini-1.5-flash":
 * 1. Update @google/generative-ai: npm install @google/generative-ai@latest
 * 2. In ai-service.ts, change all "models/text-bison-001" to "gemini-1.5-flash"
 * 3. Remove "models/" prefix from all model names
 */

export async function POST(request: NextRequest) {
  let question: string | undefined;
  let userId: string | undefined;
  
  try {
    // Validate API key first - check multiple sources
    // Note: In Next.js API routes, process.env reads from .env.local automatically
    const apiKey = process.env.GEMINI_API_KEY 
      || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      || process.env.GOOGLE_API_KEY;
    
    console.log('[AI Assistant] Environment check:');
    console.log('[AI Assistant] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('[AI Assistant] GEMINI_API_KEY value (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10) || 'NOT FOUND');
    console.log('[AI Assistant] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
    console.log('[AI Assistant] NEXT_PUBLIC_GEMINI_API_KEY exists:', !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    console.log('[AI Assistant] GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
    console.log('[AI Assistant] NODE_ENV:', process.env.NODE_ENV);
    console.log('[AI Assistant] All env vars with GEMINI/GOOGLE:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE')));
    
    if (!apiKey) {
      console.error('[AI Assistant] Missing GEMINI_API_KEY in all sources');
      console.error('[AI Assistant] Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE')).join(', '));
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Gemini API key. The server cannot find GEMINI_API_KEY in environment variables. Please ensure: 1) GEMINI_API_KEY is set in .env.local file (not .env), 2) The file is in the project root, 3) You have restarted the Next.js server after adding the key.',
      }, { status: 500 });
    }
    
    // Validate API key format
    const apiKeyTrimmed = apiKey.trim();
    console.log('[AI Assistant] API key trimmed length:', apiKeyTrimmed.length);
    console.log('[AI Assistant] API key starts with:', apiKeyTrimmed.substring(0, 4));
    
    if (apiKeyTrimmed.length < 10) {
      console.error('[AI Assistant] API key appears invalid (too short):', apiKeyTrimmed.length);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid Gemini API key format',
        answer: 'The Gemini API key format appears invalid. Valid keys typically start with "AIza" and are 39 characters long. Please check your GEMINI_API_KEY in .env.local file and restart the server.'
      }, { status: 500 });
    }
    
    if (!apiKeyTrimmed.startsWith('AIza')) {
      console.warn('[AI Assistant] API key does not start with "AIza":', apiKeyTrimmed.substring(0, 10));
      // Don't fail here - let the API validate it, but log a warning
    }
    
    console.log('[AI Assistant] API key validation passed, length:', apiKeyTrimmed.length, 'starts with:', apiKeyTrimmed.substring(0, 4));

    const body = await request.json();
    question = body.question;
    userId = body.userId;
    const userRole = body.userRole || 'user';

    console.log('[AI Assistant] Received request:', { 
      question: question?.substring(0, 50), 
      userId,
      userRole 
    });

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    // Fetch files with permission filtering
    let filesQuery = supabaseServer
      .from('data_items')
      .select('id, title, type, text_content, created_by, visibility, team_id, allowed_users');

    // Apply permission filters
    if (userRole !== 'admin') {
      filesQuery = filesQuery.or(
        `created_by.eq.${userId},visibility.eq.public,allowed_users.cs.{${userId}}`
      );
    }

    const { data: files, error: filesError } = await filesQuery;

    if (filesError) {
      console.error('[AI Assistant] Error fetching files:', filesError);
      // Continue without files - answer as general AI assistant
    }

    // Filter files that have text content
    const filesWithText = (files || []).filter((file: any) => {
      const hasText = file.text_content || file.extracted_text || file.raw_text;
      return hasText && hasText.trim().length > 0;
    });

    console.log(`[AI Assistant] Found ${filesWithText.length} files with text content`);

    // If no files, answer directly without file context (general AI assistant mode)
    if (!files || files.length === 0 || filesWithText.length === 0) {
      console.log('[AI Assistant] No files found, answering as general AI assistant');
      const { answer } = await answerQuestion(question, []);
      return NextResponse.json({
        success: true,
        answer,
        referencedFiles: [],
        fileDetails: [],
      });
    }

    // Use text-based matching to find relevant files
    const questionLower = question.toLowerCase();
    const relevantFiles = filesWithText
      .map((file: any) => {
        const text = (file.text_content || file.extracted_text || file.raw_text || '').toLowerCase();
        const title = (file.title || '').toLowerCase();
        
        // Simple text matching score
        let score = 0;
        const questionWords = questionLower.split(/\s+/).filter(w => w.length > 2);
        questionWords.forEach((word: string) => {
          if (text.includes(word)) score += 1;
          if (title.includes(word)) score += 2;
        });

        return {
          id: file.id,
          title: file.title,
          extractedText: file.text_content || file.extracted_text || file.raw_text || '',
          similarity: score / Math.max(questionWords.length * 3, 1),
        };
      })
      .filter((item: any) => item.similarity > 0.05)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 5);

    console.log(`[AI Assistant] Found ${relevantFiles.length} relevant files`);

    // If no relevant files found, answer directly without file context
    if (relevantFiles.length === 0) {
      console.log('[AI Assistant] No relevant files found, answering as general AI assistant');
      const { answer } = await answerQuestion(question, []);
      return NextResponse.json({
        success: true,
        answer,
        referencedFiles: [],
        fileDetails: [],
      });
    }

    // Generate answer using AI with file context
    console.log('[AI Assistant] Generating answer with file context...');
    let answerResult;
    try {
      answerResult = await answerQuestion(
        question,
        relevantFiles.map((file: any) => ({
          id: file.id,
          title: file.title,
          extractedText: file.extractedText,
        }))
      );
    } catch (answerError) {
      console.error('[AI Assistant] Error in answerQuestion with files:', answerError);
      // Fallback: try to answer without file context
      try {
      answerResult = await answerQuestion(question, []);
      } catch (fallbackError) {
        console.error('[AI Assistant] Error in fallback answerQuestion:', fallbackError);
        // Re-throw the original error with better context
        throw new Error(
          `Failed to generate AI response: ${answerError instanceof Error ? answerError.message : 'Unknown error'}. ` +
          `Please check: 1) Your GEMINI_API_KEY is set in .env.local file, 2) The API key is valid (should start with "AIza"), 3) You have internet connectivity, 4) Restart your Next.js server after updating .env.local.`
        );
      }
    }

    const { answer, referencedFiles } = answerResult;

    // Return file details for UI display
    const fileDetails = relevantFiles.map((file: any) => {
      const originalFile = files?.find((f: any) => f.id === file.id);
      return {
        id: file.id,
        title: file.title,
        type: originalFile?.type || 'unknown',
      };
    });

    console.log('[AI Assistant] Successfully generated answer');

    return NextResponse.json({
      success: true,
      answer,
      referencedFiles: referencedFiles || relevantFiles.map((f: any) => f.id),
      fileDetails,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[AI Assistant] Error in route:', {
      error: errorMessage,
      stack: errorStack,
      question,
      userId,
    });
    
    // Return error response - don't return error message as "answer" to avoid confusion
    // The frontend will handle displaying the error properly
    return NextResponse.json({
      success: false,
      error: errorMessage,
      // Don't include "answer" field on error - let the frontend handle error display
    }, { status: 500 });
  }
}
