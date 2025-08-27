// api/generate-prediction.js - Серверная функция для генерации ИИ-предсказаний через n8n
const crypto = require('crypto');

export default async function handler(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user_id, question, cards, type, userName } = req.body;

        if (!cards || (!Array.isArray(cards) && !cards.name)) {
            return res.status(400).json({ error: 'Missing required fields: cards' });
        }

        // Поддерживаем как массив карт, так и одну карту
        const card = Array.isArray(cards) ? cards[0] : cards;

        console.log('🔮 Генерация предсказания для карты:', card.name);

        // Попытка получить предсказание через n8n
        try {
            const prediction = await generateN8nPrediction({
                user_id: user_id || 'webapp_user',
                userName: userName || 'Гость', 
                question: question || '',
                card: card,
                type: type || 'single_card'
            });

            return res.status(200).json({
                success: true,
                prediction: prediction.prediction,
                source: 'n8n',
                user: prediction.user || null,
                timestamp: prediction.timestamp
            });

        } catch (n8nError) {
            console.error('❌ n8n Error:', n8nError.message);
            console.log('🔄 Fallback к локальной генерации...');
            
            // Fallback к локальной генерации
            const localPrediction = generateLocalPrediction(card, question);
            
            return res.status(200).json({
                success: true,
                prediction: localPrediction,
                source: 'local',
                user: null,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Error generating prediction:', error);
        return res.status(500).json({ 
            error: 'Не удалось получить предсказание. Попробуйте позже.' 
        });
    }
}

async function generateN8nPrediction(data) {
    const n8nConfig = {
        webhookUrl: process.env.N8N_WEBHOOK_URL,
        secret: process.env.N8N_SECRET
    };

    if (!n8nConfig.webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL не настроен');
    }

    const requestPayload = {
        action: 'generate_prediction',
        telegram_id: data.user_id,
        userName: data.userName,
        card: {
            name: data.card.name,
            symbol: data.card.symbol || '🔮',
            meaning: data.card.meaning
        },
        question: data.question,
        type: data.type
    };

    const payload = JSON.stringify(requestPayload);
    const signature = createHmacSignature(payload, n8nConfig.secret);

    const response = await fetch(n8nConfig.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-Sign': signature,
            'User-Agent': 'TarotWebApp/1.0'
        },
        body: payload
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.prediction) {
        throw new Error('Некорректный ответ от n8n API');
    }

    return result;
}

function createHmacSignature(payload, secret) {
    if (!secret) {
        console.warn('⚠️ N8N_SECRET не настроен, отправляем без подписи');
        return '';
    }
    
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

function generateLocalPrediction(card, question) {
    const templates = [
        `Карты указывают: "${card.name}" раскрывает ${card.meaning.toLowerCase()}. В контексте вашего вопроса это может означать период важных перемен и новых возможностей.`,
        `Энергии "${card.name}" говорят о ${card.meaning.toLowerCase()}. Вселенная направляет ваше внимание на внутреннюю мудрость и интуицию.`,
        `Мистическая сила "${card.name}" указывает на ${card.meaning.toLowerCase()}. Прислушайтесь к знакам, которые подает вам судьба.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
}
