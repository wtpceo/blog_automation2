# 브랜드 블로그 자동화 시스템 PRD

## 1. 프로젝트 개요

### 1.1 프로젝트명
브랜드 블로그 원고 관리 및 컨펌 시스템

### 1.2 목적
300개 이상의 클라이언트 브랜드 블로그 원고 제작/컨펌/배포 프로세스를 자동화하여 운영 인력을 6명에서 2~3명으로 축소

### 1.3 핵심 기능 요약
- 광고주 정보 관리
- 원고 템플릿 관리 (업종/시즌별)
- 템플릿 + 광고주 정보 자동 치환
- 웹 기반 컨펌 시스템 (승인/수정 요청)
- 컨펌률 추적 및 관리

### 1.4 기술 스택
- Frontend: Next.js 14+ (App Router)
- Styling: Tailwind CSS
- Database: Supabase (PostgreSQL)
- Deployment: Vercel
- Language: TypeScript

---

## 2. 사용자 역할

### 2.1 관리자 (내부 담당자)
- 광고주 등록/수정/삭제
- 템플릿 등록/수정/삭제
- 원고 발송 (템플릿 선택 → 광고주 선택 → 치환 → 발송)
- 컨펌 현황 모니터링
- 컨펌률 확인

### 2.2 광고주 (외부 클라이언트)
- 컨펌 링크를 통해 원고 확인
- 승인 또는 수정 요청
- 수정 요청 시 상세 내용 입력

---

## 3. 데이터베이스 스키마

