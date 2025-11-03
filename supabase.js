// supabase.js - Интеграция с Supabase для Tarot Web App
// ========================================================================

console.log('🔗 Загрузка Supabase интеграции...');

// 🌐 ИНИЦИАЛИЗАЦИЯ SUPABASE КЛИЕНТА
let supabaseClient = null;
let isAuthenticated = false;

async function initializeSupabase() {
    try {
        console.log('🔗 Инициализация Supabase...');
        
        // Ждем готовности конфигурации
        let config = null;
        let attempts = 0;
        const maxAttempts = 30; // 3 секунды
        
        while (!config && attempts < maxAttempts) {
            if (typeof window.getSupabaseConfig === 'function') {
                config = window.getSupabaseConfig();
            }
            
            if (!config) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }
        
        if (!config || !config.url || !config.anonKey) {
            console.warn('⚠️ Supabase конфигурация недоступна, работаем в автономном режиме');
            return false;
        }

        // Проверяем, не являются ли это тестовые значения
        if (config.url.includes('your-project') || config.anonKey.includes('your-anon')) {
            console.warn('⚠️ Обнаружены placeholder значения Supabase, работаем в автономном режиме');
            return false;
        }

        // Ждем загрузки Supabase библиотеки
        if (typeof window.supabase === 'undefined') {
            console.log('📚 Ожидание загрузки Supabase библиотеки...');
            
            // Проверяем, загружена ли библиотека в HTML
            const supabaseScript = document.querySelector('script[src*="supabase"]');
            if (!supabaseScript) {
                console.warn('⚠️ Supabase скрипт не найден в HTML');
                return false;
            }
            
            // Ждем загрузки библиотеки
            let libAttempts = 0;
            const maxLibAttempts = 50; // 5 секунд
            
            while (typeof window.supabase === 'undefined' && libAttempts < maxLibAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                libAttempts++;
            }
            
            if (typeof window.supabase === 'undefined') {
                console.warn('⚠️ Supabase библиотека не загрузилась, работаем в автономном режиме');
                return false;
            }
        }

        // Инициализируем клиент Supabase с правильными настройками
        try {
            supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: {
                        'x-application': 'tarot-web-app',
                        'apikey': config.anonKey
                    }
                },
                realtime: {
                    disabled: true // Отключаем realtime для лучшей производительности
                },
                // Включаем подробное логирование для отладки
                debug: true
            });
            
            console.log('✅ Supabase клиент инициализирован:', config.url.replace(/\/\/.*@/, '//***@'));
            
        } catch (clientError) {
            console.error('❌ Ошибка создания Supabase клиента:', clientError);
            return false;
        }

        // Проверяем подключение с таймаутом
        try {
            console.log('🔍 Проверка подключения к Supabase...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
            
            const { error } = await supabaseClient
                .from('tarot_user_profiles')
                .select('count', { count: 'exact', head: true })
                .abortSignal(controller.signal);
                
            clearTimeout(timeoutId);
                
            if (error) {
                if (error.name === 'AbortError') {
                    console.warn('⚠️ Таймаут подключения к Supabase, работаем в автономном режиме');
                } else {
                    console.warn('⚠️ Ошибка подключения к Supabase:', error.message);
                }
                return false;
            }
            
            console.log('✅ Подключение к Supabase проверено успешно');
            
            // Автоматически пытаемся аутентифицироваться с Telegram
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
                console.log('🔐 Запускаем автоматическую аутентификацию с Telegram...');
                await signInWithTelegram();
            }
            
            return true;
            
        } catch (connectionError) {
            if (connectionError.name === 'AbortError') {
                console.warn('⚠️ Таймаут проверки подключения к Supabase');
            } else {
                console.warn('⚠️ Ошибка проверки подключения:', connectionError.message);
            }
            return false;
        }
            
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации Supabase:', error);
        return false;
    }
}

// 🔐 ФУНКЦИИ АУТЕНТИФИКАЦИИ TELEGRAM

async function signInWithTelegram() {
    try {
        if (!window.Telegram || !window.Telegram.WebApp || !window.Telegram.WebApp.initData) {
            console.warn('⚠️ Telegram Web App данные недоступны');
            return false;
        }

        const initData = window.Telegram.WebApp.initData;
        
        if (!initData) {
            console.warn('⚠️ initData пуст');
            return false;
        }

        console.log('🔐 Отправляем запрос на аутентификацию...');

        // Отправляем запрос на серверный эндпоинт для аутентификации
        const response = await fetch('/api/auth-with-telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                initData: initData
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Ошибка аутентификации:', errorData.error);
            return false;
        }

        const authResult = await response.json();
        
        if (!authResult.success || !authResult.session) {
            console.error('❌ Неверный ответ аутентификации');
            return false;
        }

        console.log('✅ Получен JWT токен от сервера');

        // Устанавливаем сессию в Supabase клиенте
        const { error } = await supabaseClient.auth.setSession({
            access_token: authResult.session.access_token,
            refresh_token: authResult.session.refresh_token
        });

        if (error) {
            console.error('❌ Ошибка установки сессии:', error);
            return false;
        }

        isAuthenticated = true;
        console.log('✅ Сессия Supabase успешно установлена');
        
        // Сохраняем информацию о пользователе
        if (authResult.user_profile) {
            window.authenticatedUser = authResult.user_profile;
            console.log('👤 Пользователь аутентифицирован:', authResult.user_profile.telegram_id);
        }

        return true;

    } catch (error) {
        console.error('❌ Критическая ошибка аутентификации:', error);
        return false;
    }
}

