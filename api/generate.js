export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Vercel에 GROQ_API_KEY 환경변수가 없습니다!' });
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // 💡 여기서 서비스가 종료된 구형 모델 대신, 똑똑한 최신 모델 이름으로 변경했습니다!
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 800
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error("Groq API Error:", data.error);
            return res.status(500).json({ error: data.error?.message || 'Groq 호출 실패' });
        }

        if (data.choices && data.choices.length > 0) {
            const generatedText = data.choices[0].message.content;
            res.status(200).json({ content: [{ text: generatedText }] });
        } else {
            res.status(500).json({ error: '답장 결과가 비어있습니다.' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}