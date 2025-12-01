import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import ClientForm from '@/components/admin/ClientForm';
import { supabaseAdmin } from '@/lib/supabase';

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;

  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !client) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>광고주 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm initialData={client} isEditing />
        </CardContent>
      </Card>
    </div>
  );
}
