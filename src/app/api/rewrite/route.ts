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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

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

    const userMessage = `${REWRITE_PROMPT}

---
원본 제목: ${title}

원본 본문:
${content}
---`;

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
