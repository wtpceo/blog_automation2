import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { replaceVariables, generateConfirmToken } from '@/lib/utils';
import { sendBulkAlimtalk } from '@/lib/notification';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || '';
  const excludeCancelled = searchParams.get('exclude_cancelled') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('manuscripts')
    .select('*, client:clients(*), template:templates(*)', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  } else if (excludeCancelled) {
    query = query.neq('status', 'cancelled');
  }

  const { data, error, count } = await query
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { template_ids, client_ids, rewritten_contents } = body;

  // 단일 템플릿 호환성 유지 (template_id도 지원)
  const templateIdList = template_ids || [body.template_id];

  // Get templates
  const { data: templates, error: templatesError } = await supabaseAdmin
    .from('templates')
    .select('*')
    .in('id', templateIdList);

  if (templatesError || !templates?.length) {
    return NextResponse.json({ error: 'Templates not found' }, { status: 404 });
  }

  // Get clients
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from('clients')
    .select('*')
    .in('id', client_ids)
    .eq('is_active', true);

  if (clientsError || !clients?.length) {
    return NextResponse.json({ error: 'No valid clients found' }, { status: 404 });
  }

  // 클라이언트별 group_id 생성 (같은 클라이언트의 원고들을 그룹으로 묶음)
  const clientGroupIds: Record<string, string> = {};
  clients.forEach((client) => {
    clientGroupIds[client.id] = uuidv4();
  });

  // Create manuscripts for each client x template combination
  const manuscripts: Array<{
    client_id: string;
    template_id: string;
    title: string;
    content: string;
    status: 'pending';
    revision_count: number;
    confirm_token: string;
    sent_at: string;
    group_id: string;
  }> = [];

  for (const client of clients) {
    const groupId = clientGroupIds[client.id];
    // 첫 번째 원고에만 confirm_token 부여 (그룹 대표)
    const groupToken = generateConfirmToken();

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const rewritten = rewritten_contents?.[template.id]?.[client.id];

      manuscripts.push({
        client_id: client.id,
        template_id: template.id,
        title: rewritten?.title || replaceVariables(template.title, client),
        content: rewritten?.content || replaceVariables(template.content, client),
        status: 'pending' as const,
        revision_count: 0,
        confirm_token: i === 0 ? groupToken : generateConfirmToken(), // 첫 번째만 대표 토큰
        sent_at: new Date().toISOString(),
        group_id: groupId,
      });
    }
  }

  const { data: insertedManuscripts, error: insertError } = await supabaseAdmin
    .from('manuscripts')
    .insert(manuscripts)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update templates send_count
  for (const template of templates) {
    await supabaseAdmin
      .from('templates')
      .update({ send_count: (template.send_count || 0) + clients.length })
      .eq('id', template.id);
  }

  // Generate confirm links (클라이언트당 1개, 첫 번째 원고의 토큰 사용)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmLinks = clients.map((client) => {
    // 해당 클라이언트의 첫 번째 원고 찾기
    const firstManuscript = insertedManuscripts?.find(
      (m) => m.client_id === client.id && m.group_id === clientGroupIds[client.id]
    );
    return {
      client_id: client.id,
      client_name: client.name,
      confirm_url: `${appUrl}/confirm/${firstManuscript?.confirm_token}`,
      phone_number: client.contact,
    };
  });

  // 알림톡 발송
  if (confirmLinks && confirmLinks.length > 0) {
    const alimtalkRecipients = confirmLinks.map((link) => ({
      phoneNumber: link.phone_number || '',
      confirmUrl: link.confirm_url,
      clientName: link.client_name || '',
      templateTitle: templates.map((t) => t.title).join(', '),
    }));

    const alimtalkResult = await sendBulkAlimtalk(alimtalkRecipients);

    return NextResponse.json({
      data: insertedManuscripts,
      confirmLinks,
      alimtalk: {
        total: alimtalkResult.total,
        success: alimtalkResult.success,
        failed: alimtalkResult.failed,
        errors: alimtalkResult.results
          .filter((r) => !r.success)
          .map((r) => ({ phone: r.phoneNumber, error: r.error })),
      },
    }, { status: 201 });
  }

  return NextResponse.json({ data: insertedManuscripts, confirmLinks }, { status: 201 });
}
