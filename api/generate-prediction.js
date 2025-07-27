// api/generate-prediction.js - Серверная функция для генерации ИИ-предсказаний
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user_id, question, cards, type } = req.body;

        if (!user_id || !cards || !Array.isArray(cards)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Отправляем запрос в n8n для генерации ИИ-предсказания
        const n8nResponse = await fetch(`${process.env.N8N_WEBHOOK_BASE}/tarot-prediction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user_id,
                question: question || '',
                cards: cards,
                type: type || 'question',
                timestamp: new Date().toISOString()
            })
        });

        if (!n8nResponse.ok) {
            throw new Error(`n8n API error: ${n8nResponse.status}`);
        }

        const result = await n8nResponse.json();
        
        return res.status(200).json({
            success: true,
            prediction: result.prediction || result.message || 'Предсказание получено успешно'
        });

    } catch (error) {
        console.error('❌ Error generating prediction:', error);
        return res.status(500).json({ 
            error: 'Не удалось получить предсказание. Попробуйте позже.' 
        });
    }
}
