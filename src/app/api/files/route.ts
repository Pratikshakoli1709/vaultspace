import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { mapRowToAsset } from '@/lib/supabase-mappers';

/**
 * GET /api/files
 * Returns all files for the authenticated user with starred status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Fetch files from database - return ALL files (not filtered by userId)
    // Users can see all files, but starred status is per-user from starred_items table
    const { data: files, error } = await supabaseServer
      .from('data_items')
      .select(`
        id,
        title,
        type,
        file_url,
        link_url,
        text_content,
        storage_path,
        created_by,
        updated_by,
        created_at,
        updated_at,
        folder_id,
        visibility,
        team_id,
        allowed_users,
        profiles:created_by (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch files' },
        { status: 500 }
      );
    }

    // Get starred items from starred_items table for this user
    let starredFileIds: string[] = [];
    try {
      const { data: starredItems } = await supabaseServer
        .from('starred_items')
        .select('item_id')
        .eq('user_id', userId)
        .eq('item_type', 'file');

      starredFileIds = (starredItems || []).map((item) => item.item_id);
    } catch (starredError) {
      // Table might not exist yet - continue without it
      console.warn('Could not fetch starred items:', starredError);
    }

    // Map files and merge starred status
    // starred_items table is the per-user source of truth
    // is_starred column is updated for instant UI feedback but is global, so we don't use it for reading
    const mappedFiles = (files || []).map((file: any) => {
      const enriched = mapRowToAsset(file);
      // Get starred status from starred_items table (per-user source of truth)
      enriched.isStarred = starredFileIds.includes(enriched.id);
      enriched.is_starred = enriched.isStarred; // For backward compatibility
      return enriched;
    });

    return NextResponse.json({
      success: true,
      files: mappedFiles,
    });
  } catch (error) {
    console.error('Error in GET /api/files:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

