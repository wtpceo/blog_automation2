import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateConfirmToken } from '@/lib/utils';
import { sendBulkAlimtalk } from '@/lib/notification';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { client_id, title, content, topic } = body;

  if (!client_id || !title || !content) {
    return NextResponse.json(
      { error: '광고주 ID, 제목, 내용이 필요합니다.' },
      { status: 400 }
    );
  }

  // Get client
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', client_id)
    .eq('is_active', true)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 });
  }

  // Create manuscript (template_id is null for custom)
  const confirmToken = generateConfirmToken();

  const { data: manuscript, error: insertError } = await supabaseAdmin
    .from('manuscripts')
    .insert({
      client_id: client.id,
      template_id: null,
      title,
      content,
      status: 'pending',
      revision_count: 0,
      confirm_token: confirmToken,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Generate confirm link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmUrl = `${appUrl}/confirm/${confirmToken}`;

  // Send Alimtalk
  if (client.contact) {
    const alimtalkResult = await sendBulkAlimtalk([
      {
        phoneNumber: client.contact,
        confirmUrl,
        clientName: client.name,
        templateTitle: topic || title,
      },
    ]);

    return NextResponse.json({
      data: manuscript,
      confirmLink: {
        client_id: client.id,
        client_name: client.name,
        confirm_url: confirmUrl,
      },
      alimtalk: {
        total: alimtalkResult.total,
        success: alimtalkResult.success,
        failed: alimtalkResult.failed,
      },
    }, { status: 201 });
  }

  return NextResponse.json({
    data: manuscript,
    confirmLink: {
      client_id: client.id,
      client_name: client.name,
      confirm_url: confirmUrl,
    },
  }, { status: 201 });
}
