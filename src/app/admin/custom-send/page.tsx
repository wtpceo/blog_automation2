'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { Client, MANAGERS, Manager } from '@/types';

type Step = 1 | 2 | 3;

interface ConfirmLink {
  client_id: string;
  client_name: string;
  confirm_url: string;
}

export default function CustomSendPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Client selection
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState<Manager | ''>('');
  const [clientsLoading, setClientsLoading] = useState(true);

  // Step 2: Topic input
  const [topic, setTopic] = useState('');

  // Step 3: Generated content
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Send complete
  const [confirmLink, setConfirmLink] = useState<ConfirmLink | null>(null);
  const [sendComplete, setSendComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filtered clients
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
          client.region.toLowerCase().includes(searchLower) ||
          client.business_type.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [clients, clientSearch, managerFilter]);

  // Fetch custom clients
  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    const params = new URLSearchParams({
      client_type: 'custom',
      is_active: 'true',
      limit: '500',
    });

    const response = await fetch(`/api/clients?${params}`);
    const result = await response.json();
    setClients(result.data || []);
    setClientsLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep(2);
  };

  const handleGenerateContent = async () => {
    if (!selectedClient || !topic.trim()) return;

    setGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/custom-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: selectedClient,
          topic: topic.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setGeneratedTitle(result.title);
        setGeneratedContent(result.content);
        setStep(3);
      } else {
        setGenerateError(result.error || '원고 생성에 실패했습니다.');
      }
    } catch {
      setGenerateError('원고 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/custom-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: selectedClient,
          topic: topic.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setGeneratedTitle(result.title);
        setGeneratedContent(result.content);
      } else {
        setGenerateError(result.error || '원고 생성에 실패했습니다.');
      }
    } catch {
      setGenerateError('원고 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!selectedClient || !generatedTitle || !generatedContent) return;

    setLoading(true);

    try {
      const response = await fetch('/api/custom-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.id,
          title: generatedTitle,
          content: generatedContent,
          topic,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setConfirmLink(result.confirmLink);
        setSendComplete(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (confirmLink) {
      navigator.clipboard.writeText(confirmLink.confirm_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSelectedClient(null);
    setClientSearch('');
    setManagerFilter('');
    setTopic('');
    setGeneratedTitle('');
    setGeneratedContent('');
    setGenerateError(null);
    setConfirmLink(null);
    setSendComplete(false);
    setCopied(false);
  };

  if (sendComplete && confirmLink) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">커스텀 발송 완료</h1>
        <Card>
          <CardContent className="py-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                원고가 발송되었습니다
              </h2>
              <p className="text-gray-600">아래 컨펌 링크를 광고주에게 전달해주세요.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-gray-900">{confirmLink.client_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-white text-gray-700 rounded border text-sm">
                  {confirmLink.confirm_url}
                </code>
                <Button onClick={handleCopyLink}>
                  {copied ? '복사됨!' : '복사'}
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={resetAll}>새 커스텀 발송</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">커스텀 발송</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            <span className={`ml-2 text-sm ${step >= s ? 'text-gray-900' : 'text-gray-500'}`}>
              {s === 1 ? '광고주 선택' : s === 2 ? '주제 입력' : '미리보기 및 발송'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-gray-200 ml-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Client Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: 광고주 선택</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <Input
                  id="client-search"
                  placeholder="업체명, 지역, 업종으로 검색..."
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

            {clientsLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 커스텀 광고주가 없습니다.
                <br />
                <span className="text-sm">광고주 관리에서 커스텀 광고주를 등록해주세요.</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                필터 조건에 맞는 광고주가 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>업체명</TableHead>
                    <TableHead>지역</TableHead>
                    <TableHead>업종</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>대표서비스</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.region}</TableCell>
                      <TableCell>{client.business_type}</TableCell>
                      <TableCell>{client.manager || '-'}</TableCell>
                      <TableCell>{client.main_service || '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleClientSelect(client)}>
                          선택
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Topic Input */}
      {step === 2 && selectedClient && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Step 2: 주제 입력</CardTitle>
              <Button variant="ghost" onClick={() => setStep(1)}>
                이전
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                선택된 광고주: <strong>{selectedClient.name}</strong>
                <br />
                지역: {selectedClient.region} | 업종: {selectedClient.business_type}
                {selectedClient.main_service && ` | 대표서비스: ${selectedClient.main_service}`}
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                id="topic"
                label="원고 주제"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="예: 겨울방학 줄넘기 특강 안내, 신규 오픈 이벤트, 12월 프로모션 등"
                required
              />

              {generateError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {generateError}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateContent}
                  disabled={!topic.trim()}
                  loading={generating}
                  size="lg"
                >
                  원고 생성
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview and Send */}
      {step === 3 && selectedClient && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Step 3: 미리보기 및 발송</CardTitle>
              <Button variant="ghost" onClick={() => setStep(2)}>
                이전
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                광고주: <strong>{selectedClient.name}</strong> | 주제: <strong>{topic}</strong>
              </p>
            </div>

            {generating ? (
              <div className="py-12 text-center">
                <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">원고 생성 중...</p>
              </div>
            ) : (
              <>
                {generateError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {generateError}
                  </div>
                )}

                <div className="border rounded-lg p-6 bg-white mb-6 max-h-[500px] overflow-y-auto">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{generatedTitle}</h3>
                  <MarkdownRenderer content={generatedContent} />
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="secondary"
                    onClick={handleRegenerate}
                    disabled={generating}
                    loading={generating}
                  >
                    다시 생성
                  </Button>
                  <Button
                    onClick={handleSend}
                    loading={loading}
                    size="lg"
                  >
                    발송하기
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
