// api/subscription-codes.js - API для управления кодами подписки
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента с service key для полного доступа
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials not found');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action } = req.query;

        switch (action) {
            case 'generate':
                return await generateCodes(req, res);
            case 'validate':
                return await validateCode(req, res);
            case 'list':
                return await listCodes(req, res);
            case 'stats':
                return await getStats(req, res);
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid action. Use: generate, validate, list, stats'
                });
        }
    } catch (error) {
        console.error('❌ Subscription codes API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Генерация новых кодов
async function generateCodes(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { count = 1, admin_key } = req.body;

    // Простая проверка админского ключа (в реальном проекте использовать JWT)
    if (admin_key !== process.env.ADMIN_KEY) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        const { data, error } = await supabase
            .rpc('create_subscription_codes', { count_to_create: count });

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            codes: data.map(item => item.code),
            count: data.length
        });
    } catch (error) {
        console.error('❌ Error generating codes:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate codes'
        });
    }
}

// Валидация кода
async function validateCode(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            success: false,
            error: 'Code is required'
        });
    }

    try {
        const { data, error } = await supabase
            .from('tarot_subscription_codes')
            .select('id, code, is_used, subscription_duration_days, expires_at')
            .eq('code', code.toUpperCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(200).json({
                    success: true,
                    valid: false,
                    error: 'Code not found'
                });
            }
            throw error;
        }

        const isValid = !data.is_used && 
            (!data.expires_at || new Date(data.expires_at) > new Date());

        return res.status(200).json({
            success: true,
            valid: isValid,
            code: data.code,
            subscriptionDays: data.subscription_duration_days,
            error: !isValid ? (data.is_used ? 'Code already used' : 'Code expired') : null
        });

    } catch (error) {
        console.error('❌ Error validating code:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to validate code'
        });
    }
}

// Список кодов
async function listCodes(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { admin_key, limit = 50, offset = 0, used } = req.query;

    if (admin_key !== process.env.ADMIN_KEY) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        let query = supabase
            .from('tarot_subscription_codes')
            .select('id, code, is_used, used_by_user_id, used_at, created_at, subscription_duration_days')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (used !== undefined) {
            query = query.eq('is_used', used === 'true');
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            codes: data,
            count: data.length
        });

    } catch (error) {
        console.error('❌ Error listing codes:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list codes'
        });
    }
}

// Статистика кодов
async function getStats(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { admin_key } = req.query;

    if (admin_key !== process.env.ADMIN_KEY) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        // Общее количество кодов
        const { count: totalCodes } = await supabase
            .from('tarot_subscription_codes')
            .select('*', { count: 'exact', head: true });

        // Использованные коды
        const { count: usedCodes } = await supabase
            .from('tarot_subscription_codes')
            .select('*', { count: 'exact', head: true })
            .eq('is_used', true);

        // Активные коды
        const activeCodes = totalCodes - usedCodes;

        return res.status(200).json({
            success: true,
            stats: {
                total: totalCodes,
                used: usedCodes,
                active: activeCodes,
                usageRate: totalCodes > 0 ? ((usedCodes / totalCodes) * 100).toFixed(2) : 0
            }
        });

    } catch (error) {
        console.error('❌ Error getting stats:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
}
