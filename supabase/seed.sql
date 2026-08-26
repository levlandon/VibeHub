-- Seed data for local Supabase testing

-- 1. Create auth users (which will automatically trigger profile creation via handle_new_user)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-4111-a111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@vibehub.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Алексей Смирнов","handle":"alex_dev","initials":"АС"}'::jsonb,
    '2026-08-01 10:00:00+00',
    '2026-08-01 10:00:00+00'
  ),
  (
    '22222222-2222-4222-a222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'maria@vibehub.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Мария Иванова","handle":"maria_ai","initials":"МИ"}'::jsonb,
    '2026-08-01 10:05:00+00',
    '2026-08-01 10:05:00+00'
  ),
  (
    '33333333-3333-4333-a333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dmitry@vibehub.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Дмитрий Козлов","handle":"dmitry_k","initials":"ДК"}'::jsonb,
    '2026-08-01 10:10:00+00',
    '2026-08-01 10:10:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert auth identities for GoTrue password authentication
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-4111-a111-111111111111',
    '11111111-1111-4111-a111-111111111111',
    '{"sub":"11111111-1111-4111-a111-111111111111","email":"alex@vibehub.dev"}'::jsonb,
    'email',
    'alex@vibehub.dev',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-a222-222222222222',
    '22222222-2222-4222-a222-222222222222',
    '{"sub":"22222222-2222-4222-a222-222222222222","email":"maria@vibehub.dev"}'::jsonb,
    'email',
    'maria@vibehub.dev',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-4333-a333-333333333333',
    '33333333-3333-4333-a333-333333333333',
    '{"sub":"33333333-3333-4333-a333-333333333333","email":"dmitry@vibehub.dev"}'::jsonb,
    'email',
    'dmitry@vibehub.dev',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Ensure public.profiles have exact intended fields
UPDATE public.profiles
SET
  name = 'Алексей Смирнов',
  handle = 'alex_dev',
  initials = 'АС',
  bio = 'Frontend Lead & AI enthusiast. Строю интерфейсы нового поколения на React и LLM.',
  avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  model_ids = ARRAY['anthropic/claude-3.7-sonnet', 'openai/gpt-4o'],
  interests = ARRAY['Coding', 'Design', 'Product']
WHERE id = '11111111-1111-4111-a111-111111111111';

UPDATE public.profiles
SET
  name = 'Мария Иванова',
  handle = 'maria_ai',
  initials = 'МИ',
  bio = 'AI Researcher. Изучаю reasoning models, MCP и мультиагентные пайплайны.',
  avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  model_ids = ARRAY['deepseek/deepseek-r1', 'google/gemini-2.0-flash', 'anthropic/claude-3.7-sonnet'],
  interests = ARRAY['Research', 'Automation', 'Data']
WHERE id = '22222222-2222-4222-a222-222222222222';

UPDATE public.profiles
SET
  name = 'Дмитрий Козлов',
  handle = 'dmitry_k',
  initials = 'ДК',
  bio = 'Fullstack Dev & Open-source contributor. Локальные LLM и devops.',
  avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  model_ids = ARRAY['deepseek/deepseek-r1', 'meta/llama-3.3-70b-instruct'],
  interests = ARRAY['Coding', 'Automation']
WHERE id = '33333333-3333-4333-a333-333333333333';


-- 2. Insert 16 posts with different and identical timestamps
INSERT INTO public.posts (
  id,
  type,
  title,
  content,
  author_id,
  tags,
  related_entities,
  extras,
  created_at
) VALUES
  (
    'a0000001-0000-0000-0000-000000000016',
    'discussion',
    'Сравнение Claude 3.7 Sonnet и GPT-4.5 в реальных задачах',
    'Протестировали обе модели на кодогенерации и архитектурном планировании. Claude демонстрирует глубокое понимание контекста проекта.',
    '11111111-1111-4111-a111-111111111111',
    ARRAY['claude-3-7', 'gpt-4-5', 'benchmarks'],
    '[{"id":"anthropic/claude-3.7-sonnet","kind":"model","name":"Claude 3.7 Sonnet"}]'::jsonb,
    '{"benchmarkUrl":"https://benchlm.dev/tests/coding"}'::jsonb,
    '2026-08-25 18:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000015',
    'guide',
    'Настройка Model Context Protocol (MCP) в Cursor и Claude Desktop',
    'Пошаговое руководство по интеграции локальных инструментов через MCP. Разбираем создание собственного сервера на TypeScript.',
    '22222222-2222-4222-a222-222222222222',
    ARRAY['mcp', 'cursor', 'typescript'],
    '[{"id":"cursor","kind":"tool","name":"Cursor"}]'::jsonb,
    '{"repo":"https://github.com/example/mcp-server"}'::jsonb,
    '2026-08-25 17:30:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000014',
    'project',
    'AI-агент для автоматического ревью pull request в GitHub Actions',
    'Разработали легковесный action, проверяющий стиль кода, потенциальные баги и соответствие документации.',
    '33333333-3333-4333-a333-333333333333',
    ARRAY['github-actions', 'ci-cd', 'agents'],
    '[]'::jsonb,
    '{"github":"https://github.com/example/ai-pr-reviewer"}'::jsonb,
    '2026-08-25 16:45:00+00'
  ),
  -- Posts 13 and 12 with identical created_at to test deterministic tiebreaker
  (
    'a0000001-0000-0000-0000-000000000013',
    'question',
    'Как оптимизировать context window при работе с большими репозиториями?',
    'Сталкиваемся с лимитами токенов при индексации монорепозитория. Какие техники чанкинга и RAG вы используете?',
    '11111111-1111-4111-a111-111111111111',
    ARRAY['rag', 'embeddings', 'optimization'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 16:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000012',
    'resource',
    'Коллекция лучших системных промптов для coding assistants',
    'Собрали проверенные системные промпты для генерации чистого кода без лишней «воды».',
    '22222222-2222-4222-a222-222222222222',
    ARRAY['prompts', 'coding', 'resources'],
    '[]'::jsonb,
    '{"url":"https://vibehub.dev/prompts"}'::jsonb,
    '2026-08-25 16:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000011',
    'discussion',
    'Локальный запуск DeepSeek R1 70B на Mac Studio M2 Ultra',
    'Делимся замерами скорости токенов/сек через llama.cpp и Ollama с 4-bit квантованием.',
    '33333333-3333-4333-a333-333333333333',
    ARRAY['deepseek', 'ollama', 'apple-silicon'],
    '[{"id":"deepseek/deepseek-r1","kind":"model","name":"DeepSeek R1"}]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 15:30:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000010',
    'guide',
    'Best practices работы с векторными БД в PostgreSQL (pgvector)',
    'Как правильно строить HNSW индексы и настраивать ef_search для высоконагруженных систем.',
    '11111111-1111-4111-a111-111111111111',
    ARRAY['postgres', 'pgvector', 'hnsw'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 15:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000009',
    'project',
    'Open-source расширение для Chrome: AI Summarizer для YouTube видео',
    'Генерирует структурированные заметки с таймкодами на основе субтитров с помощью Gemini Flash.',
    '22222222-2222-4222-a222-222222222222',
    ARRAY['chrome-extension', 'gemini', 'youtube'],
    '[{"id":"google/gemini-2.0-flash","kind":"model","name":"Gemini 2.0 Flash"}]'::jsonb,
    '{"chromeWebStore":"https://chrome.google.com/webstore"}'::jsonb,
    '2026-08-25 14:30:00+00'
  ),
  -- Posts 8 and 7 with identical created_at to test deterministic tiebreaker
  (
    'a0000001-0000-0000-0000-000000000008',
    'question',
    'Какой фреймворк для мультиагентных систем выбрать в 2026 году?',
    'LangGraph, CrewAI или AutoGen? Интересует надёжность в продакшене и поддержка state machine.',
    '33333333-3333-4333-a333-333333333333',
    ARRAY['agents', 'langgraph', 'crewai'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 14:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000007',
    'resource',
    'Cheatsheet: Регулярные выражения и Prompt Engineering',
    'Краткая памятка по созданию детерминированного JSON-вывода через Few-Shot и грамматики.',
    '11111111-1111-4111-a111-111111111111',
    ARRAY['json', 'prompt-engineering', 'cheatsheet'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 14:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000006',
    'discussion',
    'Тренды открытых моделей в первом полугодии 2026',
    'Обсуждаем развитие reasoning-моделей, гибридный inference и сжатие KV-кэша.',
    '22222222-2222-4222-a222-222222222222',
    ARRAY['open-weights', 'reasoning', 'ai-trends'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 13:00:00+00'
  ),
  -- Posts 5 and 4 with identical created_at to test deterministic tiebreaker
  (
    'a0000001-0000-0000-0000-000000000005',
    'guide',
    'Безопасность AI-приложений: защита от Prompt Injection',
    'Паттерны санитизации пользовательского ввода и изоляция привилегированных вызовов инструментов.',
    '33333333-3333-4333-a333-333333333333',
    ARRAY['security', 'prompt-injection', 'best-practices'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 12:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000004',
    'project',
    'UI-компоненты на React 19 для чат-интерфейсов нового поколения',
    'Набор компонентов с поддержкой streaming markdown, артефактов и интерактивных графиков.',
    '11111111-1111-4111-a111-111111111111',
    ARRAY['react-19', 'ui-kit', 'streaming'],
    '[]'::jsonb,
    '{"storybook":"https://ui.vibehub.dev"}'::jsonb,
    '2026-08-25 12:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    'question',
    'Как организовать кэширование ответов LLM на уровне Edge Runtime?',
    'Используем Cloudflare Workers и Upstash Redis. Стоит ли кэшировать эмбеддинги запросов?',
    '22222222-2222-4222-a222-222222222222',
    ARRAY['caching', 'edge-runtime', 'redis'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 11:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    'resource',
    'Список актуальных бенчмарков для оценки автономных кодинг-агентов',
    'SWE-bench, HumanEval+, MultiPL-E и свежие бенчмарки на рефакторинг реальных кодовых баз.',
    '33333333-3333-4333-a333-333333333333',
    ARRAY['benchmarks', 'swe-bench', 'evals'],
    '[]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 10:00:00+00'
  ),
  (
    'a0000001-0000-0000-0000-000000000001',
    'discussion',
    'Первые впечатления от релиза Claude 3.7 Sonnet',
    'Гибридный режим рассуждений работает впечатляюще. Тестируем в связке с VibeHub.',
    '11111111-1111-4111-a111-111111111111',
    ARRAY['claude', 'anthropic', 'reasoning'],
    '[{"id":"anthropic/claude-3.7-sonnet","kind":"model","name":"Claude 3.7 Sonnet"}]'::jsonb,
    '{}'::jsonb,
    '2026-08-25 09:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Comments for post 1
INSERT INTO public.comments (
  id,
  post_id,
  author_id,
  content,
  created_at
) VALUES
  (
    'b0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    '22222222-2222-4222-a222-222222222222',
    'Отличный обзор! Особенно впечатляет скорость размышления в hybrid mode.',
    '2026-08-25 09:15:00+00'
  ),
  (
    'b0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000001',
    '33333333-3333-4333-a333-333333333333',
    'Протестировал на рефакторинге большого TypeScript-проекта — результаты впечатляющие.',
    '2026-08-25 09:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Mark question as solved with accepted answer comment
INSERT INTO public.comments (
  id,
  post_id,
  author_id,
  content,
  created_at
) VALUES
  (
    'b0000001-0000-0000-0000-000000000003',
    'a0000001-0000-0000-0000-000000000013',
    '22222222-2222-4222-a222-222222222222',
    'Рекомендуем использовать семантический чанкинг на основе AST дерева кода.',
    '2026-08-25 16:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.posts
SET solved = true, accepted_answer_id = 'b0000001-0000-0000-0000-000000000003'
WHERE id = 'a0000001-0000-0000-0000-000000000013';

-- 5. Seed Saved Items / Bookmarks
INSERT INTO public.saved_items (
  id,
  user_id,
  entity_type,
  entity_id,
  title,
  subtitle,
  url,
  metadata,
  created_at
) VALUES
  (
    'd0000001-0000-0000-0000-000000000001',
    '11111111-1111-4111-a111-111111111111',
    'model',
    'anthropic/claude-3.7-sonnet',
    'Claude 3.7 Sonnet',
    'Anthropic',
    '',
    '{}'::jsonb,
    '2026-08-25 10:00:00+00'
  ),
  (
    'd0000001-0000-0000-0000-000000000002',
    '11111111-1111-4111-a111-111111111111',
    'tool',
    'cursor',
    'Cursor',
    'IDE',
    '',
    '{}'::jsonb,
    '2026-08-25 10:05:00+00'
  ),
  (
    'd0000001-0000-0000-0000-000000000003',
    '11111111-1111-4111-a111-111111111111',
    'repository',
    'facebook/react',
    'react',
    'facebook',
    'https://github.com/facebook/react',
    '{"owner":"facebook","name":"react","description":"The library for web and native user interfaces"}'::jsonb,
    '2026-08-25 10:10:00+00'
  ),
  (
    'd0000001-0000-0000-0000-000000000004',
    '22222222-2222-4222-a222-222222222222',
    'model',
    'deepseek/deepseek-r1',
    'DeepSeek R1',
    'DeepSeek',
    '',
    '{}'::jsonb,
    '2026-08-25 11:00:00+00'
  ),
  (
    'd0000001-0000-0000-0000-000000000005',
    '22222222-2222-4222-a222-222222222222',
    'post',
    'a0000001-0000-0000-0000-000000000016',
    'Сравнение Claude 3.7 Sonnet и GPT-4.5 в реальных задачах',
    'Обсуждение',
    '',
    '{}'::jsonb,
    '2026-08-25 11:05:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Collections & Collection Items
INSERT INTO public.collections (
  id,
  user_id,
  name,
  description,
  created_at,
  updated_at
) VALUES
  (
    'e0000001-0000-0000-0000-000000000001',
    '11111111-1111-4111-a111-111111111111',
    'AI Stack',
    'Веб-сервисы и ассистенты для ежедневной разработки',
    '2026-08-25 10:00:00+00',
    '2026-08-25 10:00:00+00'
  ),
  (
    'e0000001-0000-0000-0000-000000000002',
    '22222222-2222-4222-a222-222222222222',
    'Research & Benchmarks',
    'Датасеты, открытые веса и независимые замеры',
    '2026-08-25 11:00:00+00',
    '2026-08-25 11:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collection_items (
  id,
  collection_id,
  url,
  title,
  domain,
  description,
  favicon,
  position,
  created_at
) VALUES
  (
    'e0000002-0000-0000-0000-000000000001',
    'e0000001-0000-0000-0000-000000000001',
    'https://openrouter.ai',
    'OpenRouter',
    'openrouter.ai',
    'Единый API и чат для доступа ко всем LLM',
    'https://www.google.com/s2/favicons?domain=openrouter.ai&sz=64',
    0,
    '2026-08-25 10:01:00+00'
  ),
  (
    'e0000002-0000-0000-0000-000000000002',
    'e0000001-0000-0000-0000-000000000001',
    'https://claude.ai',
    'Claude AI',
    'claude.ai',
    'Ассистент от Anthropic с артефактами',
    'https://www.google.com/s2/favicons?domain=claude.ai&sz=64',
    1,
    '2026-08-25 10:02:00+00'
  ),
  (
    'e0000002-0000-0000-0000-000000000003',
    'e0000001-0000-0000-0000-000000000001',
    'https://cursor.com',
    'Cursor',
    'cursor.com',
    'AI-first редактор кода',
    'https://www.google.com/s2/favicons?domain=cursor.com&sz=64',
    2,
    '2026-08-25 10:03:00+00'
  ),
  (
    'e0000002-0000-0000-0000-000000000004',
    'e0000001-0000-0000-0000-000000000002',
    'https://huggingface.co',
    'Hugging Face',
    'huggingface.co',
    'Хаб моделей, датасетов и спейсов',
    'https://www.google.com/s2/favicons?domain=huggingface.co&sz=64',
    0,
    '2026-08-25 11:01:00+00'
  ),
  (
    'e0000002-0000-0000-0000-000000000005',
    'e0000001-0000-0000-0000-000000000002',
    'https://artificialanalysis.ai',
    'Artificial Analysis',
    'artificialanalysis.ai',
    'Независимые бенчмарки скорости и качества',
    'https://www.google.com/s2/favicons?domain=artificialanalysis.ai&sz=64',
    1,
    '2026-08-25 11:02:00+00'
  )
ON CONFLICT (id) DO NOTHING;

