// api/cards.js - API для получения карт Таро с кэшированием
import fs from 'fs';
import path from 'path';

// Кэш для карт (в памяти)
let cardsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 час в миллисекундах

export default async function handler(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Обрабатываем только GET запросы
    if (req.method !== 'GET') {
        res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Только GET запросы разрешены' 
        });
        return;
    }
    
    try {
        const now = Date.now();
        
        // Проверяем кэш
        if (cardsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
            console.log('📂 Возвращаем карты из кэша');
            
            // Устанавливаем заголовки кэширования
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // 1 час
            res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
            res.setHeader('X-Cache-Status', 'HIT');
            
            return res.status(200).json({
                success: true,
                cards: cardsCache,
                cached: true,
                timestamp: new Date().toISOString()
            });
        }
        
        // Загружаем карты из нескольких источников
        let cards = null;
        let source = 'unknown';
        
        // 1. Пытаемся загрузить из локального файла
        try {
            const cardsPath = path.join(process.cwd(), 'cards.json');
            const cardsData = fs.readFileSync(cardsPath, 'utf8');
            cards = JSON.parse(cardsData);
            source = 'local';
            console.log('📂 Карты загружены из локального файла');
        } catch (localError) {
            console.warn('⚠️ Не удалось загрузить локальный файл cards.json:', localError.message);
        }
        
        // 2. Если локальный файл не найден, пытаемся загрузить из внешнего источника
        if (!cards && process.env.CARDS_URL) {
            try {
                const response = await fetch(process.env.CARDS_URL, {
                    headers: {
                        'User-Agent': 'Tarot-Web-App/1.0'
                    }
                });
                
                if (response.ok) {
                    cards = await response.json();
                    source = 'external';
                    console.log('🌐 Карты загружены из внешнего источника');
                } else {
                    console.warn('⚠️ Ошибка загрузки из внешнего источника:', response.status);
                }
            } catch (externalError) {
                console.warn('⚠️ Ошибка загрузки внешнего источника:', externalError.message);
            }
        }
        
        // 3. Fallback - используем встроенные карты
        if (!cards) {
            cards = getFallbackCards();
            source = 'fallback';
            console.log('🛡️ Используем встроенные карты (fallback)');
        }
        
        // Валидируем структуру карт
        if (!Array.isArray(cards) || cards.length === 0) {
            throw new Error('Некорректный формат данных карт');
        }
        
        // Сохраняем в кэш
        cardsCache = cards;
        cacheTimestamp = now;
        
        // Устанавливаем заголовки кэширования
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // 1 час
        res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Cache-Status', 'MISS');
        res.setHeader('X-Cards-Source', source);
        
        // Возвращаем успешный ответ
        res.status(200).json({
            success: true,
            cards: cards,
            source: source,
            count: cards.length,
            cached: false,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Ошибка API cards:', error);
        
        // Если есть кэш, возвращаем его даже если он устарел
        if (cardsCache) {
            console.log('🛡️ Возвращаем устаревший кэш из-за ошибки');
            res.setHeader('X-Cache-Status', 'STALE');
            
            return res.status(200).json({
                success: true,
                cards: cardsCache,
                cached: true,
                stale: true,
                error: 'Использованы кэшированные данные',
                timestamp: new Date().toISOString()
            });
        }
        
        // Возвращаем ошибку с fallback картами
        const fallbackCards = getFallbackCards();
        
        res.status(500).json({ 
            success: false,
            error: 'Ошибка загрузки карт',
            message: error.message,
            fallback: {
                cards: fallbackCards,
                count: fallbackCards.length
            }
        });
    }
}

// Встроенные карты как fallback (без внешних изображений)
function getFallbackCards() {
    return [
        {
            id: "MA_0",
            name: "Дурак",
            symbol: "🔮",
            image: null, // Будет создан placeholder в клиенте
            meaningUpright: "Начало, невинность, спонтанность, свободный дух",
            meaningReversed: "Безрассудство, наивность, риск",
            description: "Карта новых начинаний и свободы выбора. Сегодня звезды благоволят вашим смелым решениям и спонтанным поступкам."
        },
        {
            id: "MA_1",
            name: "Маг",
            symbol: "🔮",
            image: null,
            meaningUpright: "Сила воли, проявление, вдохновение",
            meaningReversed: "Манипуляция, обман, неиспользованные таланты",
            description: "Карта силы воли и творческих способностей. У вас есть все инструменты для достижения цели."
        },
        {
            id: "MA_2",
            name: "Верховная Жрица",
            symbol: "🌙",
            image: null,
            meaningUpright: "Интуиция, тайны, внутренний голос",
            meaningReversed: "Потаённость, отстранённость, иллюзии",
            description: "Карта интуиции и скрытых знаний. Прислушайтесь к своему внутреннему голосу."
        },
        {
            id: "MA_17",
            name: "Звезда",
            symbol: "⭐",
            image: null,
            meaningUpright: "Надежда, вдохновение, исцеление",
            meaningReversed: "Пессимизм, разочарование",
            description: "Карта надежды и вдохновения. Впереди вас ждут светлые перспективы и новые возможности."
        },
        {
            id: "MA_19",
            name: "Солнце",
            symbol: "☀️",
            image: null,
            meaningUpright: "Радость, успех, жизненная сила",
            meaningReversed: "Сомнение, эго",
            description: "Карта радости и успеха. Сегодня день полон позитивной энергии и благоприятных возможностей."
        },
        {
            id: "MA_18",
            name: "Луна",
            symbol: "🌙",
            image: null,
            meaningUpright: "Иллюзии, интуиция, страхи",
            meaningReversed: "Ясность, прозрение",
            description: "Карта тайн и интуиции. Доверьтесь внутреннему голосу, но будьте осторожны с иллюзиями."
        }
    ];
}
