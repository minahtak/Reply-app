export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Vercel에 GEMINI_API_KEY 환경변수가 없습니다!' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 800 }
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error("Gemini API Error:", data.error);
            return res.status(500).json({ error: data.error?.message || 'Gemini 호출 실패' });
        }

        if (data.candidates && data.candidates.length > 0) {
            const generatedText = data.candidates[0].content.parts[0].text;
            res.status(200).json({ content: [{ text: generatedText }] });
        } else {
            res.status(500).json({ error: '답장 결과가 비어있습니다.' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}