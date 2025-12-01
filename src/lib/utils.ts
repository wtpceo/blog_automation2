import { Client, Template } from '@/types';

export function replaceVariables(template: string, client: Client): string {
  return template
    .replace(/\{\{지역\}\}/g, client.region)
    .replace(/\{\{업체명\}\}/g, client.name)
    .replace(/\{\{대표서비스\}\}/g, client.main_service || '')
    .replace(/\{\{차별점\}\}/g, client.differentiator || '')
    .replace(/\{\{연락처\}\}/g, client.contact || '');
}

export function getConfirmRate(template: Template): number {
  if (template.send_count === 0) return 0;
  return Math.round((template.approve_count / template.send_count) * 100);
}

export function generateConfirmToken(): string {
  return crypto.randomUUID();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isOverdue(sentAt: string, hours: number = 48): boolean {
  const sentDate = new Date(sentAt);
  const now = new Date();
  const diffHours = (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60);
  return diffHours > hours;
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
