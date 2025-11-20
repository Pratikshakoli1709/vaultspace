import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabaseClient';
import { generateEmbedding, classifyDocument, generateTags, generateSummary } from '@/lib/ai-service';

// Dynamic import for pdf-parse (server-side only)
async function parsePDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const pdfData = await pdfParse.default(Buffer.from(arrayBuffer));
    return pdfData.text || '';
  } catch (error) {
    console.warn('PDF parsing not available or failed:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, textContent, fileType } = body;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    // Get file from database
    const { data: file, error: fileError } = await supabase
      .from('data_items')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (fileError || !file) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // Extract text - try multiple sources
    let extractedText = textContent || file.text_content || '';

    // If no text content, try to extract from file URL (for PDFs, images, etc.)
    if (!extractedText && file.file_url && (file.type === 'document' || file.type === 'image')) {
      try {
        // Fetch file and extract text
        const response = await fetch(file.file_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          
          // Try PDF parsing
          if (file.type === 'document' && file.file_url.endsWith('.pdf')) {
            extractedText = await parsePDF(arrayBuffer);
          }
          
          // TODO: Add OCR for images using Tesseract.js or Google Vision API
          // if (file.type === 'image' && !extractedText) {
          //   extractedText = await extractTextFromImageOCR(arrayBuffer);
          // }
          
          // For images, OCR would be implemented here
          // For now, we'll rely on text_content being provided
        }
      } catch (fetchError) {
        console.warn('Failed to fetch file for text extraction:', fetchError);
      }
    }

    // If still no text content, return early
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No text content to process',
        data: {
          embedding: null,
          category: 'Misc',
          tags: [],
          summary: '',
          extractedText: '',
        },
      });
    }

    // Process AI features in parallel
    const [embedding, category, tags, summary] = await Promise.all([
      generateEmbedding(extractedText).catch(() => null),
      classifyDocument(extractedText),
      generateTags(extractedText),
      generateSummary(extractedText),
    ]);

    // Update file with AI data
    const updateData: any = {
      raw_text: extractedText, // Store raw extracted text
      extracted_text: extractedText, // Also store in extracted_text for backward compatibility
      category,
      tags,
      ai_summary: summary,
      updated_at: new Date().toISOString(),
    };

    // Only add embedding if it was generated successfully
    // For Supabase with pgvector, format as PostgreSQL array: '{1,2,3}'
    if (embedding) {
      updateData.embedding = `{${embedding.join(',')}}`;
    }

    const { error: updateError } = await supabase
      .from('data_items')
      .update(updateData)
      .eq('id', fileId);

    if (updateError) {
      console.error('Error updating file with AI data:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update file with AI data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        embedding: embedding ? 'generated' : null,
        category,
        tags,
        summary,
        extractedText,
      },
    });
  } catch (error) {
    console.error('Error processing file for AI:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

