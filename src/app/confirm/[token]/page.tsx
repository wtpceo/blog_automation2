'use client';

import { useEffect, useState, use } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { Manuscript, STATUS_LABELS } from '@/types';
import Badge from '@/components/ui/Badge';

interface PageProps {
  params: Promise<{ token: string }>;
}

interface ManuscriptWithClient extends Omit<Manuscript, 'client' | 'template'> {
  client: { name: string; region: string };
  template?: { topic: string };
}

export default function ConfirmPage({ params }: PageProps) {
  const { token } = use(params);
  const [manuscripts, setManuscripts] = useState<ManuscriptWithClient[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<'all_approved' | 'partial' | 'revision' | null>(null);

  useEffect(() => {
    const fetchManuscript = async () => {
      try {
        const response = await fetch(`/api/confirm/${token}`);
        if (!response.ok) {
          throw new Error('유효하지 않은 링크입니다.');
        }
        const result = await response.json();

        // manuscripts 배열 사용 (새 API), 없으면 data 사용 (기존 호환)
        const manuscriptList = result.manuscripts || [result.data];
        setManuscripts(manuscriptList);

        // 모든 원고가 pending이 아닌지 확인
        const allProcessed = manuscriptList.every(
          (m: ManuscriptWithClient) => m.status !== 'pending'
        );
        if (allProcessed && manuscriptList.length > 0) {
          const hasRevision = manuscriptList.some((m: ManuscriptWithClient) => m.status === 'revision');
          const allApproved = manuscriptList.every((m: ManuscriptWithClient) => m.status === 'approved');
          if (allApproved) {
            setCompleted('all_approved');
          } else if (hasRevision) {
            setCompleted('partial');
          } else {
            setCompleted('all_approved');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchManuscript();
  }, [token]);

  // 개별 원고 승인
  const handleApproveSingle = async (manuscriptId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', manuscript_id: manuscriptId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '처리 중 오류가 발생했습니다.');
      }

      // 해당 원고 상태 업데이트
      setManuscripts(prev => prev.map(m =>
        m.id === manuscriptId ? { ...m, status: 'approved' as const } : m
      ));

      // 모든 원고가 처리되었는지 확인
      const updatedManuscripts = manuscripts.map(m =>
        m.id === manuscriptId ? { ...m, status: 'approved' as const } : m
      );
      const allProcessed = updatedManuscripts.every(m => m.status !== 'pending');
      if (allProcessed) {
        setCompleted('all_approved');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 전체 승인
  const handleApproveAll = async () => {
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

      setCompleted('all_approved');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 개별 원고 수정 요청
  const handleRevisionSingle = async (manuscriptId: string) => {
    if (!revisionRequest.trim()) {
      alert('수정 요청 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revision', revision_request: revisionRequest, manuscript_id: manuscriptId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '처리 중 오류가 발생했습니다.');
      }

      // 해당 원고 상태 업데이트
      setManuscripts(prev => prev.map(m =>
        m.id === manuscriptId ? { ...m, status: 'revision' as const, revision_request: revisionRequest } : m
      ));

      setShowRevisionForm(false);
      setRevisionRequest('');

      // 모든 원고가 처리되었는지 확인
      const updatedManuscripts = manuscripts.map(m =>
        m.id === manuscriptId ? { ...m, status: 'revision' as const } : m
      );
      const allProcessed = updatedManuscripts.every(m => m.status !== 'pending');
      if (allProcessed) {
        setCompleted('partial');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 전체 수정 요청
  const handleRevisionAll = async () => {
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

  // 현재 원고의 pending 여부
  const currentManuscript = manuscripts[activeTab];
  const isPending = currentManuscript?.status === 'pending';
  const pendingCount = manuscripts.filter(m => m.status === 'pending').length;

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
            completed === 'all_approved' ? 'bg-green-100' : completed === 'partial' ? 'bg-blue-100' : 'bg-yellow-100'
          }`}>
            {completed === 'all_approved' ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : completed === 'partial' ? (
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {completed === 'all_approved' ? '승인 완료' : completed === 'partial' ? '처리 완료' : '수정 요청 완료'}
          </h1>
          <p className="text-gray-600">
            {completed === 'all_approved'
              ? `${manuscripts.length}개의 원고가 모두 승인되었습니다. 감사합니다.`
              : completed === 'partial'
              ? '모든 원고가 처리되었습니다. 감사합니다.'
              : '수정 요청이 접수되었습니다. 담당자가 확인 후 수정된 원고를 보내드리겠습니다.'}
          </p>
        </div>
      </div>
    );
  }

  if (manuscripts.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-sm border-b px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {currentManuscript?.client?.name} 원고 컨펌
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {manuscripts.length > 1
              ? `${manuscripts.length}개의 원고를 확인하시고 승인 또는 수정 요청을 해주세요.`
              : '아래 원고 내용을 확인하시고 승인 또는 수정 요청을 해주세요.'}
          </p>
        </div>

        {/* 원고 탭 (2개 이상일 때만 표시) - 더 눈에 띄게 */}
        {manuscripts.length > 1 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm border-b px-4 py-3">
            <div className="flex gap-2">
              {manuscripts.map((m, idx) => {
                const isActive = activeTab === idx;
                const status = m.status;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveTab(idx)}
                    className={`relative flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-md ring-2 ring-blue-500'
                        : 'bg-white/60 text-gray-600 hover:bg-white hover:shadow'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base">원고 {idx + 1}</span>
                      {m.template?.topic && (
                        <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                          {m.template.topic}
                        </span>
                      )}
                      {status !== 'pending' && (
                        <Badge
                          variant={status === 'approved' ? 'success' : 'warning'}
                          className="text-xs mt-1"
                        >
                          {status === 'approved' ? '승인됨' : '수정요청'}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white shadow-sm px-6 py-8">
          {/* 현재 원고 상태 표시 */}
          {currentManuscript?.status !== 'pending' && (
            <div className={`mb-4 p-3 rounded-lg ${
              currentManuscript?.status === 'approved' ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <p className={`text-sm font-medium ${
                currentManuscript?.status === 'approved' ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {currentManuscript?.status === 'approved'
                  ? '✓ 이 원고는 승인되었습니다.'
                  : '✎ 이 원고는 수정 요청되었습니다.'}
              </p>
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {currentManuscript?.title}
          </h2>
          <MarkdownRenderer content={currentManuscript?.content || ''} />
        </div>

        {/* Actions */}
        <div className="bg-white rounded-b-lg shadow-sm border-t px-6 py-6">
          {showRevisionForm ? (
            <div className="space-y-4">
              <Textarea
                label={manuscripts.length > 1 ? `원고 ${activeTab + 1} 수정 요청 내용` : '수정 요청 내용'}
                value={revisionRequest}
                onChange={(e) => setRevisionRequest(e.target.value)}
                rows={4}
                placeholder="수정이 필요한 부분을 자세히 적어주세요."
                required
              />
              <div className="flex flex-col gap-3">
                {/* 개별 수정 요청 */}
                <Button
                  onClick={() => handleRevisionSingle(currentManuscript?.id)}
                  loading={submitting}
                  variant="danger"
                  className="w-full"
                >
                  이 원고만 수정 요청
                </Button>
                {/* 전체 수정 요청 (여러 원고일 때) */}
                {manuscripts.length > 1 && pendingCount > 1 && (
                  <Button
                    onClick={handleRevisionAll}
                    loading={submitting}
                    variant="danger"
                    className="w-full opacity-80"
                  >
                    전체 {pendingCount}개 원고 수정 요청
                  </Button>
                )}
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
          ) : isPending ? (
            <div className="space-y-4">
              {/* 개별 원고 버튼 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleApproveSingle(currentManuscript?.id)}
                  loading={submitting}
                  variant="success"
                  size="lg"
                  className="flex-1"
                >
                  이 원고 승인
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setShowRevisionForm(true)}
                  className="flex-1"
                >
                  이 원고 수정 요청
                </Button>
              </div>

              {/* 전체 처리 버튼 (여러 원고이고 pending이 있을 때) */}
              {manuscripts.length > 1 && pendingCount > 1 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white text-gray-500">또는</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleApproveAll}
                    loading={submitting}
                    variant="success"
                    size="lg"
                    className="w-full"
                  >
                    전체 {pendingCount}개 원고 모두 승인
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p>이 원고는 이미 처리되었습니다.</p>
              {pendingCount > 0 && (
                <p className="text-sm mt-2">
                  다른 탭에서 아직 처리되지 않은 원고를 확인해주세요.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
