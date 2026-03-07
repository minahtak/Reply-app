// pages/api/generate.js
// GPT-4o-mini 기반 | 월 예산 약 $22 (3만원) 제한

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    // ───────────────────────────────────────────
    // 1. 입력 길이 서버 측 검증 (프론트 우회 방지)
    // ───────────────────────────────────────────
    if (!prompt || prompt.length > 500) {
        return res.status(400).json({ error: '입력이 너무 깁니다.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY 환경변수가 없습니다.' });
    }

    // ───────────────────────────────────────────
    // 2. 월 예산 제한 체크
    //    Vercel KV 없이 간단히 구현:
    //    OpenAI 대시보드에서 Usage Limit 설정하는 게 가장 확실하지만
    //    아래는 서버에서도 이중으로 막는 코드입니다.
    //
    //    ✅ 가장 중요: OpenAI 대시보드에서 꼭 설정하세요!
    //    platform.openai.com → Settings → Limits
    //    → Monthly budget: $22 (약 3만원)
    //    → Hard limit 체크 (초과 시 자동 차단)
    // ───────────────────────────────────────────

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        // 시스템 프롬프트 분리 → 캐싱 효과 + 토큰 절약
                        role: 'system',
                        content: `너는 20대 한국인이야. 실제로 카카오톡을 매일 쓰는 사람처럼 답장을 써줘.

[절대 규칙]
- 답장만 3개 써. 설명, 번호 뒤 콜론, 부연 일절 금지
- 형식: 1. 답장\n2. 답장\n3. 답장
- AI 느낌 나는 문장 금지 (예: "물론이죠", "도움이 되셨으면", "안타깝지만" 등)
- 이모지는 자연스러울 때만, 남발 금지
- 각 답장은 뉘앙스가 달라야 함 (예: 하나는 짧게, 하나는 부드럽게, 하나는 좀 더 직접적으로)

[말투 기준]
- 따뜻: 친근하고 온기 있게, 상대 배려
- 쿨: 담백하고 군더더기 없이
- 미안: 진심이 느껴지게, 과하지 않게
- 귀엽: 자연스러운 애교, 억지스럽지 않게
- 짧게: 10자 이내로, 딱 필요한 말만`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 200,      // 답장 3개 기준 충분한 양 (기존 800→200, 비용 75% 절감)
                temperature: 0.85,    // 다양한 뉘앙스를 위해 약간 높게
            })
        });

        // OpenAI 예산 초과 시 (429 또는 quota 에러)
        if (response.status === 429) {
            return res.status(429).json({ error: '이번 달 사용 한도에 도달했어요.' });
        }

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('OpenAI Error:', data.error);

            // quota 초과 에러 감지
            if (data.error?.code === 'insufficient_quota' || data.error?.type === 'insufficient_quota') {
                return res.status(429).json({ error: '이번 달 사용 한도에 도달했어요.' });
            }

            return res.status(500).json({ error: data.error?.message || 'API 호출 실패' });
        }

        const text = data.choices?.[0]?.message?.content;
        if (!text) {
            return res.status(500).json({ error: '답장 결과가 비어있습니다.' });
        }

        return res.status(200).json({ text });

    } catch (error) {
        console.error('Handler Error:', error);
        return res.status(500).json({ error: error.message });
    }
}