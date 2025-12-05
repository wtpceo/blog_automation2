import crypto from 'crypto';

const API_KEY = process.env.SOLAPI_API_KEY || '';
const API_SECRET = process.env.SOLAPI_API_SECRET || '';
const PFID = process.env.SOLAPI_PFID || '';
const TEMPLATE_ID = process.env.SOLAPI_TEMPLATE_ID || '';

interface AlimtalkMessage {
  to: string;
  from: string;
  kakaoOptions: {
    pfId: string;
    templateId: string;
    variables: Record<string, string>;
    buttons?: Array<{
      buttonType: string;
      buttonName: string;
      linkMo?: string;
      linkPc?: string;
    }>;
  };
}

function generateSignature(): { authorization: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(timestamp + salt)
    .digest('hex');

  const authorization = `HMAC-SHA256 apiKey=${API_KEY}, date=${timestamp}, salt=${salt}, signature=${signature}`;

  return { authorization, timestamp };
}

export async function sendAlimtalk(
  phoneNumber: string,
  clientName: string,
  confirmUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { authorization } = generateSignature();

    // 전화번호 포맷 (하이픈 제거, 국가코드 추가)
    const formattedPhone = phoneNumber.replace(/-/g, '');
    const to = formattedPhone.startsWith('0')
      ? '82' + formattedPhone.slice(1)
      : formattedPhone;

    const message: AlimtalkMessage = {
      to,
      from: process.env.SOLAPI_SENDER_NUMBER || '',
      kakaoOptions: {
        pfId: PFID,
        templateId: TEMPLATE_ID,
        variables: {
          '#{고객명}': clientName,
        },
        buttons: [
          {
            buttonType: 'WL',
            buttonName: '원고 확인하기',
            linkMo: confirmUrl,
            linkPc: confirmUrl,
          },
        ],
      },
    };

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Solapi API Error:', result);
      return {
        success: false,
        error: result.errorMessage || 'Failed to send alimtalk',
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Solapi Send Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendBulkAlimtalk(
  recipients: Array<{
    phoneNumber: string;
    clientName: string;
    confirmUrl: string;
  }>
): Promise<{ total: number; success: number; failed: number; results: Array<{ phoneNumber: string; success: boolean; error?: string }> }> {
  const results: Array<{ phoneNumber: string; success: boolean; error?: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const result = await sendAlimtalk(
      recipient.phoneNumber,
      recipient.clientName,
      recipient.confirmUrl
    );

    results.push({
      phoneNumber: recipient.phoneNumber,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }

    // Rate limiting - 솔라피는 초당 요청 제한이 있을 수 있음
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    total: recipients.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}
