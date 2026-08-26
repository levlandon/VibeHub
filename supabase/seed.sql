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
    '$2a$10$abcdefghijklmnopqrstuu',
    now(),
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
    '$2a$10$abcdefghijklmnopqrstuu',
    now(),
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
    '$2a$10$abcdefghijklmnopqrstuu',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Дмитрий Козлов","handle":"dmitry_k","initials":"ДК"}'::jsonb,
    '2026-08-01 10:10:00+00',
    '2026-08-01 10:10:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Ensure public.profiles have exact intended fields
UPDATE public.profiles SET name = 'Алексей Смирнов', handle = 'alex_dev', initials = 'АС' WHERE id = '11111111-1111-4111-a111-111111111111';
UPDATE public.profiles SET name = 'Мария Иванова', handle = 'maria_ai', initials = 'МИ' WHERE id = '22222222-2222-4222-a222-222222222222';
UPDATE public.profiles SET name = 'Дмитрий Козлов', handle = 'dmitry_k', initials = 'ДК' WHERE id = '33333333-3333-4333-a333-333333333333';

-- 2. Insert 16 posts with different and identical timestamps
INSERT INTO public.posts (
  id,
  author_id,
  type,
  title,
  content,
  created_at,
  tags,
  related_entities,
  reactions,
  extras,
  solved,
  accepted_answer_id
) VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    '11111111-1111-4111-a111-111111111111',
    'discussion',
    'Пост 16: Новые возможности Claude 3.7 Sonnet',
    'Обсуждаем гибридный режим размышлений в Claude 3.7 Sonnet и применение в сложных задачах разработки.',
    '2026-08-25 18:00:00+00',
    ARRAY['models', 'anthropic', 'reasoning'],
    '[{"kind":"model","id":"anthropic/claude-3.7-sonnet","name":"Claude 3.7 Sonnet"}]'::jsonb,
    '[{"emoji":"🔥","count":12},{"emoji":"👍","count":8}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    '22222222-2222-4222-a222-222222222222',
    'guide',
    'Пост 15: Настройка MCP-серверов в VibeHub',
    'Полное руководство по интеграции Model Context Protocol серверов для локальной разработки.',
    '2026-08-25 16:30:00+00',
    ARRAY['mcp', 'tools', 'guide'],
    '[]'::jsonb,
    '[{"emoji":"🚀","count":15}]'::jsonb,
    '{"github":"https://github.com/modelcontextprotocol"}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    '33333333-3333-4333-a333-333333333333',
    'question',
    'Пост 14: Как оптимизировать TTFT для открытых моделей?',
    'Сталкиваюсь с задержкой 1.5s на первой токене в локальном инференсе. Какие параметры vLLM рекомендуете?',
    '2026-08-25 15:00:00+00',
    ARRAY['benchmarks', 'performance', 'vllm'],
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  -- Two posts with the EXACT SAME created_at timestamp to test deterministic id tiebreaker:
  (
    'a0000001-0000-0000-0000-000000000004',
    '11111111-1111-4111-a111-111111111111',
    'project',
    'Пост 13: VibeHub Benchmark Visualizer',
    'Открытый инструмент для интерактивного сравнения BenchLM результатов среди 20+ моделей.',
    '2026-08-25 14:00:00+00',
    ARRAY['benchmarks', 'project', 'tools'],
    '[]'::jsonb,
    '[{"emoji":"⭐","count":24}]'::jsonb,
    '{"demo":"https://vibehub.dev/benchmarks"}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000005',
    '22222222-2222-4222-a222-222222222222',
    'resource',
    'Пост 12: Коллекция системных промптов для кодинга',
    'Собрали лучшие системные инструкции для Claude, DeepSeek-R1 и GPT-4o.',
    '2026-08-25 14:00:00+00',
    ARRAY['prompts', 'agents', 'resource'],
    '[]'::jsonb,
    '[{"emoji":"💡","count":7}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000006',
    '33333333-3333-4333-a333-333333333333',
    'discussion',
    'Пост 11: DeepSeek R1 против o3-mini',
    'Сравнение математических возможностей и качества рассуждений на сложных бенчмарках.',
    '2026-08-25 12:00:00+00',
    ARRAY['models', 'deepseek', 'openai'],
    '[{"kind":"model","id":"deepseek/deepseek-r1","name":"DeepSeek R1"}]'::jsonb,
    '[{"emoji":"🧠","count":19}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000007',
    '11111111-1111-4111-a111-111111111111',
    'guide',
    'Пост 10: Локальный запуск Qwen 2.5 Coder',
    'Инструкция по развёртыванию 32B квантованной модели на потребительских GPU с Ollama и llama.cpp.',
    '2026-08-25 10:00:00+00',
    ARRAY['models', 'qwen', 'guide'],
    '[]'::jsonb,
    '[{"emoji":"💻","count":11}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000008',
    '22222222-2222-4222-a222-222222222222',
    'question',
    'Пост 9: Как настроить CORS для кастомного REST эндпоинта?',
    'При вызове локального бэкенда из браузера получаю CORS header missing. В чём может быть проблема?',
    '2026-08-25 08:30:00+00',
    ARRAY['tools', 'web', 'question'],
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000009',
    '33333333-3333-4333-a333-333333333333',
    'discussion',
    'Пост 8: Архитектура агентных пайплайнов',
    'Разбор паттернов Router, Orchestrator-Workers и Evaluator-Optimizer в современных мультиагентных системах.',
    '2026-08-24 20:00:00+00',
    ARRAY['agents', 'architecture'],
    '[]'::jsonb,
    '[{"emoji":"🔥","count":14}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000010',
    '11111111-1111-4111-a111-111111111111',
    'project',
    'Пост 7: VibeHub Cursor Pagination Module',
    'Высокопроизводительная реализация курсорной пагинации на PostgreSQL и TypeScript.',
    '2026-08-24 16:00:00+00',
    ARRAY['project', 'supabase', 'database'],
    '[]'::jsonb,
    '[{"emoji":"🎉","count":9}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000011',
    '22222222-2222-4222-a222-222222222222',
    'guide',
    'Пост 6: Безопасность RLS в Supabase',
    'Лучшие практики проектирования политик безопасности строк (Row Level Security) без уязвимостей.',
    '2026-08-24 12:00:00+00',
    ARRAY['security', 'supabase', 'guide'],
    '[]'::jsonb,
    '[{"emoji":"🛡️","count":18}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000012',
    '33333333-3333-4333-a333-333333333333',
    'resource',
    'Пост 5: Датасет для бенчмаркинга кода',
    'Публичный датасет из 500 реальных задач рефакторинга для валидации LLM.',
    '2026-08-24 09:00:00+00',
    ARRAY['benchmarks', 'datasets', 'resource'],
    '[]'::jsonb,
    '[{"emoji":"📊","count":6}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000013',
    '11111111-1111-4111-a111-111111111111',
    'question',
    'Пост 4: Как настроить pgTAP для тестирования политик?',
    'Поделитесь примерами проверки ролей anon и authenticated в pgTAP тестах.',
    '2026-08-23 18:00:00+00',
    ARRAY['supabase', 'testing', 'question'],
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000014',
    '22222222-2222-4222-a222-222222222222',
    'discussion',
    'Пост 3: Будущее автономных AI-агентов в IDE',
    'Как изменится рабочий процесс разработчика при переходе от автодополнения к автономным агентам.',
    '2026-08-23 14:00:00+00',
    ARRAY['agents', 'future', 'ide'],
    '[]'::jsonb,
    '[{"emoji":"🤖","count":22}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000015',
    '33333333-3333-4333-a333-333333333333',
    'project',
    'Пост 2: VibeHub Design System Dark Theme',
    'Новые цветовые токены и компоненты интерфейса для тёмной темы VibeHub.',
    '2026-08-23 10:00:00+00',
    ARRAY['design', 'ui', 'project'],
    '[]'::jsonb,
    '[{"emoji":"🎨","count":8}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  ),
  (
    'a0000001-0000-0000-0000-000000000016',
    '11111111-1111-4111-a111-111111111111',
    'discussion',
    'Пост 1: Добро пожаловать в сообщество VibeHub!',
    'Первая вводная публикация в ленте VibeHub. Делитесь проектами, задавайте вопросы и обсуждайте инструменты.',
    '2026-08-22 08:00:00+00',
    ARRAY['welcome', 'community'],
    '[]'::jsonb,
    '[{"emoji":"👋","count":35},{"emoji":"❤️","count":20}]'::jsonb,
    '{}'::jsonb,
    false,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Comments on select posts
INSERT INTO public.comments (
  id,
  post_id,
  author_id,
  content,
  created_at
) VALUES
  (
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    '22222222-2222-4222-a222-222222222222',
    'Отличный обзор! Особенно впечатляет скорость размышления в hybrid mode.',
    '2026-08-25 18:30:00+00'
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000001',
    '33333333-3333-4333-a333-333333333333',
    'Протестировал на рефакторинге большого TypeScript-проекта — результаты впечатляющие.',
    '2026-08-25 19:00:00+00'
  ),
  (
    'c0000001-0000-0000-0000-000000000003',
    'a0000001-0000-0000-0000-000000000003',
    '11111111-1111-4111-a111-111111111111',
    'Попробуйте включить --chunked-prefill и увеличить gpu-memory-utilization до 0.95.',
    '2026-08-25 15:20:00+00'
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    'a0000001-0000-0000-0000-000000000013',
    '22222222-2222-4222-a222-222222222222',
    'В pgTAP используйте SET ROLE anon перед вызовом lives_ok/throws_ok, а затем ROLLBACK.',
    '2026-08-23 18:40:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Update accepted answer for solved question
UPDATE public.posts
SET solved = true, accepted_answer_id = 'c0000001-0000-0000-0000-000000000004'
WHERE id = 'a0000001-0000-0000-0000-000000000013';