// Проверка статуса аутентификации
function isSupabaseAuthenticated() {
    return isAuthenticated && supabaseClient && supabaseClient.auth.getUser();
}

// Получение текущего пользователя
async function getCurrentUser() {
    if (!supabaseClient) {
        return null;
    }
    
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            console.error('❌ Ошибка получения текущего пользователя:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('❌ Критическая ошибка получения пользователя:', error);
        return null;
    }
}

// 🧹 ФУНКЦИИ САНИТИЗАЦИИ ДАННЫХ

// Санитизация Telegram ID
function sanitizeTelegramId(telegramId) {
    if (!telegramId) return null;
    
    // Если это объект, пытаемся извлечь ID
    if (typeof telegramId === 'object' && telegramId !== null) {
        if (telegramId.id) return sanitizeTelegramId(telegramId.id);
        if (telegramId.chat_id) return sanitizeTelegramId(telegramId.chat_id);
        console.warn('⚠️ Неизвестная структура объекта telegram_id:', telegramId);
        return null;
    }
    
    // Приводим к строке и очищаем
    const cleaned = String(telegramId).trim();
    
    // Проверяем, что это не JSON
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
        console.warn('⚠️ Telegram ID похож на JSON:', cleaned);
        return null;
    }
    
    // Проверяем, что это валидный ID (число или строка без пробелов)
    if (!/^-?\d+$/.test(cleaned) && !/^[a-zA-Z0-9_]+$/.test(cleaned)) {
        console.warn('⚠️ Неверный формат Telegram ID:', cleaned);
        return null;
    }
    
    return cleaned;
}

// Санитизация username
function sanitizeUsername(username) {
    if (!username || username === null || username === undefined) return null;
    
    // Приводим к строке и очищаем
    const cleaned = String(username).trim();
    
    // Ограничиваем длину
    if (cleaned.length > 100) {
        return cleaned.substring(0, 100);
    }
    
    // Убираем потенциально опасные символы
    return cleaned.replace(/[<>]/g, '');
}

// 📝 ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ

// Вспомогательная функция для получения или создания профиля пользователя
async function getOrCreateUserProfile(telegramId, profileInfo = null) {
    console.log('🔍 Получение или создание профиля для ID:', telegramId);
    
    let userProfile = await getUserProfile(telegramId);
    
    if (!userProfile) {
        console.log('👤 Профиль не найден, создаем новый...');
        
        // Если передана только строка (старый формат), создаем объект
        let profileData = profileInfo;
        if (typeof profileInfo === 'string') {
            profileData = { username: profileInfo };
        }
        
        // Получаем полные данные пользователя Telegram
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
        const fullProfileData = {
            username: profileData?.username || window.getTelegramUserName?.() || null,
            first_name: profileData?.first_name || telegramUser.first_name || null,
            last_name: profileData?.last_name || telegramUser.last_name || null,
            is_subscribed: profileData?.is_subscribed || false,
            is_premium: profileData?.is_premium || false,
            questions_used: profileData?.questions_used || 0,
            total_questions: profileData?.total_questions || 0,
            free_predictions_left: profileData?.free_predictions_left || 3,
            ...profileData // Добавляем любые другие переданные поля
        };
        
        userProfile = await createUserProfile(telegramId, fullProfileData);
    }
    
    return userProfile;
}

