// api/telegram-webhook.js - Обработчик вебхуков Telegram
// ========================================================================

import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;
        
        // Проверяем, что это сообщение от Telegram
        if (!update.message && !update.callback_query) {
            return res.status(200).json({ ok: true });
        }

        const message = update.message || update.callback_query?.message;
        const user = message?.from || update.callback_query?.from;
        
        if (!user) {
            return res.status(200).json({ ok: true });
        }

        // Обрабатываем команды
        if (message?.text) {
            await handleTextMessage(message, user);
        }

        // Обрабатываем данные из Web App
        if (message?.web_app_data) {
            await handleWebAppData(message.web_app_data, user);
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('❌ Telegram webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Обработка текстовых сообщений
async function handleTextMessage(message, user) {
    const text = message.text;
    const chatId = message.chat.id;

    switch (text) {
        case '/start':
            await handleStartCommand(chatId, user);
            break;
        case '/premium':
            await handlePremiumCommand(chatId, user);
            break;
        case '/stats':
            await handleStatsCommand(chatId, user);
            break;
        default:
            // Обработка обычных сообщений
            break;
    }
}

// Обработка команды /start
async function handleStartCommand(chatId, user) {
    try {
        // Создаем или получаем пользователя в Supabase
        const { data: existingUser } = await supabase
            .from('tarot_user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!existingUser) {
            // Создаем нового пользователя
            await supabase
                .from('tarot_user_profiles')
                .insert([{
                    user_id: user.id,
                    chat_id: chatId,
                    username: user.username,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    free_predictions_left: 3,
                    is_subscribed: false,
                    referral_code: `ref_${user.id}`
                }]);
        }

        // Отправляем приветственное сообщение
        await sendMessage(chatId, 
            `🔮 Добро пожаловать в мир карт Таро!\n\n` +
            `Я помогу вам получить мудрые советы от древних карт.\n\n` +
            `Нажмите кнопку ниже, чтобы начать:`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '🃏 Открыть приложение Таро',
                            web_app: { url: `${process.env.VERCEL_URL || 'https://your-app.vercel.app'}` }
                        }
                    ]]
                }
            }
        );

    } catch (error) {
        console.error('❌ Error in start command:', error);
    }
}

// Обработка команды /premium
async function handlePremiumCommand(chatId, user) {
    try {
        const { data: userProfile } = await supabase
            .from('tarot_user_profiles')
            .select('is_subscribed, subscription_expiry_date, free_predictions_left')
            .eq('user_id', user.id)
            .single();

        if (!userProfile) {
            await sendMessage(chatId, 'Сначала выполните команду /start');
            return;
        }

        if (userProfile.is_subscribed) {
            const expiryDate = new Date(userProfile.subscription_expiry_date).toLocaleDateString('ru-RU');
            await sendMessage(chatId, `⭐ У вас активна премиум подписка до ${expiryDate}`);
        } else {
            await sendMessage(chatId, 
                `💎 Премиум подписка\n\n` +
                `🎫 Бесплатных вопросов осталось: ${userProfile.free_predictions_left}\n\n` +
                `⭐ С премиум подпиской вы получите:\n` +
                `• Неограниченные вопросы к картам\n` +
                `• Эксклюзивные расклады\n` +
                `• Подробные ИИ-толкования\n` +
                `• Приоритетная поддержка\n\n` +
                `💰 Всего 299₽ на 30 дней`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '💳 Оформить премиум',
                                url: process.env.PAYMENT_URL || 'https://digital.wildberries.ru/offer/491728'
                            }
                        ]]
                    }
                }
            );
        }

    } catch (error) {
        console.error('❌ Error in premium command:', error);
    }
}

// Обработка команды /stats
async function handleStatsCommand(chatId, user) {
    try {
        const { data: userProfile } = await supabase
            .from('tarot_user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!userProfile) {
            await sendMessage(chatId, 'Сначала выполните команду /start');
            return;
        }

        // Получаем статистику пользователя
        const [questionsCount, dailyCardsCount] = await Promise.all([
            supabase.from('tarot_questions').select('id', { count: 'exact' }).eq('user_id', user.id),
            supabase.from('tarot_daily_cards').select('id', { count: 'exact' }).eq('user_id', user.id)
        ]);

        const memberSince = new Date(userProfile.created_at).toLocaleDateString('ru-RU');
        
        await sendMessage(chatId,
            `📊 Ваша статистика\n\n` +
            `👤 Имя: ${userProfile.first_name}\n` +
            `📅 Участник с: ${memberSince}\n` +
            `🎫 Бесплатных вопросов: ${userProfile.free_predictions_left}\n` +
            `⭐ Премиум: ${userProfile.is_subscribed ? 'Да' : 'Нет'}\n` +
            `❓ Всего вопросов: ${questionsCount.count}\n` +
            `🌅 Карт дня: ${dailyCardsCount.count}\n` +
            `🔗 Приглашено друзей: ${userProfile.referral_count}`
        );

    } catch (error) {
        console.error('❌ Error in stats command:', error);
    }
}

// Обработка данных из Web App
async function handle
