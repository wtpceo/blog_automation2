import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendAlimtalk } from '@/lib/bizgo';

interface SendRequest {
  templateCode: 'wiz1' | 'wiz2' | 'wiz3';
  phone: string;
  clientId?: string;
  manuscriptId?: string;
  variables?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendRequest = await request.json();
    const { templateCode, phone, clientId, manuscriptId, variables = {} } = body;

    // 유효성 검사
    if (!templateCode || !phone) {
      return NextResponse.json(
        { error: 'templateCode and phone are required' },
        { status: 400 }
      );
    }

    if (!['wiz1', 'wiz2', 'wiz3'].includes(templateCode)) {
      return NextResponse.json(
        { error: 'Invalid templateCode. Must be wiz1, wiz2, or wiz3' },
        { status: 400 }
      );
    }

    // 전화번호 형식 검증 (한국 휴대폰)
    const normalizedPhone = phone.replace(/-/g, '');
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // 알림톡 발송
    const result = await sendAlimtalk({
      templateCode,
      phone: normalizedPhone,
      variables
    });

    // 발송 로그 저장
    const { error: logError } = await supabaseAdmin
      .from('alimtalk_logs')
      .insert({
        client_id: clientId || null,
        manuscript_id: manuscriptId || null,
        template_code: templateCode,
        phone: normalizedPhone,
        status: result.success ? 'success' : 'fail',
        response: JSON.stringify(result),
        variables: JSON.stringify(variables)
      });

    if (logError) {
      console.error('Failed to save alimtalk log:', logError);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        msgKey: result.msgKey,
        message: '알림톡 발송 성공'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send alimtalk',
          code: result.code
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Alimtalk send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// 발송 로그 조회
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabaseAdmin
    .from('alimtalk_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
