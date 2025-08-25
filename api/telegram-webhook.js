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
            .maybeSingle();

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
            .maybeSingle();

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
            .maybeSingle();

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
async function handleWebAppData(webAppData, user) {
    try {
        const data = JSON.parse(webAppData.data);
        
        switch (data.type) {
            case 'history_share':
                await handleHistoryShare(user.id, data);
                break;
            case 'premium_purchase':
                await handlePremiumPurchase(user.id, data);
                break;
            case 'feedback':
                await handleFeedback(user.id, data);
                break;
            default:
                console.log('Unknown web app data type:', data.type);
        }

    } catch (error) {
        console.error('❌ Error handling web app data:', error);
    }
}

// Обработка поделиться историей
async function handleHistoryShare(userId, data) {
    try {
        const { data: userProfile } = await supabase
            .from('tarot_user_profiles')
            .select('chat_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!userProfile) return;

        // Отправляем красиво оформленное сообщение с историей
        const message = data.text_message || 'История расклада получена из приложения';
        
        await sendMessage(userProfile.chat_id, 
            `📋 История из приложения Таро:\n\n${message}`,
            {
                parse_mode: 'Markdown'
            }
        );

    } catch (error) {
        console.error('❌ Error sharing history:', error);
    }
}

// Обработка покупки премиум
async function handlePremiumPurchase(userId, data) {
    try {
        // Здесь будет логика проверки оплаты
        // Пока просто активируем премиум для тестирования
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 дней

        await supabase
            .from('tarot_user_profiles')
            .update({
                is_subscribed: true,
                subscription_expiry_date: expiryDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        const { data: userProfile } = await supabase
            .from('tarot_user_profiles')
            .select('chat_id, first_name')
            .eq('user_id', userId)
            .maybeSingle();

        if (userProfile) {
            await sendMessage(userProfile.chat_id,
                `🎉 Поздравляем, ${userProfile.first_name}!\n\n` +
                `⭐ Премиум подписка активирована на 30 дней!\n\n` +
                `Теперь вы можете:\n` +
                `• Задавать неограниченное количество вопросов\n` +
                `• Использовать эксклюзивные расклады\n` +
                `• Получать подробные ИИ-толкования\n\n` +
                `Приятного использования! 🔮`
            );
        }

    } catch (error) {
        console.error('❌ Error handling premium purchase:', error);
    }
}

// Обработка отзыва
async function handleFeedback(userId, data) {
    try {
        // Сохраняем отзыв в базу данных
        await supabase
            .from('tarot_reviews')
            .insert([{
                user_id: userId,
                rating: data.rating,
                review_text: data.text,
                is_anonymous: data.is_anonymous || false,
                is_approved: false // Требует модерации
            }]);

        const { data: userProfile } = await supabase
            .from('tarot_user_profiles')
            .select('chat_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (userProfile) {
            await sendMessage(userProfile.chat_id,
                `🙏 Спасибо за ваш отзыв!\n\n` +
                `Ваше мнение очень важно для нас. ` +
                `После модерации отзыв появится в приложении.`
            );
        }

    } catch (error) {
        console.error('❌ Error handling feedback:', error);
    }
}

// Отправка сообщения в Telegram
async function sendMessage(chatId, text, options = {}) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                ...options
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('❌ Error sending message:', error);
        throw error;
    }
}

// Функция для установки вебхука (вызывается отдельно)
export async function setWebhook() {
    try {
        const webhookUrl = `${process.env.VERCEL_URL}/api/telegram-webhook`;
        
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query']
            })
        });

        const result = await response.json();
        console.log('Webhook set result:', result);
        
        return result;

    } catch (error) {
        console.error('❌ Error setting webhook:', error);
        throw error;
    }
}
