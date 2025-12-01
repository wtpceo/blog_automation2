'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Client, BUSINESS_TYPES, ClientType } from '@/types';
import { formatDate, cn } from '@/lib/utils';

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<ClientType>('template');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; client: Client | null }>({
    isOpen: false,
    client: null,
  });
  const [moveModal, setMoveModal] = useState<{ isOpen: boolean; client: Client | null }>({
    isOpen: false,
    client: null,
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      client_type: activeTab,
    });

    if (search) params.append('search', search);
    if (businessType) params.append('business_type', businessType);
    if (isActive) params.append('is_active', isActive);

    const response = await fetch(`/api/clients?${params}`);
    const result = await response.json();

    setClients(result.data || []);
    setTotalPages(result.pagination?.totalPages || 1);
    setTotal(result.pagination?.total || 0);
    setLoading(false);
  }, [page, search, businessType, isActive, activeTab]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    // 탭 변경 시 페이지 초기화
    setPage(1);
  }, [activeTab]);

  const handleDelete = async () => {
    if (!deleteModal.client) return;

    await fetch(`/api/clients/${deleteModal.client.id}`, {
      method: 'DELETE',
    });

    setDeleteModal({ isOpen: false, client: null });
    fetchClients();
  };

  const handleMoveClientType = async () => {
    if (!moveModal.client) return;

    const newType: ClientType = moveModal.client.client_type === 'template' ? 'custom' : 'template';

    await fetch(`/api/clients/${moveModal.client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...moveModal.client,
        client_type: newType,
      }),
    });

    setMoveModal({ isOpen: false, client: null });
    fetchClients();
  };

  const businessTypeOptions = BUSINESS_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  const tabs = [
    { key: 'template' as ClientType, label: '템플릿 광고주', description: '자동화 발송 대상' },
    { key: 'custom' as ClientType, label: '커스텀 광고주', description: '수동 발송만' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">광고주 관리</h1>
        <Link href="/admin/clients/new">
          <Button>광고주 등록</Button>
        </Link>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-4 px-6 text-center border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <span className="font-medium">{tab.label}</span>
                <span className="block text-xs mt-1 text-gray-400">{tab.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 필터 */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="업체명, 지역 검색"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              options={businessTypeOptions}
              value={businessType}
              onChange={(e) => {
                setBusinessType(e.target.value);
                setPage(1);
              }}
            />
            <Select
              options={[
                { value: 'true', label: '활성' },
                { value: 'false', label: '비활성' },
              ]}
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setBusinessType('');
                setIsActive('');
                setPage(1);
              }}
            >
              초기화
            </Button>
          </div>
        </div>

        {/* 결과 카운트 */}
        <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
          총 <strong>{total}</strong>개의 {activeTab === 'template' ? '템플릿' : '커스텀'} 광고주
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            등록된 {activeTab === 'template' ? '템플릿' : '커스텀'} 광고주가 없습니다.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업체명</TableHead>
                  <TableHead>지역</TableHead>
                  <TableHead>업종</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.region}</TableCell>
                    <TableCell>{client.business_type}</TableCell>
                    <TableCell>{client.contact || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? 'success' : 'default'}>
                        {client.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            수정
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMoveModal({ isOpen: true, client })}
                        >
                          {activeTab === 'template' ? '커스텀으로' : '템플릿으로'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteModal({ isOpen: true, client })}
                        >
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, client: null })}
        title="광고주 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          <strong>{deleteModal.client?.name}</strong>을(를) 삭제하시겠습니까?
          <br />
          <span className="text-sm text-gray-500">삭제된 광고주는 비활성 상태로 전환됩니다.</span>
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteModal({ isOpen: false, client: null })}>
            취소
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </Modal>

      {/* 유형 이동 확인 모달 */}
      <Modal
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal({ isOpen: false, client: null })}
        title="광고주 유형 변경"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          <strong>{moveModal.client?.name}</strong>을(를){' '}
          <strong className="text-blue-600">
            {moveModal.client?.client_type === 'template' ? '커스텀' : '템플릿'}
          </strong>{' '}
          광고주로 이동하시겠습니까?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setMoveModal({ isOpen: false, client: null })}>
            취소
          </Button>
          <Button onClick={handleMoveClientType}>이동</Button>
        </div>
      </Modal>
    </div>
  );
}
