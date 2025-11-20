import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * PATCH /api/file/[id]/star
 * Toggles the starred status of a file for the authenticated user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Get current starred status from starred_items table
    let isCurrentlyStarred = false;

    try {
      const { data: starredItem } = await supabaseServer
        .from('starred_items')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', fileId)
        .eq('item_type', 'file')
        .maybeSingle();

      isCurrentlyStarred = !!starredItem;
    } catch (starredError: any) {
      // If starred_items table doesn't exist, return error with instructions
      if (starredError.code === '42P01' || starredError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Starred items table does not exist. Please run setup-starred-items.sql migration.' 
          },
          { status: 500 }
        );
      }
      throw starredError;
    }

    // Toggle starred status
    const newStarredStatus = !isCurrentlyStarred;

    // Update starred_items table
    try {
      if (newStarredStatus) {
        // Add to starred_items
        const { error: insertError } = await supabaseServer
          .from('starred_items')
          .insert({
            user_id: userId,
            item_id: fileId,
            item_type: 'file',
          });

        // Ignore duplicate key errors (already starred)
        if (insertError && insertError.code !== '23505') {
          console.warn('Error inserting into starred_items:', insertError);
          throw insertError;
        }
      } else {
        // Remove from starred_items
        const { error: deleteError } = await supabaseServer
          .from('starred_items')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', fileId)
          .eq('item_type', 'file');

        if (deleteError) {
          console.warn('Error deleting from starred_items:', deleteError);
          throw deleteError;
        }
      }
    } catch (starredError: any) {
      // If starred_items table doesn't exist, return error with instructions
      if (starredError.code === '42P01' || starredError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Starred items table does not exist. Please run setup-starred-items.sql migration.' 
          },
          { status: 500 }
        );
      }
      throw starredError;
    }

    // Note: We don't update is_starred in data_items because it's global, not per-user
    // The frontend uses optimistic updates for instant UI feedback
    // starred_items table is the per-user source of truth

    // Return success with the new starred status
    // The frontend will update the UI optimistically, so we just need to confirm the status
    return NextResponse.json({
      success: true,
      isStarred: newStarredStatus,
      message: newStarredStatus ? 'File starred successfully' : 'File unstarred successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/file/[id]/star:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

