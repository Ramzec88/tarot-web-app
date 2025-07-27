// supabase-functions.js - Функции для работы с Supabase базой данных
// ========================================================================

// 🔗 Глобальная переменная для клиента Supabase
let supabase = null;

// 🚀 ИНИЦИАЛИЗАЦИЯ SUPABASE
function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase инициализирован успешно');
            return true;
        } else {
            console.warn('⚠️ Supabase недоступен или неправильная конфигурация');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 👤 ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ

// Создание или получение профиля пользователя
async function createOrGetUserProfile(telegramUser) {
    if (!supabase) {
        console.warn('Supabase не инициализирован');
        return null;
    }

    try {
        const userId = telegramUser.id;
        
        // Сначала пытаемся найти существующего пользователя
        const { data: existingUser, error: selectError } = await supabase
            .from(TABLES.userProfiles)
            .select('*')
            .eq('user_id', userId)
            .single();

        if (existingUser && !selectError) {
            console.log('👤 Пользователь найден:', existingUser.username || existingUser.first_name);
            return existingUser;
        }

        // Если пользователь не найден, создаем нового
        const newUserProfile = {
            user_id: userId,
            chat_id: telegramUser.chat_id || userId,
            username: telegramUser.username || null,
            first_name: telegramUser.first_name || null,
            last_name: telegramUser.last_name || null,
            free_predictions_left: APP_CONFIG.freeQuestionsLimit,
            is_subscribed: false,
            referral_code: `ref_${userId}`,
            referral_count: 0,
            total_questions: 0
        };

        const { data: newUser, error: insertError } = await supabase
            .from(TABLES.userProfiles)
            .insert([newUserProfile])
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        console.log('🆕 Создан новый пользователь:', newUser.username || newUser.first_name);
        return newUser;

    } catch (error) {
        console.error('❌ Ошибка при создании/получении пользователя:', error);
        return null;
    }
}

// Обновление профиля пользователя
async function updateUserProfile(userId, updates) {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from(TABLES.userProfiles)
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log('📝 Профиль пользователя обновлен:', userId);
        return data;

    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        return false;
    }
}

// Получение профиля пользователя
async function getUserProfile(userId) {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from(TABLES.userProfiles)
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        return data;

    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error);
        return null;
    }
}

// 🃏 ФУНКЦИИ ДЛЯ КАРТ ДНЯ

// Сохранение карты дня
async function saveDailyCardToSupabase(userId, cardData, aiPrediction = null) {
    if (!supabase) return false;

    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD формат

        const { data, error } = await supabase
            .from(TABLES.dailyCards)
            .insert([{
                user_id: userId,
                card_data: cardData,
                ai_prediction: aiPrediction,
                card_date: today
            }])
            .select()
            .single();

        if (error) {
            // Если карта на сегодня уже существует, обновляем её
            if (error.code === '23505') { // unique_violation
                return await updateDailyCard(userId, cardData, aiPrediction);
            }
            throw error;
        }

        console.log('💾 Карта дня сохранена:', cardData.name);
        return data;

    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
        return false;
    }
}

// Обновление карты дня
async function updateDailyCard(userId, cardData, aiPrediction) {
    if (!supabase) return false;

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from(TABLES.dailyCards)
            .update({
                card_data: cardData,
                ai_prediction: aiPrediction
            })
            .eq('user_id', userId)
            .eq('card_date', today)
            .select()
            .single();

        if (error) throw error;

        console.log('🔄 Карта дня обновлена:', cardData.name);
        return data;

    } catch (error) {
        console.error('❌ Ошибка обновления карты дня:', error);
        return false;
    }
}

// Получение карты дня
async function getTodayDailyCard(userId) {
    if (!supabase) return null;

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from(TABLES.dailyCards)
            .select('*')
            .eq('user_id', userId)
            .eq('card_date', today)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return data;

    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        return null;
    }
}

// ❓ ФУНКЦИИ ДЛЯ ВОПРОСОВ И ОТВЕТОВ

