'use client';

import { useState, useRef } from 'react';
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

const REPLACEMENT_VARIABLES = [
  { key: '{{지역}}', description: '광고주 지역' },
  { key: '{{업체명}}', description: '광고주 업체명' },
  { key: '{{대표서비스}}', description: '대표 서비스' },
  { key: '{{차별점}}', description: '차별화 포인트' },
  { key: '{{연락처}}', description: '연락처' },
];

export default function TemplateForm({ initialData, isEditing = false }: TemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<'title' | 'content'>('content');

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

  const insertVariable = (variable: string) => {
    if (activeField === 'title' && titleRef.current) {
      const input = titleRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = formData.title.slice(0, start) + variable + formData.title.slice(end);
      setFormData((prev) => ({ ...prev, title: newValue }));
      // 커서 위치 복원
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else if (activeField === 'content' && contentRef.current) {
      const textarea = contentRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newValue = formData.content.slice(0, start) + variable + formData.content.slice(end);
      setFormData((prev) => ({ ...prev, content: newValue }));
      // 커서 위치 복원
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/templates/${initialData?.id}` : '/api/templates';
      const method = isEditing ? 'PUT' : 'POST';

      // week가 빈 문자열이면 null로 처리
      const weekValue = formData.week === '' ? null : parseInt(formData.week);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          month: parseInt(formData.month),
          week: weekValue,
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

  const weekOptions = [
    { value: '', label: '없음' },
    { value: '1', label: '1주차' },
    { value: '2', label: '2주차' },
    { value: '3', label: '3주차' },
    { value: '4', label: '4주차' },
    { value: '5', label: '5주차' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">치환 변수 안내</h4>
        <p className="text-sm text-blue-700 mb-3">
          클릭하면 현재 선택된 필드(제목/본문)의 커서 위치에 삽입됩니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {REPLACEMENT_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v.key)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              title={v.description}
            >
              <code>{v.key}</code>
              <span className="text-blue-600 text-xs">({v.description})</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">
          현재 선택: <span className="font-medium">{activeField === 'title' ? '제목' : '본문'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Select
          id="business_type"
          name="business_type"
          label="업종 *"
          value={formData.business_type}
          onChange={handleChange}
          options={businessTypeOptions}
          required
        />

        <Select
          id="month"
          name="month"
          label="월 *"
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
        />
      </div>

      <Input
        id="topic"
        name="topic"
        label="주제 *"
        value={formData.topic}
        onChange={handleChange}
        required
        placeholder="예: 겨울방학 영어 선행학습"
      />

      <div>
        <Input
          ref={titleRef}
          id="title"
          name="title"
          label="제목 *"
          value={formData.title}
          onChange={handleChange}
          onFocus={() => setActiveField('title')}
          required
          placeholder="예: {{지역}} {{업체명}}에서 알려드리는 학습 비법"
        />
      </div>

      <div>
        <Textarea
          ref={contentRef}
          id="content"
          name="content"
          label="본문 *"
          value={formData.content}
          onChange={handleChange}
          onFocus={() => setActiveField('content')}
          required
          rows={20}
          placeholder="원고 본문을 입력하세요. 치환 변수를 클릭하여 삽입할 수 있습니다."
        />
      </div>

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
