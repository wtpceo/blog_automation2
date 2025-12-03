# 맥 미니 알림톡 서버 설정 가이드

## 1. 사전 준비

### Node.js 설치 확인
```bash
node --version  # v18 이상 권장
npm --version
```

### PM2 글로벌 설치
```bash
npm install -g pm2
```

## 2. 프로젝트 설정

### 프로젝트 클론
```bash
cd ~/Desktop
git clone https://github.com/wtpceo/blog_automation2.git blog_automation
cd blog_automation
```

### 의존성 설치
```bash
npm install
```

### 환경변수 설정
`.env.local` 파일 생성:
```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://uftkbsdrkufhqmxjlobk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://your-mac-mini-ip:3000

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_key

# BizGo Alimtalk API
BIZGO_API_KEY=mars_ak_33d4faba-7415-4e36-bf5d-81eb7c7121af
BIZGO_USER_ID=qpqpqp@wiztheplanning.com
BIZGO_SENDER_KEY=114cf85072e9d9aafa9cb2ef4d753c7a05568008
EOF
```

### 빌드
```bash
npm run build
```

## 3. Supabase 테이블 생성

Supabase 대시보드에서 SQL Editor 실행:

```sql
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_client_id ON alimtalk_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_manuscript_id ON alimtalk_logs(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_template_code ON alimtalk_logs(template_code);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_status ON alimtalk_logs(status);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_created_at ON alimtalk_logs(created_at);

-- RLS 비활성화
ALTER TABLE alimtalk_logs DISABLE ROW LEVEL SECURITY;
```

## 4. PM2로 서버 실행

### 로그 디렉토리 생성
```bash
mkdir -p logs
```

### PM2로 실행
```bash
pm2 start ecosystem.config.js
```

### 상태 확인
```bash
pm2 status
pm2 logs blog-automation
```

## 5. 재부팅 시 자동 실행 설정

### PM2 startup 설정
```bash
pm2 startup
# 출력되는 명령어를 복사해서 실행

pm2 save
```

## 6. API 테스트

### 알림톡 발송 테스트
```bash
curl -X POST http://localhost:3000/api/alimtalk/send \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "wiz1",
    "phone": "01012345678",
    "variables": {
      "업체명": "테스트업체",
      "확인링크": "https://example.com/confirm/test"
    }
  }'
```

### 발송 로그 조회
```bash
curl http://localhost:3000/api/alimtalk/send
```

## 7. 알림톡 템플릿 코드

| 코드 | 용도 | 설명 |
|------|------|------|
| wiz1 | 최초 원고 확정 요청 | 원고 발송 시 |
| wiz2 | 수정 완료 알림 | 수정 요청 반영 후 |
| wiz3 | 리마인드 | 48시간 미확인 시 |

## 8. 트러블슈팅

### PM2 재시작
```bash
pm2 restart blog-automation
```

### 로그 확인
```bash
pm2 logs blog-automation --lines 100
```

### 프로세스 삭제 후 재시작
```bash
pm2 delete blog-automation
pm2 start ecosystem.config.js
pm2 save
```

### 포트 확인
```bash
lsof -i :3000
```

## 9. 주의사항

- 비즈고 API는 회사 맥 미니 IP만 허용되어 있음
- 알림톡 발송은 맥 미니 서버에서만 가능
- Vercel 배포 환경에서는 알림톡 발송 불가
