import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data, error } = await supabaseAdmin
    .from('manuscripts')
    .select('*, client:clients(name, region, business_type)')
    .eq('confirm_token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();
  const { action, revision_request } = body;

  // Find manuscript
  const { data: manuscript, error: findError } = await supabaseAdmin
    .from('manuscripts')
    .select('*, template:templates(*)')
    .eq('confirm_token', token)
    .single();

  if (findError || !manuscript) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  // Check if already processed
  if (manuscript.status !== 'pending') {
    return NextResponse.json({
      error: 'Already processed',
      status: manuscript.status,
    }, { status: 400 });
  }

  if (action === 'approve') {
    // Update manuscript status to approved
    const { data, error } = await supabaseAdmin
      .from('manuscripts')
      .update({
        status: 'approved',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', manuscript.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increase template approve_count
    if (manuscript.template) {
      await supabaseAdmin
        .from('templates')
        .update({ approve_count: manuscript.template.approve_count + 1 })
        .eq('id', manuscript.template_id);
    }

    return NextResponse.json({ data, message: 'Approved successfully' });
  } else if (action === 'revision') {
    if (!revision_request) {
      return NextResponse.json({ error: 'Revision request content required' }, { status: 400 });
    }

    // Update manuscript status to revision
    const { data, error } = await supabaseAdmin
      .from('manuscripts')
      .update({
        status: 'revision',
        revision_request,
        revision_count: manuscript.revision_count + 1,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', manuscript.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Revision request submitted' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