### 3.1 clients (광고주)
```sql
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,                    -- 업체명
  region VARCHAR(50) NOT NULL,                   -- 지역 (강남, 목동 등)
  business_type VARCHAR(50) NOT NULL,            -- 업종 (수학학원, 태권도학원 등)
  main_service VARCHAR(200),                     -- 대표서비스
  differentiator VARCHAR(300),                   -- 차별점
  contact VARCHAR(50),                           -- 연락처
  memo TEXT,                                     -- 메모
  is_active BOOLEAN DEFAULT true,                -- 활성 상태
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 templates (원고 템플릿)
```sql
CREATE TABLE templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_type VARCHAR(50) NOT NULL,            -- 업종
  month INTEGER NOT NULL,                        -- 월 (1~12)
  week INTEGER NOT NULL,                         -- 주차 (1~5)
  title VARCHAR(200) NOT NULL,                   -- 제목 (치환 변수 포함)
  content TEXT NOT NULL,                         -- 본문 (치환 변수 포함)
  topic VARCHAR(100),                            -- 주제 태그
  send_count INTEGER DEFAULT 0,                  -- 발송 횟수
  approve_count INTEGER DEFAULT 0,               -- 승인 횟수
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 manuscripts (발송된 원고)
```sql
CREATE TABLE manuscripts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  template_id UUID REFERENCES templates(id),
  title VARCHAR(200) NOT NULL,                   -- 치환된 제목
  content TEXT NOT NULL,                         -- 치환된 본문
  status VARCHAR(20) DEFAULT 'pending',          -- pending, approved, revision, auto_approved
  revision_request TEXT,                         -- 수정 요청 내용
  revision_count INTEGER DEFAULT 0,              -- 수정 횟수
  confirm_token VARCHAR(100) UNIQUE,             -- 컨펌 페이지 접근용 토큰
  sent_at TIMESTAMP DEFAULT NOW(),               -- 발송 시간
  confirmed_at TIMESTAMP,                        -- 컨펌 완료 시간
  reminded_at TIMESTAMP,                         -- 마지막 리마인드 시간
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.4 치환 변수 규칙
템플릿에서 사용하는 치환 변수:
- `{{지역}}` → clients.region
- `{{업체명}}` → clients.name
- `{{대표서비스}}` → clients.main_service
- `{{차별점}}` → clients.differentiator
- `{{연락처}}` → clients.contact

---

## 4. 페이지 구조 및 기능 명세

### 4.1 관리자 페이지

#### 4.1.1 광고주 관리 (`/admin/clients`)
**목록 페이지**
- 테이블 형태로 광고주 목록 표시
- 컬럼: 업체명, 지역, 업종, 연락처, 상태, 등록일, 액션
- 검색: 업체명, 지역으로 검색
- 필터: 업종별, 활성/비활성
- 페이지네이션: 20개씩

**등록/수정 모달 또는 페이지**
- 입력 필드: 업체명*, 지역*, 업종*, 대표서비스, 차별점, 연락처, 메모
- * 필수 입력

**삭제**
- 소프트 삭제 (is_active = false)
- 확인 모달 표시

#### 4.1.2 템플릿 관리 (`/admin/templates`)
**목록 페이지**
- 테이블 형태로 템플릿 목록 표시
- 컬럼: 업종, 월, 주차, 주제, 컨펌률, 발송수, 등록일, 액션
- 컨펌률 = (approve_count / send_count * 100)%
- 검색: 주제, 제목으로 검색
- 필터: 업종별, 월별
- 정렬: 컨펌률 높은순 기본
- 페이지네이션: 20개씩

**등록/수정 페이지**
- 입력 필드: 업종*, 월*, 주차*, 주제, 제목*, 본문*
- 본문: 텍스트에어리어 (충분히 큰 사이즈)
- 치환 변수 가이드 표시: {{지역}}, {{업체명}}, {{대표서비스}}, {{차별점}}, {{연락처}}
- 미리보기 기능: 샘플 데이터로 치환된 결과 확인

#### 4.1.3 원고 발송 (`/admin/send`)
**Step 1: 템플릿 선택**
- 업종 선택 (드롭다운)
- 월/주차 선택
- 해당 조건의 템플릿 목록 표시 (컨펌률 순)
- 템플릿 선택

**Step 2: 광고주 선택**
- 선택한 업종의 광고주 목록 표시
- 체크박스로 다중 선택 가능
- 전체 선택 기능

**Step 3: 미리보기 및 발송**
- 선택한 광고주별 치환된 원고 미리보기
- 개별 확인 또는 일괄 발송
- 발송 버튼 클릭 시:
  - manuscripts 테이블에 레코드 생성
  - confirm_token 생성 (UUID)
  - templates.send_count 증가
  - 컨펌 링크 생성: `/confirm/{confirm_token}`

#### 4.1.4 컨펌 현황 대시보드 (`/admin/dashboard`)
**요약 카드**
- 전체 발송 건수
- 대기중 건수
- 승인 건수
- 수정요청 건수

**목록**
- 탭: 전체 / 대기중 / 승인 / 수정요청
- 컬럼: 광고주명, 템플릿 주제, 상태, 발송일, 컨펌일, 액션
- 액션: 상세보기, 리마인드 발송, 수정 후 재발송
- 필터: 날짜 범위, 상태별
- 대기중 48시간 이상 건 하이라이트 표시

**블랙리스트 관리**
- 수정 요청 3회 이상 광고주 별도 표시
- 해당 광고주 수정 이력 확인 가능

---

### 4.2 광고주 컨펌 페이지 (`/confirm/[token]`)

**레이아웃**
- 깔끔하고 심플한 디자인
- 모바일 최적화 필수 (광고주가 카톡으로 받아서 모바일에서 열 확률 높음)

**구성 요소**
1. 헤더: 업체명 표시
2. 원고 미리보기
   - 제목
   - 본문 (HTML 렌더링, 단락 구분 명확히)
3. 액션 버튼
   - 승인하기 (초록색, 크게)
   - 수정 요청하기 (회색)
4. 수정 요청 시
   - 텍스트에어리어 표시 (수정 요청 내용 입력)
   - 제출 버튼

**동작**
- 승인 클릭 시:
  - manuscripts.status = 'approved'
  - manuscripts.confirmed_at = NOW()
  - templates.approve_count 증가
  - 완료 메시지 표시
- 수정 요청 시:
  - manuscripts.status = 'revision'
  - manuscripts.revision_request = 입력 내용
  - manuscripts.revision_count 증가
  - 완료 메시지 표시

**예외 처리**
- 이미 처리된 건: "이미 처리되었습니다" 메시지 + 현재 상태 표시
- 잘못된 토큰: "유효하지 않은 링크입니다" 메시지

---

## 5. UI/UX 가이드라인

### 5.1 디자인 원칙
- 깔끔하고 직관적인 UI
- 불필요한 장식 배제
- 액션 버튼 명확히 구분
- 상태별 색상 일관성 유지

### 5.2 색상 팔레트
- Primary: #2563EB (파란색 계열)
- Success: #16A34A (승인)
- Warning: #F59E0B (대기중)
- Danger: #DC2626 (수정요청/삭제)
- Neutral: #6B7280 (비활성)

### 5.3 상태 표시
- 대기중 (pending): 노란색 배지
- 승인 (approved): 초록색 배지
- 수정요청 (revision): 빨간색 배지
- 자동승인 (auto_approved): 파란색 배지

### 5.4 반응형
- 관리자 페이지: 데스크톱 우선 (최소 1024px)
- 컨펌 페이지: 모바일 우선 (375px 기준)

---

## 6. API 엔드포인트

### 6.1 광고주 API
```
GET    /api/clients          - 목록 조회 (검색, 필터, 페이지네이션)
POST   /api/clients          - 등록
GET    /api/clients/[id]     - 상세 조회
PUT    /api/clients/[id]     - 수정
DELETE /api/clients/[id]     - 삭제 (소프트)
```

### 6.2 템플릿 API
```
GET    /api/templates        - 목록 조회 (검색, 필터, 정렬)
POST   /api/templates        - 등록
GET    /api/templates/[id]   - 상세 조회
PUT    /api/templates/[id]   - 수정
DELETE /api/templates/[id]   - 삭제
```

### 6.3 원고 API
```
GET    /api/manuscripts           - 목록 조회 (상태별 필터)
POST   /api/manuscripts           - 발송 (템플릿 + 광고주 → 치환 후 생성)
GET    /api/manuscripts/[id]      - 상세 조회
PUT    /api/manuscripts/[id]      - 상태 업데이트
```

### 6.4 컨펌 API
```
GET    /api/confirm/[token]       - 원고 조회 (컨펌 페이지용)
POST   /api/confirm/[token]       - 승인/수정요청 처리
```

---

## 7. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 8. 폴더 구조

```
/app
  /admin
    /clients
      page.tsx              - 광고주 목록
      /new
        page.tsx            - 광고주 등록
      /[id]
        page.tsx            - 광고주 수정
    /templates
      page.tsx              - 템플릿 목록
      /new
        page.tsx            - 템플릿 등록
      /[id]
        page.tsx            - 템플릿 수정
    /send
      page.tsx              - 원고 발송
    /dashboard
      page.tsx              - 컨펌 현황
    layout.tsx              - 관리자 레이아웃 (사이드바 포함)
  /confirm
    /[token]
      page.tsx              - 광고주 컨펌 페이지
  /api
    /clients
      route.ts
      /[id]
        route.ts
    /templates
      route.ts
      /[id]
        route.ts
    /manuscripts
      route.ts
      /[id]
        route.ts
    /confirm
      /[token]
        route.ts
  layout.tsx
  page.tsx                  - 랜딩 (관리자 로그인으로 리다이렉트)

