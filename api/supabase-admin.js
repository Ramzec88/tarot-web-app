// api/supabase-admin.js - Серверная функция для операций с Service Role Key
// ========================================================================

import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase с Service Role Key (только на сервере!)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, data } = req.body;

        switch (action) {
            case 'create_user':
                return await createUser(req, res, data);
            case 'update_subscription':
                return await updateSubscription(req, res, data);
            case 'admin_stats':
                return await getAdminStats(req, res);
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }

    } catch (error) {
        console.error('❌ Server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Создание пользователя (с административными правами)
async function createUser(req, res, userData) {
    try {
        const { data, error } = await supabaseAdmin
            .from('tarot_user_profiles')
            .insert([{
                user_id: userData.user_id,
                chat_id: userData.chat_id,
                username: userData.username,
                first_name: userData.first_name,
                last_name: userData.last_name,
                free_predictions_left: userData.free_predictions_left || 3,
                is_subscribed: userData.is_subscribed || false,
                referral_code: `ref_${userData.user_id}`,
                referred_by: userData.referred_by || null
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, user: data });

    } catch (error) {
        console.error('❌ Error creating user:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Обновление подписки пользователя
async function updateSubscription(req, res, subscriptionData) {
    try {
        const { user_id, is_subscribed, expiry_date } = subscriptionData;

        const { data, error } = await supabaseAdmin
            .from('tarot_user_profiles')
            .update({
                is_subscribed: is_subscribed,
                subscription_expiry_date: expiry_date,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user_id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, user: data });

    } catch (error) {
        console.error('❌ Error updating subscription:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Получение административной статистики
async function getAdminStats(req, res) {
    try {
        const [usersCount, questionsCount, dailyCardsCount] = await Promise.all([
            supabaseAdmin.from('tarot_user_profiles').select('id', { count: 'exact' }),
            supabaseAdmin.from('tarot_questions').select('id', { count: 'exact' }),
            supabaseAdmin.from('tarot_daily_cards').select('id', { count: 'exact' })
        ]);

        const stats = {
            total_users: usersCount.count,
            total_questions: questionsCount.count,
            total_daily_cards: dailyCardsCount.count,
            timestamp: new Date().toISOString()
        };

        return res.status(200).json(stats);

    } catch (error) {
        console.error('❌ Error getting admin stats:', error);
        return res.status(500).json({ error: error.message });
    }
}
