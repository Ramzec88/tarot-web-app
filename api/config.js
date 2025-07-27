// api/config.js - Серверная функция для получения публичной конфигурации
export default function handler(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Обрабатываем только GET запросы
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        // Возвращаем только ПУБЛИЧНЫЕ данные (anon key безопасен для клиента)
        const config = {
            supabase: {
                url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
                anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
            },
            api: {
                n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'https://your-n8n.app/webhook/tarot',
                cardsUrl: process.env.GITHUB_CARDS_URL || 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json',
                paymentUrl: process.env.PAYMENT_URL || 'https://www.wildberries.ru/catalog/199937445/detail.aspx'
            },
            app: {
                freeQuestionsLimit: parseInt(process.env.FREE_QUESTIONS_LIMIT) || 3,
                premiumPrice: parseInt(process.env.PREMIUM_PRICE) || 299
            }
        };
        
        // Добавляем заголовки для кэширования
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Кэш на 1 час
        
        // Возвращаем конфигурацию
        res.status(200).json(config);
        
    } catch (error) {
        console.error('Ошибка API config:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Не удалось загрузить конфигурацию'
        });
    }
}
