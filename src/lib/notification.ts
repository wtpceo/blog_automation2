/**
 * 알림톡 발송 모듈
 *
 * BizGo OMNI API를 사용하여 실제 알림톡 발송
 */

import { sendAlimtalk as sendBizgoAlimtalk } from './bizgo';

interface AlimtalkParams {
  phoneNumber: string;
  confirmUrl: string;
  clientName: string;
  templateTitle?: string;
}

interface AlimtalkResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 알림톡 발송 함수
 *
 * @param params - 발송 파라미터
 * @returns 발송 결과
 */
export async function sendAlimtalk(params: AlimtalkParams): Promise<AlimtalkResult> {
  const { phoneNumber, confirmUrl, clientName, templateTitle } = params;

  // 전화번호 유효성 검사
  if (!phoneNumber) {
    console.warn('[알림톡] 전화번호 없음 - 발송 스킵:', clientName);
    return { success: false, error: 'No phone number' };
  }

  console.log('='.repeat(50));
  console.log('[알림톡 발송]');
  console.log(`  광고주: ${clientName}`);
  console.log(`  전화번호: ${phoneNumber}`);
  console.log(`  컨펌링크: ${confirmUrl}`);
  if (templateTitle) {
    console.log(`  원고제목: ${templateTitle}`);
  }
  console.log(`  발송시각: ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  // BizGo API를 통한 실제 알림톡 발송
  const result = await sendBizgoAlimtalk({
    templateCode: 'wiz1',
    phone: phoneNumber,
    variables: {
      '변수내용1': clientName,
      '변수내용2': confirmUrl,
    },
  });

  if (result.success) {
    return {
      success: true,
      messageId: result.msgKey,
    };
  } else {
    console.error('[알림톡 발송 실패]', result.error);
    return {
      success: false,
      error: result.error,
    };
  }
}

/**
 * 대량 알림톡 발송 함수
 *
 * @param recipients - 수신자 목록
 * @returns 발송 결과 목록
 */
export async function sendBulkAlimtalk(
  recipients: AlimtalkParams[]
): Promise<{ total: number; success: number; failed: number; results: AlimtalkResult[] }> {
  const results: AlimtalkResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const result = await sendAlimtalk(recipient);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`[알림톡 대량발송 완료] 총 ${recipients.length}건 중 성공 ${successCount}건, 실패 ${failedCount}건`);

  return {
    total: recipients.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 수정 완료 알림톡 발송
 */
export async function sendRevisionCompleteAlimtalk(params: AlimtalkParams): Promise<AlimtalkResult> {
  const { phoneNumber, confirmUrl, clientName } = params;

  if (!phoneNumber) {
    console.warn('[알림톡] 전화번호 없음 - 발송 스킵:', clientName);
    return { success: false, error: 'No phone number' };
  }

  const result = await sendBizgoAlimtalk({
    templateCode: 'wiz2',
    phone: phoneNumber,
    variables: {
      '변수내용1': clientName,
      '변수내용2': confirmUrl,
    },
  });

  return {
    success: result.success,
    messageId: result.msgKey,
    error: result.error,
  };
}

/**
 * 리마인드 알림톡 발송 (48시간 미확인 시)
 */
export async function sendReminderAlimtalk(params: AlimtalkParams): Promise<AlimtalkResult> {
  const { phoneNumber, confirmUrl, clientName } = params;

  if (!phoneNumber) {
    console.warn('[알림톡] 전화번호 없음 - 발송 스킵:', clientName);
    return { success: false, error: 'No phone number' };
  }

  const result = await sendBizgoAlimtalk({
    templateCode: 'wiz3',
    phone: phoneNumber,
    variables: {
      '변수내용1': clientName,
      '변수내용2': confirmUrl,
    },
  });

  return {
    success: result.success,
    messageId: result.msgKey,
    error: result.error,
  };
}
