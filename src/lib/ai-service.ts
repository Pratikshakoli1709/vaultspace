import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EnrichedDataItem } from './types';

/**
 * AI Assistant - answer questions using file context with Gemini
 * Loads API key dynamically at runtime inside the function
 * 
 * CURRENT SETUP: Using v1beta API with "models/text-bison-001"
 * 
 * TO UPGRADE TO NEW SDK FOR "gemini-1.5-flash":
 * 1. Update @google/generative-ai to latest version: npm install @google/generative-ai@latest
 * 2. Change model from "models/text-bison-001" to "gemini-1.5-flash" or "gemini-1.5-pro"
 * 3. The new SDK supports models like:
 *    - "gemini-1.5-flash" (fast, cost-effective)
 *    - "gemini-1.5-pro" (more capable)
 *    - "gemini-pro" (standard)
 * 4. Remove the "models/" prefix - new SDK uses just the model name
 * 5. Example: model: "gemini-1.5-flash" instead of model: "models/text-bison-001"
 */
/**
 * Validates Gemini API key format
 * Valid keys typically start with "AIza" for Google API keys
 */
function validateApiKey(apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }
  
  // Gemini API keys typically start with "AIza" (39 characters total)
  // But we'll accept any non-empty key and let the API validate it
  return apiKey.trim().length > 10;
}

export async function answerQuestion(
  question: string, 
  files: Array<{ id: string; title: string; extractedText: string }>
): Promise<{ answer: string; referencedFiles: string[] }> {
  try {
    if (!question || question.trim().length === 0) {
      return { answer: 'Please provide a question.', referencedFiles: [] };
    }

    // Load env inside function (dynamic runtime)
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    console.log('[answerQuestion] Environment variable check:');
    console.log('[answerQuestion] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('[answerQuestion] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
    console.log('[answerQuestion] GEMINI_API_KEY first 10 chars:', process.env.GEMINI_API_KEY?.substring(0, 10) || 'NOT FOUND');

    if (!apiKey) {
      const errorMsg = "Missing Gemini API key. Please set GEMINI_API_KEY in your .env.local file and RESTART your Next.js server (stop and start again). Environment variables are only loaded when the server starts.";
      console.error('[answerQuestion]', errorMsg);
      throw new Error(errorMsg);
    }

    const apiKeyTrimmed = apiKey.trim();
    console.log('[answerQuestion] API key found, trimmed length:', apiKeyTrimmed.length, 'starts with:', apiKeyTrimmed.substring(0, 4));

    if (!validateApiKey(apiKeyTrimmed)) {
      const errorMsg = `Invalid Gemini API key format. Found key with length ${apiKeyTrimmed.length}. Gemini API keys typically start with 'AIza' and are 39 characters long. Please check your GEMINI_API_KEY in .env.local file and restart the server.`;
      console.error('[answerQuestion]', errorMsg);
      throw new Error(errorMsg);
    }

    // Using v1beta API - model name must include "models/" prefix
    // For new SDK upgrade, change to: model: "gemini-1.5-flash"
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash",
    });

    let contextText = "";
    if (files.length > 0) {
      contextText =
        files
          .map((f) => `FILE: ${f.title}\n${f.extractedText?.substring(0, 3000) || 'No content'}\n`)
          .join("\n\n") || "";
    }

    // Build dynamic prompt based on user's actual question
    const prompt = contextText
      ? `You are an AI assistant helping users find information in their files. Answer questions based on the provided file context when relevant, but you can also use your general knowledge to provide comprehensive answers.

User question: ${question}

Relevant file context:
${contextText}

Provide a helpful and comprehensive answer. If the question can be answered using the file context, prioritize that. Otherwise, use your general knowledge to answer. When referencing information from files, mention which file it came from.`
      : `You are a helpful AI assistant. Answer the following question comprehensively and accurately.

Question: ${question}

Provide a clear, helpful, and comprehensive answer.`;

    console.log('[answerQuestion] Calling Gemini API with question:', question.substring(0, 50), '...', 'files:', files.length);
    
    // Actually call the Gemini API - this generates dynamic responses based on user query
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    if (!response) {
      throw new Error('Gemini API returned an empty response.');
    }
    
    const answer = response.text().trim();
    
    if (!answer || answer.length === 0) {
      throw new Error('Gemini API returned an empty answer.');
    }

    console.log('[answerQuestion] Successfully generated answer, length:', answer.length);

    return {
      answer,
      referencedFiles: files.map((f) => f.id),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error('[answerQuestion] Error details:', {
      message: errorMessage,
      details: errorDetails,
      question: question.substring(0, 50),
    });
    
    // Check for specific API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('API_KEY') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      throw new Error('Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in .env.local file. The key should start with "AIza" and be 39 characters long. Make sure to restart your Next.js server after updating the .env.local file.');
    }
    
    // Re-throw the error so the route handler can handle it properly
    throw error;
  }
}

