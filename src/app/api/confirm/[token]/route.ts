import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 먼저 해당 토큰의 원고 찾기
  const { data: manuscript, error } = await supabaseAdmin
    .from('manuscripts')
    .select('*, client:clients(name, region, business_type)')
    .eq('confirm_token', token)
    .single();

  if (error || !manuscript) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  // group_id가 있으면 같은 그룹의 모든 원고 가져오기
  let groupManuscripts = [manuscript];
  if (manuscript.group_id) {
    const { data: groupData } = await supabaseAdmin
      .from('manuscripts')
      .select('*, client:clients(name, region, business_type), template:templates(topic)')
      .eq('group_id', manuscript.group_id)
      .order('created_at', { ascending: true });

    if (groupData && groupData.length > 0) {
      groupManuscripts = groupData;
    }
  }

  return NextResponse.json({
    data: manuscript, // 기존 호환성
    manuscripts: groupManuscripts, // 그룹 원고들
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();
  const { action, revision_request, manuscript_id } = body;

  // Find manuscript by token
  const { data: manuscript, error: findError } = await supabaseAdmin
    .from('manuscripts')
    .select('*, template:templates(*)')
    .eq('confirm_token', token)
    .single();

  if (findError || !manuscript) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  // manuscript_id가 있으면 해당 원고만 처리, 없으면 그룹 전체 처리
  let targetIds: string[] = [];

  if (manuscript_id) {
    // 특정 원고만 처리
    targetIds = [manuscript_id];
  } else if (manuscript.group_id) {
    // 그룹 전체 처리
    const { data: groupManuscripts } = await supabaseAdmin
      .from('manuscripts')
      .select('id, status')
      .eq('group_id', manuscript.group_id)
      .eq('status', 'pending');

    targetIds = groupManuscripts?.map((m) => m.id) || [manuscript.id];
  } else {
    targetIds = [manuscript.id];
  }

  // Check if any pending manuscripts exist
  const { data: pendingCheck } = await supabaseAdmin
    .from('manuscripts')
    .select('id')
    .in('id', targetIds)
    .eq('status', 'pending');

  if (!pendingCheck || pendingCheck.length === 0) {
    return NextResponse.json({
      error: 'Already processed',
      status: manuscript.status,
    }, { status: 400 });
  }

  if (action === 'approve') {
    // Update all target manuscripts to approved
    const { data, error } = await supabaseAdmin
      .from('manuscripts')
      .update({
        status: 'approved',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', targetIds)
      .eq('status', 'pending')
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increase template approve_count for each updated manuscript
    if (data) {
      const templateIds = [...new Set(data.map((m) => m.template_id))];
      for (const templateId of templateIds) {
        const count = data.filter((m) => m.template_id === templateId).length;
        const { data: template } = await supabaseAdmin
          .from('templates')
          .select('approve_count')
          .eq('id', templateId)
          .single();

        if (template) {
          await supabaseAdmin
            .from('templates')
            .update({ approve_count: (template.approve_count || 0) + count })
            .eq('id', templateId);
        }
      }
    }

    return NextResponse.json({ data, message: 'Approved successfully', count: data?.length || 0 });
  } else if (action === 'revision') {
    if (!revision_request) {
      return NextResponse.json({ error: 'Revision request content required' }, { status: 400 });
    }

    // Update all target manuscripts to revision
    const { data: pendingManuscripts } = await supabaseAdmin
      .from('manuscripts')
      .select('id, revision_count')
      .in('id', targetIds)
      .eq('status', 'pending');

    const results = [];
    for (const m of pendingManuscripts || []) {
      const { data, error } = await supabaseAdmin
        .from('manuscripts')
        .update({
          status: 'revision',
          revision_request,
          revision_count: m.revision_count + 1,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', m.id)
        .select()
        .single();

      if (!error && data) {
        results.push(data);
      }
    }

    return NextResponse.json({ data: results, message: 'Revision request submitted', count: results.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
