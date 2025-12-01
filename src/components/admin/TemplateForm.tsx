'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { Template, BUSINESS_TYPES } from '@/types';
import { replaceVariables } from '@/lib/utils';

interface TemplateFormProps {
  initialData?: Template;
  isEditing?: boolean;
}

const sampleClient = {
  id: 'sample',
  name: '샘플학원',
  region: '강남',
  business_type: '수학학원',
  main_service: '1:1 맞춤 수학 과외',
  differentiator: '15년 경력 명문대 출신 강사진',
  contact: '02-1234-5678',
  memo: null,
  is_active: true,
  client_type: 'template' as const,
  manager: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function TemplateForm({ initialData, isEditing = false }: TemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    business_type: initialData?.business_type || '',
    month: initialData?.month?.toString() || '',
    week: initialData?.week?.toString() || '',
    topic: initialData?.topic || '',
    title: initialData?.title || '',
    content: initialData?.content || '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/templates/${initialData?.id}` : '/api/templates';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          month: parseInt(formData.month),
          week: parseInt(formData.week),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      router.push('/admin/templates');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const businessTypeOptions = BUSINESS_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1}월`,
  }));

  const weekOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1}주차`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">치환 변수 안내</h4>
        <p className="text-sm text-blue-700">
          제목과 본문에 다음 변수를 사용하세요: <br />
          <code className="bg-blue-100 px-1 rounded">{'{{지역}}'}</code>{' '}
          <code className="bg-blue-100 px-1 rounded">{'{{업체명}}'}</code>{' '}
          <code className="bg-blue-100 px-1 rounded">{'{{대표서비스}}'}</code>{' '}
          <code className="bg-blue-100 px-1 rounded">{'{{차별점}}'}</code>{' '}
          <code className="bg-blue-100 px-1 rounded">{'{{연락처}}'}</code>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Select
          id="business_type"
          name="business_type"
          label="업종"
          value={formData.business_type}
          onChange={handleChange}
          options={businessTypeOptions}
          required
        />

        <Select
          id="month"
          name="month"
          label="월"
          value={formData.month}
          onChange={handleChange}
          options={monthOptions}
          required
        />

        <Select
          id="week"
          name="week"
          label="주차"
          value={formData.week}
          onChange={handleChange}
          options={weekOptions}
          required
        />
      </div>

      <Input
        id="topic"
        name="topic"
        label="주제 태그"
        value={formData.topic}
        onChange={handleChange}
        placeholder="예: 신학기 준비, 겨울방학 특강"
      />

      <Input
        id="title"
        name="title"
        label="제목"
        value={formData.title}
        onChange={handleChange}
        required
        placeholder="예: {{지역}} {{업체명}}에서 알려드리는 학습 비법"
      />

      <Textarea
        id="content"
        name="content"
        label="본문"
        value={formData.content}
        onChange={handleChange}
        required
        rows={15}
        placeholder="원고 본문을 입력하세요..."
      />

      <div className="flex gap-4">
        <Button type="submit" loading={loading}>
          {isEditing ? '수정하기' : '등록하기'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? '미리보기 닫기' : '미리보기'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          취소
        </Button>
      </div>

      {showPreview && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-4">미리보기 (샘플 데이터 적용)</h4>
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {replaceVariables(formData.title, sampleClient)}
            </h2>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
              {replaceVariables(formData.content, sampleClient)}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