/**
 * Ask Gemini a question using models/text-bison-001 (v1beta API)
 * Loads API key dynamically at runtime from GEMINI_API_KEY in .env.local
 * 
 * TO UPGRADE TO NEW SDK:
 * 1. Update package: npm install @google/generative-ai@latest
 * 2. Change model type to: model?: 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-pro'
 * 3. Change default model to: 'gemini-1.5-flash' (remove "models/" prefix)
 */
export async function askGemini(
  question: string,
  options?: {
    model?: 'models/gemini-2.0-flash';
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<string> {
  try {
    // Load API key from .env.local - GEMINI_API_KEY is loaded automatically by Next.js
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("Missing Gemini API key. Please set GEMINI_API_KEY in your .env.local file and restart the server.");
    }

    if (!validateApiKey(apiKey)) {
      throw new Error("Invalid Gemini API key format. Gemini API keys typically start with 'AIza' and are 39 characters long.");
    }

    // Using v1beta API - model name must include "models/" prefix
    // For new SDK upgrade, change to: const modelName = options?.model || 'gemini-1.5-flash';
    const modelName = options?.model || 'models/text-bison-001';
    console.log(`[askGemini] Using model: ${modelName}, API key loaded`);

    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 2000,
      },
    });

    // Actually call the Gemini API - generates dynamic response based on question
    const result = await model.generateContent(question);
    const response = result.response;
    
    if (!response) {
      throw new Error('Gemini API returned an empty response.');
    }
    
    const text = response.text().trim();

    if (!text || text.length === 0) {
      throw new Error('Gemini API returned an empty response.');
    }

    return text;
  } catch (error: unknown) {
    const errorObj = error as { message?: string; status?: number; statusCode?: number; code?: string };
    
    console.error('[askGemini] Error:', {
      message: errorObj?.message,
      status: errorObj?.status,
      code: errorObj?.code,
    });

    if (errorObj?.message?.includes('API key') || errorObj?.message?.includes('API_KEY') || errorObj?.status === 401 || errorObj?.statusCode === 401) {
      throw new Error('Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in .env.local file. The key should start with "AIza" and be 39 characters long.');
    }
    
    if (errorObj?.status === 404 || errorObj?.statusCode === 404 || errorObj?.message?.includes('not found')) {
      throw new Error(`Gemini model not found. Please check: 1) Your API key has access to Gemini models, 2) The model name is correct.`);
    }
    
    if (errorObj?.status === 429 || errorObj?.statusCode === 429) {
      throw new Error('Gemini API rate limit exceeded. Please try again in a moment.');
    }
    
    if (errorObj?.status === 400 || errorObj?.statusCode === 400) {
      throw new Error(`Invalid request to Gemini API: ${errorObj?.message || 'Bad request'}`);
    }
    
    if (errorObj?.status === 403 || errorObj?.statusCode === 403) {
      throw new Error('Access denied. Please check your Gemini API key permissions.');
    }

    throw new Error(`Gemini API error: ${errorObj?.message || 'Unknown error occurred'}`);
  }
}

