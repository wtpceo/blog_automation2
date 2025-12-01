import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import ClientForm from '@/components/admin/ClientForm';

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>광고주 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
