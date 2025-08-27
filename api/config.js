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
                url: process.env.SUPABASE_URL || 'https://jjowuzqfnwcuulcknkxh.supabase.co',
                anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3d1enFmbndjdXVsY2tua3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MDk4MzQsImV4cCI6MjA1OTI4NTgzNH0.Yzw4rjZh1KhKIKtzwAShYC-7nGjzp6aORTUaBtNxtVQ'
            },
            api: {
                n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'https://volshebstvo.app.n8n.cloud/webhook/shepot-kart',
                cardsUrl: process.env.CARDS_URL || '',
                paymentUrl: process.env.PAYMENT_URL || 'https://www.wildberries.ru/catalog/199937445/detail.aspx'
            },
            n8n: {
                enabled: process.env.N8N_ENABLED === 'true',
                webhookUrl: process.env.N8N_WEBHOOK_URL || 'https://volshebstvo.app.n8n.cloud/webhook/webapp-api',
                timeout: parseInt(process.env.N8N_TIMEOUT) || 30000,
                fallbackEnabled: process.env.N8N_FALLBACK_ENABLED !== 'false'
                // Не передаем secret на клиент из соображений безопасности
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
                    url: 'https://jjowuzqfnwcuulcknkxh.supabase.co',
                    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3d1enFmbndjdXVsY2tua3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MDk4MzQsImV4cCI6MjA1OTI4NTgzNH0.Yzw4rjZh1KhKIKtzwAShYC-7nGjzp6aORTUaBtNxtVQ'
                },
                api: {
                    n8nWebhookUrl: 'https://volshebstvo.app.n8n.cloud/webhook/shepot-kart',
                    cardsUrl: '',
                    paymentUrl: 'https://www.wildberries.ru/catalog/199937445/detail.aspx'
                },
                n8n: {
                    enabled: false,
                    webhookUrl: 'https://volshebstvo.app.n8n.cloud/webhook/webapp-api',
                    timeout: 30000,
                    fallbackEnabled: true
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
