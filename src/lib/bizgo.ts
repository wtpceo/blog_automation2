// BizGo Alimtalk API Client
// 비즈고 OMNI API v1 - 알림톡 발송

const BIZGO_BASE_URL = 'https://mars.ibapi.kr/api/comm';

interface AlimtalkRequest {
  templateCode: 'wiz1' | 'wiz2' | 'wiz3';
  phone: string;
  variables?: Record<string, string>;
}

interface AlimtalkResponse {
  success: boolean;
  msgKey?: string;
  code?: string;
  result?: string;
  error?: string;
}

// 템플릿 내용 정의 - 비즈고에 등록된 템플릿과 정확히 일치해야 함
const TEMPLATE_CONTENTS: Record<string, { text: string; buttons?: Array<{ name: string; type: string; urlMobile?: string; urlPc?: string }> }> = {
  // wiz1: 최초 원고 확정 요청 발송
  wiz1: {
    text: `[#{변수내용1} 블로그 원고 안내]

안녕하세요, #{변수내용1} 담당자님.
금주 블로그 원고가 준비되었습니다.

아래 링크에서 확인 후 승인 또는 수정 요청 부탁드립니다.

👉 원고 확인하기
#{변수내용2}

* 48시간 내 응답이 없으면 자동 승인됩니다.

감사합니다.
위즈더플래닝`,
    buttons: [
      {
        name: '원고 확인하기',
        type: 'WL',
        urlMobile: '#{변수내용2}',
        urlPc: '#{변수내용2}'
      }
    ]
  },
  // wiz2: 수정 완료 알림 발송
  wiz2: {
    text: `[#{변수내용1} 블로그 원고 수정본 안내]

안녕하세요, #{변수내용1} 담당자님.
요청하신 수정사항 반영하여 원고 수정했습니다.

아래 링크에서 확인 부탁드립니다.

👉 원고 확인하기
#{변수내용2}

감사합니다.
위즈더플래닝`,
    buttons: [
      {
        name: '원고 확인하기',
        type: 'WL',
        urlMobile: '#{변수내용2}',
        urlPc: '#{변수내용2}'
      }
    ]
  },
  // wiz3: 리마인드 발송 (48시간 미확인 시)
  wiz3: {
    text: `[#{변수내용1} 블로그 원고 확인 요청]

안녕하세요, #{변수내용1} 담당자님.
아직 블로그 원고 확인이 안 되었습니다.

👉 원고 확인하기
#{변수내용2}

* 24시간 후 자동 승인 예정입니다.

감사합니다.
위즈더플래닝`,
    buttons: [
      {
        name: '원고 확인하기',
        type: 'WL',
        urlMobile: '#{변수내용2}',
        urlPc: '#{변수내용2}'
      }
    ]
  }
};

// 변수 치환 함수
function replaceTemplateVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// 전화번호 정규화 (하이픈 제거)
function normalizePhone(phone: string): string {
  return phone.replace(/-/g, '');
}

export async function sendAlimtalk(request: AlimtalkRequest): Promise<AlimtalkResponse> {
  const { templateCode, phone, variables = {} } = request;

  const apiKey = process.env.BIZGO_API_KEY;
  const senderKey = process.env.BIZGO_SENDER_KEY;

  if (!apiKey || !senderKey) {
    return {
      success: false,
      error: 'BizGo API credentials not configured'
    };
  }

  const template = TEMPLATE_CONTENTS[templateCode];
  if (!template) {
    return {
      success: false,
      error: `Unknown template code: ${templateCode}`
    };
  }

  // 템플릿 텍스트에 변수 치환
  const text = replaceTemplateVariables(template.text, variables);

  // 버튼 URL에도 변수 치환
  const buttons = template.buttons?.map(btn => ({
    ...btn,
    urlMobile: btn.urlMobile ? replaceTemplateVariables(btn.urlMobile, variables) : undefined,
    urlPc: btn.urlPc ? replaceTemplateVariables(btn.urlPc, variables) : undefined
  }));

  const requestBody = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: senderKey,
          templateCode: templateCode,
          msgType: 'AT', // AT: 알림톡 텍스트
          text: text,
          ...(buttons && { buttons })
        }
      }
    ],
    destinations: [
      {
        to: normalizePhone(phone),
        replaceWords: variables
      }
    ],
    ref: `blog_automation_${Date.now()}`
  };

  try {
    const response = await fetch(`${BIZGO_BASE_URL}/v1/send/omni`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log('[BizGo API Response]', JSON.stringify(data, null, 2));

    // 응답 구조: { common: {...}, data: { code, result, data: { destinations: [...] } } }
    if (response.ok && data.common?.authCode === 'A000') {
      const destinations = data.data?.data?.destinations;
      if (destinations?.[0]) {
        const dest = destinations[0];
        return {
          success: dest.code === 'A000' || dest.result === 'Success',
          msgKey: dest.msgKey,
          code: dest.code,
          result: dest.result
        };
      }
    }

    return {
      success: false,
      code: data.common?.authCode || data.data?.code,
      error: data.common?.authResult || data.data?.result || 'Unknown error'
    };
  } catch (error) {
    console.error('[BizGo API Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

export { TEMPLATE_CONTENTS };
