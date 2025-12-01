import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('manuscripts')
    .select('*, client:clients(*), template:templates(*)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status) {
    updateData.status = body.status;
    if (body.status === 'approved' || body.status === 'revision') {
      updateData.confirmed_at = new Date().toISOString();
    }
  }

  if (body.revision_request !== undefined) {
    updateData.revision_request = body.revision_request;
  }

  if (body.title !== undefined) {
    updateData.title = body.title;
  }

  if (body.content !== undefined) {
    updateData.content = body.content;
  }

  const { data, error } = await supabaseAdmin
    .from('manuscripts')
    .update(updateData)
    .eq('id', id)
    .select('*, client:clients(*), template:templates(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
