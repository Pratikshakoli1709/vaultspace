import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabaseClient';
import { mapRowToAsset } from '@/lib/supabase-mappers';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    // Get file from database
    const { data: file, error: fileError } = await supabase
      .from('data_items')
      .select(`
        *,
        profiles:created_by (
          id,
          email,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('id', fileId)
      .maybeSingle();

    if (fileError || !file) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const enrichedFile = mapRowToAsset(file);

    return NextResponse.json({ success: true, file: enrichedFile });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}