async function createUserProfile(telegramId, profileInfo = {}) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен, сохраняем локально');
        return saveUserProfileLocally(telegramId, profileInfo.username || profileInfo);
    }

    try {
        // Если пользователь аутентифицирован, используем auth.uid()
        const { data: { user } } = await supabaseClient.auth.getUser();
        const authUserId = user?.id || null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const sanitizedTelegramId = sanitizeTelegramId(telegramId);
        if (!sanitizedTelegramId) {
            console.warn('⚠️ Неверный Telegram ID, используем локальное сохранение:', telegramId);
            return saveUserProfileLocally(telegramId, profileInfo.username || profileInfo);
        }
        
        // Поддерживаем старый формат (только username как строка) и новый (объект)
        let userData = {};
        if (typeof profileInfo === 'string') {
            userData.username = sanitizeUsername(profileInfo);
        } else if (typeof profileInfo === 'object' && profileInfo !== null) {
            userData = { ...profileInfo };
            if (userData.username) {
                userData.username = sanitizeUsername(userData.username);
            }
        }
        
        // Получаем данные Telegram пользователя для полного профиля
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
        
        const profileData = {
            telegram_id: sanitizedTelegramId,
            chat_id: telegramUser.id || sanitizedTelegramId, // Используем как chat_id
            username: userData.username || sanitizeUsername(telegramUser.username) || null,
            first_name: userData.first_name || telegramUser.first_name || null,
            last_name: userData.last_name || telegramUser.last_name || null,
            is_subscribed: userData.is_subscribed || false,
            questions_used: userData.questions_used || 0,
            total_questions: userData.total_questions || userData.questions_used || 0,
            free_predictions_left: userData.free_predictions_left || 3,
            last_card_day: userData.last_card_day || null,
            is_premium: userData.is_premium || userData.is_subscribed || false
        };

        // Добавляем user_id только если пользователь аутентифицирован
        if (authUserId) {
            profileData.user_id = authUserId;
        }

        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .upsert([profileData], { 
                onConflict: 'telegram_id',
                ignoreDuplicates: false
            })
            .select()
            .single()
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
            console.warn('⚠️ Ошибка Supabase при создании профиля:', error.message);
            return saveUserProfileLocally(telegramId, profileInfo.username || profileInfo);
        }
        
        console.log('✅ Профиль пользователя создан в Supabase:', data);
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⚠️ Таймаут создания профиля в Supabase');
        } else {
            console.error('❌ Критическая ошибка создания профиля:', error.message);
        }
        return saveUserProfileLocally(telegramId, profileInfo.username || profileInfo);
    }
}

