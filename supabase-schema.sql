-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients (광고주) 테이블
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  main_service VARCHAR(200),
  differentiator VARCHAR(300),
  contact VARCHAR(50),
  memo TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates (원고 템플릿) 테이블
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_type VARCHAR(50) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 5),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  topic VARCHAR(100),
  send_count INTEGER DEFAULT 0,
  approve_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manuscripts (발송된 원고) 테이블
CREATE TABLE IF NOT EXISTS manuscripts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision', 'auto_approved')),
  revision_request TEXT,
  revision_count INTEGER DEFAULT 0,
  confirm_token VARCHAR(100) UNIQUE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  reminded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_clients_business_type ON clients(business_type);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_business_type ON templates(business_type);
CREATE INDEX IF NOT EXISTS idx_templates_month ON templates(month);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_manuscripts_status ON manuscripts(status);
CREATE INDEX IF NOT EXISTS idx_manuscripts_client_id ON manuscripts(client_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_template_id ON manuscripts(template_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_confirm_token ON manuscripts(confirm_token);

-- RLS (Row Level Security) 비활성화 (관리자용 시스템이므로)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE manuscripts DISABLE ROW LEVEL SECURITY;

-- 샘플 데이터 추가 (선택사항)
-- 샘플 광고주
INSERT INTO clients (name, region, business_type, main_service, differentiator, contact) VALUES
('강남수학학원', '강남', '수학학원', '1:1 맞춤 수학 과외', '15년 경력 명문대 출신 강사진', '02-1234-5678'),
('목동영어학원', '목동', '영어학원', '원어민 회화 수업', '미국 현지 경험 풍부한 강사진', '02-2345-6789'),
('서초태권도장', '서초', '태권도학원', '품새/겨루기 전문', '국가대표 출신 사범', '02-3456-7890');

-- 샘플 템플릿
INSERT INTO templates (business_type, month, week, title, topic, content) VALUES
('수학학원', 12, 1, '{{지역}} {{업체명}}에서 알려드리는 겨울방학 수학 학습법', '겨울방학 학습',
'안녕하세요, {{지역}}에 위치한 {{업체명}}입니다.

겨울방학이 다가오고 있습니다. 이번 방학을 알차게 보내기 위한 수학 학습 팁을 알려드립니다.

{{업체명}}의 {{대표서비스}}로 이번 겨울방학을 더욱 알차게 보내세요.

{{차별점}}

문의: {{연락처}}'),
('영어학원', 12, 1, '{{지역}} {{업체명}} 겨울방학 특강 안내', '겨울방학 특강',
'안녕하세요, {{지역}} {{업체명}}입니다.

겨울방학 영어 특강을 안내드립니다.

{{대표서비스}}

{{차별점}}

상담 문의: {{연락처}}');

-- 알림톡 발송 로그 테이블
CREATE TABLE IF NOT EXISTS alimtalk_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE SET NULL,
  template_code VARCHAR(20) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'fail')),
  response JSONB,
  variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림톡 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_client_id ON alimtalk_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_manuscript_id ON alimtalk_logs(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_template_code ON alimtalk_logs(template_code);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_status ON alimtalk_logs(status);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_created_at ON alimtalk_logs(created_at);

-- RLS 비활성화
ALTER TABLE alimtalk_logs DISABLE ROW LEVEL SECURITY;
