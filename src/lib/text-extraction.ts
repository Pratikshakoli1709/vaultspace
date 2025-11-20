'use client';

/**
 * Extract text from various file types
 */
export async function extractTextFromFile(
  file: File,
  fileUrl?: string | null
): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // Handle text-based files
    if (fileType.startsWith('text/') || 
        fileName.endsWith('.txt') || 
        fileName.endsWith('.md') ||
        fileName.endsWith('.markdown')) {
      return await file.text();
    }

    // Handle code files
    if (isCodeFile(fileName)) {
      return await file.text();
    }

    // Handle PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractTextFromPDF(file);
    }

    // Handle DOCX files
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')) {
      return await extractTextFromDocx(file);
    }

    // Handle images with OCR
    if (fileType.startsWith('image/')) {
      return await extractTextFromImage(file);
    }

    // Fallback: try to read as text
    try {
      return await file.text();
    } catch {
      return '';
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

/**
 * Check if file is a code file
 */
function isCodeFile(fileName: string): boolean {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh', '.bash',
    '.json', '.xml', '.yaml', '.yml', '.html', '.css', '.scss', '.sass',
    '.vue', '.svelte', '.dart', '.lua', '.r', '.sql', '.pl', '.pm'
  ];
  return codeExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Extract text from PDF (basic implementation)
 * In production, use pdf-parse or pdfjs-dist
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // For now, return empty - will be enhanced with pdf-parse
    // In production, you'd use:
    // const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    // Then extract text from each page
    
    // Placeholder - will be implemented with actual PDF parsing
    const arrayBuffer = await file.arrayBuffer();
    
    // Try to use pdf-parse if available (server-side only)
    // For client-side, we'll need to use a different approach
    return '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Extract text from DOCX
 */
async function extractTextFromDocx(file: File): Promise<string> {
  try {
    // DOCX is a ZIP file containing XML
    // For now, return empty - would need mammoth.js or similar
    // In production, use: const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return '';
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return '';
  }
}

/**
 * Extract text from image using OCR
 */
async function extractTextFromImage(file: File): Promise<string> {
  try {
    // For client-side OCR, we'd use Tesseract.js
    // In production, you'd use:
    // const { createWorker } = await import('tesseract.js');
    // const worker = await createWorker();
    // const { data: { text } } = await worker.recognize(file);
    // await worker.terminate();
    // return text;
    
    // Placeholder - OCR will be implemented server-side via API
    return '';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return '';
  }
}

/**
 * Server-side text extraction (to be called from API route)
 */
export async function extractTextServerSide(
  fileUrl: string,
  fileType: string,
  fileName: string
): Promise<string> {
  try {
    // This will be called from the server-side API route
    // where we have access to pdf-parse, mammoth, tesseract, etc.
    
    // For now, return empty - actual implementation will be in the API route
    return '';
  } catch (error) {
    console.error('Error in server-side text extraction:', error);
    return '';
  }
}


