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
  const { template_id, title, content } = body;

  if (!template_id || !title || !content) {
    return NextResponse.json(
      { error: 'Template ID, title and content are required' },
      { status: 400 }
    );
  }

  // Get current manuscript
  const { data: oldManuscript, error: fetchError } = await supabaseAdmin
    .from('manuscripts')
    .select('*, client:clients(*)')
    .eq('id', id)
    .single();

  if (fetchError || !oldManuscript) {
    return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
  }

  // Get template to update send_count
  const { data: template, error: templateError } = await supabaseAdmin
    .from('templates')
    .select('*')
    .eq('id', template_id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // 1. Update old manuscript status to cancelled
  const { error: cancelError } = await supabaseAdmin
    .from('manuscripts')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (cancelError) {
    return NextResponse.json({ error: cancelError.message }, { status: 500 });
  }

  // 2. Create new manuscript with new template
  const newConfirmToken = generateConfirmToken();
  const { data: newManuscript, error: insertError } = await supabaseAdmin
    .from('manuscripts')
    .insert({
      client_id: oldManuscript.client_id,
      template_id: template_id,
      title,
      content,
      status: 'pending',
      revision_count: oldManuscript.revision_count, // Keep revision count for history
      confirm_token: newConfirmToken,
      sent_at: new Date().toISOString(),
    })
    .select('*, client:clients(*), template:templates(*)')
    .single();

  if (insertError) {
    // Rollback: restore old manuscript status
    await supabaseAdmin
      .from('manuscripts')
      .update({ status: 'revision' })
      .eq('id', id);

    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 3. Update template send_count
  await supabaseAdmin
    .from('templates')
    .update({ send_count: template.send_count + 1 })
    .eq('id', template_id);

  // Generate confirm link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmUrl = `${appUrl}/confirm/${newConfirmToken}`;

  // 알림톡 발송
  if (newManuscript.client?.contact) {
    await sendAlimtalk({
      phoneNumber: newManuscript.client.contact,
      confirmUrl,
      clientName: newManuscript.client.name,
      templateTitle: title,
    });
  }

  return NextResponse.json({
    data: newManuscript,
    confirmUrl,
    message: 'Template changed and new manuscript created successfully',
  });
}
