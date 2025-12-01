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
import { Template, BUSINESS_TYPES } from '@/types';
import { formatDate, getConfirmRate } from '@/lib/utils';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; template: Template | null }>({
    isOpen: false,
    template: null,
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    });

    if (search) params.append('search', search);
    if (businessType) params.append('business_type', businessType);
    if (month) params.append('month', month);

    const response = await fetch(`/api/templates?${params}`);
    const result = await response.json();

    setTemplates(result.data || []);
    setTotalPages(result.pagination?.totalPages || 1);
    setLoading(false);
  }, [page, search, businessType, month]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async () => {
    if (!deleteModal.template) return;

    await fetch(`/api/templates/${deleteModal.template.id}`, {
      method: 'DELETE',
    });

    setDeleteModal({ isOpen: false, template: null });
    fetchTemplates();
  };

  const businessTypeOptions = BUSINESS_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1}월`,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">템플릿 관리</h1>
        <Link href="/admin/templates/new">
          <Button>템플릿 등록</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="주제, 제목 검색"
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
              options={monthOptions}
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setBusinessType('');
                setMonth('');
                setPage(1);
              }}
            >
              초기화
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 템플릿이 없습니다.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업종</TableHead>
                  <TableHead>월/주차</TableHead>
                  <TableHead>주제</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>컨펌률</TableHead>
                  <TableHead>발송수</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const confirmRate = getConfirmRate(template);
                  return (
                    <TableRow key={template.id}>
                      <TableCell>{template.business_type}</TableCell>
                      <TableCell>
                        {template.month}월 {template.week ? `${template.week}주차` : ''}
                      </TableCell>
                      <TableCell>{template.topic || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            confirmRate >= 80
                              ? 'success'
                              : confirmRate >= 50
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {confirmRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>{template.send_count}</TableCell>
                      <TableCell>{formatDate(template.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/admin/templates/${template.id}`}>
                            <Button variant="ghost" size="sm">
                              수정
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteModal({ isOpen: true, template })}
                          >
                            삭제
                          </Button>
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

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, template: null })}
        title="템플릿 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          이 템플릿을 삭제하시겠습니까?
          <br />
          <span className="text-sm text-gray-500">삭제된 템플릿은 비활성 상태로 전환됩니다.</span>
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ isOpen: false, template: null })}
          >
            취소
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
