import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import TemplateForm from '@/components/admin/TemplateForm';
import { supabaseAdmin } from '@/lib/supabase';

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;

  const { data: template, error } = await supabaseAdmin
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !template) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>템플릿 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm initialData={template} isEditing />
        </CardContent>
      </Card>
    </div>
  );
}