async function getUserProfile(telegramId) {
    if (!supabaseClient) {
        return getUserProfileLocally(telegramId);
    }

    try {
        // Санитизация и валидация telegram_id
        const sanitizedTelegramId = sanitizeTelegramId(telegramId);
        if (!sanitizedTelegramId) {
            console.warn('⚠️ Неверный Telegram ID при получении профиля:', telegramId);
            return null;
        }
        
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .select('*')
            .eq('telegram_id', sanitizedTelegramId) // Using sanitized telegram_id
            .maybeSingle();

        // Подробное логирование ответа Supabase
        console.log('🔍 Supabase response for getUserProfile:', { 
            originalTelegramId: telegramId,
            sanitizedTelegramId: sanitizedTelegramId, 
            data: data || null, 
            error: error || null,
            errorCode: error?.code,
            errorMessage: error?.message,
            errorDetails: error?.details
        });

        // С .maybeSingle() не нужно проверять PGRST116, null возвращается автоматически
        if (error) {
            console.warn('⚠️ Ошибка Supabase при получении профиля:', error.message);
            return null;
        }
        
        // Если пользователь не найден, data будет null
        if (!data) {
            console.log('👤 Пользователь не найден для ID:', telegramId);
            return null;
        }
        
        // Проверяем истечение подписки если профиль найден
        if (data.subscription_end_date) {
            const subscriptionEndDate = new Date(data.subscription_end_date);
            const now = new Date();
            
            if (now > subscriptionEndDate) {
                console.log('⏰ Подписка истекла:', {
                    endDate: subscriptionEndDate.toISOString(),
                    currentDate: now.toISOString()
                });
                
                // Автоматически обновляем статус подписки в базе данных
                try {
                    await supabaseClient
                        .from('tarot_user_profiles')
                        .update({
                            is_subscribed: false,
                            is_premium: false
                        })
                        .eq('telegram_id', sanitizedTelegramId);
                    
                    // Обновляем локальные данные
                    data.is_subscribed = false;
                    data.is_premium = false;
                    
                    console.log('✅ Статус подписки автоматически обновлен (истекла)');
                } catch (updateError) {
                    console.error('❌ Ошибка обновления статуса подписки:', updateError);
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error('❌ Критическая ошибка получения профиля:', error.message);
        return null;
    }
}

async function updateUserProfile(telegramId, updates) {
    // Проверяем существование профиля перед обновлением
    const userProfile = await getUserProfile(telegramId);
    if (!userProfile) {
        console.warn('⚠️ Невозможно обновить профиль: пользователь не найден');
        return null;
    }

    if (!supabaseClient) {
        return updateUserProfileLocally(telegramId, updates);
    }

    try {
        // Валидируем telegram_id
        if (!telegramId || telegramId.toString().trim() === '') {
            console.warn('⚠️ Пустой Telegram ID');
            return null;
        }
        
        console.log('🔍 DEBUG: Обновляем профиль пользователя:', {
            telegramId: telegramId,
            updates: updates,
            timestamp: new Date().toISOString()
        });
        
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .update(updates)
            .eq('telegram_id', telegramId) // Using telegram_id consistently
            .select()
            .single();

        if (error) {
            console.error('❌ Ошибка обновления профиля:', {
                error: error,
                telegramId: telegramId,
                updates: updates,
                errorCode: error.code,
                errorMessage: error.message
            });
            return null;
        }
        
        console.log('✅ Профиль успешно обновлен:', {
            telegramId: telegramId,
            updatedData: data,
            requestedUpdates: updates
        });
        return data;
    } catch (error) {
        console.error('❌ Критическая ошибка обновления профиля:', error);
        return null;
    }
}

// 🃏 ФУНКЦИИ ДЛЯ РАБОТЫ С ЕЖЕДНЕВНЫМИ КАРТАМИ
async function saveDailyCard(telegramId, cardData) {
    if (!supabaseClient) {
        return saveDailyCardLocally(telegramId, cardData);
    }

    try {
        // Получаем или создаем профиль пользователя для получения user_id
        const userProfile = await getOrCreateUserProfile(telegramId);
        if (!userProfile || !userProfile.user_id) {
            console.warn('⚠️ Не удалось получить user_id, используем локальное сохранение');
            return saveDailyCardLocally(telegramId, cardData);
        }

        const { data, error } = await supabaseClient
            .from('tarot_daily_cards')
            .insert([
                {
                    user_id: userProfile.user_id,
                    card_data: {
                        id: cardData.id,
                        name: cardData.name,
                        image: cardData.image,
                        description: cardData.description
                    },
                    card_date: new Date().toISOString().split('T')[0],
                    ai_prediction: cardData.interpretation
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Ежедневная карта сохранена:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
        return saveDailyCardLocally(telegramId, cardData);
    }
}

async function getDailyCard(telegramId, date = null) {
    if (!supabaseClient) {
        return getDailyCardLocally(telegramId, date);
    }

    try {
        // Получаем или создаем профиль пользователя для получения user_id
        const userProfile = await getOrCreateUserProfile(telegramId);
        if (!userProfile || !userProfile.user_id) {
            console.warn('⚠️ Не удалось получить user_id, используем локальное получение');
            return getDailyCardLocally(telegramId, date);
        }

        const targetDate = date || new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabaseClient
            .from('tarot_daily_cards')
            .select('*')
            .eq('user_id', userProfile.user_id)
            .eq('card_date', targetDate)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        return getDailyCardLocally(telegramId, date);
    }
}

// ❓ ФУНКЦИИ ДЛЯ РАБОТЫ С ВОПРОСАМИ
async function saveQuestion(telegramId, questionText) {
    if (!supabaseClient) {
        return saveQuestionLocally(telegramId, questionText);
    }

    try {
        // Получаем или создаем профиль пользователя для получения user_id
        const userProfile = await getOrCreateUserProfile(telegramId);
        if (!userProfile || !userProfile.user_id) {
            console.warn('⚠️ Не удалось получить user_id, используем локальное сохранение');
            return saveQuestionLocally(telegramId, questionText);
        }

        const { data, error } = await supabaseClient
            .from('tarot_questions')
            .insert([
                {
                    user_id: userProfile.user_id,
                    question_text: questionText,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Вопрос сохранен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса:', error);
        return saveQuestionLocally(telegramId, questionText);
    }
}

async function saveAnswer(questionId, cardData, interpretation) {
    if (!supabaseClient) {
        return saveAnswerLocally(questionId, cardData, interpretation);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_answers')
            .insert([
                {
                    question_id: questionId,
                    user_id: null, // Пока null, можно добавить логику получения user_id
                    cards_drawn: [{ // Используем существующую структуру
                        id: cardData.id,
                        name: cardData.name,
                        image: cardData.image,
                        description: cardData.description
                    }],
                    ai_prediction: interpretation, // Используем ai_prediction вместо interpretation
                    spread_type: 'single_card', // Тип расклада
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Ответ сохранен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения ответа:', error);
        return saveAnswerLocally(questionId, cardData, interpretation);
    }
}

// ⭐ ФУНКЦИИ ДЛЯ РАБОТЫ С ОТЗЫВАМИ
async function saveReview(telegramId, rating, reviewText) {
    if (!supabaseClient) {
        return saveReviewLocally(telegramId, rating, reviewText);
    }

    try {
        // Получаем или создаем профиль пользователя для получения user_id
        const userProfile = await getOrCreateUserProfile(telegramId);
        if (!userProfile || !userProfile.user_id) {
            console.warn('⚠️ Не удалось получить user_id, используем локальное сохранение');
            return saveReviewLocally(telegramId, rating, reviewText);
        }

        // Сначала проверим, есть ли колонка username в таблице
        const reviewData = {
            user_id: userProfile.user_id,
            rating: rating,
            review_text: reviewText,
            created_at: new Date().toISOString()
        };
        
        // Пытаемся добавить username, если колонка существует
        try {
            reviewData.username = userProfile.username || window.getTelegramUserName();
            reviewData.telegram_id = telegramId; // Для связи с пользователем
        } catch (e) {
            // Если есть проблемы с username, продолжаем без него
            console.log('⚠️ Не удалось добавить username к отзыву');
        }
        
        const { data, error } = await supabaseClient
            .from('tarot_reviews')
            .insert([reviewData])
            .select()
            .single();

        if (error) {
            // Если ошибка связана с отсутствующими колонками, пробуем без них
            if (error.code === '42703' && (error.message.includes('username') || error.message.includes('telegram_id'))) {
                console.log('⚠️ Колонки username/telegram_id не существуют, сохраняем базовые данные');
                
                const basicReviewData = {
                    user_id: userProfile.user_id,
                    rating: rating,
                    review_text: reviewText,
                    created_at: new Date().toISOString()
                };
                
                const { data: retryData, error: retryError } = await supabaseClient
                    .from('tarot_reviews')
                    .insert([basicReviewData])
                    .select()
                    .single();
                    
                if (retryError) throw retryError;
                
                console.log('✅ Отзыв сохранен (без username):', retryData);
                return retryData;
            }
            throw error;
        }
        
        console.log('✅ Отзыв сохранен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения отзыва:', error);
        return saveReviewLocally(telegramId, rating, reviewText);
    }
}

async function getReviews(limit = 10, currentPage = 1, perPage = null) {
    if (!supabaseClient) {
        return getReviewsLocally(limit);
    }

    try {
        // Сначала пытаемся запросить с username
        let query = supabaseClient
            .from('tarot_reviews')
            .select('rating, review_text, username, telegram_id, created_at')
            .order('created_at', { ascending: false });

        // If pagination parameters are provided, use them instead of simple limit
        if (perPage !== null && currentPage !== null && !isNaN(perPage) && !isNaN(currentPage)) {
            // Sanitize pagination parameters to prevent PGRST103 errors
            const page = Math.max(1, Number(currentPage || 1));
            const pageSize = Math.max(1, Math.min(100, Number(perPage || 10))); // Max 100 per page
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            
            console.log('🔍 Sanitized pagination:', { page, pageSize, from, to });
            query = query.range(from, to);
        } else {
            // Sanitize simple limit - защита от NaN
            const numericLimit = isNaN(Number(limit)) ? 10 : Number(limit);
            const sanitizedLimit = Math.max(1, Math.min(100, numericLimit));
            console.log('🔍 Sanitized limit:', sanitizedLimit, 'from original:', limit);
            query = query.limit(sanitizedLimit);
        }

        const { data, error } = await query;

        if (error) {
            // Если ошибка связана с отсутствующей колонкой username, пробуем без неё
            if (error.code === '42703' && error.message.includes('username')) {
                console.log('⚠️ Колонка username не существует, запрашиваем без неё');
                
                let fallbackQuery = supabaseClient
                    .from('tarot_reviews')
                    .select('rating, review_text, created_at')
                    .order('created_at', { ascending: false });
                
                if (perPage !== null && currentPage !== null && !isNaN(perPage) && !isNaN(currentPage)) {
                    const page = Math.max(1, Number(currentPage || 1));
                    const pageSize = Math.max(1, Math.min(100, Number(perPage || 10)));
                    const from = (page - 1) * pageSize;
                    const to = from + pageSize - 1;
                    fallbackQuery = fallbackQuery.range(from, to);
                } else {
                    const numericLimit = isNaN(Number(limit)) ? 10 : Number(limit);
                    const sanitizedLimit = Math.max(1, Math.min(100, numericLimit));
                    fallbackQuery = fallbackQuery.limit(sanitizedLimit);
                }
                
                const { data: fallbackData, error: fallbackError } = await fallbackQuery;
                
                if (fallbackError) throw fallbackError;
                return fallbackData;
            }
            
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка получения отзывов:', error);
        return getReviewsLocally(limit);
    }
}

// 🎫 ФУНКЦИИ ДЛЯ РАБОТЫ С КОДАМИ ПОДПИСКИ
async function validateSubscriptionCode(code) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен, не можем проверить код подписки');
        return { valid: false, error: 'Сервис временно недоступен' };
    }

    try {
        // Проверяем, существует ли код и не использован ли он
        const { data, error } = await supabaseClient
            .from('tarot_subscription_codes')
            .select('id, code, is_used, used_by_user_id, subscription_duration_days, expires_at')
            .eq('code', code.toUpperCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Код не найден
                return { valid: false, error: 'Код не найден' };
            }
            if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
                // Таблица не существует
                console.warn('⚠️ Таблица tarot_subscription_codes не существует');
                return { valid: false, error: 'Система кодов подписки пока недоступна' };
            }
            console.error('❌ Ошибка проверки кода:', error);
            return { valid: false, error: 'Ошибка проверки кода' };
        }

        // Проверяем, не использован ли код
        if (data.is_used) {
            return { valid: false, error: 'Код уже использован' };
        }

        // Проверяем срок действия кода (если указан)
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return { valid: false, error: 'Срок действия кода истек' };
        }

        return { 
            valid: true, 
            codeData: data,
            subscriptionDays: data.subscription_duration_days || 30
        };

    } catch (error) {
        console.error('❌ Ошибка валидации кода подписки:', error);
        return { valid: false, error: 'Ошибка проверки кода' };
    }
}

async function useSubscriptionCode(code, userId) {
    if (!supabaseClient) {
        return { success: false, error: 'Сервис недоступен' };
    }

    try {
        // Сначала проверяем код
        const validation = await validateSubscriptionCode(code);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Отмечаем код как использованный
        const { data, error } = await supabaseClient
            .from('tarot_subscription_codes')
            .update({
                is_used: true,
                used_by_user_id: userId,
                used_at: new Date().toISOString()
            })
            .eq('code', code.toUpperCase())
            .eq('is_used', false) // Дополнительная проверка, что код еще не использован
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
                // Таблица не существует
                console.warn('⚠️ Таблица tarot_subscription_codes не существует при использовании кода');
                return { success: false, error: 'Система кодов подписки пока недоступна' };
            }
            if (error.code === '22P02' && error.message.includes('invalid input syntax for type uuid')) {
                // Проблема с типом поля used_by_user_id
                console.warn('⚠️ Несоответствие типа данных в поле used_by_user_id');
                return { success: false, error: 'Требуется обновление структуры базы данных' };
            }
            console.error('❌ Ошибка использования кода:', error);
            return { success: false, error: 'Не удалось активировать код' };
        }

        return { 
            success: true, 
            subscriptionDays: validation.subscriptionDays,
            codeData: data
        };

    } catch (error) {
        console.error('❌ Ошибка использования кода подписки:', error);
        return { success: false, error: 'Ошибка активации кода' };
    }
}

// 📚 ФУНКЦИИ ДЛЯ РАБОТЫ С ИСТОРИЕЙ
async function getUserHistory(telegramId, limit = 20) {
    if (!supabaseClient) {
        return getUserHistoryLocally(telegramId, limit);
    }

    try {
        // Получаем или создаем профиль пользователя для получения user_id
        const userProfile = await getOrCreateUserProfile(telegramId);
        if (!userProfile || !userProfile.user_id) {
            console.warn('⚠️ Не удалось получить user_id, используем локальную историю');
            return getUserHistoryLocally(telegramId, limit);
        }

        // Получаем историю вопросов с ответами
        // Сначала проверяем существование таблицы tarot_answers и её колонок
        const { data: questionsData, error: questionsError } = await supabaseClient
            .from('tarot_questions')
            .select(`
                id,
                question_text,
                created_at
            `)
            .eq('user_id', userProfile.user_id)
            .order('created_at', { ascending: false })
            .limit(limit);
            
        // Логируем ошибку для отладки
        if (questionsError) {
            console.log('🔍 Questions query error details:', questionsError);
        }

        if (questionsError) {
            console.warn('⚠️ Ошибка получения вопросов:', questionsError.message);
            return getUserHistoryLocally(telegramId, limit);
        }

        // Получаем историю ежедневных карт
        const { data: dailyCardsData, error: dailyCardsError } = await supabaseClient
            .from('tarot_daily_cards')
            .select('*')
            .eq('user_id', userProfile.user_id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (dailyCardsError) {
            console.warn('⚠️ Ошибка получения ежедневных карт:', dailyCardsError.message);
            // Возвращаем хотя бы вопросы, если они есть
            return {
                questions: questionsData || [],
                dailyCards: []
            };
        }

        return {
            questions: questionsData || [],
            dailyCards: dailyCardsData || []
        };
    } catch (error) {
        console.error('❌ Ошибка получения истории:', error);
        return getUserHistoryLocally(telegramId, limit);
    }
}

// 💾 ЛОКАЛЬНЫЕ FALLBACK ФУНКЦИИ
function saveUserProfileLocally(telegramId, username) {
    const profile = {
        user_id: null, // Nullable for guests
        telegram_id: telegramId.toString(), // Ensure it's a string
        username: username,
        is_subscribed: false, // Changed from is_premium to match schema
        questions_used: 0, // Default 0
        free_predictions_left: 3,
        last_card_day: null,
        created_at: new Date().toISOString()
    };
    
    localStorage.setItem(`tarot_profile_${telegramId}`, JSON.stringify(profile));
    return profile;
}

function getUserProfileLocally(telegramId) {
    const stored = localStorage.getItem(`tarot_profile_${telegramId}`);
    return stored ? JSON.parse(stored) : null;
}

function updateUserProfileLocally(telegramId, updates) {
    const profile = getUserProfileLocally(telegramId) || saveUserProfileLocally(telegramId);
    const updated = { ...profile, ...updates };
    localStorage.setItem(`tarot_profile_${telegramId}`, JSON.stringify(updated));
    return updated;
}

function saveDailyCardLocally(telegramId, cardData) {
    const dailyCard = {
        telegram_id: telegramId,
        card_id: cardData.id,
        card_name: cardData.name,
        interpretation: cardData.interpretation,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
    };
    
    localStorage.setItem(`tarot_daily_${telegramId}_${dailyCard.date}`, JSON.stringify(dailyCard));
    return dailyCard;
}

function getDailyCardLocally(telegramId, date) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(`tarot_daily_${telegramId}_${targetDate}`);
    return stored ? JSON.parse(stored) : null;
}

function saveQuestionLocally(telegramId, questionText) {
    const question = {
        id: Date.now(),
        telegram_id: telegramId,
        question_text: questionText,
        created_at: new Date().toISOString()
    };
    
    const questions = getQuestionsLocally(telegramId);
    questions.push(question);
    localStorage.setItem(`tarot_questions_${telegramId}`, JSON.stringify(questions));
    return question;
}

function getQuestionsLocally(telegramId) {
    const stored = localStorage.getItem(`tarot_questions_${telegramId}`);
    return stored ? JSON.parse(stored) : [];
}

function saveAnswerLocally(questionId, cardData, interpretation) {
    const answer = {
        id: Date.now(),
        question_id: questionId,
        card_id: cardData.id,
        card_name: cardData.name,
        interpretation: interpretation,
        created_at: new Date().toISOString()
    };
    
    const answers = getAnswersLocally();
    answers.push(answer);
    localStorage.setItem('tarot_answers', JSON.stringify(answers));
    return answer;
}

function getAnswersLocally() {
    const stored = localStorage.getItem('tarot_answers');
    return stored ? JSON.parse(stored) : [];
}

function saveReviewLocally(telegramId, rating, reviewText) {
    const review = {
        id: Date.now(),
        telegram_id: telegramId,
        rating: rating,
        review_text: reviewText,
        created_at: new Date().toISOString()
    };
    
    const reviews = getReviewsLocally();
    reviews.push(review);
    localStorage.setItem('tarot_reviews', JSON.stringify(reviews));
    return review;
}

function getReviewsLocally(limit = 10) {
    const stored = localStorage.getItem('tarot_reviews');
    const reviews = stored ? JSON.parse(stored) : [];
    return reviews
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
}

function getUserHistoryLocally(telegramId, limit = 20) {
    const questions = getQuestionsLocally(telegramId);
    const answers = getAnswersLocally();
    const dailyCards = [];
    
    // Собираем ежедневные карты из localStorage
    for (let i = 0; i < 30; i++) { // Проверяем последние 30 дней
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const card = getDailyCardLocally(telegramId, dateStr);
        if (card) dailyCards.push(card);
    }
    
    // Связываем вопросы с ответами
    const questionsWithAnswers = questions.map(question => {
        const questionAnswers = answers.filter(answer => answer.question_id === question.id);
        return {
            ...question,
            tarot_answers: questionAnswers
        };
    });
    
    return {
        questions: questionsWithAnswers.slice(0, limit),
        dailyCards: dailyCards.slice(0, limit)
    };
}

// 🔧 УТИЛИТЫ
function isSupabaseConnected() {
    return supabaseClient !== null;
}

function getConnectionStatus() {
    return {
        connected: isSupabaseConnected(),
        mode: isSupabaseConnected() ? 'online' : 'offline',
        client: supabaseClient ? 'initialized' : 'not_initialized'
    };
}

// Функция для проверки структуры таблиц (отладочная)
async function checkTableStructure(tableName) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен для проверки структуры таблиц');
        return null;
    }
    
    try {
        console.log(`🔍 Проверяем структуру таблицы: ${tableName}`);
        
        // Пытаемся сделать простой запрос, чтобы узнать о структуре из ошибки
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .limit(1);
            
        if (error) {
            console.log(`❌ Ошибка при проверке ${tableName}:`, error);
            return { error, exists: false };
        } else {
            console.log(`✅ Таблица ${tableName} существует, пример данных:`, data);
            return { data, exists: true, structure: data[0] ? Object.keys(data[0]) : [] };
        }
    } catch (err) {
        console.error(`❌ Критическая ошибка проверки ${tableName}:`, err);
        return { error: err, exists: false };
    }
}

// 🔄 ФУНКЦИИ СИНХРОНИЗАЦИИ
async function syncUserDataToSupabase(telegramId, localData) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен, синхронизация невозможна');
        return false;
    }

    try {
        // Получаем текущий профиль из Supabase
        const currentProfile = await getUserProfile(telegramId);
        if (!currentProfile) {
            console.warn('⚠️ Профиль пользователя не найден в Supabase');
            return false;
        }

        // Определяем, какие данные нужно обновить
        const updates = {};
        
        if (localData.questionsUsed > (currentProfile.total_questions || 0)) {
            updates.total_questions = localData.questionsUsed;
        }
        
        // Обновляем статус подписки только если локальные данные показывают премиум
        // и в базе данных статус false, или наоборот. Но приоритет отдаем базе данных.
        // НЕ сбрасываем премиум статус если он установлен в базе данных
        console.log('🔍 DEBUG: Сравниваем статус подписки:', {
            localIsPremium: localData.isPremium,
            currentProfileIsSubscribed: currentProfile.is_subscribed,
            willUpdate: localData.isPremium && !currentProfile.is_subscribed
        });
        
        if (localData.isPremium && !currentProfile.is_subscribed) {
            // Локально премиум, в базе нет - обновляем базу
            updates.is_subscribed = true;
            console.log('✅ Обновляем статус подписки: false -> true');
        } else if (!localData.isPremium && currentProfile.is_subscribed) {
            console.log('⚠️ НЕ сбрасываем статус подписки (база данных в приоритете)');
        }
        // НЕ делаем else if (!localData.isPremium && currentProfile.is_subscribed)
        // чтобы не сбрасывать статус подписки из-за устаревших локальных данных
        
        // Обновляем количество оставшихся бесплатных предсказаний
        const freeLeft = Math.max(0, 3 - localData.questionsUsed);
        if (freeLeft !== currentProfile.free_predictions_left) {
            updates.free_predictions_left = freeLeft;
        }
        
        if (localData.dailyCardUsed && localData.lastCardDay) {
            const currentDate = new Date().toISOString().split('T')[0];
            if (localData.lastCardDay === currentDate && currentProfile.last_card_day !== currentDate) {
                updates.last_card_day = currentDate;
            }
        }

        // Если есть что обновить, отправляем в Supabase
        if (Object.keys(updates).length > 0) {
            console.log('🔄 Синхронизируем локальные изменения с Supabase:', updates);
            await updateUserProfile(telegramId, updates);
            return true;
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка синхронизации данных с Supabase:', error);
        return false;
    }
}

async function syncUserDataFromSupabase(telegramId) {
    if (!supabaseClient) {
        return null;
    }

    try {
        const profile = await getUserProfile(telegramId);
        if (!profile) {
            return null;
        }

        // Преобразуем данные из Supabase в формат приложения
        const syncedData = {
            isPremium: profile.is_subscribed || false,
            questionsUsed: profile.total_questions || 0,
            dailyCardUsed: profile.last_card_day === new Date().toISOString().split('T')[0],
            lastCardDay: profile.last_card_day,
            freeQuestionsLeft: profile.free_predictions_left || 3
        };

        console.log('📥 Данные синхронизированы из Supabase:', syncedData);
        return syncedData;
    } catch (error) {
        console.error('❌ Ошибка получения данных из Supabase:', error);
        return null;
    }
}

async function performDataSync(telegramId, localAppState) {
    try {
        console.log('🔄 Начинаем синхронизацию данных...');
        
        // Сначала получаем актуальные данные из Supabase
        const supabaseData = await syncUserDataFromSupabase(telegramId);
        
        if (supabaseData) {
            // Объединяем данные, приоритет для статуса подписки отдается базе данных
            const mergedState = {
                isPremium: supabaseData.isPremium || localAppState.isPremium, // База данных в приоритете
                questionsUsed: Math.max(supabaseData.questionsUsed, localAppState.questionsUsed || 0),
                dailyCardUsed: supabaseData.dailyCardUsed || localAppState.dailyCardUsed,
                lastCardDay: supabaseData.lastCardDay || localAppState.lastCardDay
            };

            // Синхронизируем обратно в Supabase если локальные данные новее
            await syncUserDataToSupabase(telegramId, localAppState);
            
            console.log('✅ Синхронизация завершена успешно');
            return mergedState;
        } else {
            // Если Supabase недоступен, используем локальные данные
            console.log('📱 Используем локальные данные (Supabase недоступен)');
            return localAppState;
        }
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        return localAppState;
    }
}

// 🌟 ЭКСПОРТ ФУНКЦИЙ
window.TarotDB = {
    // Инициализация
    initialize: initializeSupabase,
    isConnected: isSupabaseConnected,
    getStatus: getConnectionStatus,
    checkTableStructure: checkTableStructure,
    
    // Аутентификация
    signInWithTelegram,
    isAuthenticated: isSupabaseAuthenticated,
    getCurrentUser,
    
    // Пользователи
    createUserProfile,
    getUserProfile,
    getOrCreateUserProfile,
    updateUserProfile,
    
    // Ежедневные карты
    saveDailyCard,
    getDailyCard,
    
    // Вопросы и ответы
    saveQuestion,
    saveAnswer,
    
    // Отзывы
    saveReview,
    getReviews,
    getUserReviews: getReviews, // Алиас для совместимости
    
    // История и чтения
    getUserHistory,
    getUserReadings: getUserHistory, // Алиас для совместимости
    saveReading: saveQuestion, // Алиас для saveQuestion
    
    // Синхронизация
    syncUserDataToSupabase,
    syncUserDataFromSupabase,
    performDataSync,
    
    // Коды подписки
    validateSubscriptionCode,
    useSubscriptionCode
};

// Проверяем экспорт
console.log('✅ Supabase интеграция загружена');
console.log('🔧 TarotDB экспортирован:', typeof window.TarotDB);
console.log('📋 Доступные методы:', Object.keys(window.TarotDB));

// Уведомляем о готовности
if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('TarotDB-ready', { 
        detail: { 
            timestamp: new Date().toISOString(),
            methods: Object.keys(window.TarotDB)
        }
    }));
}

// 🚀 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
console.log('🚀 Запуск автоматической инициализации TarotDB...');
initializeSupabase().then(() => {
    console.log('✅ Автоматическая инициализация TarotDB завершена');
    console.log('📊 Финальный статус:', window.TarotDB.getStatus());
}).catch(error => {
    console.error('❌ Ошибка автоматической инициализации TarotDB:', error);
});
