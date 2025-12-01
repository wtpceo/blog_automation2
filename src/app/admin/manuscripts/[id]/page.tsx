'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Manuscript, Template, STATUS_LABELS, ManuscriptStatus } from '@/types';
import { formatDateTime, replaceVariables, getConfirmRate } from '@/lib/utils';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ManuscriptDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  // Template change modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Rewrite states
  const [rewriting, setRewriting] = useState(false);
  const [isRewritten, setIsRewritten] = useState(false);
  const [originalPreviewTitle, setOriginalPreviewTitle] = useState('');
  const [originalPreviewContent, setOriginalPreviewContent] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManuscript = async () => {
      try {
        const response = await fetch(`/api/manuscripts/${id}`);
        if (!response.ok) {
          throw new Error('원고를 찾을 수 없습니다.');
        }
        const result = await response.json();
        setManuscript(result.data);
        setEditedTitle(result.data.title);
        setEditedContent(result.data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchManuscript();
  }, [id]);

  const fetchTemplates = useCallback(async () => {
    if (!manuscript?.client?.business_type) return;

    setLoadingTemplates(true);
    try {
      const params = new URLSearchParams({
        business_type: manuscript.client.business_type,
        limit: '100',
      });
      const response = await fetch(`/api/templates?${params}`);
      const result = await response.json();
      setTemplates(result.data || []);
    } finally {
      setLoadingTemplates(false);
    }
  }, [manuscript?.client?.business_type]);

  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplates();
    }
  }, [showTemplateModal, fetchTemplates]);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setIsRewritten(false);
    setShowOriginal(false);
    setRewriteError(null);
    if (manuscript?.client) {
      const title = replaceVariables(template.title, manuscript.client);
      const content = replaceVariables(template.content, manuscript.client);
      setPreviewTitle(title);
      setPreviewContent(content);
      setOriginalPreviewTitle(title);
      setOriginalPreviewContent(content);
    }
  };

  const handleRewritePreview = async () => {
    if (!previewTitle || !previewContent) return;

    setRewriting(true);
    setRewriteError(null);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: originalPreviewTitle,
          content: originalPreviewContent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setPreviewTitle(result.title);
        setPreviewContent(result.content);
        setIsRewritten(true);
        setShowOriginal(false);
      } else {
        setRewriteError(result.error || '리라이팅에 실패했습니다.');
      }
    } catch {
      setRewriteError('리라이팅 중 오류가 발생했습니다.');
    } finally {
      setRewriting(false);
    }
  };

  const handleClearRewrite = () => {
    setPreviewTitle(originalPreviewTitle);
    setPreviewContent(originalPreviewContent);
    setIsRewritten(false);
    setShowOriginal(false);
  };

  const handleResend = async () => {
    if (!manuscript) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/manuscripts/${id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '재발송에 실패했습니다.');
      }

      const result = await response.json();
      setSuccess(`원고가 수정되어 재발송되었습니다. 새 컨펌 링크가 생성되었습니다.`);
      setManuscript(result.data);

      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = async () => {
    if (!manuscript || !selectedTemplate) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/manuscripts/${id}/change-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          title: previewTitle,
          content: previewContent,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '템플릿 변경에 실패했습니다.');
      }

      setSuccess('템플릿이 변경되어 새 원고가 발송되었습니다.');
      setShowTemplateModal(false);

      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: ManuscriptStatus) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'revision':
        return 'danger';
      case 'cancelled':
        return 'default';
      case 'auto_approved':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error && !manuscript) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>뒤로 가기</Button>
        </div>
      </div>
    );
  }

  if (!manuscript) return null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">원고 상세</h1>
        <Button variant="ghost" onClick={() => router.back()}>
          뒤로 가기
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* 광고주 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>광고주 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-500">업체명</label>
                <p className="font-medium text-gray-900">{manuscript.client?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">지역</label>
                <p className="text-gray-900">{manuscript.client?.region || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">연락처</label>
                <p className="text-gray-900">{manuscript.client?.contact || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">상태</label>
                <p>
                  <Badge variant={getStatusBadgeVariant(manuscript.status)}>
                    {STATUS_LABELS[manuscript.status]}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">발송일</label>
                <p className="text-gray-900">{formatDateTime(manuscript.sent_at)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">컨펌일</label>
                <p className="text-gray-900">
                  {manuscript.confirmed_at ? formatDateTime(manuscript.confirmed_at) : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">수정 횟수</label>
                <p className="text-gray-900">{manuscript.revision_count}회</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">업종</label>
                <p className="text-gray-900">{manuscript.client?.business_type || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수정 요청 내용 */}
        {manuscript.status === 'revision' && manuscript.revision_request && (
          <Card className="border-red-300 border-2">
            <CardHeader className="bg-red-50 border-b border-red-200">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                광고주 수정 요청 내용
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-red-50 py-4">
              <p className="text-red-800 whitespace-pre-wrap text-base leading-relaxed">{manuscript.revision_request}</p>
            </CardContent>
          </Card>
        )}

        {/* 원고 에디터 */}
        <Card>
          <CardHeader>
            <CardTitle>원고 내용</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="title"
              label="제목"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="원고 제목"
            />
            <Textarea
              id="content"
              label="본문"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={15}
              placeholder="원고 본문"
            />
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        {manuscript.status === 'revision' && (
          <div className="flex gap-4">
            <Button
              onClick={handleResend}
              loading={saving}
              size="lg"
            >
              수정 후 재발송
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowTemplateModal(true)}
            >
              템플릿 변경
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => router.back()}
            >
              취소
            </Button>
          </div>
        )}

        {/* pending 상태일 때 컨펌 링크 표시 */}
        {manuscript.status === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle>컨펌 링크</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  {`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${manuscript.confirm_token}`}
                </code>
                <Button
                  onClick={() => {
                    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${manuscript.confirm_token}`;
                    navigator.clipboard.writeText(url);
                    alert('링크가 복사되었습니다.');
                  }}
                >
                  복사
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 템플릿 변경 모달 */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplate(null);
          setPreviewTitle('');
          setPreviewContent('');
        }}
        title="템플릿 변경"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            같은 업종({manuscript.client?.business_type})의 다른 템플릿을 선택하세요.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[60vh] overflow-hidden">
            {/* 템플릿 목록 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b font-medium text-gray-700">
                템플릿 목록
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingTemplates ? (
                  <div className="p-4 text-center text-gray-500">로딩 중...</div>
                ) : templates.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">템플릿이 없습니다.</div>
                ) : (
                  <div className="divide-y">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {template.month}월 {template.week}주
                              </span>
                              <Badge variant={getConfirmRate(template) >= 70 ? 'success' : 'default'}>
                                {getConfirmRate(template)}%
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{template.topic || '주제 없음'}</p>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 미리보기 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b font-medium text-gray-700 flex items-center justify-between">
                <span>미리보기</span>
                {selectedTemplate && isRewritten && (
                  <label className="flex items-center gap-2 text-sm font-normal">
                    <input
                      type="checkbox"
                      checked={showOriginal}
                      onChange={(e) => setShowOriginal(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-600">원본 보기</span>
                  </label>
                )}
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {selectedTemplate ? (
                  <div>
                    {isRewritten && !showOriginal && (
                      <div className="mb-3">
                        <Badge variant="info">리라이팅됨</Badge>
                      </div>
                    )}
                    {showOriginal && (
                      <div className="mb-3">
                        <Badge variant="default">원본</Badge>
                      </div>
                    )}
                    <h4 className="font-bold text-gray-900 mb-3">
                      {showOriginal ? originalPreviewTitle : previewTitle}
                    </h4>
                    <MarkdownRenderer
                      content={showOriginal ? originalPreviewContent : previewContent}
                      className="text-sm"
                    />
                    {rewriteError && (
                      <div className="mt-3 text-sm text-red-600">{rewriteError}</div>
                    )}
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      {!isRewritten ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleRewritePreview}
                          disabled={rewriting}
                          loading={rewriting}
                        >
                          AI 리라이팅 적용
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleRewritePreview}
                            disabled={rewriting}
                            loading={rewriting}
                          >
                            다시 리라이팅
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClearRewrite}
                          >
                            리라이팅 취소
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    템플릿을 선택하면 미리보기가 표시됩니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTemplateModal(false);
                setSelectedTemplate(null);
                setIsRewritten(false);
                setShowOriginal(false);
                setRewriteError(null);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleTemplateChange}
              disabled={!selectedTemplate}
              loading={saving}
            >
              이 템플릿으로 발송
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
