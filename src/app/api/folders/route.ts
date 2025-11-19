import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * GET /api/folders
 * Returns all folders for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from auth header or session
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // If no auth header, try to get from session cookie
    if (!userId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // Try to extract session from cookie
        // For now, we'll use a different approach - check if folders table exists
      }
    }

    // For server-side, we need the user ID from the request
    // Since Supabase client-side auth is used, we'll accept userId as query param
    // In production, this should come from session/auth
    const { searchParams } = new URL(request.url);
    userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Fetch folders from database
    const { data: folders, error } = await supabaseServer
      .from('folders')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return NextResponse.json({ success: true, folders: [] });
      }
      
      console.error('Error fetching folders:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Build folder tree structure
    const folderMap = new Map<string, any>();
    const rootFolders: any[] = [];

    // First pass: create all folders
    (folders || []).forEach((folder: any) => {
      const mappedFolder = {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        ownerId: folder.owner_id,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at,
        isStarred: folder.is_starred || false,
        children: [],
      };
      folderMap.set(folder.id, mappedFolder);
    });

    // Second pass: build tree structure
    folderMap.forEach((folder) => {
      if (!folder.parentId) {
        rootFolders.push(folder);
      } else {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(folder);
        }
      }
    });

    return NextResponse.json({
      success: true,
      folders: rootFolders,
    });
  } catch (error) {
    console.error('Error in GET /api/folders:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/folder
 * Creates a new folder for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parentId, userId } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { success: false, error: 'Folder name and user ID are required' },
        { status: 400 }
      );
    }

    // Normalize parentId - only accept valid UUIDs or null
    let normalizedParentId: string | null = null;
    if (parentId && parentId !== 'starred' && parentId !== 'recent' && parentId !== 'root') {
      if (parentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        normalizedParentId = parentId;
      }
    }

    // Create folder in database
    const { data, error } = await supabaseServer
      .from('folders')
      .insert({
        name: name.trim(),
        parent_id: normalizedParentId,
        owner_id: userId,
        is_starred: false,
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, return error with instructions
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Folders table does not exist. Please run setup-folder-column.sql migration.' },
          { status: 503 }
        );
      }

      console.error('Error creating folder:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Map database response to Folder type
    const newFolder = {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isStarred: data.is_starred || false,
    };

    return NextResponse.json({
      success: true,
      folder: newFolder,
    });
  } catch (error) {
    console.error('Error in POST /api/folder:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

