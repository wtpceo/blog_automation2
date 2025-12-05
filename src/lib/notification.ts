/**
 * 알림톡 발송 모듈
 *
 * Solapi API를 사용하여 알림톡 발송
 */

import { sendAlimtalk as sendSolapiAlimtalk } from './solapi';

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
  phoneNumber?: string;
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
  console.log('[알림톡 발송 - Solapi]');
  console.log(`  광고주: ${clientName}`);
  console.log(`  전화번호: ${phoneNumber}`);
  console.log(`  컨펌링크: ${confirmUrl}`);
  if (templateTitle) {
    console.log(`  원고제목: ${templateTitle}`);
  }
  console.log(`  발송시각: ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  // Solapi API를 통한 알림톡 발송
  const result = await sendSolapiAlimtalk(phoneNumber, clientName, confirmUrl);

  if (result.success) {
    return {
      success: true,
      messageId: result.messageId,
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
    results.push({ ...result, phoneNumber: recipient.phoneNumber });

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
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
  // 현재는 동일한 템플릿 사용 (추후 별도 템플릿 등록 시 변경)
  return sendAlimtalk(params);
}

/**
 * 리마인드 알림톡 발송 (48시간 미확인 시)
 */
export async function sendReminderAlimtalk(params: AlimtalkParams): Promise<AlimtalkResult> {
  // 현재는 동일한 템플릿 사용 (추후 별도 템플릿 등록 시 변경)
  return sendAlimtalk(params);
}