// Categories for classification
const CATEGORIES = [
  'Engineering',
  'HR',
  'Legal',
  'DevOps',
  'Finance',
  'Marketing',
  'Contracts',
  'API Keys',
  'Misc',
];

/**
 * Generate embedding for text using Gemini
 * Loads API key dynamically at runtime
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for embedding generation');
    }

    // Load env inside function (dynamic runtime)
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("Missing Gemini API key for embedding generation");
    }

    const truncatedText = text.length > 6000 ? text.substring(0, 6000) : text;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const result = await model.embedContent(truncatedText);
    const embedding = result.embedding?.values || [];

    if (embedding.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Classify document into category using Gemini
 */
export async function classifyDocument(text: string): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      return 'Misc';
    }

    const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;

    const prompt = `You are a document classifier. Classify the following document into one of these categories: ${CATEGORIES.join(', ')}. Respond with ONLY the category name, nothing else.

Document content:
${truncatedText}`;

    // Using v1beta API model - for new SDK, change to: model: 'gemini-1.5-flash'
    const categoryText = await askGemini(prompt, {
      model: 'models/gemini-2.0-flash',
      temperature: 0.3,
      maxOutputTokens: 50,
    });

    const category = categoryText.trim() || 'Misc';
    const validCategory = CATEGORIES.includes(category) ? category : 'Misc';
    return validCategory;
  } catch (error) {
    console.error('Error classifying document:', error);
    return 'Misc';
  }
}

/**
 * Generate document summary using Gemini
 */
export async function generateSummary(text: string): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      return '';
    }

    const truncatedText = text.length > 4000 ? text.substring(0, 4000) : text;

    const prompt = `You are a document summarizer. Create a concise, informative summary (2-3 sentences) of the following document.

Document content:
${truncatedText}`;

    // Using v1beta API model - for new SDK, change to: model: 'gemini-1.5-flash'
    const summary = await askGemini(prompt, {
      model: 'models/gemini-2.0-flash',
      temperature: 0.5,
      maxOutputTokens: 150,
    });
    
    return summary || '';
  } catch (error) {
    console.error('Error generating summary:', error);
    return '';
  }
}

/**
 * Generate tags for document using Gemini
 */
export async function generateTags(text: string): Promise<string[]> {
  try {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;

    const prompt = `You are a tag generator. Generate 5-10 high-quality, relevant tags for this document. Return ONLY a comma-separated list of tags, nothing else. Tags should be lowercase and use hyphens for spaces (e.g., "api-key", "user-authentication").

Document content:
${truncatedText}`;

    // Using v1beta API model - for new SDK, change to: model: 'gemini-1.5-flash'
    const tagsString = await askGemini(prompt, {
      model: 'models/gemini-2.0-flash',
      temperature: 0.7,
      maxOutputTokens: 100,
    });
    
    const tags = tagsString
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .slice(0, 10);

    return tags;
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
}

/**
 * Process file for AI features (extract text, generate embeddings, etc.)
 */
export async function processFileForAI(
  fileId: string,
  textContent: string | null,
  fileUrl: string | null,
  fileType: string
): Promise<{
  embedding: number[] | null;
  category: string;
  tags: string[];
  summary: string;
  extractedText: string;
}> {
  let extractedText = textContent || '';

  if (!extractedText || extractedText.trim().length === 0) {
    return {
      embedding: null,
      category: 'Misc',
      tags: [],
      summary: '',
      extractedText: '',
    };
  }

  // Generate AI features in parallel
  const [embedding, category, tags, summary] = await Promise.allSettled([
    generateEmbedding(extractedText).catch(() => null),
    classifyDocument(extractedText),
    generateTags(extractedText),
    generateSummary(extractedText),
  ]);

  return {
    embedding: embedding.status === 'fulfilled' ? embedding.value : null,
    category: category.status === 'fulfilled' ? category.value : 'Misc',
    tags: tags.status === 'fulfilled' ? tags.value : [],
    summary: summary.status === 'fulfilled' ? summary.value : '',
    extractedText,
  };
}
