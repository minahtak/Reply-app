export default async function handler(req, res) {
    // POST 요청이 아니면 차단
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; // Vercel에 숨겨둘 제미나이 키

    // 제미나이 1.5 Flash 모델 (무료 티어에 가장 적합하고 빠름)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 800,
                }
            })
        });

        const data = await response.json();

        // 제미나이의 응답을 기존 프론트엔드(index.html)가 이해할 수 있는 클로드의 형태로 변환해줍니다.
        if (data.candidates && data.candidates.length > 0) {
            const generatedText = data.candidates[0].content.parts[0].text;

            // index.html에서 data.content[0].text 로 읽을 수 있게 맞춰서 전송!
            res.status(200).json({ content: [{ text: generatedText }] });
        } else {
            res.status(500).json({ error: '답장을 생성하지 못했습니다.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'AI 요청 중 오류가 발생했습니다.' });
    }
}