'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { Client, BUSINESS_TYPES, ClientType, MANAGERS, Manager } from '@/types';
import { cn } from '@/lib/utils';

interface ClientFormProps {
  initialData?: Client;
  isEditing?: boolean;
}

export default function ClientForm({ initialData, isEditing = false }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    region: initialData?.region || '',
    business_type: initialData?.business_type || '',
    main_service: initialData?.main_service || '',
    differentiator: initialData?.differentiator || '',
    contact: initialData?.contact || '',
    memo: initialData?.memo || '',
    client_type: (initialData?.client_type || 'template') as ClientType,
    manager: (initialData?.manager || '') as Manager | '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientTypeChange = (type: ClientType) => {
    setFormData((prev) => ({ ...prev, client_type: type }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/clients/${initialData?.id}` : '/api/clients';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save client');
      }

      router.push('/admin/clients');
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

  const managerOptions = MANAGERS.map((manager) => ({
    value: manager,
    label: manager,
  }));

  const clientTypeOptions: { key: ClientType; label: string; description: string }[] = [
    { key: 'template', label: '템플릿 광고주', description: '템플릿 기반 자동화 발송 대상' },
    { key: 'custom', label: '커스텀 광고주', description: '주제 입력 후 AI 원고 생성' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 광고주 유형 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          광고주 유형 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {clientTypeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleClientTypeChange(option.key)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                formData.client_type === option.key
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    formData.client_type === option.key
                      ? 'border-blue-600'
                      : 'border-gray-300'
                  )}
                >
                  {formData.client_type === option.key && (
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          id="name"
          name="name"
          label="업체명"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="업체명을 입력하세요"
        />

        <Input
          id="region"
          name="region"
          label="지역"
          value={formData.region}
          onChange={handleChange}
          required
          placeholder="예: 강남, 목동"
        />

        <Select
          id="business_type"
          name="business_type"
          label="업종"
          value={formData.business_type}
          onChange={handleChange}
          options={businessTypeOptions}
          required
        />

        <Input
          id="contact"
          name="contact"
          label="연락처"
          value={formData.contact}
          onChange={handleChange}
          placeholder="연락처를 입력하세요"
        />

        <Select
          id="manager"
          name="manager"
          label="담당자"
          value={formData.manager}
          onChange={handleChange}
          options={managerOptions}
          placeholder="담당자 선택"
        />
      </div>

      <Input
        id="main_service"
        name="main_service"
        label="대표서비스"
        value={formData.main_service}
        onChange={handleChange}
        placeholder="대표 서비스를 입력하세요"
      />

      <Textarea
        id="differentiator"
        name="differentiator"
        label="차별점"
        value={formData.differentiator}
        onChange={handleChange}
        rows={3}
        placeholder="업체의 차별점을 입력하세요"
      />

      <Textarea
        id="memo"
        name="memo"
        label="메모"
        value={formData.memo}
        onChange={handleChange}
        rows={3}
        placeholder="추가 메모를 입력하세요"
      />

      <div className="flex gap-4">
        <Button type="submit" loading={loading}>
          {isEditing ? '수정하기' : '등록하기'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  );
}
