import crypto from 'crypto';

const API_KEY = process.env.SOLAPI_API_KEY || '';
const API_SECRET = process.env.SOLAPI_API_SECRET || '';
const PFID = process.env.SOLAPI_PFID || '';
const TEMPLATE_ID = process.env.SOLAPI_TEMPLATE_ID || '';

interface AlimtalkMessage {
  to: string;
  from: string;
  type: 'ATA';
  kakaoOptions: {
    pfId: string;
    templateId: string;
    variables: Record<string, string>;
  };
}

function generateSignature(): { authorization: string; date: string } {
  // ISO 8601 형식: YYYY-MM-DD HH:mm:ss (Asia/Seoul 기준)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // KST = UTC + 9
  const kstDate = new Date(now.getTime() + kstOffset);
  const date = kstDate.toISOString().replace('T', ' ').substring(0, 19);

  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(date + salt)
    .digest('hex');

  const authorization = `HMAC-SHA256 apiKey=${API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

  return { authorization, date };
}

export async function sendAlimtalk(
  phoneNumber: string,
  clientName: string,
  confirmUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { authorization } = generateSignature();

    // 전화번호 포맷 (하이픈 제거만, 국가코드 불필요)
    const to = phoneNumber.replace(/-/g, '');

    // confirmUrl에서 https:// 제거 (템플릿에 https://#{url}로 설정되어 있음)
    const urlWithoutProtocol = confirmUrl.replace(/^https?:\/\//, '');

    const message: AlimtalkMessage = {
      to,
      from: process.env.SOLAPI_SENDER_NUMBER || '',
      type: 'ATA',
      kakaoOptions: {
        pfId: PFID,
        templateId: TEMPLATE_ID,
        variables: {
          '#{고객명}': clientName,
          '#{url}': urlWithoutProtocol,
        },
      },
    };

    console.log('[Solapi] Sending message:', JSON.stringify(message, null, 2));

    const response = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        messages: [message],
      }),
    });

    console.log('[Solapi] Response status:', response.status);

    const result = await response.json();
    console.log('[Solapi] Response body:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('[Solapi] API Error:', result);
      return {
        success: false,
        error: result.errorMessage || result.message || JSON.stringify(result),
      };
    }

    // 성공 응답 처리 (groupId가 있으면 성공)
    if (result.groupId) {
      console.log('[Solapi] Success! GroupId:', result.groupId);
      return {
        success: true,
        messageId: result.groupId,
      };
    }

    return {
      success: true,
      messageId: result.messageId || result.groupId,
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
