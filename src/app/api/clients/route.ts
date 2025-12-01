import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const businessType = searchParams.get('business_type') || '';
  const isActive = searchParams.get('is_active');
  const clientType = searchParams.get('client_type') || '';
  const manager = searchParams.get('manager') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('clients')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,region.ilike.%${search}%`);
  }

  if (businessType) {
    query = query.eq('business_type', businessType);
  }

  if (isActive !== null && isActive !== '') {
    query = query.eq('is_active', isActive === 'true');
  }

  if (clientType) {
    query = query.eq('client_type', clientType);
  }

  if (manager) {
    query = query.eq('manager', manager);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
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
    .from('clients')
    .insert({
      name: body.name,
      region: body.region,
      business_type: body.business_type,
      main_service: body.main_service || null,
      differentiator: body.differentiator || null,
      contact: body.contact || null,
      memo: body.memo || null,
      is_active: true,
      client_type: body.client_type || 'template',
      manager: body.manager || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
