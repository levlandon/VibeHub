# VibeHub

Открытый community-driven хаб для AI-моделей, инструментов, бенчмарков и vibe coding.

Проект родился внутри комьюнити как эксперимент: сделать одно место, где можно находить полезные AI-инструменты, следить за моделями, сохранять находки и общаться — вместо того чтобы держать всё по Telegram-чатам, закладкам и разным сервисам.

> VibeHub готовится к закрытой beta. Критические community-сценарии работают через Supabase и защищены RLS.

### Политика закрытой beta

Чат временно скрыт из основной beta-навигации. Его код остаётся в репозитории как
preview-scaffold для последующей реализации, но в рамках текущей beta не обещаются
история сообщений, realtime-доставка, вложения или действия Reply/Save. Fake persistence
не используется.

### Локализация

Базовый интерфейс доступен на русском и английском языках. Переводы и единый
контракт `t(key, values)` находятся в `src/i18n/`; тяжёлая i18n-зависимость для
этого не нужна. Выбранный язык хранится локально в браузере под ключом
`vibehub.language`, поэтому одинаково доступен анонимному и авторизованному
пользователю, переживает reload и logout и сразу применяется без перезагрузки.
Переключатель-глобус есть в auth modal, а Settings использует тот же контекст —
это не два независимых состояния. Auth/Supabase ошибки проходят через
`src/services/auth/authErrors.ts` и показываются как локализованные сообщения;
сырой backend `error.message` в UI не выводится.

## Что планируется

- **Модели** — каталог AI-моделей с основной информацией, оценками и сравнением.
- **Инструменты** — skills, MCP, CLI, плагины, IDE и другие полезные штуки.
- **Бенчмарки** — результаты и сравнения моделей в одном месте.
- **Чат (после beta)** — общение внутри комьюнити с возможностью упоминать модели и инструменты через `@`.
- **Закладки** — сохранение интересных моделей, инструментов и материалов.
- **Коллекции** — свои подборки AI-сервисов и полезных ссылок.
- **Quick Access** — быстрый доступ к сервисам, которыми пользуешься постоянно.

## Идея проекта

VibeHub развивается самим vibe coding комьюнити.

Нашёл проблему?  
Есть идея для функции?  
Хочешь переделать неудобную часть интерфейса?

Форкай репозиторий, экспериментируй и отправляй Pull Request.

Не обязательно брать огромную задачу — небольшие улучшения интерфейса, новые функции и исправления тоже приветствуются.

## Как запустить

```bash
npm install
npm run dev       # разработка
npm run build     # typecheck + сборка
npm run lint      # eslint
npm run test      # vitest
npm run test:integration # integration tests against local Supabase
```

Для локального backend нужен Docker и [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
supabase start
supabase db reset   # применяет migrations с нуля и загружает только dev/test seed
supabase test db    # pgTAP/RLS checks
```

## Архитектура

- **Стек:** Vite 7 + React 19 + TypeScript, CSS-модули. Роутер — TanStack Router.
- **Маршруты** (`src/router.tsx`): `/models`, `/models/:id`, `/tools`, `/tools/:id`, `/benchmarks`, `/bookmarks`, `/collections`. Карточки моделей и инструментов имеют публичные URL — их можно шарить.
- **Состояние** (`src/state/HubContext.tsx`): единый контекст. Навигация (`route`, `entityView`) выведена из URL через хелперы в `src/state/routing.ts`, переключение — через роутер.
- **Данные моделей** (`src/services/models/`): живьё из OpenRouter API с кэшем (10 минут, sessionStorage). Абстракция `ModelProvider` позволяет добавить другие источники.
- **Персистентность** (`src/services/collections/`, `src/services/saved.ts`): Supabase-backed закладки и коллекции с owner-only RLS; Quick Access остаётся локальной настройкой браузера.
- **Сообщество** (`src/services/posts/`, `src/features/share/`): Supabase CRUD постов и комментариев, one-level threads, soft-delete и persistent accepted answers.
- **Бэкенд** (`supabase/migrations/`, `supabase/tests/`): Supabase Auth, profiles, posts/comments, bookmarks/collections, forward migrations, RLS и pgTAP. Без Supabase env приложение использует безопасный demo fallback.
- **Внешние данные:** модели загружаются из OpenRouter, бенчмарки — из BenchLMirror; запросы ограничены timeout и используют существующий session cache/fallback.

### Важно про окружение

Переменные с префиксом `VITE_` попадают в клиентский бандл. **Никогда** не указывайте API-ключи и другие секреты в `.env` или `.env.example` для `VITE_*`. См. `.env.example`.

Для Supabase нужны `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. Для локального GitHub OAuth конфигурация читает `GITHUB_CLIENT_SECRET`; email seed users не требуют реального GitHub. Anon key — публичный, он попадает в клиентский бандл, это ожидаемо. **Никогда** не используйте `service_role` key в клиенте: он обходит RLS и даёт полный доступ к базе.

## Как внести вклад

1. Сделай Fork репозитория.
2. Создай отдельную ветку под изменение.
3. Внеси изменения.
4. Проверь, что проект запускается и ничего очевидно не сломано: `npm run lint`, `npm run build`, `npm run test`.
5. Отправь Pull Request с коротким описанием того, что изменил и зачем.

Изменения в `main` принимаются через Pull Request. Публикации (`vite preview`) проверяются в CI.

## Статус

🚧 **Prototype / Work in Progress**

Сейчас главная задача — проверить саму концепцию и понять, какие функции действительно нужны комьюнити.

Поэтому идеи, критика интерфейса, Issues и Pull Requests особенно полезны.

## Почему VibeHub?

Потому что VibeHub можно буквально vibe-кодить самим.

Комьюнити пользуется хабом → находит, чего не хватает → делает → отправляет PR → хаб развивается дальше.