// Сохранение вопроса
async function saveQuestionToSupabase(userId, questionText, questionType = 'question') {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from(TABLES.questions)
            .insert([{
                user_id: userId,
                question_text: questionText,
                question_type: questionType
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('💾 Вопрос сохранен:', questionText.substring(0, 50) + '...');
        return data;

    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса:', error);
        return false;
    }
}

// Сохранение ответа
async function saveAnswerToSupabase(userId, questionId, cardsDrawn, aiPrediction, spreadType = null) {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from(TABLES.answers)
            .insert([{
                question_id: questionId,
                user_id: userId,
                cards_drawn: cardsDrawn,
                ai_prediction: aiPrediction,
                spread_type: spreadType
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('💾 Ответ сохранен для вопроса:', questionId);
        return data;

    } catch (error) {
        console.error('❌ Ошибка сохранения ответа:', error);
        return false;
    }
}

// 🎴 ФУНКЦИИ ДЛЯ РАСКЛАДОВ

// Сохранение расклада
async function saveSpreadToSupabase(userId, spreadName, cardsData, question = null) {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from(TABLES.spreads)
            .insert([{
                user_id: userId,
                spread_name: spreadName,
                cards_data: cardsData,
                question: question
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('💾 Расклад сохранен:', spreadName);
        return data;

    } catch (error) {
        console.error('❌ Ошибка сохранения расклада:', error);
        return false;
    }
}

// 📚 ФУНКЦИИ ДЛЯ ИСТОРИИ

// Получение истории пользователя
async function getUserHistory(userId, limit = 50) {
    if (!supabase) return [];

    try {
        // Получаем карты дня
        const { data: dailyCards, error: dailyError } = await supabase
            .from(TABLES.dailyCards)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // Получаем вопросы с ответами
        const { data: questionsWithAnswers, error: questionsError } = await supabase
            .from(TABLES.questions)
            .select(`
                *,
                tarot_answers (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // Получаем расклады
        const { data: spreads, error: spreadsError } = await supabase
            .from(TABLES.spreads)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (dailyError || questionsError || spreadsError) {
            console.warn('⚠️ Ошибки при получении истории:', { dailyError, questionsError, spreadsError });
        }

        // Объединяем и сортируем по дате
        const allHistory = [
            ...(dailyCards || []).map(item => ({ ...item, type: 'daily' })),
            ...(questionsWithAnswers || []).map(item => ({ ...item, type: 'question' })),
            ...(spreads || []).map(item => ({ ...item, type: 'spread' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        console.log(`📚 Загружено ${allHistory.length} записей истории`);
        return allHistory;

    } catch (error) {
        console.error('❌ Ошибка получения истории:', error);
        return [];
    }
}

// 💬 ФУНКЦИИ ДЛЯ ОТЗЫВОВ

// Сохранение отзыва
async function saveReviewToSupabase(userId, rating, reviewText, isAnonymous = false) {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from(TABLES.reviews)
            .insert([{
                user_id: userId,
                rating: rating,
                review_text: reviewText,
                is_anonymous: isAnonymous,
                is_approved: false // Требует модерации
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('💾 Отзыв сохранен и отправлен на модерацию');
        return data;

    } catch (error) {
        console.error('❌ Ошибка сохранения отзыва:', error);
        return false;
    }
}

// Получение одобренных отзывов
async function getApprovedReviews(limit = 20) {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from(TABLES.reviews)
            .select(`
                id,
                rating,
                review_text,
                is_anonymous,
                created_at,
                tarot_user_profiles (username, first_name)
            `)
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];

    } catch (error) {
        console.error('❌ Ошибка получения отзывов:', error);
        return [];
    }
}

// 📊 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

// Проверка подписки пользователя
async function checkUserSubscription(userId) {
    if (!supabase) return { isSubscribed: false, daysLeft: 0 };

    try {
        const userProfile = await getUserProfile(userId);
        if (!userProfile) return { isSubscribed: false, daysLeft: 0 };

        if (!userProfile.is_subscribed || !userProfile.subscription_expiry_date) {
            return { isSubscribed: false, daysLeft: 0 };
        }

        const expiryDate = new Date(userProfile.subscription_expiry_date);
        const now = new Date();
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0) {
            // Подписка истекла, обновляем статус
            await updateUserProfile(userId, {
                is_subscribed: false,
                subscription_expiry_date: null
            });
            return { isSubscribed: false, daysLeft: 0 };
        }

        return { isSubscribed: true, daysLeft };

    } catch (error) {
        console.error('❌ Ошибка проверки подписки:', error);
        return { isSubscribed: false, daysLeft: 0 };
    }
}

// Уменьшение счетчика бесплатных вопросов
async function decrementFreeQuestions(userId) {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from(TABLES.userProfiles)
            .update({
                free_predictions_left: supabase.raw('free_predictions_left - 1'),
                total_questions: supabase.raw('total_questions + 1')
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log(`📉 Осталось бесплатных вопросов: ${data.free_predictions_left}`);
        return data;

    } catch (error) {
        console.error('❌ Ошибка уменьшения счетчика:', error);
        return false;
    }
}

// Очистка старых записей (можно вызывать периодически)
async function cleanupOldRecords() {
    if (!supabase) return false;

    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Удаляем старые карты дня (старше 3 месяцев)
        await supabase
            .from(TABLES.dailyCards)
            .delete()
            .lt('created_at', threeMonthsAgo.toISOString());

        // Удаляем старые вопросы и ответы
        await supabase
            .from(TABLES.questions)
            .delete()
            .lt('created_at', threeMonthsAgo.toISOString());

        console.log('🧹 Очистка старых записей завершена');
        return true;

    } catch (error) {
        console.error('❌ Ошибка очистки записей:', error);
        return false;
    }
}

// 🔄 СИНХРОНИЗАЦИЯ С N8N (гибридный подход)

// Дублирование данных пользователя в n8n (для совместимости)
async function syncUserToN8N(userProfile) {
    try {
        const response = await fetch(API_CONFIG.createUser, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userProfile.user_id,
                chat_id: userProfile.chat_id,
                username: userProfile.username,
                first_name: userProfile.first_name,
                free_predictions_left: userProfile.free_predictions_left,
                is_subscribed: userProfile.is_subscribed,
                subscription_expiry_date: userProfile.subscription_expiry_date,
                referral_code: userProfile.referral_code,
                source: 'supabase_sync'
            })
        });

        if (response.ok) {
            console.log('🔄 Пользователь синхронизирован с n8n');
        }

    } catch (error) {
        console.warn('⚠️ Ошибка синхронизации с n8n:', error);
        // Не критичная ошибка, продолжаем работу
    }
}

// Отправка предсказания в n8n для ИИ-обработки
async function sendPredictionToN8N(userId, question, cardsData, type = 'question') {
    try {
        const response = await fetch(API_CONFIG.generatePrediction, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                question: question,
                cards: cardsData,
                type: type,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('🤖 ИИ-предсказание получено от n8n');
        return result.prediction || result.message || 'Предсказание получено';

    } catch (error) {
        console.error('❌ Ошибка получения предсказания от n8n:', error);
        return 'К сожалению, не удалось получить предсказание от ИИ. Попробуйте позже.';
    }
}

// 🎯 КОМПЛЕКСНЫЕ ФУНКЦИИ (объединяющие Supabase + n8n)

// Полное сохранение сессии вопроса
async function saveCompleteQuestionSession(userId, questionText, cardsData, aiPrediction, questionType = 'question') {
    const results = {
        question: null,
        answer: null,
        profile: null,
        n8nSync: false
    };

    try {
        // 1. Сохраняем вопрос в Supabase
        results.question = await saveQuestionToSupabase(userId, questionText, questionType);
        
        if (results.question) {
            // 2. Сохраняем ответ в Supabase
            results.answer = await saveAnswerToSupabase(
                userId, 
                results.question.id, 
                cardsData, 
                aiPrediction
            );

            // 3. Обновляем счетчики пользователя (если не премиум)
            const userProfile = await getUserProfile(userId);
            if (userProfile && !userProfile.is_subscribed && questionType !== 'daily') {
                results.profile = await decrementFreeQuestions(userId);
            }

            // 4. Дополнительно отправляем в n8n для аналитики
            try {
                await fetch(API_CONFIG.saveQuestion, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        question: questionText,
                        cards: cardsData,
                        ai_prediction: aiPrediction,
                        type: questionType,
                        supabase_id: results.question.id
                    })
                });
                results.n8nSync = true;
            } catch (n8nError) {
                console.warn('⚠️ n8n синхронизация не удалась:', n8nError);
            }
        }

        console.log('💾 Сессия вопроса полностью сохранена');
        return results;

    } catch (error) {
        console.error('❌ Ошибка сохранения сессии:', error);
        return results;
    }
}

// Полное сохранение карты дня с ИИ-предсказанием
async function saveCompleteDailyCardSession(userId, cardData) {
    try {
        // 1. Проверяем, была ли уже карта дня сегодня
        const existingCard = await getTodayDailyCard(userId);
        if (existingCard) {
            console.log('📅 Карта дня уже была вытянута сегодня');
            return existingCard;
        }

        // 2. Получаем ИИ-предсказание для карты дня
        const aiPrediction = await sendPredictionToN8N(userId, 'Карта дня', [cardData], 'daily');

        // 3. Сохраняем в Supabase
        const savedCard = await saveDailyCardToSupabase(userId, cardData, aiPrediction);

        // 4. Обновляем дату последней карты дня в профиле
        if (savedCard) {
            await updateUserProfile(userId, {
                last_card_day: new Date().toISOString().split('T')[0]
            });
        }

        console.log('🌅 Карта дня полностью сохранена');
        return savedCard;

    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
        return false;
    }
}

// 📱 ИНТЕГРАЦИЯ С TELEGRAM WEB APP

// Инициализация пользователя из Telegram WebApp
async function initTelegramUser() {
    try {
        // Получаем данные пользователя из Telegram WebApp
        let telegramUser = null;
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
        }

        if (!telegramUser) {
            console.warn('⚠️ Данные Telegram пользователя недоступны, используем тестовые данные');
            telegramUser = {
                id: 123456789,
                first_name: 'Тестовый пользователь',
                username: 'test_user'
            };
        }

        console.log('👤 Инициализация пользователя Telegram:', telegramUser.first_name);

        // Создаем или получаем профиль пользователя
        const userProfile = await createOrGetUserProfile(telegramUser);

        if (userProfile) {
            // Синхронизируем с n8n для совместимости
            await syncUserToN8N(userProfile);
            
            // Сохраняем в глобальную переменную для доступа из других функций
            window.currentUser = userProfile;
            
            console.log('✅ Пользователь успешно инициализирован');
            return userProfile;
        }

        return null;

    } catch (error) {
        console.error('❌ Ошибка инициализации пользователя:', error);
        return null;
    }
}

// 🔍 ФУНКЦИИ ПОИСКА И ФИЛЬТРАЦИИ

// Поиск в истории по тексту
async function searchUserHistory(userId, searchText, type = null) {
    if (!supabase || !searchText) return [];

    try {
        let query = supabase
            .from(TABLES.questions)
            .select(`
                *,
                tarot_answers (*)
            `)
            .eq('user_id', userId)
            .ilike('question_text', `%${searchText}%`);

        if (type) {
            query = query.eq('question_type', type);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        console.log(`🔍 Найдено ${data?.length || 0} записей по запросу: "${searchText}"`);
        return data || [];

    } catch (error) {
        console.error('❌ Ошибка поиска в истории:', error);
        return [];
    }
}

// Получение статистики пользователя
async function getUserStatistics(userId) {
    if (!supabase) return null;

    try {
        const userProfile = await getUserProfile(userId);
        if (!userProfile) return null;

        // Подсчитываем количество записей разных типов
        const [dailyCardsCount, questionsCount, spreadsCount] = await Promise.all([
            supabase.from(TABLES.dailyCards).select('id', { count: 'exact' }).eq('user_id', userId),
            supabase.from(TABLES.questions).select('id', { count: 'exact' }).eq('user_id', userId),
            supabase.from(TABLES.spreads).select('id', { count: 'exact' }).eq('user_id', userId)
        ]);

        const stats = {
            profile: userProfile,
            dailyCards: dailyCardsCount.count || 0,
            totalQuestions: questionsCount.count || 0,
            spreads: spreadsCount.count || 0,
            freeQuestionsLeft: userProfile.free_predictions_left,
            isSubscribed: userProfile.is_subscribed,
            memberSince: userProfile.created_at
        };

        console.log('📊 Статистика пользователя получена');
        return stats;

    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        return null;
    }
}

// 🛡️ ФУНКЦИИ БЕЗОПАСНОСТИ И ВАЛИДАЦИИ

// Валидация данных пользователя
function validateUserData(userData) {
    const required = ['user_id'];
    const optional = ['username', 'first_name', 'last_name', 'chat_id'];
    
    for (const field of required) {
        if (!userData[field]) {
            throw new Error(`Обязательное поле отсутствует: ${field}`);
        }
    }

    // Санитизация данных
    const sanitized = {};
    [...required, ...optional].forEach(field => {
        if (userData[field] !== undefined) {
            sanitized[field] = typeof userData[field] === 'string' 
                ? userData[field].trim().substring(0, 255) 
                : userData[field];
        }
    });

    return sanitized;
}

// Проверка прав доступа
function checkUserPermissions(userId, action) {
    // Здесь можно добавить логику проверки прав
    // Например, ограничения для заблокированных пользователей
    return true;
}

// 🔄 ЭКСПОРТ ФУНКЦИЙ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ ФАЙЛАХ
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSupabase,
        createOrGetUserProfile,
        updateUserProfile,
        getUserProfile,
        saveDailyCardToSupabase,
        getTodayDailyCard,
        saveQuestionToSupabase,
        saveAnswerToSupabase,
        saveSpreadToSupabase,
        getUserHistory,
        saveReviewToSupabase,
        getApprovedReviews,
        checkUserSubscription,
        decrementFreeQuestions,
        saveCompleteQuestionSession,
        saveCompleteDailyCardSession,
        initTelegramUser,
        searchUserHistory,
        getUserStatistics,
        sendPredictionToN8N,
        syncUserToN8N
    };
}