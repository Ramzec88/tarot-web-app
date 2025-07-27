// supabase-functions.js - Функции для работы с Supabase базой данных
// ========================================================================

// 🔗 Глобальная переменная для клиента Supabase
// Инициализируется в initSupabase
let supabase = null;

// 🚀 ИНИЦИАЛИЗАЦИЯ SUPABASE (вызывается из script.js -> ensureSupabaseLibrary)
window.initSupabase = function() { // Делаем функцию глобальной для вызова из script.js
    try {
        // Убедимся, что глобальные конфиги доступны
        if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
            console.error('❌ Supabase: Конфигурация SUPABASE_CONFIG недоступна или неполна.');
            return false;
        }
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
             console.error('❌ Supabase: Библиотека Supabase не загружена.');
             return false;
        }

        supabase = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            },
            realtime: {
                params: {
                    eventsPerSecond: 2
                }
            }
        });
        console.log('✅ Supabase клиент инициализирован успешно.');
        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase клиента:', error);
        return false;
    }
};


// 👤 ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ

// Создание или получение профиля пользователя
async function createOrGetUserProfile(telegramUser) {
    if (!supabase) {
        console.warn('Supabase не инициализирован для createOrGetUserProfile.');
        return null;
    }
    if (!window.TABLES || !window.TABLES.userProfiles) {
        console.error('TABLES.userProfiles не определен в конфигурации.');
        return null;
    }

    try {
        // Telegram user ID теперь BIGINT, а Supabase auth.uid() - UUID
        // Мы НЕ ДОЛЖНЫ использовать telegramUser.id напрямую как user_id для RLS,
        // если в Supabase user_id UUID.
        // Вместо этого, user_id в Supabase будет UUID, генерируемым Supabase.
        // Идентификация будет по auth.uid() после входа в систему (например, через Telegram OAuth в будущем).
        // Для Web App, где прямого логина нет, Telegram user ID (BIGINT) можно хранить
        // как дополнительное поле, а user_id (UUID) будет уникальным ключом.

        // Для целей текущего Web App (без прямого OAuth):
        // Если user_id в Supabase - UUID, а приходит Telegram ID (BIGINT),
        // нам нужен способ сопоставить их.
        // Предположим, что Telegram ID (BIGINT) будет храниться в поле `telegram_user_id` (BIGINT),
        // а `user_id` (UUID) будет уникальным для строки в Supabase, генерируемым Supabase.
        // Иначе RLS не будет работать.

        // **** ВАЖНОЕ ИЗМЕНЕНИЕ ДЛЯ СОВМЕСТИМОСТИ С ВАШИМИ ТАБЛИЦАМИ (user_id: BIGINT) ****
        // Если вы действительно хотите, чтобы user_id в Supabase был BIGINT,
        // и вы не используете auth.uid() для RLS (или используете специальный триггер для его преобразования),
        // тогда нужно оставить user_id как BIGINT в таблице,
        // И в политиках RLS сравнивать с auth.jwt().claims->>'user_id' если user_id в токене BIGINT.
        // Или, если auth.uid() используется, user_id в таблице ОБЯЗАТЕЛЬНО должен быть UUID.

        // Учитывая, что вы пересоздали таблицы с user_id UUID, но Telegram ID - BIGINT,
        // нам нужно решить, как сопоставлять.
        // Самый простой способ: использовать Telegram ID как внешний ключ (telegram_user_id BIGINT),
        // а UUID пусть генерируется Supabase как основной user_id.

        // Временно, если user_id в вашей таблице tarot_user_profiles остался BIGINT,
        // а вы хотите, чтобы он был UUID, нужно это исправить в базе.
        // Если вы изменили его на UUID, то:
        // window.Telegram.WebApp.initDataUnsafe.user.id - это BIGINT из Telegram.
        // Для RLS с UUID, нам нужен UUID пользователя Supabase.

        // Для простоты, пока нет полной системы аутентификации Telegram в Supabase:
        // Мы будем использовать telegramUser.id (BIGINT) как уникальный идентификатор пользователя в вашем
        // Supabase `user_id` (предполагая, что вы НЕ изменили его на UUID)
        // ИЛИ
        // Если вы изменили `user_id` на UUID, то нам нужен способ получить UUID из Telegram ID.
        // На данный момент, поскольку auth.uid() (UUID) не совпадает с Telegram ID (BIGINT), RLS работать не будет.
        // Для обхода проблемы, пока нет полной интеграции Telegram Auth с Supabase,
        // мы временно ОТКЛЮЧИМ RLS для INSERT/UPDATE для createOrGetUserProfile
        // ИЛИ
        // Изменим RLS политики так, чтобы они использовали 'telegram_id' поле, если оно есть.

        // *** ВАРИАНТ 1: Если user_id в tarot_user_profiles ВСЁ ЕЩЕ BIGINT (не UUID) ***
        // (Это расходится с вашим последним SQL-скриптом, но соответствует тому, как обычно работает Telegram ID)
        // Если user_id в вашей таблице - BIGINT, то `auth.uid()` (UUID) НЕ БУДЕТ РАБОТАТЬ в RLS.
        // Тогда RLS политики должны быть ослаблены для теста, или используйте другое поле.
        // ДОПУСТИМ, что user_id в таблице tarot_user_profiles это UUID, как вы обновили,
        // но тогда initTelegramUser должен генерировать UUID для тестового пользователя.
        // ИЛИ
        // САМЫЙ ПРОСТОЙ ОБХОД ДЛЯ ТЕСТИРОВАНИЯ (если user_id в Supabase БЫЛ UUID)
        // Для WebApp без полного Telegram Auth, user_id в Supabase Auth НЕ СОВПАДАЕТ с Telegram ID.
        // Поэтому для создания записи в Supabase, мы можем использовать telegramUser.id
        // как значение для поля telegram_user_id (которое нужно добавить в схему).
        // А user_id будет генерироваться Supabase.

        // ---- ПРЕДПОЛАГАЕМЫЙ СЦЕНАРИЙ: user_id в tarot_user_profiles - UUID, но у нас есть только telegramUser.id (BIGINT) ----
        // Здесь потребуется логика, которая создает/находит пользователя по telegram_user_id
        // или генерирует UUID и сохраняет telegram_user_id для сопоставления.
        // ВАЖНО: auth.uid() (UUID) будет связан с JWT токеном, который приходит из Supabase Auth.
        // Telegram Web App напрямую не дает JWT, если нет логина через Supabase OAuth.

        // Для начала, давайте просто искать по telegram_user_id, ДОБАВИВ ЕГО В СХЕМУ tarot_user_profiles
        // ИЛИ, если user_id в вашей таблице все-таки остался BIGINT (как Telegram ID),
        // тогда нужно изменить RLS политики на что-то вроде 'auth.uid() = null' для тестов
        // или отключить RLS полностью для INSERT/UPDATE для `anon` роли, если это тестовая среда.

        // Давайте пока временно ОТКЛЮЧИМ RLS для тестирования входа, а потом включим.
        // Временно для `createOrGetUserProfile` я буду использовать `telegramUser.id` напрямую,
        // предполагая, что `user_id` в таблице `tarot_user_profiles` является `BIGINT`.
        // Если вы изменили на UUID, то здесь будет проблема.
        // Если user_id в таблице `tarot_user_profiles` - `UUID`, то нужно добавлять новое поле `telegram_id BIGINT UNIQUE`.
        // Искать по нему. А `user_id` (UUID) будет генерироваться.

        // **** Если `user_id` в `tarot_user_profiles` действительно `UUID` ****
        // Ищем по полю, которое хранит Telegram ID (допустим, `telegram_id`)
        // Если у вас нет поля `telegram_id` в таблице, его нужно добавить, если user_id - UUID.
        // Пока используем `user_id` как Telegram ID (если он BIGINT в БД).
        // Если он UUID, то следующая логика не сработает без дополнительного поля.

        const telegram_id_str = telegramUser.id.toString(); // Конвертируем BIGINT в строку для поиска
        
        // Поиск по `telegram_id` (если такое поле есть в таблице и оно UNIQUE)
        let { data: existingUser, error: selectError } = await supabase
            .from(window.TABLES.userProfiles)
            .select('*')
            .eq('telegram_id', telegram_id_str) // Предполагаем, что есть поле telegram_id
            .single();

        if (selectError && selectError.code === 'PGRST116') { // No rows found
            console.log('Пользователь не найден по Telegram ID, создаю новый.');

            // Если user_id в таблице UUID, то тут нам нужен какой-то способ получить UUID
            // Если Telegram ID (BIGINT) хранится в `user_id` (UUID), это нелогично.
            // Предположим, что `user_id` в вашей Supabase - это `UUID`, а `telegram_id` - это `BIGINT`.
            // Если у вас `user_id` в Supabase - `BIGINT`, то это упрощает, но тогда RLS с `auth.uid()` не работает.

            // ВАЖНО: Если user_id в DB UUID, а Telegram id BIGINT:
            // Либо вам нужен реальный Supabase Auth,
            // либо нужно изменить RLS политики, чтобы они работали с `telegram_id`.
            // Для этой итерации, я предполагаю, что в вашей таблице `tarot_user_profiles` есть поле `telegram_id BIGINT UNIQUE`
            // ИЛИ, что `user_id` в `tarot_user_profiles` остался `BIGINT` и он **используется как Telegram ID**.

            // ---- ДАВАЙТЕ ПРЕДПОЛОЖИМ, что user_id в `tarot_user_profiles` = BIGINT (Telegram ID)
            // Это самый простой путь для текущей WebApp логики без полного Supabase Auth.
            // Игнорируем предыдущее изменение на UUID, если вы еще не развернули его.
            // Если вы уже развернули UUID, то это требует добавления `telegram_id` поля.

            // **** ВАРИАНТ 2: Если user_id в `tarot_user_profiles` это BIGINT (Telegram ID) ****
            // (Это проще для вашей текущей модели, но RLS `auth.uid()=user_id` не сработает)
            // Значит, RLS политики должны быть либо удалены/отключены для анонимного доступа,
            // либо изменены на что-то вроде `true` для анонимной роли.

            const userIdToUse = telegramUser.id; // Используем Telegram ID напрямую

            const newUserProfile = {
                user_id: userIdToUse, // Используем Telegram ID (BIGINT)
                chat_id: telegramUser.id, // chat_id часто совпадает с user_id для WebApp
                username: telegramUser.username || null,
                first_name: telegramUser.first_name || null,
                last_name: telegramUser.last_name || null,
                free_predictions_left: APP_CONFIG.freeQuestionsLimit,
                is_subscribed: false,
                referral_code: `ref_${userIdToUse}`,
                referral_count: 0,
                total_questions: 0,
                display_name: telegramUser.first_name || telegramUser.username || `Пользователь ${userIdToUse}` // Добавим display_name
            };

            const { data: newUser, error: insertError } = await supabase
                .from(window.TABLES.userProfiles)
                .insert([newUserProfile])
                .select()
                .single();

            if (insertError) {
                // Если ошибка связана с дубликатом user_id (конфликт), то пользователь уже существует.
                // Это может произойти, если запрос на SELECT вернул null, но INSERT сработал из-за гонки.
                if (insertError.code === '23505') { // unique_violation
                    console.log('Конфликт при создании пользователя, значит, он уже существует. Повторная попытка SELECT.');
                    let { data: existingUserAfterConflict, error: selectAfterConflictError } = await supabase
                        .from(window.TABLES.userProfiles)
                        .select('*')
                        .eq('user_id', userIdToUse)
                        .single();
                    if (existingUserAfterConflict && !selectAfterConflictError) {
                        console.log('👤 Пользователь найден после конфликта:', existingUserAfterConflict.username || existingUserAfterConflict.first_name);
                        return existingUserAfterConflict;
                    }
                }
                throw insertError;
            }

            console.log('🆕 Создан новый пользователь:', newUser.username || newUser.first_name);
            return newUser;

        } else if (existingUser) { // Пользователь найден через SELECT
            console.log('👤 Пользователь найден:', existingUser.username || existingUser.first_name);
            return existingUser;
        }

        console.error('Непредвиденная ситуация при создании/получении пользователя.');
        return null;

    } catch (error) {
        console.error('❌ Ошибка при создании/получении пользователя:', error);
        return null;
    }
}


