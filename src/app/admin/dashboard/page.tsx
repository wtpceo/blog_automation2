'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Manuscript, STATUS_LABELS, ManuscriptStatus } from '@/types';
import { formatDateTime, isOverdue, cn } from '@/lib/utils';

interface Stats {
  total: number;
  pending: number;
  approved: number;
  revision: number;
  cancelled: number;
  auto_approved: number;
}

type TabKey = 'all' | 'pending' | 'approved' | 'revision' | 'cancelled';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, revision: 0, cancelled: 0, auto_approved: 0 });
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; manuscript: Manuscript | null }>({
    isOpen: false,
    manuscript: null,
  });

  const fetchStats = async () => {
    const response = await fetch('/api/manuscripts/stats');
    const result = await response.json();
    setStats(result.stats);
  };

  const fetchManuscripts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    });

    if (activeTab !== 'all') {
      params.append('status', activeTab);
    } else {
      // 기본 목록에서 cancelled 제외
      params.append('exclude_cancelled', 'true');
    }

    const response = await fetch(`/api/manuscripts?${params}`);
    const result = await response.json();

    setManuscripts(result.data || []);
    setTotalPages(result.pagination?.totalPages || 1);
    setLoading(false);
  }, [page, activeTab]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchManuscripts();
  }, [fetchManuscripts]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
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

  // cancelled 제외한 total 계산
  const activeTotal = stats.total - stats.cancelled;

  const statCards = [
    { label: '전체 발송', value: activeTotal, color: 'bg-gray-100 text-gray-800' },
    { label: '대기중', value: stats.pending, color: 'bg-yellow-100 text-yellow-800' },
    { label: '승인', value: stats.approved + stats.auto_approved, color: 'bg-green-100 text-green-800' },
    { label: '수정요청', value: stats.revision, color: 'bg-red-100 text-red-800' },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '대기중' },
    { key: 'approved', label: '승인' },
    { key: 'revision', label: '수정요청' },
    { key: 'cancelled', label: '취소됨' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">컨펌 현황 대시보드</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.color)}>
                  <span className="text-lg font-bold">{stat.value}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex gap-1 p-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab.label}
                {tab.key === 'cancelled' && stats.cancelled > 0 && (
                  <span className="ml-1 text-xs text-gray-400">({stats.cancelled})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : manuscripts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>광고주명</TableHead>
                  <TableHead>템플릿 주제</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송일</TableHead>
                  <TableHead>컨펌일</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manuscripts.map((manuscript) => {
                  const overdue = manuscript.status === 'pending' && isOverdue(manuscript.sent_at);
                  return (
                    <TableRow key={manuscript.id} className={overdue ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">
                        {manuscript.client?.name || '-'}
                        {overdue && (
                          <span className="ml-2 text-xs text-red-600">(48시간 경과)</span>
                        )}
                      </TableCell>
                      <TableCell>{manuscript.template?.topic || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(manuscript.status)}>
                          {STATUS_LABELS[manuscript.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(manuscript.sent_at)}</TableCell>
                      <TableCell>
                        {manuscript.confirmed_at ? formatDateTime(manuscript.confirmed_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {manuscript.status === 'revision' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/manuscripts/${manuscript.id}`)}
                            >
                              수정하기
                            </Button>
                          ) : manuscript.status === 'cancelled' ? (
                            <span className="text-sm text-gray-400">-</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailModal({ isOpen: true, manuscript })}
                            >
                              상세
                            </Button>
                          )}
                          {manuscript.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${manuscript.confirm_token}`;
                                navigator.clipboard.writeText(url);
                                alert('링크가 복사되었습니다.');
                              }}
                            >
                              링크복사
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, manuscript: null })}
        title="원고 상세"
        size="lg"
      >
        {detailModal.manuscript && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">광고주</label>
                <p className="font-medium text-gray-900">{detailModal.manuscript.client?.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">상태</label>
                <p>
                  <Badge variant={getStatusBadgeVariant(detailModal.manuscript.status)}>
                    {STATUS_LABELS[detailModal.manuscript.status]}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">발송일</label>
                <p className="text-gray-900">{formatDateTime(detailModal.manuscript.sent_at)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">컨펌일</label>
                <p className="text-gray-900">
                  {detailModal.manuscript.confirmed_at
                    ? formatDateTime(detailModal.manuscript.confirmed_at)
                    : '-'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500">제목</label>
              <p className="font-medium text-gray-900">{detailModal.manuscript.title}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">본문</label>
              <div className="mt-1 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {detailModal.manuscript.content}
              </div>
            </div>

            {detailModal.manuscript.status === 'revision' && detailModal.manuscript.revision_request && (
              <div>
                <label className="text-sm text-gray-500">수정 요청 내용</label>
                <div className="mt-1 p-4 bg-red-50 rounded-lg text-sm text-red-800">
                  {detailModal.manuscript.revision_request}
                </div>
              </div>
            )}

            {detailModal.manuscript.status === 'pending' && (
              <div className="pt-4 border-t">
                <label className="text-sm text-gray-500">컨펌 링크</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 text-gray-700 rounded text-sm truncate">
                    {`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${detailModal.manuscript.confirm_token}`}
                  </code>
                  <Button
                    size="sm"
                    onClick={() => {
                      const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${detailModal.manuscript?.confirm_token}`;
                      navigator.clipboard.writeText(url);
                      alert('링크가 복사되었습니다.');
                    }}
                  >
                    복사
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
