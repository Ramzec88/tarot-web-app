// api/config.js - Исправленный API endpoint для конфигурации
export default function handler(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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
        // Публичная конфигурация (безопасная для клиента)
        const config = {
            supabase: {
                url: process.env.SUPABASE_URL || 'https://xqtokipsfzywippmvpgp.supabase.co',
                anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxdG9raXBzZnp5d2lwcG12cGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNzAyNDQsImV4cCI6MjA0NjY0NjI0NH0.GgwhQgjWLrOj4zYoL6S7_3iuYdO4ufcRsAWY_wqtTkY'
            },
            api: {
                n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'https://volshebstvo.app.n8n.cloud/webhook/shepot-kart',
                cardsUrl: process.env.GITHUB_CARDS_URL || '',
                paymentUrl: process.env.PAYMENT_URL || 'https://www.wildberries.ru/catalog/199937445/detail.aspx'
            },
            app: {
                freeQuestionsLimit: parseInt(process.env.FREE_QUESTIONS_LIMIT) || 3,
                premiumPrice: parseInt(process.env.PREMIUM_PRICE) || 299,
                version: '1.0.0',
                supportBot: '@Helppodarok_bot'
            }
        };
        
        // Добавляем заголовки для кэширования (5 минут)
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
        res.setHeader('CDN-Cache-Control', 'public, max-age=300');
        
        // Возвращаем успешный ответ
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            ...config
        });
        
    } catch (error) {
        console.error('❌ Ошибка API config:', error);
        
        // Возвращаем ошибку с fallback конфигурацией
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Ошибка загрузки конфигурации',
            fallback: {
                supabase: {
                    url: 'https://xqtokipsfzywippmvpgp.supabase.co',
                    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxdG9raXBzZnp5d2lwcG12cGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNzAyNDQsImV4cCI6MjA0NjY0NjI0NH0.GgwhQgjWLrOj4zYoL6S7_3iuYdO4ufcRsAWY_wqtTkY'
                },
                api: {
                    n8nWebhookUrl: 'https://volshebstvo.app.n8n.cloud/webhook/shepot-kart',
                    cardsUrl: '',
                    paymentUrl: 'https://www.wildberries.ru/catalog/199937445/detail.aspx'
                },
                app: {
                    freeQuestionsLimit: 3,
                    premiumPrice: 299,
                    version: '1.0.0'
                }
            }
        });
    }
}
