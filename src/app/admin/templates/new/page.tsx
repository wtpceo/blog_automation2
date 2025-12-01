import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import TemplateForm from '@/components/admin/TemplateForm';

export default function NewTemplatePage() {
  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>템플릿 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
