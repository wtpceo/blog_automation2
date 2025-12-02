export type ClientType = 'template' | 'custom';
export type Manager = '주미' | '수빈' | '현주';

export const MANAGERS: Manager[] = ['주미', '수빈', '현주'];

export interface Client {
  id: string;
  name: string;
  region: string;
  business_type: string;
  main_service: string | null;
  differentiator: string | null;
  contact: string | null;
  memo: string | null;
  is_active: boolean;
  client_type: ClientType;
  manager: Manager | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  business_type: string;
  month: number;
  week: number | null;
  title: string;
  content: string;
  topic: string | null;
  send_count: number;
  approve_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Manuscript {
  id: string;
  client_id: string;
  template_id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'revision' | 'cancelled' | 'auto_approved';
  revision_request: string | null;
  revision_count: number;
  confirm_token: string;
  sent_at: string;
  confirmed_at: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  template?: Template;
}

export type ManuscriptStatus = 'pending' | 'approved' | 'revision' | 'cancelled' | 'auto_approved';

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, 'id' | 'created_at' | 'updated_at' | 'send_count' | 'approve_count'>;
        Update: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>;
      };
      manuscripts: {
        Row: Manuscript;
        Insert: Omit<Manuscript, 'id' | 'created_at' | 'updated_at' | 'confirmed_at' | 'reminded_at'>;
        Update: Partial<Omit<Manuscript, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

export const BUSINESS_TYPES = [
  '수학학원',
  '영어학원',
  '국어학원',
  '종합학원',
  '태권도학원',
  '미술학원',
  '음악학원',
  '반찬가게',
  '식당',
  '카페',
  '에스테틱',
  '피부과',
  '헬스장',
  '필라테스',
  '안경원',
  '세탁소',
  '인테리어',
  '부동산',
  '마사지',
  '복싱체육관',
  '보험샵',
  '교정원',
  '테라피',
  '기타',
] as const;

export const STATUS_LABELS: Record<ManuscriptStatus, string> = {
  pending: '대기중',
  approved: '승인',
  revision: '수정요청',
  cancelled: '취소됨',
  auto_approved: '자동승인',
};

export const STATUS_COLORS: Record<ManuscriptStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  revision: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  auto_approved: 'bg-blue-100 text-blue-800',
};
