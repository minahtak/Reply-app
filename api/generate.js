// pages/api/generate.js
// GPT-4o-mini 기반 | 월 예산 약 $22 (3만원) 제한

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { received, mode, tone, context } = req.body;

    if ((received && received.length > 100) || (context && context.length > 80)) {
        return res.status(400).json({ error: '입력이 너무 깁니다.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY 환경변수가 없습니다.' });
    }

    const modeGuide = {
        refuse: '상대방의 부탁/제안을 거절',
        ignore: '오랫동안 답장을 안 했던 것을 자연스럽게 해명',
        excuse: '못 가거나 못 하는 상황에 대한 자연스러운 핑계를 대',
        end: '대화를 자연스럽게 마무리',
        awkward: '어색하거나 오래된 사이에 어색하지 않게 답',
        formal: '격식 있고 정중한 말투로 답장',
        compliment: '칭찬이나 관심 표현에 자연스럽고 부담 없이 받아치는 답장',
        some: '썸 타는 상대에게 설레고 자연스럽게 답하는 답장',
    };

    const toneGuide = {
        warm: '따뜻하고 친근하게, 상대방을 배려하는 느낌',
        cool: '담백하고 쿨하게, 군더더기 없이',
        sorry: '미안한 마음이 진심으로 전해지게, 과하지 않게',
        cute: '귀엽고 애교 있게, 억지스럽지 않게',
        short: '최대한 짧게, 10자 이내로',
    };

    let userMsg = `[내가 해야 할 것]\n${modeGuide[mode] || mode}\n\n[말투]\n${toneGuide[tone] || tone}`;
    if (received) userMsg += `\n\n[상대방이 보낸 메시지]\n"${received}"`;
    if (context) userMsg += `\n\n[추가 설명]\n${context}`;

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
                        role: 'system',
                        content: `너는 사용자를 대신해 카톡 답장을 써주는 20대 한국인 대필 전문가야. 
사용자가 넘겨주는 '상대방 메시지'와 '상황 설명'을 읽고, 그 상대방에게 직접 전송할 자연스러운 카톡 답장만 작성하는 것이 네 유일한 임무야.
사용자의 말에 대답하거나 위로하지 말고, 오직 '상대방에게 보낼 텍스트'만 만들어.

[절대 규칙]
- 답장만 3개 써. 설명, 번호 뒤 콜론, 부연 일절 금지
- 형식: 1. 답장\n2. 답장\n3. 답장
- AI 느낌 나는 문장 금지 (예: "물론이죠", "도움이 되셨으면", "안타깝지만" 등)
- 이모지는 자연스러울 때만, 남발 금지
- 각 답장은 뉘앙스가 달라야 함`
                    },
                    {
                        role: 'user',
                        content: userMsg
                    }
                ],
                max_tokens: 200,
                temperature: 0.85,
            })
        });

        if (response.status === 429) {
            return res.status(429).json({ error: '이번 달 사용 한도에 도달했어요.' });
        }

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('OpenAI Error:', data.error);
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