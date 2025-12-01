'use client';

import { useEffect, useState, use } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { Manuscript, STATUS_LABELS } from '@/types';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function ConfirmPage({ params }: PageProps) {
  const { token } = use(params);
  const [manuscript, setManuscript] = useState<Manuscript & { client: { name: string; region: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<'approved' | 'revision' | null>(null);

  useEffect(() => {
    const fetchManuscript = async () => {
      try {
        const response = await fetch(`/api/confirm/${token}`);
        if (!response.ok) {
          throw new Error('유효하지 않은 링크입니다.');
        }
        const result = await response.json();
        setManuscript(result.data);

        if (result.data.status !== 'pending') {
          setCompleted(result.data.status);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchManuscript();
  }, [token]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '처리 중 오류가 발생했습니다.');
      }

      setCompleted('approved');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionRequest.trim()) {
      alert('수정 요청 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revision', revision_request: revisionRequest }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '처리 중 오류가 발생했습니다.');
      }

      setCompleted('revision');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">오류</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            completed === 'approved' ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {completed === 'approved' ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {completed === 'approved' ? '승인 완료' : '수정 요청 완료'}
          </h1>
          <p className="text-gray-600">
            {completed === 'approved'
              ? '원고가 승인되었습니다. 감사합니다.'
              : '수정 요청이 접수되었습니다. 담당자가 확인 후 수정된 원고를 보내드리겠습니다.'}
          </p>
        </div>
      </div>
    );
  }

  if (!manuscript) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-sm border-b px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {manuscript.client?.name} 원고 컨펌
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            아래 원고 내용을 확인하시고 승인 또는 수정 요청을 해주세요.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white shadow-sm px-6 py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {manuscript.title}
          </h2>
          <MarkdownRenderer content={manuscript.content} />
        </div>

        {/* Actions */}
        <div className="bg-white rounded-b-lg shadow-sm border-t px-6 py-6">
          {showRevisionForm ? (
            <div className="space-y-4">
              <Textarea
                label="수정 요청 내용"
                value={revisionRequest}
                onChange={(e) => setRevisionRequest(e.target.value)}
                rows={4}
                placeholder="수정이 필요한 부분을 자세히 적어주세요."
                required
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleRevision}
                  loading={submitting}
                  variant="danger"
                  className="flex-1"
                >
                  수정 요청 제출
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionRequest('');
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleApprove}
                loading={submitting}
                variant="success"
                size="lg"
                className="flex-1"
              >
                승인하기
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowRevisionForm(true)}
                className="flex-1"
              >
                수정 요청하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
