import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
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

    // Get Supabase client (with error handling)
    let supabaseServer;
    try {
      supabaseServer = getSupabaseServer();
    } catch (supabaseError: any) {
      console.error('❌ CRITICAL: Failed to initialize Supabase:', supabaseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed. Please check environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).',
          details: process.env.NODE_ENV === 'development' ? supabaseError.message : undefined
        },
        { status: 500 }
      );
    }

    // Get user's team memberships (handle case where table might not exist)
    let userTeamIds: string[] = [];
    try {
      const { data: teamMemberships, error: teamError } = await supabaseServer
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
      
      if (teamError) {
        // If table doesn't exist, that's okay - user just has no teams
        if (teamError.code === '42P01' || teamError.message?.includes('does not exist')) {
          console.warn('team_members table does not exist, assuming user has no teams');
        } else {
          console.warn('Error fetching team memberships:', teamError);
        }
      } else {
        userTeamIds = (teamMemberships || []).map((tm) => tm.team_id);
      }
    } catch (teamErr) {
      console.warn('Exception fetching team memberships:', teamErr);
      // Continue with empty team list
    }
    
    console.log(`User ${userId} is member of teams:`, userTeamIds);

    // Fetch files from database
    // Filter: show all non-team files OR team files where user is a member
    // Use separate queries and combine for better reliability
    let files: any[] = [];
    let error: any = null;

    try {
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
      // Only query if we have team IDs
      let teamFiles: any[] = [];
      let teamError: any = null;
      
      if (userTeamIds.length > 0) {
        const teamQueryResult = await supabaseServer
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
        
        teamFiles = teamQueryResult.data || [];
        teamError = teamQueryResult.error;
      }

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
      files = [...(nonTeamFiles || []), ...teamFiles];
      
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
    } catch (queryError: any) {
      console.error('❌ CRITICAL: Error in main query block:', queryError);
      error = queryError;
      files = []; // Set empty array on error
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
      // Log files with folder_id to verify folder_id is being loaded
      const filesWithFolders = files?.filter(f => f.folder_id) || [];
      if (filesWithFolders.length > 0) {
        console.log(`Found ${filesWithFolders.length} files in folders:`, filesWithFolders.map(f => ({ id: f.id, title: f.title, folder_id: f.folder_id })));
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
      try {
        if (!file || !file.id) {
          console.warn('⚠️ Skipping invalid file entry:', file);
          return null;
        }
        const enriched = mapRowToAsset(file);
        // Get starred status from starred_items table (per-user source of truth)
        enriched.isStarred = starredFileIds.includes(enriched.id);
        enriched.is_starred = enriched.isStarred; // For backward compatibility
        return enriched;
      } catch (mapError: any) {
        console.error('❌ Error mapping file:', {
          error: mapError?.message || String(mapError),
          fileId: file?.id,
          fileTitle: file?.title,
          stack: mapError?.stack
        });
        // Return a basic version if mapping fails
        if (!file || !file.id) {
          return null; // Skip completely invalid files
        }
        return {
          id: file.id,
          title: file.title || 'Unknown',
          type: (file.type || 'document') as any,
          created_by: file.created_by || '',
          created_at: file.created_at || new Date().toISOString(),
          updated_at: file.updated_at || file.created_at || new Date().toISOString(),
          folderId: file.folder_id || null,
          isStarred: starredFileIds.includes(file.id),
          is_starred: starredFileIds.includes(file.id),
        };
      }
    }).filter((f): f is NonNullable<typeof f> => f !== null); // Remove null entries

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

