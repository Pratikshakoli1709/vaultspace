import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabaseClient';
import { generateEmbedding } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId, userRole } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Search query is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Build query with permission filtering
    // Note: For vector similarity search, we'll use a different approach
    // First get all files user can access, then calculate similarity in the API
    let filesQuery = supabase
      .from('data_items')
      .select('id, title, type, category, tags, ai_summary, embedding, created_by, visibility, team_id, allowed_users')
      .not('embedding', 'is', null); // Only files with embeddings

    // Apply permission filters
    if (userRole !== 'admin') {
      // Users can only see their own files, public files, or files shared with them
      filesQuery = filesQuery.or(
        `created_by.eq.${userId},visibility.eq.public,allowed_users.cs.{${userId}}`
      );
    }

    const { data: files, error: filesError } = await filesQuery;

    if (filesError) {
      console.error('Error fetching files:', filesError);
      return NextResponse.json({ success: false, error: 'Failed to fetch files' }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Calculate cosine similarity for each file
    const results = files
      .map((file: any) => {
        let fileEmbedding: number[] | null = null;
        
        if (file.embedding) {
          if (typeof file.embedding === 'string') {
            // Parse PostgreSQL array format: '{1,2,3}' or JSON array
            try {
              // Try JSON first
              fileEmbedding = JSON.parse(file.embedding);
            } catch {
              // Try PostgreSQL array format
              try {
                const cleaned = file.embedding.replace(/[{}]/g, '');
                fileEmbedding = cleaned.split(',').map(Number);
              } catch {
                return null;
              }
            }
          } else if (Array.isArray(file.embedding)) {
            fileEmbedding = file.embedding;
          }
        }

        if (!fileEmbedding || fileEmbedding.length === 0) {
          return null;
        }

        const similarity = cosineSimilarity(queryEmbedding, fileEmbedding);
        return {
          id: file.id,
          title: file.title,
          type: file.type,
          category: file.category,
          tags: file.tags,
          ai_summary: file.ai_summary,
          similarity,
        };
      })
      .filter((item: any) => item !== null && item.similarity > 0.5) // Threshold for relevance
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 20); // Top 20 results

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in semantic search:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
