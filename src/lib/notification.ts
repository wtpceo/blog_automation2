/**
 * 알림톡 발송 모듈
 *
 * 현재: console.log로 발송 시뮬레이션
 * 추후: 네이버 클라우드 알림톡 API 연동 예정
 *
 * 네이버 클라우드 알림톡 API 연동 시 필요한 환경변수:
 * - NCLOUD_ACCESS_KEY: 네이버 클라우드 Access Key
 * - NCLOUD_SECRET_KEY: 네이버 클라우드 Secret Key
 * - NCLOUD_SERVICE_ID: 알림톡 서비스 ID
 * - NCLOUD_CHANNEL_ID: 카카오 채널 ID
 */

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

  // TODO: 네이버 클라우드 알림톡 API 연동
  // 아래 코드를 실제 API 호출로 교체

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

  // 시뮬레이션: 항상 성공 반환
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
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
 * 네이버 클라우드 알림톡 API 연동 예시 (추후 구현용)
 *
 * async function sendNaverCloudAlimtalk(params: AlimtalkParams): Promise<AlimtalkResult> {
 *   const accessKey = process.env.NCLOUD_ACCESS_KEY;
 *   const secretKey = process.env.NCLOUD_SECRET_KEY;
 *   const serviceId = process.env.NCLOUD_SERVICE_ID;
 *
 *   const timestamp = Date.now().toString();
 *   const method = 'POST';
 *   const uri = `/alimtalk/v2/services/${serviceId}/messages`;
 *
 *   // HMAC 서명 생성
 *   const signature = makeSignature(method, uri, timestamp, accessKey, secretKey);
 *
 *   const response = await fetch(`https://sens.apigw.ntruss.com${uri}`, {
 *     method,
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'x-ncp-apigw-timestamp': timestamp,
 *       'x-ncp-iam-access-key': accessKey,
 *       'x-ncp-apigw-signature-v2': signature,
 *     },
 *     body: JSON.stringify({
 *       plusFriendId: process.env.NCLOUD_CHANNEL_ID,
 *       templateCode: 'CONFIRM_REQUEST',
 *       messages: [{
 *         to: params.phoneNumber,
 *         content: `[블로그 원고 컨펌 요청]\n\n${params.clientName}님, 새로운 원고가 도착했습니다.\n\n아래 링크에서 원고를 확인하고 승인해주세요.\n\n${params.confirmUrl}`,
 *       }],
 *     }),
 *   });
 *
 *   const result = await response.json();
 *   return { success: response.ok, messageId: result.requestId };
 * }
 */
