import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { replaceVariables, generateConfirmToken } from '@/lib/utils';
import { sendBulkAlimtalk } from '@/lib/notification';

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
  const { template_id, client_ids, rewritten_contents } = body;

  // Get template
  const { data: template, error: templateError } = await supabaseAdmin
    .from('templates')
    .select('*')
    .eq('id', template_id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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

  // Create manuscripts for each client
  // Use rewritten content if available, otherwise use template with variable replacement
  const manuscripts = clients.map((client) => {
    const rewritten = rewritten_contents?.[client.id];
    return {
      client_id: client.id,
      template_id: template.id,
      title: rewritten?.title || replaceVariables(template.title, client),
      content: rewritten?.content || replaceVariables(template.content, client),
      status: 'pending' as const,
      revision_count: 0,
      confirm_token: generateConfirmToken(),
      sent_at: new Date().toISOString(),
    };
  });

  const { data: insertedManuscripts, error: insertError } = await supabaseAdmin
    .from('manuscripts')
    .insert(manuscripts)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update template send_count
  await supabaseAdmin
    .from('templates')
    .update({ send_count: template.send_count + clients.length })
    .eq('id', template_id);

  // Generate confirm links
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmLinks = insertedManuscripts?.map((m) => {
    const client = clients.find((c) => c.id === m.client_id);
    return {
      client_id: m.client_id,
      client_name: client?.name,
      confirm_url: `${appUrl}/confirm/${m.confirm_token}`,
      phone_number: client?.contact,
    };
  });

  // 알림톡 발송
  if (confirmLinks && confirmLinks.length > 0) {
    const alimtalkRecipients = confirmLinks.map((link) => ({
      phoneNumber: link.phone_number || '',
      confirmUrl: link.confirm_url,
      clientName: link.client_name || '',
      templateTitle: template.title,
    }));

    const alimtalkResult = await sendBulkAlimtalk(alimtalkRecipients);

    return NextResponse.json({
      data: insertedManuscripts,
      confirmLinks,
      alimtalk: {
        total: alimtalkResult.total,
        success: alimtalkResult.success,
        failed: alimtalkResult.failed,
      },
    }, { status: 201 });
  }

  return NextResponse.json({ data: insertedManuscripts, confirmLinks }, { status: 201 });
}