// Обновление профиля пользователя
async function updateUserProfile(userId, updates) {
    if (!supabase) return false;
    if (!window.TABLES || !window.TABLES.userProfiles) {
        console.error('TABLES.userProfiles не определен в конфигурации.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.userProfiles)
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
    if (!window.TABLES || !window.TABLES.userProfiles) {
        console.error('TABLES.userProfiles не определен в конфигурации.');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.userProfiles)
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

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
    if (!window.TABLES || !window.TABLES.dailyCards) {
        console.error('TABLES.dailyCards не определен в конфигурации.');
        return false;
    }

    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD формат

        const { data, error } = await supabase
            .from(window.TABLES.dailyCards)
            .insert([{
                user_id: userId,
                card_data: cardData,
                ai_prediction: aiPrediction,
                card_date: today
            }])
            .select()
            .single();

        if (error) {
            // Если карта на сегодня уже существует, это может быть ошибкой уникальности
            // В этом случае, мы должны обновить запись
            if (error.code === '23505') { // unique_violation
                console.warn('Карта дня на сегодня уже существует, обновляю.');
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
    if (!window.TABLES || !window.TABLES.dailyCards) {
        console.error('TABLES.dailyCards не определен в конфигурации.');
        return false;
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from(window.TABLES.dailyCards)
            .update({
                card_data: cardData,
                ai_prediction: aiPrediction,
                updated_at: new Date().toISOString() // Обновляем updated_at
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
    if (!window.TABLES || !window.TABLES.dailyCards) {
        console.error('TABLES.dailyCards не определен в конфигурации.');
        return null;
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from(window.TABLES.dailyCards)
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
    if (!window.TABLES || !window.TABLES.questions) {
        console.error('TABLES.questions не определен в конфигурации.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.questions)
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
    if (!window.TABLES || !window.TABLES.answers) {
        console.error('TABLES.answers не определен в конфигурации.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.answers)
            .insert([{
                question_id: questionId,
                user_id: userId, // Сохраняем user_id в ответе для удобства выборки истории
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
    if (!window.TABLES || !window.TABLES.spreads) {
        console.error('TABLES.spreads не определен в конфигурации.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.spreads)
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
    if (!window.TABLES || !window.TABLES.dailyCards || !window.TABLES.questions || !window.TABLES.spreads) {
        console.error('Не все таблицы истории определены в конфигурации.');
        return [];
    }

    try {
        // Получаем карты дня
        const { data: dailyCards, error: dailyError } = await supabase
            .from(window.TABLES.dailyCards)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // Получаем вопросы с ответами (tarot_answers теперь связано через tarot_questions)
        const { data: questionsWithAnswers, error: questionsError } = await supabase
            .from(window.TABLES.questions)
            .select(`
                *,
                ${window.TABLES.answers} (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // Получаем расклады
        const { data: spreads, error: spreadsError } = await supabase
            .from(window.TABLES.spreads)
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
    if (!window.TABLES || !window.TABLES.reviews) {
        console.error('TABLES.reviews не определен в конфигурации.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.reviews)
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
    if (!window.TABLES || !window.TABLES.reviews || !window.TABLES.userProfiles) { // Нужен userProfiles для джойна
        console.error('Не все таблицы для отзывов определены в конфигурации.');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.reviews)
            .select(`
                id,
                rating,
                review_text,
                is_anonymous,
                created_at,
                ${window.TABLES.userProfiles} (username, first_name)
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
    if (!window.TABLES || !window.TABLES.userProfiles) {
        console.error('TABLES.userProfiles не определен в конфигурации.');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from(window.TABLES.userProfiles)
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
    if (!window.TABLES || !window.TABLES.dailyCards || !window.TABLES.questions || !window.TABLES.spreads) {
        console.error('Не все таблицы для очистки определены в конфигурации.');
        return false;
    }

    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        await supabase
            .from(window.TABLES.dailyCards)
            .delete()
            .lt('created_at', threeMonthsAgo.toISOString());

        await supabase
            .from(window.TABLES.questions)
            .delete()
            .lt('created_at', threeMonthsAgo.toISOString());

        await supabase
            .from(window.TABLES.spreads)
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
    if (!window.API_CONFIG || !window.API_CONFIG.n8nWebhookUrl) {
        console.warn('⚠️ API_CONFIG.n8nWebhookUrl не определен, синхронизация с n8n пропущена.');
        return;
    }
    // Используем тот же эндпоинт для разных действий, если N8N может их различать.
    // Если у вас разные вебхуки для разных действий, нужно будет обновить API_CONFIG
    // Например, API_CONFIG.createUserWebhook, API_CONFIG.generatePredictionWebhook
    const n8nSyncUrl = window.API_CONFIG.n8nWebhookUrl; // Используем основной вебхук
    
    try {
        const response = await fetch(n8nSyncUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sync_user', // Добавим поле action для n8n
                user_id: userProfile.user_id,
                chat_id: userProfile.chat_id,
                username: userProfile.username,
                first_name: userProfile.first_name,
                free_predictions_left: userProfile.free_predictions_left,
                is_subscribed: userProfile.is_subscribed,
                subscription_expiry_date: userProfile.subscription_expiry_date,
                referral_code: userProfile.referral_code,
                source: 'supabase_sync_webapp'
            })
        });

        if (response.ok) {
            console.log('🔄 Пользователь синхронизирован с n8n');
        } else {
            console.warn(`⚠️ Ошибка синхронизации с n8n: ${response.status} - ${await response.text()}`);
        }

    } catch (error) {
        console.warn('⚠️ Ошибка синхронизации с n8n:', error);
    }
}

// Отправка предсказания в n8n для ИИ-обработки
async function sendPredictionToN8N(userId, question, cardsData, type = 'question') {
    if (!window.API_CONFIG || !window.API_CONFIG.n8nWebhookUrl) {
        console.error('❌ API_CONFIG.n8nWebhookUrl не определен, не могу получить предсказание от ИИ.');
        return 'К сожалению, не удалось связаться с ИИ. Проверьте конфигурацию.';
    }
    const n8nPredictionUrl = window.API_CONFIG.n8nWebhookUrl; // Используем основной вебхук

    try {
        const response = await fetch(n8nPredictionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generate_prediction', // Добавим поле action для n8n
                user_id: userId,
                question: question,
                cards: cardsData,
                type: type,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        console.log('🤖 ИИ-предсказание получено от n8n');
        return result.prediction || result.message || 'Предсказание получено, но без конкретного текста.';

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
                // Если API_CONFIG.saveQuestion отличается от n8nWebhookUrl, используйте его.
                // В текущей реализации у вас один n8nWebhookUrl.
                await fetch(API_CONFIG.n8nWebhookUrl, { // Используем основной вебхук
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save_question_session', // Добавим поле action для n8n
                        user_id: userId,
                        question: questionText,
                        cards: cardsData,
                        ai_prediction: aiPrediction,
                        type: questionType,
                        supabase_question_id: results.question.id
                    })
                });
                results.n8nSync = true;
            } catch (n8nError) {
                console.warn('⚠️ n8n синхронизация не удалась (сохранение сессии):', n8nError);
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
async function saveCompleteDailyCardSession(userId, cardData, aiPrediction) { // aiPrediction теперь передается
    try {
        // 1. Сохраняем в Supabase
        const savedCard = await saveDailyCardToSupabase(userId, cardData, aiPrediction);

        // 2. Обновляем дату последней карты дня в профиле
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
window.initTelegramUser = async function() { // Делаем глобальной
    try {
        let telegramUser = null;

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
        }

        if (!telegramUser) {
            console.warn('⚠️ Данные Telegram пользователя недоступны, используем тестовые данные для отладки.');
            // Для локального тестирования или запуска вне Telegram:
            // Важно: Telegram user ID - это BIGINT, а Supabase user_id теперь UUID.
            // Для связки будем использовать Telegram user ID как `telegram_id` в нашей таблице.
            // Но в этом сценарии, пока нет Supabase Auth (логина), нам нужен временный UUID для Supabase.
            // Если user_id в вашей таблице остался BIGINT, используйте telegramUser.id как user_id.
            // ИНАЧЕ, если user_id в Supabase UUID, и нет Telegram Auth,
            // тогда `currentUser` не будет соответствовать `auth.uid()`, и RLS не будет работать.

            // **** ДАВАЙТЕ ПРЕДПОЛОЖИМ, что user_id в `tarot_user_profiles` это BIGINT (Telegram ID) ****
            // Это наиболее вероятно, т.к. вы используете `user_id` напрямую в функциях.
            // Если вы изменили его на UUID, то эта часть требует пересмотра или наличия `telegram_id` поля.

            // Генерируем тестовый Telegram ID
            const testTelegramId = 1000000000 + Math.floor(Math.random() * 999999999); // Большое число для имитации BIGINT
            telegramUser = {
                id: testTelegramId,
                first_name: 'Тестовый',
                username: `test_user_${testTelegramId}`,
                language_code: 'ru',
                chat_id: testTelegramId // Добавим chat_id
            };
            console.warn(`Использую фиктивного пользователя: ${telegramUser.first_name} (ID: ${telegramUser.id})`);
        }

        console.log('👤 Инициализация пользователя Telegram:', telegramUser.first_name, `(ID: ${telegramUser.id})`);

        // Создаем или получаем профиль пользователя
        // ВАЖНО: Здесь предполагается, что `user_id` в Supabase - это `BIGINT` и он совпадает с `telegramUser.id`.
        // Если вы изменили его на `UUID`, то эта часть потребует серьезной доработки схемы БД и логики.
        const userProfile = await createOrGetUserProfile(telegramUser);

        if (userProfile) {
            // Синхронизируем с n8n для совместимости
            await syncUserToN8N(userProfile);

            // Обновляем глобальное состояние приложения
            if (window.appState) {
                window.currentUser = userProfile; // Устанавливаем глобального пользователя
                window.appState.questionsLeft = userProfile.free_predictions_left;
                window.appState.isPremium = userProfile.is_subscribed;
                window.updateUI(); // Обновляем UI после получения данных пользователя
            } else {
                console.warn('⚠️ window.appState не инициализирован при initTelegramUser.');
            }

            console.log('✅ Пользователь успешно инициализирован.');
            return userProfile;
        }

        console.error('❌ Не удалось получить/создать профиль пользователя.');
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
    if (!window.TABLES || !window.TABLES.questions) {
        console.error('TABLES.questions не определен в конфигурации для поиска.');
        return [];
    }

    try {
        let query = supabase
            .from(window.TABLES.questions)
            .select(`
                *,
                ${window.TABLES.answers} (*)
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
    if (!window.TABLES || !window.TABLES.userProfiles || !window.TABLES.dailyCards || !window.TABLES.questions || !window.TABLES.spreads) {
        console.error('Не все таблицы для статистики определены в конфигурации.');
        return null;
    }

    try {
        const userProfile = await getUserProfile(userId);
        if (!userProfile) return null;

        // Подсчитываем количество записей разных типов
        const [dailyCardsCount, questionsCount, spreadsCount] = await Promise.all([
            supabase.from(window.TABLES.dailyCards).select('id', { count: 'exact' }).eq('user_id', userId),
            supabase.from(window.TABLES.questions).select('id', { count: 'exact' }).eq('user_id', userId),
            supabase.from(window.TABLES.spreads).select('id', { count: 'exact' }).eq('user_id', userId)
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

// Валидация данных пользователя (сейчас не используется для сохранения в DB)
function validateUserData(userData) {
    const required = ['id']; // Telegram ID
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

// Проверка прав доступа (заглушка)
function checkUserPermissions(userId, action) {
    return true;
}

// 🔄 ЭКСПОРТ ФУНКЦИЙ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ ФАЙЛАХ
// Делаем функции глобальными для упрощения работы
window.createOrGetUserProfile = createOrGetUserProfile;
window.updateUserProfile = updateUserProfile;
window.getUserProfile = getUserProfile;
window.saveDailyCardToSupabase = saveDailyCardToSupabase;
window.getTodayDailyCard = getTodayDailyCard;
window.saveQuestionToSupabase = saveQuestionToSupabase;
window.saveAnswerToSupabase = saveAnswerToSupabase;
window.saveSpreadToSupabase = saveSpreadToSupabase;
window.getUserHistory = getUserHistory;
window.saveReviewToSupabase = saveReviewToSupabase;
window.getApprovedReviews = getApprovedReviews;
window.checkUserSubscription = checkUserSubscription;
window.decrementFreeQuestions = decrementFreeQuestions;
window.saveCompleteQuestionSession = saveCompleteQuestionSession;
window.saveCompleteDailyCardSession = saveCompleteDailyCardSession;
window.sendPredictionToN8N = sendPredictionToN8N;
window.syncUserToN8N = syncUserToN8N;

console.log('📜 Supabase-functions.js загружен. Функции доступны глобально.');
