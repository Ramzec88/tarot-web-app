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
        const { user_id, question, cards, type, userName, additionalData } = req.body;

        if (!cards || (!Array.isArray(cards) && !cards.name)) {
            return res.status(400).json({ error: 'Missing required fields: cards' });
        }

        console.log(`🔮 Генерация предсказания типа "${type}" для пользователя:`, userName || 'Гость');

        // Попытка получить предсказание через n8n
        try {
            const prediction = await generateN8nPrediction({
                user_id: user_id || 'webapp_user',
                userName: userName || 'Гость', 
                question: question || '',
                cards: cards, // Передаем весь массив или одну карту
                type: type || 'question',
                additionalData: additionalData || {}
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
            const localPrediction = generateLocalPrediction(cards, question, type, additionalData);
            
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
        webhookUrl: process.env.N8N_WEBHOOK_URL
    };

    if (!n8nConfig.webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL не настроен');
    }

    console.log('🌐 Отправляем в n8n:', n8nConfig.webhookUrl);
    console.log(`📤 Данные для типа "${data.type}":`, {
        cardsCount: Array.isArray(data.cards) ? data.cards.length : 1,
        hasAdditionalData: !!data.additionalData && Object.keys(data.additionalData).length > 0
    });

    const requestPayload = {
        action: 'generate_prediction',
        telegram_id: data.user_id,
        userName: data.userName,
        question: data.question,
        type: data.type,
        cards: data.cards, // Передаем как есть - массив или объект
        additionalData: data.additionalData || {}
    };

    const payload = JSON.stringify(requestPayload);
    console.log('📤 Отправляем payload:', payload.substring(0, 500) + (payload.length > 500 ? '...' : ''));

    const response = await fetch(n8nConfig.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TarotWebApp/1.0'
        },
        body: payload
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 Ответ от n8n:', result.prediction?.substring(0, 100) + '...');
    
    if (!result.success || !result.prediction) {
        throw new Error('Некорректный ответ от n8n API');
    }

    return result;
}


function generateLocalPrediction(cards, question, type = 'question', additionalData = {}) {
    const card = Array.isArray(cards) ? cards[0] : cards;
    
    switch (type) {
        case 'daily_card':
            return generateDailyCardFallback(card);
        case 'question':
            return generateQuestionFallback(card, question);
        case 'clarifying_question':
            return generateClarifyingFallback(card, question, additionalData);
        case 'spread':
            return generateSpreadFallback(cards, question, additionalData);
        default:
            return generateQuestionFallback(card, question);
    }
}

function generateDailyCardFallback(card) {
    const templates = [
        `Сегодня карта "${card.name}" принесла важное послание. ${card.description || card.meaningUpright || 'Энергии дня направлены на внутренний рост и новые возможности.'} Прислушайтесь к интуиции и доверьтесь своей внутренней мудрости.`,
        `"${card.name}" освещает ваш день особой энергией. ${card.description || card.meaningUpright || 'Время для размышлений и принятия важных решений.'} Звезды благоприятствуют новым начинаниям.`,
        `Энергии "${card.name}" окружают вас сегодня. ${card.description || card.meaningUpright || 'Вселенная открывает новые пути.'} Будьте готовы к переменам и новым открытиям.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateQuestionFallback(card, question) {
    const templates = [
        `В ответ на ваш вопрос карта "${card.name}" указывает: ${card.description || card.meaningUpright || 'Ситуация требует внимания к деталям.'}`,
        `"${card.name}" раскрывает суть вашего вопроса: ${card.description || card.meaningUpright || 'Время действовать с мудростью.'}`,
        `Энергии "${card.name}" говорят: ${card.description || card.meaningUpright || 'Доверьтесь внутреннему голосу.'}`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateClarifyingFallback(card, question, additionalData) {
    const prefix = additionalData.originalQuestion 
        ? `Углубляя предыдущий ответ, карта "${card.name}" добавляет: `
        : `В продолжение вашего вопроса "${card.name}" раскрывает: `;
    
    return prefix + (card.description || card.meaningUpright || 'Важно учесть скрытые аспекты ситуации.');
}

function generateSpreadFallback(cards, question, additionalData) {
    const cardsArray = Array.isArray(cards) ? cards : [cards];
    const cardNames = cardsArray.map(c => c.name).join(', ');
    
    return `🎯 РАСКЛАД РАСКРЫТ\n\nВыпавшие карты: ${cardNames}\n\nЭто сочетание карт указывает на период важных изменений. Каждая позиция дополняет общую картину, показывая путь к решению. Прислушайтесь к своей интуиции при интерпретации символов.`;
}
