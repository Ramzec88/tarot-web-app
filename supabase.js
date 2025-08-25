// supabase.js - Интеграция с Supabase для Tarot Web App
// ========================================================================

console.log('🔗 Загрузка Supabase интеграции...');

// 🌐 ИНИЦИАЛИЗАЦИЯ SUPABASE КЛИЕНТА
let supabaseClient = null;

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
async function getOrCreateUserProfile(telegramId, username = null) {
    console.log('🔍 Получение или создание профиля для ID:', telegramId);
    
    let userProfile = await getUserProfile(telegramId);
    
    if (!userProfile) {
        console.log('👤 Профиль не найден, создаем новый...');
        userProfile = await createUserProfile(telegramId, username);
    }
    
    return userProfile;
}

async function createUserProfile(telegramId, username = null) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен, сохраняем локально');
        return saveUserProfileLocally(telegramId, username);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд
        
        // Санитизация и валидация входных данных
        const sanitizedTelegramId = sanitizeTelegramId(telegramId);
        if (!sanitizedTelegramId) {
            console.warn('⚠️ Неверный Telegram ID, используем локальное сохранение:', telegramId);
            return saveUserProfileLocally(telegramId, username);
        }
        
        const sanitizedUsername = sanitizeUsername(username);
        
        // For RLS Option A: Use upsert with telegram_id for idempotent operations
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .upsert([
                {
                    telegram_id: sanitizedTelegramId, // Only telegram_id for anon insert
                    username: sanitizedUsername,
                    is_subscribed: false,
                    questions_used: 0, // Changed from total_questions to questions_used (default 0)
                    free_predictions_left: 3,
                    last_card_day: null
                }
            ], { 
                onConflict: 'telegram_id',
                ignoreDuplicates: false // Always update on conflict
            })
            .select()
            .single()
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
            console.warn('⚠️ Ошибка Supabase при создании профиля:', error.message);
            return saveUserProfileLocally(telegramId, username);
        }
        
        console.log('✅ Профиль пользователя создан в Supabase:', data);
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⚠️ Таймаут создания профиля в Supabase');
        } else {
            console.error('❌ Критическая ошибка создания профиля:', error.message);
        }
        return saveUserProfileLocally(telegramId, username);
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
        
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .update(updates)
            .eq('telegram_id', telegramId) // Using telegram_id consistently
            .select()
            .single();

        if (error) {
            console.error('❌ Ошибка обновления профиля:', error);
            return null;
        }
        
        console.log('✅ Профиль обновлен:', data);
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

        const { data, error } = await supabaseClient
            .from('tarot_reviews')
            .insert([
                {
                    user_id: userProfile.user_id,
                    rating: rating,
                    review_text: reviewText,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
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
        let query = supabaseClient
            .from('tarot_reviews')
            .select('rating, review_text, created_at')
            .order('created_at', { ascending: false });

        // If pagination parameters are provided, use them instead of simple limit
        if (perPage !== null && currentPage !== null) {
            // Sanitize pagination parameters to prevent PGRST103 errors
            const page = Math.max(1, Number(currentPage || 1));
            const pageSize = Math.max(1, Math.min(100, Number(perPage || 10))); // Max 100 per page
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            
            console.log('🔍 Sanitized pagination:', { page, pageSize, from, to });
            query = query.range(from, to);
        } else {
            // Sanitize simple limit
            const sanitizedLimit = Math.max(1, Math.min(100, Number(limit || 10)));
            console.log('🔍 Sanitized limit:', sanitizedLimit);
            query = query.limit(sanitizedLimit);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка получения отзывов:', error);
        return getReviewsLocally(limit);
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
        
        if (localData.isPremium !== currentProfile.is_subscribed) {
            updates.is_subscribed = localData.isPremium;
        }
        
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
            // Объединяем данные, приоритет отдается более свежим изменениям
            const mergedState = {
                isPremium: supabaseData.isPremium || localAppState.isPremium,
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
    performDataSync
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
