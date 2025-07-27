// api/config.js - Серверная функция для получения публичной конфигурации
export default function handler(req, res) {
    // Возвращаем только ПУБЛИЧНЫЕ данные (anon key безопасен для клиента)
    const config = {
        supabase: {
            url: process.env.SUPABASE_URL,
            anonKey: process.env.SUPABASE_ANON_KEY
        },
        api: {
            cardsUrl: process.env.GITHUB_CARDS_URL,
            paymentUrl: process.env.PAYMENT_URL
        },
        app: {
            freeQuestionsLimit: parseInt(process.env.FREE_QUESTIONS_LIMIT) || 3,
            premiumPrice: parseInt(process.env.PREMIUM_PRICE) || 299
        }
    };

    // Добавляем заголовки для кэширования
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Кэш на 1 час
    res.status(200).json(config);
}
