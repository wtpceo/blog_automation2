import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const REWRITE_PROMPT = `아래 블로그 원고를 같은 의미와 맥락을 유지하면서 표현을 자연스럽게 변형해줘.
- 문장 구조 변경
- 동의어/유의어 활용
- 어순 변경
- 단, 핵심 키워드는 그대로 유지 (예: "강남 수학학원" 같은 지역+업종 키워드)
- 전체 글자수는 비슷하게 유지 (1500~2000자)
- 마크다운 형식 유지
- 제목과 본문을 아래 형식으로 반환해줘:

[제목]
(리라이팅된 제목)

[본문]
(리라이팅된 본문)`;

const REVISION_PROMPT = `당신은 블로그 원고 수정 전문가입니다. 광고주가 요청한 수정 사항을 반영하여 원고를 수정해주세요.

## 수정 원칙
1. 광고주의 수정 요청 사항을 정확히 반영하세요.
2. 수정이 요청된 부분만 변경하고, 나머지 내용은 최대한 유지하세요.
3. 전체적인 글의 흐름과 톤은 유지하세요.
4. 마크다운 형식을 유지하세요.
5. 업체명, 지역명 등 핵심 키워드는 그대로 유지하세요.

## 출력 형식
반드시 아래 형식으로만 출력하세요:

[제목]
(수정된 제목)

[본문]
(수정된 본문)`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, revision_request, mode } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    let userMessage: string;

    // mode가 'revision'이고 revision_request가 있으면 수정 요청 기반 수정
    if (mode === 'revision' && revision_request) {
      userMessage = `${REVISION_PROMPT}

---
## 광고주 수정 요청 내용
${revision_request}

---
## 현재 원고

제목: ${title}

본문:
${content}
---`;
    } else {
      // 기존 리라이팅 모드
      userMessage = `${REWRITE_PROMPT}

---
원본 제목: ${title}

원본 본문:
${content}
---`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse title and content from response
    const titleMatch = responseText.match(/\[제목\]\s*([\s\S]*?)\s*\[본문\]/);
    const contentMatch = responseText.match(/\[본문\]\s*([\s\S]*?)$/);

    const rewrittenTitle = titleMatch ? titleMatch[1].trim() : title;
    const rewrittenContent = contentMatch ? contentMatch[1].trim() : content;

    return NextResponse.json({
      title: rewrittenTitle,
      content: rewrittenContent,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Rewrite API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rewrite' },
      { status: 500 }
    );
  }
}
