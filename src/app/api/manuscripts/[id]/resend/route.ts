import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateConfirmToken } from '@/lib/utils';
import { sendAlimtalk } from '@/lib/notification';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, content } = body;

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }

  // Get current manuscript
  const { data: manuscript, error: fetchError } = await supabaseAdmin
    .from('manuscripts')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !manuscript) {
    return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
  }

  // Generate new confirm token
  const newConfirmToken = generateConfirmToken();

  // Update manuscript
  const { data, error } = await supabaseAdmin
    .from('manuscripts')
    .update({
      title,
      content,
      status: 'pending',
      confirm_token: newConfirmToken,
      sent_at: new Date().toISOString(),
      confirmed_at: null,
      revision_request: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, client:clients(*), template:templates(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate new confirm link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmUrl = `${appUrl}/confirm/${newConfirmToken}`;

  // 알림톡 발송
  if (data.client?.contact) {
    await sendAlimtalk({
      phoneNumber: data.client.contact,
      confirmUrl,
      clientName: data.client.name,
      templateTitle: title,
    });
  }

  return NextResponse.json({
    data,
    confirmUrl,
    message: 'Manuscript resent successfully'
  });
}
