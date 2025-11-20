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

    // Get user's team memberships
    const { data: teamMemberships, error: teamError } = await supabaseServer
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    
    if (teamError) {
      console.warn('Error fetching team memberships:', teamError);
    }
    
    const userTeamIds = (teamMemberships || []).map((tm) => tm.team_id);
    console.log(`User ${userId} is member of teams:`, userTeamIds);

    // Fetch files from database
    // Filter: show all non-team files OR team files where user is a member
    // Use separate queries and combine for better reliability
    let files: any[] = [];
    let error: any = null;

    if (userTeamIds.length > 0) {
      // Fetch non-team files (team_id is null)
      const { data: nonTeamFiles, error: nonTeamError } = await supabaseServer
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
        .is('team_id', null)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      // Fetch team files where user is a member
      const { data: teamFiles, error: teamError } = await supabaseServer
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
        .in('team_id', userTeamIds)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      // Log errors but continue with available data
      if (nonTeamError) {
        console.error('Error fetching non-team files:', nonTeamError);
      }
      if (teamError) {
        console.error('Error fetching team files:', teamError);
      }

      // Set error only if both queries failed
      if (nonTeamError && teamError) {
        error = teamError; // Use the last error
      }

      // Combine both results (use empty array if query failed)
      files = [...(nonTeamFiles || []), ...(teamFiles || [])];
      
      // Remove duplicates (in case of any overlap)
      const uniqueFiles = Array.from(
        new Map(files.map((file) => [file.id, file])).values()
      );
      files = uniqueFiles;
      
      // Sort by updated_at descending
      files.sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.updated_at || b.created_at).getTime();
        return bTime - aTime;
      });
      
      console.log(`Combined ${nonTeamFiles?.length || 0} non-team files + ${teamFiles?.length || 0} team files = ${files.length} total files`);
    } else {
      // If user is not in any teams, only show non-team files
      const { data: nonTeamFiles, error: nonTeamError } = await supabaseServer
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
        .is('team_id', null)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });
      
      files = nonTeamFiles || [];
      error = nonTeamError;
    }

    if (error) {
      console.error('Error fetching files:', error);
      console.error('Query details:', { userTeamIds, userId });
    } else {
      console.log(`Fetched ${files?.length || 0} files for user ${userId}`);
      // Log team documents found
      const teamDocs = files?.filter(f => f.team_id) || [];
      if (teamDocs.length > 0) {
        console.log(`Found ${teamDocs.length} team documents:`, teamDocs.map(d => ({ id: d.id, title: d.title, team_id: d.team_id })));
      }
    }

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

