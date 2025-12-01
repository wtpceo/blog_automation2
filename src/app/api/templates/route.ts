import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const businessType = searchParams.get('business_type') || '';
  const month = searchParams.get('month') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('templates')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (search) {
    query = query.or(`title.ilike.%${search}%,topic.ilike.%${search}%`);
  }

  if (businessType) {
    query = query.eq('business_type', businessType);
  }

  if (month) {
    query = query.eq('month', parseInt(month));
  }

  const { data, error, count } = await query
    .order('approve_count', { ascending: false })
    .order('send_count', { ascending: false })
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

  const { data, error } = await supabaseAdmin
    .from('templates')
    .insert({
      business_type: body.business_type,
      month: body.month,
      week: body.week,
      title: body.title,
      content: body.content,
      topic: body.topic || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
