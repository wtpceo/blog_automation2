'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { Template, Client, BUSINESS_TYPES, MANAGERS, Manager } from '@/types';
import { replaceVariables, getConfirmRate } from '@/lib/utils';

type Step = 1 | 2 | 3;

interface ConfirmLink {
  client_id: string;
  client_name: string;
  confirm_url: string;
}

interface RewrittenContent {
  clientId: string;
  templateId: string;
  title: string;
  content: string;
}

export default function SendPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Template selection (다중 선택 지원)
  const [businessType, setBusinessType] = useState('');
  const [month, setMonth] = useState('');
  const [week, setWeek] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]); // 다중 선택
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Step 2: Client selection
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState<Manager | ''>('');

  // Step 3: Preview and send
  const [previewClient, setPreviewClient] = useState<Client | null>(null);
  const [previewTemplateIndex, setPreviewTemplateIndex] = useState(0); // 어떤 템플릿 원고를 보고 있는지
  const [confirmLinks, setConfirmLinks] = useState<ConfirmLink[]>([]);
  const [sendComplete, setSendComplete] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [alimtalkResult, setAlimtalkResult] = useState<{ total: number; success: number; failed: number; errors?: Array<{ phone: string; error: string }> } | null>(null);

  // Rewrite states
  const [enableRewrite, setEnableRewrite] = useState(true);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteProgress, setRewriteProgress] = useState({ current: 0, total: 0 });
  const [rewrittenContents, setRewrittenContents] = useState<Map<string, RewrittenContent>>(new Map()); // key: clientId_templateId
  const [showOriginal, setShowOriginal] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [autoRewriteStarted, setAutoRewriteStarted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filtered clients based on search and manager
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by manager
    if (managerFilter) {
      filtered = filtered.filter((client) => client.manager === managerFilter);
    }

    // Filter by search
    if (clientSearch.trim()) {
      const searchLower = clientSearch.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(searchLower) ||
          client.region.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [clients, clientSearch, managerFilter]);

  const fetchTemplates = useCallback(async () => {
    if (!businessType) return;
    setLoading(true);

    const params = new URLSearchParams({ business_type: businessType });
    if (month) params.append('month', month);

    const response = await fetch(`/api/templates?${params}&limit=100`);
    const result = await response.json();
    setTemplates(result.data || []);
    setLoading(false);
  }, [businessType, month]);

  const fetchClients = useCallback(async () => {
    if (selectedTemplates.length === 0) return;
    setLoading(true);

    const params = new URLSearchParams({
      business_type: selectedTemplates[0].business_type,
      is_active: 'true',
      client_type: 'template',
      limit: '500',
    });

    const response = await fetch(`/api/clients?${params}`);
    const result = await response.json();
    setClients(result.data || []);
    setLoading(false);
  }, [selectedTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (step === 2) {
      fetchClients();
    }
  }, [step, fetchClients]);

  // Auto-rewrite when entering step 3 with rewrite enabled
  const runAutoRewrite = useCallback(async () => {
    if (selectedTemplates.length === 0 || !enableRewrite || selectedClientIds.length === 0) return;

    setRewriting(true);
    setRewriteError(null);
    const totalCount = selectedClientIds.length * selectedTemplates.length;
    setRewriteProgress({ current: 0, total: totalCount });

    abortControllerRef.current = new AbortController();
    const selectedClients = clients.filter((c) => selectedClientIds.includes(c.id));

    let currentProgress = 0;
    for (const template of selectedTemplates) {
      for (const client of selectedClients) {
        if (abortControllerRef.current?.signal.aborted) break;

        currentProgress++;
        setRewriteProgress({ current: currentProgress, total: totalCount });

        const key = `${client.id}_${template.id}`;
        // Skip if already rewritten
        if (rewrittenContents.has(key)) continue;

        const originalTitle = replaceVariables(template.title, client);
        const originalContent = replaceVariables(template.content, client);

        try {
          const response = await fetch('/api/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: originalTitle,
              content: originalContent,
            }),
            signal: abortControllerRef.current?.signal,
          });

          const result = await response.json();

          if (response.ok) {
            setRewrittenContents((prev) => {
              const newMap = new Map(prev);
              newMap.set(key, {
                clientId: client.id,
                templateId: template.id,
                title: result.title,
                content: result.content,
              });
              return newMap;
            });
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            break;
          }
        }
      }
    }

    setRewriting(false);
    abortControllerRef.current = null;
  }, [selectedTemplates, enableRewrite, selectedClientIds, clients, rewrittenContents]);

  // Trigger auto-rewrite when entering step 3
  useEffect(() => {
    if (step === 3 && enableRewrite && !autoRewriteStarted && selectedClientIds.length > 0) {
      setAutoRewriteStarted(true);
      runAutoRewrite();
    }
  }, [step, enableRewrite, autoRewriteStarted, selectedClientIds.length, runAutoRewrite]);

  const handleTemplateToggle = (template: Template) => {
    setSelectedTemplates((prev) => {
      const exists = prev.find((t) => t.id === template.id);
      if (exists) {
        return prev.filter((t) => t.id !== template.id);
      }
      if (prev.length >= 2) {
        // 최대 2개까지만 선택 가능
        alert('템플릿은 최대 2개까지 선택할 수 있습니다.');
        return prev;
      }
      return [...prev, template];
    });
  };

  const handleGoToStep2 = () => {
    if (selectedTemplates.length === 0) {
      alert('템플릿을 선택해주세요.');
      return;
    }
    setStep(2);
  };

  const handleClientToggle = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    // Select/deselect all filtered clients
    const filteredIds = filteredClients.map((c) => c.id);
    const allFilteredSelected = filteredIds.every((id) => selectedClientIds.includes(id));

    if (allFilteredSelected) {
      setSelectedClientIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedClientIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleGoToStep3 = () => {
    setAutoRewriteStarted(false);
    setRewrittenContents(new Map());
    setStep(3);
  };

  const handleRewriteSingle = async (client: Client, template: Template) => {
    setRewriting(true);
    setRewriteError(null);

    const originalTitle = replaceVariables(template.title, client);
    const originalContent = replaceVariables(template.content, client);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: originalTitle,
          content: originalContent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const key = `${client.id}_${template.id}`;
        setRewrittenContents((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, {
            clientId: client.id,
            templateId: template.id,
            title: result.title,
            content: result.content,
          });
          return newMap;
        });
      } else {
        setRewriteError(result.error || '리라이팅에 실패했습니다.');
      }
    } catch {
      setRewriteError('리라이팅 중 오류가 발생했습니다.');
    } finally {
      setRewriting(false);
    }
  };

  const handleSend = async () => {
    if (selectedTemplates.length === 0 || selectedClientIds.length === 0) return;
    setLoading(true);

    try {
      // 템플릿별로 리라이팅된 컨텐츠 정리
      const rewrittenData: Record<string, Record<string, { title: string; content: string }>> = {};
      if (enableRewrite) {
        selectedTemplates.forEach((template) => {
          rewrittenData[template.id] = {};
          selectedClientIds.forEach((clientId) => {
            const key = `${clientId}_${template.id}`;
            const content = rewrittenContents.get(key);
            if (content) {
              rewrittenData[template.id][clientId] = {
                title: content.title,
                content: content.content,
              };
            }
          });
        });
      }

      const response = await fetch('/api/manuscripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_ids: selectedTemplates.map((t) => t.id),
          client_ids: selectedClientIds,
          rewritten_contents: enableRewrite ? rewrittenData : undefined,
        }),
      });

      const result = await response.json();
      console.log('Send result:', result);
      if (response.ok) {
        setConfirmLinks(result.confirmLinks || []);
        setAlimtalkResult(result.alimtalk || null);
        setSendComplete(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string, clientId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    const allLinks = confirmLinks
      .map((link) => `${link.client_name}: ${link.confirm_url}`)
      .join('\n');
    navigator.clipboard.writeText(allLinks);
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep(1);
    setBusinessType('');
    setMonth('');
    setWeek('');
    setTemplates([]);
    setSelectedTemplates([]);
    setPreviewTemplate(null);
    setClients([]);
    setSelectedClientIds([]);
    setClientSearch('');
    setManagerFilter('');
    setPreviewClient(null);
    setPreviewTemplateIndex(0);
    setConfirmLinks([]);
    setSendComplete(false);
    setCopiedId(null);
    setAlimtalkResult(null);
    setEnableRewrite(true);
    setRewrittenContents(new Map());
    setShowOriginal(false);
    setRewriteError(null);
    setAutoRewriteStarted(false);
    setRewriteProgress({ current: 0, total: 0 });
  };

  const handleBackToStep2 = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAutoRewriteStarted(false);
    setStep(2);
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

  if (sendComplete) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">원고 발송 완료</h1>
        <Card>
          <CardContent className="py-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {confirmLinks.length}건의 원고가 발송되었습니다
              </h2>
              <p className="text-gray-600">아래 컨펌 링크를 광고주에게 전달해주세요.</p>
              {alimtalkResult && (
                <div className={`mt-4 p-3 rounded-lg ${alimtalkResult.success > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p>알림톡: 총 {alimtalkResult.total}건 중 성공 {alimtalkResult.success}건, 실패 {alimtalkResult.failed}건</p>
                  {alimtalkResult.errors && alimtalkResult.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium">에러 상세:</p>
                      {alimtalkResult.errors.map((err, idx) => (
                        <p key={idx} className="text-red-600">{err.phone}: {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">컨펌 링크 목록</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyAllLinks}
                >
                  {copiedId === 'all' ? '복사됨!' : '전체 복사'}
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {confirmLinks.map((link) => (
                  <div key={link.client_id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <span className="font-medium text-gray-900">{link.client_name}</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded truncate max-w-md">
                        {link.confirm_url}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyLink(link.confirm_url, link.client_id)}
                      >
                        {copiedId === link.client_id ? '복사됨!' : '복사'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={resetAll}>새 원고 발송</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">원고 발송</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            <span className={`ml-2 text-sm ${step >= s ? 'text-gray-900' : 'text-gray-500'}`}>
              {s === 1 ? '템플릿 선택' : s === 2 ? '광고주 선택' : '미리보기 및 발송'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-gray-200 ml-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Step 1: 템플릿 선택 (최대 2개)</CardTitle>
              {selectedTemplates.length > 0 && (
                <Button onClick={handleGoToStep2}>
                  다음 ({selectedTemplates.length}개 선택됨)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Select
                label="업종"
                options={businessTypeOptions}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                required
              />
              <Select
                label="월"
                options={monthOptions}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <Select
                label="주차"
                options={weekOptions}
                value={week}
                onChange={(e) => setWeek(e.target.value)}
              />
            </div>

            {/* 선택된 템플릿 표시 */}
            {selectedTemplates.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">선택된 템플릿:</p>
                <div className="space-y-2">
                  {selectedTemplates.map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm">
                        <strong>원고 {idx + 1}:</strong> {t.title}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTemplateToggle(t)}
                      >
                        제거
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {businessType ? '해당 조건의 템플릿이 없습니다.' : '업종을 선택해주세요.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>월/주차</TableHead>
                    <TableHead>주제</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>컨펌률</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates
                    .filter((t) => !week || (t.week !== null && t.week.toString() === week))
                    .map((template) => {
                      const isSelected = selectedTemplates.some((t) => t.id === template.id);
                      return (
                        <TableRow key={template.id} className={isSelected ? 'bg-blue-50' : ''}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTemplateToggle(template)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            {template.month}월 {template.week ? `${template.week}주차` : ''}
                          </TableCell>
                          <TableCell>{template.topic || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{template.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                getConfirmRate(template) >= 80
                                  ? 'success'
                                  : getConfirmRate(template) >= 50
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {getConfirmRate(template)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewTemplate(template)}
                            >
                              미리보기
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Client Selection */}
      {step === 2 && selectedTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Step 2: 광고주 선택</CardTitle>
              <Button variant="ghost" onClick={() => setStep(1)}>
                이전
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                선택된 템플릿 ({selectedTemplates.length}개):
              </p>
              {selectedTemplates.map((t, idx) => (
                <p key={t.id} className="text-sm text-blue-700">
                  <strong>원고 {idx + 1}:</strong> {t.title}
                </p>
              ))}
              <p className="text-xs text-blue-600 mt-2">
                업종: {selectedTemplates[0].business_type} | {selectedTemplates[0].month}월{selectedTemplates[0].week ? ` ${selectedTemplates[0].week}주차` : ''}
              </p>
            </div>

            {/* Rewrite Option */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={enableRewrite}
                  onChange={(e) => setEnableRewrite(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">AI 리라이팅 적용</span>
                <span className="text-xs text-gray-500">(광고주 선택 후 자동으로 리라이팅 진행)</span>
              </label>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                해당 업종의 활성 광고주가 없습니다.
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <Input
                      id="client-search"
                      placeholder="업체명 또는 지역으로 검색..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                  <Select
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value as Manager | '')}
                    options={MANAGERS.map((m) => ({ value: m, label: m }))}
                    placeholder="담당자 전체"
                  />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filteredClients.length > 0 && filteredClients.every((c) => selectedClientIds.includes(c.id))}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {(clientSearch || managerFilter)
                        ? `필터 결과 전체 선택 (${filteredClients.filter((c) => selectedClientIds.includes(c.id)).length}/${filteredClients.length})`
                        : `전체 선택 (${selectedClientIds.length}/${clients.length})`}
                    </span>
                  </label>
                  <Button
                    disabled={selectedClientIds.length === 0}
                    onClick={handleGoToStep3}
                  >
                    다음 ({selectedClientIds.length}개 선택됨)
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>업체명</TableHead>
                      <TableHead>지역</TableHead>
                      <TableHead>담당자</TableHead>
                      <TableHead>연락처</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.id)}
                            onChange={() => handleClientToggle(client.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.region}</TableCell>
                        <TableCell>{client.manager || '-'}</TableCell>
                        <TableCell>{client.contact || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(clientSearch || managerFilter) && filteredClients.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    필터 조건에 맞는 광고주가 없습니다.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview and Send */}
      {step === 3 && selectedTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Step 3: 미리보기 및 발송</CardTitle>
              <Button variant="ghost" onClick={handleBackToStep2}>
                이전
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Rewriting Progress */}
            {rewriting && (
              <div className="mb-6 p-6 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-800 font-medium">원고 생성 중...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(rewriteProgress.current / rewriteProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700 mt-2 text-center">
                  {rewriteProgress.current} / {rewriteProgress.total} 완료
                </p>
              </div>
            )}

            {/* Rewrite Status */}
            {!rewriting && enableRewrite && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 font-medium">
                    리라이팅 완료: {rewrittenContents.size}/{selectedClientIds.length * selectedTemplates.length}건
                  </span>
                </div>
                {rewriteError && (
                  <span className="text-sm text-red-600">{rewriteError}</span>
                )}
              </div>
            )}

            {!rewriting && !enableRewrite && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">리라이팅 미적용 (원본 템플릿 사용)</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client List */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  선택된 광고주 ({selectedClientIds.length}개) × 원고 {selectedTemplates.length}개
                </h3>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {clients
                    .filter((c) => selectedClientIds.includes(c.id))
                    .map((client) => {
                      // 해당 클라이언트의 모든 템플릿 리라이팅 완료 여부
                      const allDone = selectedTemplates.every((t) =>
                        rewrittenContents.has(`${client.id}_${t.id}`)
                      );
                      return (
                        <button
                          key={client.id}
                          onClick={() => {
                            setPreviewClient(client);
                            setPreviewTemplateIndex(0);
                          }}
                          disabled={rewriting}
                          className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50 disabled:opacity-50 ${
                            previewClient?.id === client.id ? 'bg-blue-50' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900">{client.name}</span>
                              <span className="text-gray-500 ml-2">({client.region})</span>
                            </div>
                            {enableRewrite && (
                              allDone ? (
                                <Badge variant="success">완료</Badge>
                              ) : rewriting ? (
                                <Badge variant="warning">대기중</Badge>
                              ) : null
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">미리보기</h3>
                  {previewClient && enableRewrite && (
                    <label className="flex items-center gap-2 text-sm">
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

                {/* 템플릿 탭 */}
                {previewClient && selectedTemplates.length > 1 && (
                  <div className="flex gap-1 mb-3 border-b">
                    {selectedTemplates.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => setPreviewTemplateIndex(idx)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                          previewTemplateIndex === idx
                            ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        원고 {idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                {rewriting ? (
                  <div className="border rounded-lg p-8 text-center text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    원고 생성 중입니다...
                  </div>
                ) : previewClient ? (
                  <div className="border rounded-lg p-4 bg-white max-h-[500px] overflow-y-auto">
                    {(() => {
                      const currentTemplate = selectedTemplates[previewTemplateIndex];
                      const rewriteKey = `${previewClient.id}_${currentTemplate.id}`;
                      const rewritten = rewrittenContents.get(rewriteKey);

                      return (
                        <>
                          {/* Show badge */}
                          {enableRewrite && rewritten && !showOriginal && (
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="info">리라이팅됨</Badge>
                            </div>
                          )}
                          {showOriginal && (
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="default">원본</Badge>
                            </div>
                          )}

                          {/* Content */}
                          {enableRewrite && rewritten && !showOriginal ? (
                            <>
                              <h4 className="text-lg font-bold text-gray-900 mb-4">
                                {rewritten.title}
                              </h4>
                              <MarkdownRenderer content={rewritten.content} />
                              <div className="mt-4 pt-4 border-t">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRewriteSingle(previewClient, currentTemplate)}
                                  disabled={rewriting}
                                  loading={rewriting}
                                >
                                  다시 리라이팅
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <h4 className="text-lg font-bold text-gray-900 mb-4">
                                {replaceVariables(currentTemplate.title, previewClient)}
                              </h4>
                              <MarkdownRenderer content={replaceVariables(currentTemplate.content, previewClient)} />
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 text-center text-gray-500">
                    좌측에서 광고주를 클릭하면 미리보기가 표시됩니다.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                size="lg"
                onClick={handleSend}
                loading={loading}
                disabled={rewriting}
              >
                {selectedClientIds.length}명 × {selectedTemplates.length}원고 발송하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Preview Modal */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title="템플릿 미리보기"
        size="lg"
      >
        {previewTemplate && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                {previewTemplate.business_type} | {previewTemplate.month}월{previewTemplate.week ? ` ${previewTemplate.week}주차` : ''}
                {previewTemplate.topic && ` | ${previewTemplate.topic}`}
              </p>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{previewTemplate.title}</h3>
            <div className="max-h-96 overflow-y-auto">
              <MarkdownRenderer content={previewTemplate.content} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPreviewTemplate(null)}>
                닫기
              </Button>
              <Button onClick={() => {
                handleTemplateToggle(previewTemplate);
                setPreviewTemplate(null);
              }}>
                {selectedTemplates.some((t) => t.id === previewTemplate.id) ? '선택 해제' : '선택'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
