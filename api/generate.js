export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 프론트엔드에서 넘어오는 데이터들
    const { received, mode, tone, context, prompt } = req.body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY 환경변수가 없습니다.' });
    }

    // 네가 가장 자연스럽다고 했던 라벨들 그대로 적용!
    const modeLabels = { refuse: '공손한 거절', ignore: '읽씹 해명', excuse: '자연스러운 핑계', end: '대화 마무리', awkward: '어색한 사이', formal: '격식체 변환', compliment: '칭찬·관심에 자연스럽게 답장', some: '썸 상대에게 설레고 자연스러운 답장' };
    const toneLabels = { warm: '따뜻하게', cool: '쿨하게', sorry: '미안하게', cute: '귀엽게', short: '짧게' };

    // 프론트엔드에서 'prompt'로 통째로 보낸 경우 그걸 쓰고, 
    // 아니라면 네가 줬던 "가장 자연스러웠던 구조"로 백엔드에서 조립
    let userContent = prompt;

    if (!userContent) {
        const modeLabel = modeLabels[mode] || mode;
        const toneLabel = toneLabels[tone] || tone;
        
        userContent = `너는 한국어 카카오톡/문자 답장을 대신 써주는 AI야.\n`;
        if (received) userContent += `상대방이 보낸 메세지: "${received}"\n`;
        userContent += `상황 유형: ${modeLabel}\n말투: ${toneLabel}\n`;
        if (context) userContent += `추가 설명: ${context}\n`;
        userContent += `\n위 상황에 맞는 답장 3가지를 써줘.
- 각각 뉘앙스가 조금씩 달라야 해
- 실제 카톡처럼 짧고 자연스럽게
- 반드시 아래 형식으로만 (설명 없이):
1. [메세지]
2. [메세지]
3. [메세지]`;
    }

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
                        // AI가 사용자에게 대화나 위로를 시도하는 '동문서답'을 막는 강력한 룰
                        role: 'system',
                        content: `너는 사용자를 대신해 답장을 써주는 '대필 기계'야. 사용자에게 말 걸거나 위로, 조언을 하지 말고, 오직 '전송할 텍스트'만 형식에 맞춰 출력해.`
                    },
                    {
                        // 네가 제일 자연스럽다고 했던 바로 그 프롬프트 텍스트!
                        role: 'user',
                        content: userContent
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