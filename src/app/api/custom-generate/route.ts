import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { client, topic } = body;

  if (!client || !topic) {
    return NextResponse.json(
      { error: '광고주 정보와 주제가 필요합니다.' },
      { status: 400 }
    );
  }

  const keyword = `${client.region} ${client.business_type}`;

  const prompt = `다음 정보를 바탕으로 네이버 블로그 원고를 작성해줘.

업체명: ${client.name}
지역: ${client.region}
업종: ${client.business_type}
대표서비스: ${client.main_service || '없음'}
차별점: ${client.differentiator || '없음'}
주제: ${topic}

작성 조건:
- 글자수: 1,700~2,000자
- 키워드 "${keyword}" 3회 이상 자연스럽게 삽입
- 구조: 도입 → 본문 3개 소주제 → 업체 소개 → 상담 유도 마무리
- 자연스럽고 친근한 문체
- 마크다운 형식 (### 소제목)
- 제목은 첫 줄에 작성하고, 본문과 빈 줄로 구분

응답 형식:
제목: [제목 내용]

[본문 내용]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: '원고 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    const fullText = textContent.text;

    // Parse title and content
    let title = '';
    let content = '';

    const titleMatch = fullText.match(/^제목:\s*(.+?)(?:\n|$)/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      content = fullText.substring(titleMatch[0].length).trim();
    } else {
      // Fallback: first line as title
      const lines = fullText.split('\n');
      title = lines[0].replace(/^#+\s*/, '').trim();
      content = lines.slice(1).join('\n').trim();
    }

    return NextResponse.json({
      title,
      content,
    });
  } catch (error) {
    console.error('Custom generate error:', error);
    return NextResponse.json(
      { error: '원고 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
