export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GROQ_API_KEY; // Vercel에 숨겨둘 Groq 키

    if (!apiKey) {
        return res.status(500).json({ error: 'Vercel에 GROQ_API_KEY 환경변수가 없습니다!' });
    }

    // Groq API 주소
    const url = "https://api.groq.com/openai/v1/chat/completions";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-70b-8192", // 메타(Meta)의 똑똑한 Llama 3 (70B) 모델
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
            // 프론트엔드가 원래 읽던 방식 그대로 포장해서 전송!
            res.status(200).json({ content: [{ text: generatedText }] });
        } else {
            res.status(500).json({ error: '답장 결과가 비어있습니다.' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}