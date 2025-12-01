import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // Get total counts by status
  const { data: manuscripts } = await supabaseAdmin
    .from('manuscripts')
    .select('status');

  const stats = {
    total: manuscripts?.length || 0,
    pending: manuscripts?.filter((m) => m.status === 'pending').length || 0,
    approved: manuscripts?.filter((m) => m.status === 'approved').length || 0,
    revision: manuscripts?.filter((m) => m.status === 'revision').length || 0,
    cancelled: manuscripts?.filter((m) => m.status === 'cancelled').length || 0,
    auto_approved: manuscripts?.filter((m) => m.status === 'auto_approved').length || 0,
  };

  return NextResponse.json({ stats });
}
