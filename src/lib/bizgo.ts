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

// 템플릿 내용 정의
const TEMPLATE_CONTENTS: Record<string, { text: string; buttons?: Array<{ name: string; type: string; urlMobile?: string; urlPc?: string }> }> = {
  // wiz1: 최초 원고 확정 요청 발송
  wiz1: {
    text: `안녕하세요, #{업체명} 담당자님!

위즈더플래닝입니다.

금주 블로그 원고가 준비되었습니다.
아래 버튼을 눌러 원고를 확인해 주세요.

#{확인링크}

24시간 내 미확인 시 자동 승인됩니다.

감사합니다.`,
    buttons: [
      {
        name: '원고 확인하기',
        type: 'WL',
        urlMobile: '#{확인링크}',
        urlPc: '#{확인링크}'
      }
    ]
  },
  // wiz2: 수정 완료 알림 발송
  wiz2: {
    text: `안녕하세요, #{업체명} 담당자님!

위즈더플래닝입니다.

요청하신 수정사항이 반영되었습니다.
아래 버튼을 눌러 수정된 원고를 확인해 주세요.

#{확인링크}

감사합니다.`,
    buttons: [
      {
        name: '수정 원고 확인하기',
        type: 'WL',
        urlMobile: '#{확인링크}',
        urlPc: '#{확인링크}'
      }
    ]
  },
  // wiz3: 리마인드 발송 (48시간 미확인 시)
  wiz3: {
    text: `안녕하세요, #{업체명} 담당자님!

위즈더플래닝입니다.

아직 원고 확인이 완료되지 않았습니다.
아래 버튼을 눌러 원고를 확인해 주세요.

#{확인링크}

미확인 시 자동 승인 처리됩니다.

감사합니다.`,
    buttons: [
      {
        name: '원고 확인하기',
        type: 'WL',
        urlMobile: '#{확인링크}',
        urlPc: '#{확인링크}'
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

    if (response.ok && data.destinations?.[0]) {
      const dest = data.destinations[0];
      return {
        success: dest.code === 'A000' || dest.result === 'SUCCESS',
        msgKey: dest.msgKey,
        code: dest.code,
        result: dest.result
      };
    }

    return {
      success: false,
      code: data.code,
      error: data.message || data.error || 'Unknown error'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

export { TEMPLATE_CONTENTS };