/components
  /ui                       - 공통 UI 컴포넌트
    Button.tsx
    Input.tsx
    Modal.tsx
    Table.tsx
    Badge.tsx
    Card.tsx
  /admin                    - 관리자 전용 컴포넌트
    Sidebar.tsx
    ClientForm.tsx
    TemplateForm.tsx
    ManuscriptPreview.tsx
  /confirm                  - 컨펌 페이지 전용 컴포넌트
    ConfirmCard.tsx
    RevisionForm.tsx

/lib
  supabase.ts               - Supabase 클라이언트
  utils.ts                  - 유틸 함수 (치환 함수 포함)

/types
  index.ts                  - TypeScript 타입 정의
```

---

## 9. 핵심 유틸 함수

### 9.1 치환 함수
```typescript
function replaceVariables(template: string, client: Client): string {
  return template
    .replace(/\{\{지역\}\}/g, client.region)
    .replace(/\{\{업체명\}\}/g, client.name)
    .replace(/\{\{대표서비스\}\}/g, client.main_service || '')
    .replace(/\{\{차별점\}\}/g, client.differentiator || '')
    .replace(/\{\{연락처\}\}/g, client.contact || '');
}
```

### 9.2 컨펌률 계산
```typescript
function getConfirmRate(template: Template): number {
  if (template.send_count === 0) return 0;
  return Math.round((template.approve_count / template.send_count) * 100);
}
```

---

## 10. 개발 우선순위

### Phase 1 (MVP - 12월 1주차 전 완료 목표)
1. Supabase 테이블 생성
2. 광고주 CRUD
3. 템플릿 CRUD
4. 원고 발송 (치환 기능)
5. 컨펌 페이지 (승인/수정요청)
6. 기본 대시보드

### Phase 2 (12월 중 개선)
7. 컨펌률 추적 및 정렬
8. 리마인더 기능
9. 자동 승인 (48시간)
10. 블랙리스트 관리

### Phase 3 (추후)
11. 알림톡 연동
12. AI 수정 자동 반영
13. 네이버 블로그 자동 입력 연동

---

## 11. 참고 사항

### 11.1 보안
- 관리자 페이지는 추후 인증 추가 필요 (Supabase Auth)
- 컨펌 토큰은 UUID로 생성하여 추측 불가능하게

### 11.2 성능
- 광고주/템플릿 목록은 페이지네이션 필수
- 대시보드 통계는 캐싱 고려

### 11.3 확장성
- 업종 목록은 하드코딩 대신 별도 테이블 또는 상수로 관리
- 치환 변수는 추후 확장 가능하도록 설계