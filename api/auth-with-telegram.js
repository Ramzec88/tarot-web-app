// api/auth-with-telegram.js - Аутентификация пользователей Telegram Web App
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase с Service Role Key (только на сервере!)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        const { initData } = req.body;
        
        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }

        // 1. Валидируем данные Telegram
        const isValid = validateTelegramWebAppData(initData, process.env.TELEGRAM_BOT_TOKEN);
        
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Telegram signature' });
        }

        // 2. Парсим данные пользователя
        const telegramUser = parseTelegramInitData(initData);
        
        if (!telegramUser || !telegramUser.id) {
            return res.status(400).json({ error: 'Invalid user data' });
        }

        console.log('✅ Telegram user validated:', telegramUser.id);

        // 3. Получаем или создаем профиль пользователя
        let userProfile = await getUserProfile(telegramUser.id);
        
        if (!userProfile) {
            console.log('👤 Создаем новый профиль для пользователя:', telegramUser.id);
            userProfile = await createUserProfile(telegramUser, telegramUser.username);
        }

        if (!userProfile || !userProfile.user_id) {
            return res.status(500).json({ error: 'Failed to create or get user profile' });
        }

        // 4. Создаем или получаем Supabase auth пользователя
        const email = `telegram_${telegramUser.id}@tarot-app.local`;
        
        // Сначала пытаемся найти существующего пользователя
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        let authUser = existingUsers.users.find(user => 
            user.user_metadata?.telegram_id === telegramUser.id.toString()
        );

        if (!authUser) {
            // Создаем нового Supabase auth пользователя
            const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: crypto.randomBytes(32).toString('hex'),
                email_confirm: true,
                user_metadata: {
                    telegram_id: telegramUser.id.toString(),
                    username: telegramUser.username || null,
                    first_name: telegramUser.first_name || null,
                    last_name: telegramUser.last_name || null,
                    app: 'tarot-web-app'
                }
            });

            if (createUserError) {
                console.error('❌ Error creating auth user:', createUserError);
                return res.status(500).json({ error: 'Failed to create auth user' });
            }

            authUser = newUser.user;
            console.log('✅ New auth user created:', authUser.id);
        }

        // 5. Обновляем профиль пользователя с auth user_id
        if (userProfile.user_id !== authUser.id) {
            const { error: updateError } = await supabaseAdmin
                .from('tarot_user_profiles')
                .update({ user_id: authUser.id })
                .eq('id', userProfile.id);

            if (updateError) {
                console.error('❌ Error updating profile with auth user_id:', updateError);
            } else {
                console.log('✅ Profile updated with auth user_id');
                userProfile.user_id = authUser.id;
            }
        }

        // 6. Генерируем access token для пользователя
        const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateAccessToken(authUser.id);

        if (tokenError) {
            console.error('❌ JWT generation error:', tokenError);
            return res.status(500).json({ error: 'Failed to generate access token' });
        }

        console.log('✅ JWT token generated for user:', authUser.id);

        return res.status(200).json({
            success: true,
            session: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                expires_in: tokenData.expires_in || 3600,
                token_type: 'bearer',
                user: {
                    id: authUser.id,
                    email: authUser.email,
                    user_metadata: authUser.user_metadata
                }
            },
            user_profile: userProfile
        });

    } catch (error) {
        console.error('❌ Error in auth-with-telegram:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Валидация Telegram Web App данных
function validateTelegramWebAppData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            console.warn('⚠️ No hash in initData');
            return false;
        }
        
        urlParams.delete('hash');
        
        // Сортируем параметры
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Создаем секретный ключ
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        
        // Проверяем подпись
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        return calculatedHash === hash;
    } catch (error) {
        console.error('❌ Validation error:', error);
        return false;
    }
}

// Парсинг данных пользователя из initData
function parseTelegramInitData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get('user');
        
        if (!userParam) {
            console.warn('⚠️ No user param in initData');
            return null;
        }
        
        return JSON.parse(userParam);
    } catch (error) {
        console.error('❌ Parse error:', error);
        return null;
    }
}

// Получение профиля пользователя
async function getUserProfile(telegramId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('tarot_user_profiles')
            .select('*')
            .eq('telegram_id', telegramId.toString())
            .maybeSingle();

        if (error) {
            console.error('❌ Error getting user profile:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Critical error getting user profile:', error);
        return null;
    }
}

// Создание профиля пользователя
async function createUserProfile(telegramUser, username = null) {
    try {
        const { data, error } = await supabaseAdmin
            .from('tarot_user_profiles')
            .insert([
                {
                    telegram_id: telegramUser.id.toString(),
                    username: username || telegramUser.username || null,
                    first_name: telegramUser.first_name || null,
                    last_name: telegramUser.last_name || null,
                    is_subscribed: false,
                    questions_used: 0,
                    free_predictions_left: 3,
                    last_card_day: null
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating user profile:', error);
            return null;
        }
        
        console.log('✅ User profile created:', data);
        return data;
    } catch (error) {
        console.error('❌ Critical error creating user profile:', error);
        return null;
    }
}
