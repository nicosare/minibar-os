# minibar-os — полный контекст

> **2026-07-20 21:28** · ветка `main` · всего файлов: **39**
> Нетекстовые файлы (картинки, шрифты, медиа) указаны только в структуре.

## Структура проекта (все файлы)

```text
context.md
minibar-os/.gitignore
minibar-os/README.md
minibar-os/about.txt
minibar-os/backend/Dockerfile
minibar-os/backend/package.json
minibar-os/backend/prisma/schema.prisma
minibar-os/backend/prisma/seed-data.sql
minibar-os/backend/src/app.js
minibar-os/backend/src/index.js
minibar-os/backend/src/lib/prisma.js
minibar-os/backend/src/lib/timezone.js
minibar-os/backend/src/routes/checks.js
minibar-os/backend/src/routes/deadlines.js
minibar-os/backend/src/routes/excises.js
minibar-os/backend/src/routes/lists.js
minibar-os/backend/src/routes/products.js
minibar-os/backend/src/routes/rooms.js
minibar-os/backend/src/routes/templates.js
minibar-os/backend/src/services/deadlines.js
minibar-os/backend/src/services/monthChecks.js
minibar-os/context.md
minibar-os/docker-compose.yml
minibar-os/frontend/Dockerfile
minibar-os/frontend/config.js
minibar-os/frontend/index.html
minibar-os/frontend/js/app-core.js
minibar-os/frontend/js/calculator-module.js
minibar-os/frontend/js/deadlines-module.js
minibar-os/frontend/js/excise-module.js
minibar-os/frontend/js/init.js
minibar-os/frontend/js/inventory-module.js
minibar-os/frontend/js/mobile-nav.js
minibar-os/frontend/js/route-handlers.js
minibar-os/frontend/js/settings-module.js
minibar-os/frontend/js/utils.js
minibar-os/frontend/nginx.conf
minibar-os/frontend/styles.css
minibar-os/make-context.sh
```

---

## `context.md`

```markdown

```

---

## `minibar-os/.gitignore`

```
context.md

```

---

## `minibar-os/README.md`

```markdown
# MiniBar OS

## Требования
- Docker 20+ и Docker Compose V2
- 2 ГБ RAM
- 10 ГБ свободного места

## Установка

```bash
# 1. Установить Docker (если не установлен)
curl -fsSL https://get.docker.com | sudo sh

# 2. Распаковать архив
tar -xzf minibar-os.tar.gz
cd minibar-os

# 3. Настроить переменные
cp .env.example .env
nano .env  # изменить POSTGRES_PASSWORD

# 4. Запустить
docker compose up -d --build

# 5. Синхронизировать схему с БД
docker exec -it minibar-api sh -c "npx prisma db push --accept-data-loss"

# 6. Залить тестовые данные
cmd /c "docker exec -i minibar-db psql -U minibar -d minibar_db < backend\\prisma\\seed-data.sql"
```

---

## `minibar-os/about.txt`

```
================================================================================
MINIBAR OS — ПОЛНЫЙ КОНТЕКСТ ДЛЯ РАЗРАБОТКИ (AI / РАЗРАБОТЧИК)
================================================================================
Версия: 1.3.0 | Обновлено: 2026-06-15
Цель: дать нейросети или разработчику все знания для работы с проектом.

================================================================================
0. КАК ЧИТАТЬ ЭТОТ ДОКУМЕНТ (для AI)
================================================================================

Перед изменением:
  1. Определи раздел UI (route) — секция 8.
  2. API — секция 7; если эндпоинта нет, проверь модель в schema.prisma.
  3. Схема БД — backend/prisma/schema.prisma + prisma db push.
  4. После изменения schema: docker exec minibar-api npx prisma db push

Ключевые файлы:
  Backend:  backend/src/app.js, backend/src/routes/*.js, backend/src/services/
  Frontend: frontend/index.html, frontend/styles.css, frontend/config.js,
            frontend/js/*.js

================================================================================
1. НАЗНАЧЕНИЕ
================================================================================

MiniBar OS — управление минибарами в гостинице (тестовый отель: Grand Palace
Hotel). Сроки годности, акцизные марки, шаблоны наполнения standard/lux,
калькулятор списания продуктов.

Язык UI: русский. Аутентификация: нет. Пользователь «Анна» захардкожен в UI.

================================================================================
2. ТЕХНОЛОГИИ
================================================================================

Backend:  Node.js 20, Express 4, Prisma 5, PostgreSQL 15
Frontend: Vanilla JS (модули App.*), Tailwind CDN, Lucide Icons, Inter font
Infra:    Docker Compose (db, backend, frontend/nginx)

================================================================================
3. СТРУКТУРА РЕПОЗИТОРИЯ (полный список файлов)
================================================================================

minibar-os/
├── docker-compose.yml
├── README.md
├── about.txt
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── app.js
│   │   ├── lib/prisma.js
│   │   ├── services/
│   │   │   ├── deadlines.js
│   │   │   └── monthChecks.js      # логика периодов MM.YY
│   │   └── routes/
│   │       ├── deadlines.js
│   │       ├── rooms.js
│   │       ├── products.js
│   │       ├── templates.js
│   │       ├── checks.js
│   │       ├── excises.js
│   │       └── lists.js
│   └── prisma/
│       ├── schema.prisma        # единственный источник схемы БД
│       └── seed-data.sql        # тестовые данные
└── frontend/
    ├── Dockerfile
    ├── index.html               # HTML (~830 строк)
    ├── styles.css               # CSS (~730 строк)
    ├── config.js                # window.api
    ├── nginx.conf               # nginx в контейнере minibar-web
    └── js/
        ├── utils.js
        ├── app-core.js
        ├── excise-module.js
        ├── deadlines-module.js
        ├── settings-module.js
        ├── calculator-module.js
        ├── route-handlers.js
        └── init.js

Всего ~32 файла. Лишние legacy-файлы удалены (init.sql, дубликат nginx.conf,
scripts/rebuild-index.js).

================================================================================
4. ЗАПУСК
================================================================================

Порты: 8080 UI | 3000 API | 5432 PostgreSQL

  docker compose up -d --build
  docker exec -it minibar-api sh -c "npx prisma db push --accept-data-loss"
  docker exec -i minibar-db psql -U minibar -d minibar_db < backend/prisma/seed-data.sql

Credentials (docker-compose.yml):
  minibar / minibar_pass / minibar_db

Пересборка frontend:
  docker compose build frontend && docker compose up -d frontend

Перезапуск backend (после новых routes):
  docker compose restart backend

Health: GET http://localhost:3000/api/health

Локальный dev:
  localhost → API http://localhost:3000/api
  Docker :8080 → /api (nginx proxy через frontend/nginx.conf)

================================================================================
5. BACKEND — АРХИТЕКТУРА
================================================================================

index.js → createApp() из app.js → app.listen(PORT)

app.js монтирует:
  GET  /api/health
  /api/deadlines  → routes/deadlines.js
  /api/rooms      → routes/rooms.js
  /api/products   → routes/products.js
  /api/templates  → routes/templates.js
  /api/checks     → routes/checks.js
  /api/excises    → routes/excises.js
  /api/lists      → routes/lists.js

services/deadlines.js:
  getBadCount(tx)           — rooms expiryStatus IN (neutral, needs_replacement)
  ensureTodayTarget(tx)     — фиксация lockedAt на сегодня
  recalcTomorrowTarget(tx)  — прогноз на завтра
  updateAllTargets(tx)
  upsertTodayRoomStats(tx)  — DeadlineDailyStat из groupBy rooms
  buildTargetsResponse(tx)  — ответ GET /deadlines/targets

services/monthChecks.js:
  parsePeriod(value)              — "11.26" / "1126" → { month, year, period }
  formatPeriod(month, year2)      — MM.YY
  isAssignmentActive(...)         — активна до начала месяца после указанного
  isCurrentCheckMonth(...)        — период = текущий календарный месяц
  isCurrentOrNextCheckMonth(...)  — текущий или следующий месяц
  purgeExpiredMonthChecks(prisma) — автоудаление просроченных записей

Важно: POST /api/rooms/reset-all-deadlines объявлен ДО GET /:id в rooms.js

================================================================================
6. МОДЕЛЬ ДАННЫХ (schema.prisma)
================================================================================

ENUM RoomCategory: standard | lux
ENUM ExpiryStatus: neutral | valid | needs_replacement | empty
ENUM CheckType: checked | emptied | gih
ENUM GihRoomSt: dnd | all_in_place | all_out | empty
ENUM GihItemSt: replenished | in_place | out | not_replenished

Product — name, price, volume, unit, emoji, bgColor, category, hasExpiry
FillTemplate + TemplateItem — шаблоны наполнения (sortOrder)
Room — number, floor, category, expiryStatus, templateId
RoomProductStatus — qtyToReplace per product (модуль «Сроки»)
ProductMonthCheck — productId, checkMonth (1–12), checkYear (2 цифры, 26=2026)
  @@unique([productId, checkMonth, checkYear]) — несколько дат на продукт
RoomCustom, ReplacementItem — модели есть, API нет
Check + GihItem — API есть, UI нет
Excise — markNumber, createdAt
ActiveList + ListRoom — GET /lists, UI нет
Setting — seed only, API нет
DeadlineDailyStat, DeadlineTarget — логика «Сроки»

Миграции: только prisma db push / migrate. SQL-дамп схемы отдельно не хранится.

================================================================================
7. REST API
================================================================================

Auth: нет. JSON. Ошибки: { error: "..." }. Prisma → camelCase в ответах.

Deadlines:
  GET  /api/deadlines/targets
  GET  /api/deadlines/stats
  POST /api/deadlines/update-stats
  GET  /api/deadlines/month-products
       — активные записи для блока UI (текущий + следующий месяц)
  GET  /api/deadlines/month-products/manage
       — все hasExpiry продукты + monthChecks[]
  PUT  /api/deadlines/month-products/:productId
       body: { period: "11.26", checkId? } — добавить или обновить дату
  DELETE /api/deadlines/month-products/check/:checkId — удалить одну дату
  DELETE /api/deadlines/month-products/:productId — удалить все даты продукта
  GET  /api/deadlines/replacement-summary
       — { items: [{ productId, product, totalQty }], totalQty }

Rooms:
  GET    /api/rooms?floor&category&status
  GET    /api/rooms/:id
  PATCH  /api/rooms/:id
  GET    /api/rooms/:id/product-statuses
  PUT    /api/rooms/:id/product-statuses   body: { items, roomStatus }
  DELETE /api/rooms/:id/product-statuses   body: { roomStatus? }
  POST   /api/rooms/reset-all-deadlines

Products: GET, GET/:id, POST, PUT/:id, DELETE/:id
Templates: GET, PUT/:id/items
Checks: GET?limit, POST
Excises: GET, POST { mark_number }, DELETE, DELETE/:id
Lists: GET

================================================================================
8. FRONTEND — ЗАГРУЗКА СКРИПТОВ (порядок в index.html)
================================================================================

  config.js
  js/utils.js
  js/app-core.js          → window.App
  js/excise-module.js
  js/deadlines-module.js
  js/settings-module.js
  js/calculator-module.js
  js/route-handlers.js
  js/init.js              → DOMContentLoaded

CSS: styles.css (в <head>)

================================================================================
9. window.api (config.js)
================================================================================

API_BASE: localhost → http://localhost:3000/api, иначе /api
Все методы через apiRequest(path, options).

Методы:
  getDeadlineTargets(), getDeadlineStats()
  getMonthProducts(), getMonthProductsManage()
  setMonthProduct(productId, period, checkId?)
  deleteMonthCheck(checkId), deleteMonthProduct(productId)
  getReplacementSummary()
  getRoomProductStatuses, saveRoomProductStatuses, clearRoomProductStatuses
  resetAllDeadlines()
  getRooms(filters), updateRoomStatus
  getProducts, createProduct, updateProduct, deleteProduct
  getTemplates, updateTemplateItems
  getChecks(limit)
  getExcises, createExcise, deleteExcise, deleteAllExcises
  getLists()

Экспорт: window.api, window.API_BASE

================================================================================
10. App CORE (js/app-core.js)
================================================================================

App.state.currentRoute
App.events — on/emit, событие 'route:change'
App.router — go(route), urlToRoute, routeToUrl, currentFromUrl()
App.badges — register(name, fn), update(name), updateAll()

Роуты: dashboard, excise, deadlines, arrivals, departures, gih, history,
        empty, calculator, inventory, settings

================================================================================
11. js/init.js + js/route-handlers.js
================================================================================

init.js:
  nav click → router.go
  popstate → router.go
  initial route from URL
  bootstrap: waitForApi → badges.updateAll → init модулей для текущего route

route-handlers.js:
  route:change → badges.update(route)
  deadlines/excise/settings/calculator → module.init() с retry если api не готов

================================================================================
12. РАЗДЕЛЫ UI — СТАТУС
================================================================================

Route          | Module                | API | Статус
---------------|-----------------------|-----|------------------
dashboard      | —                     | нет | MOCK
excise         | App.exciseModule      | да  | ПОЛНЫЙ
deadlines      | App.deadlinesModule   | да  | ПОЛНЫЙ (+продукты месяца, замены)
settings       | App.settingsModule    | да  | ПОЛНЫЙ
calculator     | App.calculatorModule  | да  | ПОЛНЫЙ
arrivals       | —                     | нет | MOCK UI
departures     | —                     | нет | MOCK UI
gih            | —                     | нет | MOCK UI
history        | —                     | нет | ЗАГЛУШКА
empty          | —                     | нет | ЗАГЛУШКА
inventory      | —                     | нет | ЗАГЛУШКА

================================================================================
13. App.exciseModule (js/excise-module.js)
================================================================================

Состояние: excises[], isInitialized, isLoaded

Валидация — isValidMark(mark):
  • строка, trim, длина >= 20, начинается с цифры (/^\d/)
  Используется для карточек, счётчиков valid/invalid, «Копировать все»

RU→EN раскладка: convertLayout() при сканировании

Кнопки:
  excise-copy-all-btn → copyValid() (только валидные + confirm очистки)
  excise-clear-all-btn → clearList()

Бейдж excise: excises.length (локальный массив)

DOM: excise-input, excise-list, excise-stat-total/valid/invalid, excise-badge

================================================================================
14. App.deadlinesModule (js/deadlines-module.js)
================================================================================

Состояние: rooms[], currentRoom, productSelections{}, modalProductos[],
           monthManageProducts[]

Основное:
  loadRooms → renderStats + renderFloors
  renderChart → api.getDeadlineStats()
  renderTargets → api.getDeadlineTargets()
  openRoomModal — продукты hasExpiry из шаблона, qtyToReplace из БД
  Бейдж: today.target - today.processed

Блок «Продукты месяца» (1/4 ширины):
  #deadlines-month-products-container
  GET /deadlines/month-products — периоды текущего И следующего месяца
  Кнопка #deadlines-month-products-btn → модал настройки

Модал продуктов месяца (#deadline-month-modal-backdrop):
  Список hasExpiry продуктов, у каждого:
    — сохранённые даты текстом слева (клик = удалить, hover красный)
    — одно поле ММ.ГГ (ввод 1126 → 11.26) + кнопка сохранить справа
    — несколько дат на продукт (повторный ввод в то же поле)
  purgeExpiredMonthChecks на каждом GET

Блок «Требуют замены» (3/4 ширины):
  #deadlines-replacement-container, #deadlines-replacement-total
  GET /deadlines/replacement-summary — агрегация qtyToReplace по продуктам
  Обновляется после save/clear/reset номеров

Макет view-deadlines:
  статистика (4 карточки) → динамика+цели (3/4+1/4) →
  продукты месяца+замены (1/4+3/4) → сетка номеров

================================================================================
15. App.calculatorModule (js/calculator-module.js)
================================================================================

Состояние: products[], cart{} (productId → qty), isInitialized, isLoaded
API: getProducts() — корзина только в памяти (не сохраняется в БД)

Макет view-calculator: grid 3/4 + 1/4
  Слева — продукты в 4 колонках по категориям:
    Дверца | Напитки | Алкоголь | Соки
  Карточка продукта (компактная, одна строка):
    [emoji] [название / цена количество] [−] [+]
    — объём не показывается
    — количество справа от цены
    — has-qty подсветка при qty > 0
  Справа — счёт (#calculator-bill-*), sticky panel
    список позиций, итого, #calculator-clear-btn

DOM: calculator-products-container, calculator-bill-list/empty/total/count

================================================================================
16. App.settingsModule (js/settings-module.js)
================================================================================

Продукты CRUD + шаблоны standard/lux, drag-and-drop, updateTemplateItems

================================================================================
17. БИЗНЕС-ЛОГИКА «СРОКИ»
================================================================================

badCount = neutral + needs_replacement
targetCount = ceil(badCount / daysLeft до конца месяца)
processedToday = startBadCount - badCount (>= 0)

Продукты месяца (ProductMonthCheck):
  Период MM.YY — месяц проверки продукта (год 2 цифры: 26 = 2026)
  Запись активна до начала месяца ПОСЛЕ указанного:
    11.26 активна до 01.12.26, затем purgeExpiredMonthChecks удаляет
  Блок UI показывает записи где isCurrentOrNextCheckMonth:
    текущий месяц (06.26 в июне) ИЛИ следующий (07.26 в июне)
  В модалке — все активные monthChecks[] per product

Требуют замены:
  SUM(qtyToReplace) GROUP BY productId WHERE qtyToReplace > 0

================================================================================
18. ТЕСТОВЫЕ ДАННЫЕ (seed-data.sql)
================================================================================

Продукты (hasExpiry), 2 шаблона, ~280 номеров (этажи 5–19)
После seed: expiry_status=valid, template_id по category

================================================================================
19. DOM ID — КРАТКАЯ КАРТА
================================================================================

Badges: excise-badge, deadlines-badge
Excise: excise-copy-all-btn, excise-clear-all-btn, excise-input, excise-list
Deadlines:
  deadlines-floors-container, deadline-modal-*, stat-*, deadlines-chart
  deadlines-month-products-btn/container
  deadlines-replacement-container/total
  deadline-month-modal-backdrop/list/close
  deadlines-reset-all-btn
Calculator:
  calculator-products-container, calculator-clear-btn
  calculator-bill-list/empty/total/count/container
Settings: settings-products/templates, product-modal-*, template-items-container

================================================================================
20. МОДЕЛИ БЕЗ API (будущие фичи)
================================================================================

RoomCustom, ReplacementItem, Setting (CRUD)
ActiveList POST, Check/GIH UI
Arrivals, Departures — mock UI

================================================================================
21. ИЗВЕСТНЫЙ ТЕХДОЛГ
================================================================================

  • Нет аутентификации
  • Tailwind CDN (не production build)
  • README ссылается на .env.example — файла нет (пароли в docker-compose.yml)
  • App.views.onEnter/onLeave не используются
  • Dashboard mock данные
  • Корзина калькулятора не персистится

================================================================================
22. ЧЕКЛИСТ: НОВАЯ ФИЧА
================================================================================

Backend: schema.prisma → db push → routes/*.js → services/*.js → config.js
Frontend: index.html + styles.css + js модуль → route-handlers + init
Docker: frontend/Dockerfile копирует js/ и styles.css; restart backend при routes

================================================================================
23. ПРИМЕРЫ curl
================================================================================

curl http://localhost:3000/api/health
curl http://localhost:3000/api/deadlines/targets
curl http://localhost:3000/api/deadlines/month-products
curl http://localhost:3000/api/deadlines/replacement-summary
curl -X PUT http://localhost:3000/api/deadlines/month-products/16 \
  -H "Content-Type: application/json" \
  -d '{"period":"07.26"}'
curl http://localhost:3000/api/rooms?floor=5
curl -X POST http://localhost:3000/api/excises \
  -H "Content-Type: application/json" \
  -d '{"mark_number":"12345678901234567890123"}'

================================================================================
КОНЕЦ ДОКУМЕНТА
================================================================================

```

---

## `minibar-os/backend/Dockerfile`

```
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

---

## `minibar-os/backend/package.json`

```json
{
    "name": "minibar-api",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "start": "node src/index.js",
      "dev": "node --watch src/index.js"
    },
    "dependencies": {
      "@prisma/client": "^5.22.0",
      "cors": "^2.8.5",
      "express": "^4.21.0"
    },
    "devDependencies": {
      "prisma": "^5.22.0"
    }
  }
```

---

## `minibar-os/backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RoomCategory {
  standard
  lux
}

enum ExpiryStatus {
  neutral
  valid
  needs_replacement
  empty
}

enum CheckType {
  checked
  emptied
  gih
}

enum GihRoomSt {
  dnd
  all_in_place
  all_out
  empty
}

enum GihItemSt {
  replenished
  in_place
  out
  not_replenished
}

model Product {
  id         Int      @id @default(autoincrement())
  name       String   @db.VarChar(200)
  price      Decimal  @db.Decimal(10,2)
  volume     Decimal? @db.Decimal(10,3)
  unit       String?  @default("шт") @db.VarChar(10)
  emoji      String?  @db.VarChar(10)
  bgColor    String?  @default("slate") @map("bg_color") @db.VarChar(20)
  category   String?  @default("Напитки") @db.VarChar(50)
  hasExpiry  Boolean  @default(true) @map("has_expiry")
  createdAt  DateTime @default(now()) @map("created_at")

  templateItems     TemplateItem[]
  roomCustoms       RoomCustom[]
  replacementItems  ReplacementItem[]
  gihItems          GihItem[]
  productStatuses   RoomProductStatus[]
  monthChecks         ProductMonthCheck[]

  @@map("products")
}

model FillTemplate {
  id         Int            @id @default(autoincrement())
  name       String         @db.VarChar(150)
  category   RoomCategory
  isDefault  Boolean        @default(false) @map("is_default")
  createdAt  DateTime       @default(now()) @map("created_at")

  items  TemplateItem[]
  rooms  Room[]

  @@unique([category, name])
  @@map("fill_templates")
}

model TemplateItem {
  id          Int @id @default(autoincrement())
  templateId  Int @map("template_id")
  productId   Int @map("product_id")
  qty         Int
  sortOrder   Int @default(0) @map("sort_order")

  template FillTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  product  Product      @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([templateId, productId])
  @@map("template_items")
}

model Room {
  id             Int           @id @default(autoincrement())
  number         Int           @unique
  floor          Int
  category       RoomCategory
  expiryStatus   ExpiryStatus  @default(neutral) @map("expiry_status")
  templateId     Int?          @map("template_id")
  notes          String?
  updatedAt      DateTime      @default(now()) @updatedAt @map("updated_at")

  template         FillTemplate?       @relation(fields: [templateId], references: [id])
  customs          RoomCustom[]
  replacementItems ReplacementItem[]
  checks           Check[]
  listRooms        ListRoom[]
  productStatuses  RoomProductStatus[]

  @@map("rooms")
}

model RoomProductStatus {
  id             Int      @id @default(autoincrement())
  roomId         Int      @map("room_id")
  productId      Int      @map("product_id")
  expiryStatus   String   @default("ok") @map("expiry_status") @db.VarChar(20)
  qtyToReplace   Int      @default(0) @map("qty_to_replace")
  checkedAt      DateTime @default(now()) @map("checked_at")

  room    Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([roomId, productId])
  @@map("room_product_statuses")
}

model RoomCustom {
  id        Int     @id @default(autoincrement())
  roomId    Int     @map("room_id")
  productId Int     @map("product_id")
  qty       Int
  isEnabled Boolean @default(true) @map("is_enabled")

  room    Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([roomId, productId])
  @@map("room_customs")
}

model ReplacementItem {
  id        Int     @id @default(autoincrement())
  roomId    Int     @map("room_id")
  productId Int     @map("product_id")
  notes     String?

  room    Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([roomId, productId])
  @@map("replacement_items")
}

model Check {
  id             Int         @id @default(autoincrement())
  roomId         Int         @map("room_id")
  checkDate      DateTime    @default(now()) @map("check_date")
  type           CheckType
  gihRoomStatus  GihRoomSt?  @map("gih_room_status")
  inspectorName  String?     @db.VarChar(150) @map("inspector_name")
  notes          String?
  createdAt      DateTime    @default(now()) @map("created_at")

  room     Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  gihItems GihItem[]

  @@map("checks")
}

model GihItem {
  id         Int       @id @default(autoincrement())
  checkId    Int       @map("check_id")
  productId  Int       @map("product_id")
  itemStatus GihItemSt @default(in_place) @map("item_status")
  notes      String?

  check   Check   @relation(fields: [checkId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([checkId, productId])
  @@map("gih_items")
}

model Excise {
  id          Int      @id @default(autoincrement())
  markNumber  String   @map("mark_number")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("excises")
}

model ActiveList {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(150)
  listType  String   @default("active") @map("list_type")
  createdAt DateTime @default(now()) @map("created_at")

  rooms ListRoom[]

  @@map("active_lists")
}

model ListRoom {
  id       Int      @id @default(autoincrement())
  listId   Int      @map("list_id")
  roomId   Int      @map("room_id")
  addedAt  DateTime @default(now()) @map("added_at")

  list ActiveList @relation(fields: [listId], references: [id], onDelete: Cascade)
  room Room       @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([listId, roomId])
  @@map("list_rooms")
}

model Setting {
  key       String   @id @db.VarChar(100)
  value     String?
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("settings")
}

model DeadlineDailyStat {
  id                     Int      @id @default(autoincrement())
  date                   DateTime @db.Date
  validCount             Int      @default(0) @map("valid_count")
  emptyCount             Int      @default(0) @map("empty_count")
  needsReplacementCount  Int      @default(0) @map("needs_replacement_count")
  neutralCount           Int      @default(0) @map("neutral_count")
  updatedAt              DateTime @default(now()) @updatedAt @map("updated_at")

  @@unique([date])
  @@map("deadline_daily_stats")
}

model DeadlineTarget {
  id            Int       @id @default(autoincrement())
  date          DateTime  @db.Date
  targetCount   Int       @map("target_count")
  startBadCount Int       @default(0) @map("start_bad_count")
  lockedAt      DateTime? @map("locked_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@unique([date])
  @@map("deadline_targets")
}

model ProductMonthCheck {
  id         Int      @id @default(autoincrement())
  productId  Int      @map("product_id")
  checkMonth Int      @map("check_month")
  checkYear  Int      @map("check_year")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, checkMonth, checkYear])
  @@map("product_month_checks")
}
```

---

## `minibar-os/backend/prisma/seed-data.sql`

```sql
TRUNCATE TABLE list_rooms, active_lists, gih_items, checks, replacement_items,
             room_customs, rooms, template_items, fill_templates, products, excises, settings
RESTART IDENTITY CASCADE;

INSERT INTO products (name, price, volume, unit, emoji, bg_color, has_expiry, created_at) VALUES
('Heineken 0.33', 450.00, 0.33, 'шт', '🍺', 'amber', TRUE, NOW()),
('Chianti Classico 0.75', 1800.00, 0.75, 'шт', '🍷', 'red', TRUE, NOW()),
('Evian 0.5', 220.00, 0.5, 'шт', '💧', 'blue', TRUE, NOW()),
('Lindt Excellence 85%', 380.00, 100, 'г', '🍫', 'yellow', TRUE, NOW()),
('Jack Daniel''s 0.05', 1200.00, 0.05, 'шт', '🥃', 'purple', TRUE, NOW()),
('Coca-Cola 0.33', 220.00, 0.33, 'шт', '🥤', 'rose', TRUE, NOW()),
('Pringles Original', 350.00, 40, 'г', '🥔', 'orange', TRUE, NOW());

INSERT INTO fill_templates (name, category, is_default, created_at) VALUES
('Стандарт (базовый)', 'standard', TRUE, NOW()),
('Люкс (базовый)', 'lux', TRUE, NOW());

INSERT INTO template_items (template_id, product_id, qty)
SELECT t.id, p.id, CASE p.name
    WHEN 'Heineken 0.33' THEN 4
    WHEN 'Evian 0.5' THEN 4
    WHEN 'Coca-Cola 0.33' THEN 4
    WHEN 'Lindt Excellence 85%' THEN 2
    ELSE 2
END
FROM fill_templates t CROSS JOIN products p
WHERE t.category = 'standard'
  AND p.name IN ('Heineken 0.33','Evian 0.5','Coca-Cola 0.33','Lindt Excellence 85%','Pringles Original');

INSERT INTO template_items (template_id, product_id, qty)
SELECT t.id, p.id, CASE p.name
    WHEN 'Chianti Classico 0.75' THEN 2
    WHEN 'Jack Daniel''s 0.05' THEN 3
    WHEN 'Heineken 0.33' THEN 6
    WHEN 'Evian 0.5' THEN 6
    ELSE 3
END
FROM fill_templates t CROSS JOIN products p
WHERE t.category = 'lux'
  AND p.name IN ('Chianti Classico 0.75','Jack Daniel''s 0.05','Heineken 0.33','Evian 0.5','Coca-Cola 0.33','Lindt Excellence 85%');

INSERT INTO rooms (number, floor, category, expiry_status, updated_at)
SELECT
    n AS number,
    (n / 100)::SMALLINT AS floor,
    CASE
        WHEN n = 1818 THEN 'lux'::"RoomCategory"
        WHEN (n % 100) = 0 THEN 'lux'::"RoomCategory"
        WHEN (n % 100) = 34 THEN 'lux'::"RoomCategory"
        WHEN n % 2 = 0 THEN 'standard'::"RoomCategory"
        ELSE 'lux'::"RoomCategory"
    END AS category,
    'valid'::"ExpiryStatus",
    NOW()
FROM unnest(ARRAY[
    500,502,504,506,508,509,510,512,514,516,518,520,522,524,526,528,530,532,534,
    600,602,604,606,608,609,610,612,614,616,618,620,622,624,626,628,630,632,634,
    700,702,704,706,708,709,710,712,714,716,717,718,720,722,724,725,726,728,730,732,734,
    800,802,804,806,808,809,810,812,814,816,817,818,820,822,824,825,826,828,830,832,834,
    900,902,904,906,908,909,910,912,914,916,917,918,920,922,924,925,926,928,930,932,934,
    1000,1002,1004,1006,1008,1009,1010,1012,1014,1016,1017,1018,1020,1022,1024,1025,1026,1028,1030,1032,1034,
    1100,1102,1104,1106,1108,1109,1110,1112,1114,1116,1117,1118,1120,1122,1124,1125,1126,1128,1130,1132,1134,
    1200,1202,1204,1206,1208,1209,1210,1212,1214,1216,1217,1218,1220,1222,1224,1225,1226,1228,1230,1232,1234,
    1300,1302,1304,1306,1308,1309,1310,1312,1314,1316,1317,1318,1320,1322,1324,1325,1326,1328,1330,1332,1334,
    1400,1402,1404,1406,1408,1409,1410,1412,1414,1416,1417,1418,1420,1422,1424,1425,1426,1428,1430,1432,1434,
    1500,1502,1504,1506,1508,1509,1510,1512,1514,1516,1517,1518,1520,1522,1524,1525,1526,1528,1530,1532,1534,
    1600,1602,1604,1606,1608,1609,1610,1612,1614,1616,1617,1618,1620,1622,1624,1625,1626,1628,1630,1632,1634,
    1700,1702,1704,1706,1708,1709,1710,1712,1714,1716,1717,1718,1720,1722,1724,1725,1726,1728,1730,1732,1734,
    1800,1802,1804,1806,1807,1808,1810,1811,1812,1814,1816,1818,
    1902,1904,1906,1908,1910,1911,1912,1914,1916,1918,1919,1920
]) AS n;

UPDATE rooms SET template_id = (
    SELECT id FROM fill_templates
    WHERE category = rooms.category AND is_default = TRUE LIMIT 1
);

INSERT INTO settings (key, value, updated_at) VALUES
('hotel_name', 'Grand Palace Hotel', NOW()),
('currency', 'RUB', NOW()),
('ui_language', 'ru', NOW());
```

---

## `minibar-os/backend/src/app.js`

```javascript
import express from 'express';
import cors from 'cors';
import deadlinesRouter from './routes/deadlines.js';
import roomsRouter from './routes/rooms.js';
import productsRouter from './routes/products.js';
import templatesRouter from './routes/templates.js';
import checksRouter from './routes/checks.js';
import excisesRouter from './routes/excises.js';
import listsRouter from './routes/lists.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

  app.use('/api/deadlines', deadlinesRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/checks', checksRouter);
  app.use('/api/excises', excisesRouter);
  app.use('/api/lists', listsRouter);

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

```

---

## `minibar-os/backend/src/index.js`

```javascript
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));

```

---

## `minibar-os/backend/src/lib/prisma.js`

```javascript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

```

---

## `minibar-os/backend/src/lib/timezone.js`

```javascript
/** Смещение клиента: минуты UTC−local (как Date.getTimezoneOffset()) */
export function clientOffset(req) {
  const raw = req?.headers?.['x-timezone-offset'];
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function fallbackTimeZone() {
  return process.env.APP_TIMEZONE || process.env.TZ || 'Europe/Moscow';
}

/** Календарная дата в локальной зоне клиента или APP_TIMEZONE */
export function getLocalParts(date = new Date(), offsetMinutes = null) {
  if (offsetMinutes != null) {
    const localMs = date.getTime() - offsetMinutes * 60 * 1000;
    const ld = new Date(localMs);
    return {
      year: ld.getUTCFullYear(),
      month: ld.getUTCMonth() + 1,
      day: ld.getUTCDate()
    };
  }

  const tz = fallbackTimeZone();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [year, month, day] = formatter.format(date).split('-').map(Number);
  return { year, month, day };
}

/** Date-only для Prisma @db.Date (полночь UTC календарного дня) */
export function dateFromParts({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfLocalDay(date = new Date(), offsetMinutes = null) {
  const { year, month, day } = getLocalParts(date, offsetMinutes);
  return dateFromParts({ year, month, day });
}

export function endOfLocalMonth(date = new Date(), offsetMinutes = null) {
  const { year, month } = getLocalParts(date, offsetMinutes);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return dateFromParts({ year, month, day: lastDay });
}

export function addLocalDays(date, days, offsetMinutes = null) {
  const { year, month, day } = getLocalParts(date, offsetMinutes);
  return new Date(Date.UTC(year, month - 1, day + days));
}

export function daysLeftInclusive(fromDate, endDate) {
  return Math.max(1, Math.ceil((endDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
}

```

---

## `minibar-os/backend/src/routes/checks.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const checks = await prisma.check.findMany({
      include: { room: true, gihItems: { include: { product: true } } },
      orderBy: { checkDate: 'desc' },
      take: limit
    });
    res.json(checks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const check = await prisma.check.create({ data: req.body });
    res.json(check);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

---

## `minibar-os/backend/src/routes/deadlines.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  buildTargetsResponse,
  upsertTodayRoomStats,
  updateAllTargets
} from '../services/deadlines.js';
import {
  parsePeriod,
  formatPeriod,
  isAssignmentActive,
  isCurrentOrNextCheckMonth,
  purgeExpiredMonthChecks
} from '../services/monthChecks.js';
import { clientOffset, getLocalParts, dateFromParts, endOfLocalMonth } from '../lib/timezone.js';

const router = Router();

router.get('/month-products', async (req, res) => {
  try {
    const offset = clientOffset(req);  // ← ДОБАВЛЕНО
    await purgeExpiredMonthChecks(prisma, offset);
    const now = new Date();
    const items = await prisma.productMonthCheck.findMany({
      include: { product: true },
      orderBy: { product: { name: 'asc' } }
    });

    const active = items.filter(i =>
      isAssignmentActive(i.checkMonth, i.checkYear, now, offset) &&
      isCurrentOrNextCheckMonth(i.checkMonth, i.checkYear, now, offset)
    );

    res.json(active.map(i => ({
      id: i.id,
      productId: i.productId,
      checkMonth: i.checkMonth,
      checkYear: i.checkYear,
      period: formatPeriod(i.checkMonth, i.checkYear),
      product: i.product
    })));
  } catch (err) {
    console.error('GET deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/month-products/manage', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await purgeExpiredMonthChecks(prisma, offset);
    const [products, checks] = await Promise.all([
      prisma.product.findMany({
        where: { hasExpiry: true },
        orderBy: { name: 'asc' }
      }),
      prisma.productMonthCheck.findMany({ orderBy: [{ checkYear: 'asc' }, { checkMonth: 'asc' }] })
    ]);

    const checksByProduct = {};
    checks.forEach(c => {
      if (!isAssignmentActive(c.checkMonth, c.checkYear, new Date(), offset)) return;
      if (!checksByProduct[c.productId]) checksByProduct[c.productId] = [];
      checksByProduct[c.productId].push({
        id: c.id,
        checkMonth: c.checkMonth,
        checkYear: c.checkYear,
        period: formatPeriod(c.checkMonth, c.checkYear)
      });
    });

    res.json(products.map(p => ({
      ...p,
      monthChecks: checksByProduct[p.id] || []
    })));
  } catch (err) {
    console.error('GET deadlines/month-products/manage error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/month-products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const checkId = req.body.checkId ? parseInt(req.body.checkId, 10) : null;
    const parsed = parsePeriod(req.body.period);
    if (!parsed) {
      return res.status(400).json({ error: 'Укажите период в формате MM.YY (например 11.26)' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Продукт не найден' });

    if (checkId) {
      const existing = await prisma.productMonthCheck.findFirst({
        where: { id: checkId, productId }
      });
      if (!existing) return res.status(404).json({ error: 'Запись не найдена' });

      const duplicate = await prisma.productMonthCheck.findFirst({
        where: {
          productId,
          checkMonth: parsed.month,
          checkYear: parsed.year,
          NOT: { id: checkId }
        }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Такой период уже добавлен для этого продукта' });
      }

      const result = await prisma.productMonthCheck.update({
        where: { id: checkId },
        data: { checkMonth: parsed.month, checkYear: parsed.year },
        include: { product: true }
      });

      return res.json({
        ...result,
        period: formatPeriod(result.checkMonth, result.checkYear)
      });
    }

    const duplicate = await prisma.productMonthCheck.findFirst({
      where: {
        productId,
        checkMonth: parsed.month,
        checkYear: parsed.year
      }
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Такой период уже добавлен для этого продукта' });
    }

    const result = await prisma.productMonthCheck.create({
      data: { productId, checkMonth: parsed.month, checkYear: parsed.year },
      include: { product: true }
    });

    res.json({
      ...result,
      period: formatPeriod(result.checkMonth, result.checkYear)
    });
  } catch (err) {
    console.error('PUT deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/month-products/check/:checkId', async (req, res) => {
  try {
    const checkId = parseInt(req.params.checkId, 10);
    await prisma.productMonthCheck.deleteMany({ where: { id: checkId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE deadlines/month-products/check error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/month-products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    await prisma.productMonthCheck.deleteMany({ where: { productId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/replacement-summary', async (req, res) => {
  try {
    const rows = await prisma.roomProductStatus.findMany({
      where: { qtyToReplace: { gt: 0 } },
      include: { product: true }
    });

    const byProduct = {};
    rows.forEach(row => {
      if (!byProduct[row.productId]) {
        byProduct[row.productId] = {
          productId: row.productId,
          product: row.product,
          totalQty: 0
        };
      }
      byProduct[row.productId].totalQty += row.qtyToReplace;
    });

    const items = Object.values(byProduct).sort((a, b) =>
      a.product.name.localeCompare(b.product.name, 'ru')
    );

    res.json({ items, totalQty: items.reduce((s, i) => s + i.totalQty, 0) });
  } catch (err) {
    console.error('GET deadlines/replacement-summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/targets', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const result = await prisma.$transaction(tx => buildTargetsResponse(tx, offset));
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    res.json(result);
  } catch (err) {
    console.error('GET deadlines/targets error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const now = new Date();
    const parts = getLocalParts(now, offset);
    const currentMonthStart = dateFromParts({ year: parts.year, month: parts.month, day: 1 });
    const prevMonth = parts.month === 1 ? 12 : parts.month - 1;
    const prevYear = parts.month === 1 ? parts.year - 1 : parts.year;
    const prevMonthStart = dateFromParts({ year: prevYear, month: prevMonth, day: 1 });
    const prevMonthEnd = endOfLocalMonth(prevMonthStart, offset);

    const [currentStats, prevStats] = await Promise.all([
      prisma.deadlineDailyStat.findMany({
        where: { date: { gte: currentMonthStart } },
        orderBy: { date: 'asc' }
      }),
      prisma.deadlineDailyStat.findMany({
        where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
        orderBy: { date: 'asc' }
      })
    ]);

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    res.json({
      current: currentStats,
      previous: prevStats,
      currentMonth: parts.month,
      currentYear: parts.year
    });
  } catch (err) {
    console.error('GET deadlines/stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/update-stats', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const result = await prisma.$transaction(tx => upsertTodayRoomStats(tx, offset));
    res.json(result);
  } catch (err) {
    console.error('POST deadlines/update-stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

---

## `minibar-os/backend/src/routes/excises.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const excises = await prisma.excise.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(excises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { mark_number } = req.body;
    if (!mark_number) return res.status(400).json({ error: 'mark_number required' });

    const existing = await prisma.excise.findFirst({ where: { markNumber: mark_number } });
    if (existing) return res.json({ ...existing, _duplicate: true });

    const excise = await prisma.excise.create({ data: { markNumber: mark_number } });
    res.json({ ...excise, _duplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const result = await prisma.excise.deleteMany({});
    res.json({ ok: true, deleted: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.excise.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

---

## `minibar-os/backend/src/routes/lists.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const lists = await prisma.activeList.findMany({
      include: { rooms: { include: { room: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

---

## `minibar-os/backend/src/routes/products.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (err) {
    console.error('GET products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price, volume, unit, hasExpiry, emoji, bgColor, category } = req.body;
    if (!name || price === undefined || volume === undefined) {
      return res.status(400).json({ error: 'Название, цена и объём обязательны' });
    }
    const product = await prisma.product.create({
      data: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        price: parseFloat(price),
        volume: parseFloat(volume),
        unit: unit || 'шт',
        emoji: emoji || null,
        bgColor: bgColor || 'slate',
        category: category || 'Напитки',
        hasExpiry: hasExpiry !== false && hasExpiry !== 'false'
      }
    });
    res.json(product);
  } catch (err) {
    console.error('POST products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, price, volume, unit, hasExpiry, emoji, bgColor, category } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id, 10) },
      data: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        price: parseFloat(price),
        volume: parseFloat(volume),
        unit: unit || 'шт',
        emoji: emoji || null,
        bgColor: bgColor || 'slate',
        category: category || 'Напитки',
        hasExpiry: hasExpiry !== false && hasExpiry !== 'false'
      }
    });
    res.json(product);
  } catch (err) {
    console.error('PUT products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const inTemplate = await prisma.templateItem.count({ where: { productId } });
    if (inTemplate > 0) {
      return res.status(400).json({
        error: `Продукт используется в ${inTemplate} шаблон(ах). Сначала удалите его из шаблонов.`
      });
    }
    await prisma.product.delete({ where: { id: productId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

---

## `minibar-os/backend/src/routes/rooms.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { upsertTodayRoomStats, updateAllTargets } from '../services/deadlines.js';
import { clientOffset, startOfLocalDay } from '../lib/timezone.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { floor, category, status } = req.query;
    const where = {};
    if (floor) where.floor = parseInt(floor, 10);
    if (category) where.category = category;
    if (status) where.expiryStatus = status;

    const rooms = await prisma.room.findMany({
      where,
      include: { template: { include: { items: { include: { product: true } } } } },
      orderBy: { number: 'asc' }
    });
    res.json(rooms);
  } catch (err) {
    console.error('GET rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-all-deadlines', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({});
      await tx.room.updateMany({ data: { expiryStatus: 'neutral' } });
      
      const today = startOfLocalDay(new Date(), offset);
      const totalRooms = await tx.room.count();

      await tx.deadlineDailyStat.upsert({
        where: { date: today },
        update: {
          validCount: 0,
          emptyCount: 0,
          needsReplacementCount: 0,
          neutralCount: totalRooms
        },
        create: {
          date: today,
          validCount: 0,
          emptyCount: 0,
          needsReplacementCount: 0,
          neutralCount: totalRooms
        }
      });
      
      // ПЕРЕСОЗДАЁМ цель на сегодня: после сброса все neutral = все плохие
      // startBadCount = totalRooms, и при обработке номера processed будет расти правильно
      await tx.deadlineTarget.deleteMany({ where: { date: today } });
      
      // updateAllTargets создаст новую запись с правильным startBadCount = badCount (= totalRooms)
      await updateAllTargets(tx, offset);
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset all deadlines error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        template: { include: { items: { include: { product: true } } } },
        customs: { include: { product: true } },
        replacementItems: { include: { product: true } }
      }
    });
    if (!room) return res.status(404).json({ error: 'Not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body
    });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/product-statuses', async (req, res) => {
  try {
    const statuses = await prisma.roomProductStatus.findMany({
      where: { roomId: parseInt(req.params.id, 10) },
      include: { product: true }
    });
    res.json(statuses);
  } catch (err) {
    console.error('GET product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { items, roomStatus } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({ where: { roomId } });

      if (items?.length > 0) {
        const toCreate = items
          .filter(i => (i.qtyToReplace && i.qtyToReplace > 0) || i.expiryStatus === 'needs_replacement')
          .map(i => ({
            roomId,
            productId: parseInt(i.productId, 10),
            expiryStatus: i.expiryStatus || 'needs_replacement',
            qtyToReplace: parseInt(i.qtyToReplace, 10) || 0,
            checkedAt: new Date()
          }));

        if (toCreate.length > 0) {
          await tx.roomProductStatus.createMany({ data: toCreate });
        }
      }

      if (roomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { expiryStatus: roomStatus }
        });
      }

      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    const updated = await prisma.roomProductStatus.findMany({
      where: { roomId },
      include: { product: true }
    });
    res.json({ ok: true, statuses: updated });
  } catch (err) {
    console.error('PUT product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { roomStatus } = req.body || {};

    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({ where: { roomId } });
      if (roomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { expiryStatus: roomStatus }
        });
      }
      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

---

## `minibar-os/backend/src/routes/templates.js`

```javascript
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const templates = await prisma.fillTemplate.findMany({
      include: {
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { category: 'asc' }
    });
    res.json(templates);
  } catch (err) {
    console.error('GET templates error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/items', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const { items } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.templateItem.deleteMany({ where: { templateId } });
      if (items?.length > 0) {
        await tx.templateItem.createMany({
          data: items.map((i, idx) => ({
            templateId,
            productId: parseInt(i.productId, 10),
            qty: parseInt(i.qty, 10),
            sortOrder: i.sortOrder !== undefined ? i.sortOrder : idx
          }))
        });
      }
    });

    const updated = await prisma.fillTemplate.findUnique({
      where: { id: templateId },
      include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } } }
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT templates/:id/items error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

---

## `minibar-os/backend/src/services/deadlines.js`

```javascript
import {
  startOfLocalDay,
  endOfLocalMonth,
  addLocalDays,
  daysLeftInclusive
} from '../lib/timezone.js';

const BAD_STATUSES = ['neutral', 'needs_replacement'];

export async function getBadCount(tx) {
  return tx.room.count({
    where: { expiryStatus: { in: BAD_STATUSES } }
  });
}

export async function recalcTomorrowTarget(tx, offsetMinutes = null) {
  const now = new Date();
  const tomorrow = addLocalDays(startOfLocalDay(now, offsetMinutes), 1, offsetMinutes);
  const monthEnd = endOfLocalMonth(now, offsetMinutes);
  const daysLeft = daysLeftInclusive(tomorrow, monthEnd);
  const badCount = await getBadCount(tx);
  const target = Math.ceil(badCount / daysLeft);
  
  await tx.deadlineTarget.upsert({
    where: { date: tomorrow },
    update: { targetCount: target },
    create: { date: tomorrow, targetCount: target, startBadCount: 0, lockedAt: null }
  });
  
  return { target, daysLeft, badCount };
}

export async function ensureTodayTarget(tx, offsetMinutes = null) {
  const today = startOfLocalDay(new Date(), offsetMinutes);
  
  // Пытаемся найти существующую запись
  let todayTarget = await tx.deadlineTarget.findUnique({ where: { date: today } });
  
  // КРИТИЧНО: если цель УЖЕ зафиксирована — возвращаем как есть, НИЧЕГО не меняем
  if (todayTarget?.lockedAt) {
    console.log('🔒 Today target locked:', { 
      date: today.toISOString().split('T')[0],
      startBad: todayTarget.startBadCount,
      target: todayTarget.targetCount
    });
    return todayTarget;
  }
  
  const badCount = await getBadCount(tx);
  const daysLeft = daysLeftInclusive(today, endOfLocalMonth(new Date(), offsetMinutes));
  const target = Math.ceil(badCount / Math.max(1, daysLeft));
  
  if (!todayTarget) {
    console.log('🆕 Creating today target:', { 
      date: today.toISOString().split('T')[0], 
      badCount, 
      target 
    });
    return tx.deadlineTarget.create({
      data: {
        date: today,
        targetCount: target,
        startBadCount: badCount,
        lockedAt: new Date()
      }
    });
  }
  
  // Обновляем незафиксированную запись
  console.log('🔧 Locking existing target:', { 
    date: today.toISOString().split('T')[0], 
    badCount, 
    target 
  });
  return tx.deadlineTarget.update({
    where: { date: today },
    data: { lockedAt: new Date(), startBadCount: badCount, targetCount: target }
  });
}

export async function updateAllTargets(tx, offsetMinutes = null) {
  await ensureTodayTarget(tx, offsetMinutes);
  await recalcTomorrowTarget(tx, offsetMinutes);
}

export async function upsertTodayRoomStats(tx, offsetMinutes = null) {
  const today = startOfLocalDay(new Date(), offsetMinutes);
  const counts = await tx.room.groupBy({
    by: ['expiryStatus'],
    _count: { id: true }
  });
  const stats = { valid: 0, empty: 0, needs_replacement: 0, neutral: 0 };
  counts.forEach(c => { stats[c.expiryStatus] = c._count.id; });
  
  return tx.deadlineDailyStat.upsert({
    where: { date: today },
    update: {
      validCount: stats.valid,
      emptyCount: stats.empty,
      needsReplacementCount: stats.needs_replacement,
      neutralCount: stats.neutral
    },
    create: {
      date: today,
      validCount: stats.valid,
      emptyCount: stats.empty,
      needsReplacementCount: stats.needs_replacement,
      neutralCount: stats.neutral
    }
  });
}

export async function buildTargetsResponse(tx, offsetMinutes = null) {
  const todayTarget = await ensureTodayTarget(tx, offsetMinutes);
  const tomorrowData = await recalcTomorrowTarget(tx, offsetMinutes);
  const badCount = await getBadCount(tx);
  const totalRooms = await tx.room.count();
  const processedToday = Math.max(0, todayTarget.startBadCount - badCount);
  
  console.log('🎯 Targets:', {
    date: todayTarget.date,
    startBadCount: todayTarget.startBadCount,
    currentBadCount: badCount,
    target: todayTarget.targetCount,
    processed: processedToday,
    lockedAt: todayTarget.lockedAt
  });
  
  const percentage = todayTarget.targetCount > 0
    ? Math.min(100, Math.round((processedToday / todayTarget.targetCount) * 100))
    : 0;

  return {
    today: {
      target: todayTarget.targetCount,
      processed: processedToday,
      percentage,
      startBadCount: todayTarget.startBadCount
    },
    tomorrow: {
      target: tomorrowData.target,
      daysLeft: tomorrowData.daysLeft
    },
    summary: {
      badCount,
      totalRooms,
      goodCount: totalRooms - badCount
    }
  };
}
```

---

## `minibar-os/backend/src/services/monthChecks.js`

```javascript
/** MM.YY — год двумя цифрами (26 → 2026) */
import { getLocalParts } from '../lib/timezone.js';

export function fullYearFromShort(year2) {
  return 2000 + year2;
}

export function formatPeriod(month, year2) {
  return `${String(month).padStart(2, '0')}.${String(year2).padStart(2, '0')}`;
}

/** Парсит "11.26" или "1126" */
export function parsePeriod(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 4) return null;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = parseInt(digits.slice(2, 4), 10);
  if (month < 1 || month > 12) return null;
  return { month, year, period: formatPeriod(month, year) };
}

/** Активна до начала месяца, следующего за указанным (11.26 → до 12.26) */
export function isAssignmentActive(month, year2, now = new Date(), offsetMinutes = null) {
  const fullYear = fullYearFromShort(year2);
  const expiryYear = month === 12 ? fullYear + 1 : fullYear;
  const expiryMonth = month === 12 ? 1 : month + 1;
  const { year: cy, month: cm } = getLocalParts(now, offsetMinutes);
  if (cy < expiryYear) return true;
  if (cy === expiryYear && cm < expiryMonth) return true;
  return false;
}

export function isCurrentCheckMonth(month, year2, now = new Date(), offsetMinutes = null) {
  const { month: cm, year: cy } = getLocalParts(now, offsetMinutes);
  return cm === month && cy === fullYearFromShort(year2);
}

/** Текущий или следующий календарный месяц (12.25 → 01.26) */
export function isCurrentOrNextCheckMonth(month, year2, now = new Date(), offsetMinutes = null) {
  if (isCurrentCheckMonth(month, year2, now, offsetMinutes)) return true;

  const { month: cm, year: cy } = getLocalParts(now, offsetMinutes);
  const nextMonth = cm === 12 ? 1 : cm + 1;
  const nextYear = cm === 12 ? cy + 1 : cy;

  return month === nextMonth && fullYearFromShort(year2) === nextYear;
}

export async function purgeExpiredMonthChecks(prisma, offsetMinutes = null) {
  const all = await prisma.productMonthCheck.findMany();
  const now = new Date();
  const expiredIds = all
    .filter(r => !isAssignmentActive(r.checkMonth, r.checkYear, now, offsetMinutes))
    .map(r => r.id);
  if (expiredIds.length > 0) {
    await prisma.productMonthCheck.deleteMany({ where: { id: { in: expiredIds } } });
  }
  return expiredIds.length;
}

```

---

## `minibar-os/context.md`

```markdown
# MiniBar OS — контекст (2026-07-20 20:43)

=== FILE: frontend/index.html ===
```
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MiniBar OS</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/index.css" />
<link rel="stylesheet" href="styles.css?v=m4" />
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
</head>
<body class="antialiased">

<div class="flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="w-64 bg-white border-r border-slate-200 flex flex-col">
    <div class="p-5 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <i data-lucide="box" class="w-4 h-4 text-white"></i>
        </div>
        <span class="font-bold text-slate-900">MiniBar OS</span>
      </div>
    </div>
    <nav class="flex-1 p-3 overflow-y-auto scrollbar">
      <!-- Обзор -->
      <a data-route="dashboard" data-accent="indigo" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="layout-dashboard" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Обзор</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Акцизы и Сроки -->
      <a data-route="excise" data-accent="amber" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="stamp" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Акцизы</span>
        <span id="excise-badge" class="ml-auto badge badge-warning hidden">0</span>
      </a>
      <a data-route="deadlines" data-accent="rose" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="calendar" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Сроки</span>
        <span id="deadlines-badge" class="ml-auto badge badge-danger hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Операции с номерами -->
      <a data-route="arrivals" data-accent="emerald" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="plane-landing" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Arrivals</span>
        <span id="arrivals-badge" class="ml-auto badge badge-success hidden">0</span>
      </a>
      <a data-route="departures" data-accent="sky" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="plane-takeoff" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Departures</span>
        <span id="departures-badge" class="ml-auto badge badge-info hidden">0</span>
      </a>
      <a data-route="gih" data-accent="violet" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="clipboard-check" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>GIH</span>
        <span id="gih-badge" class="ml-auto badge badge-primary hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Отчёты -->
      <a data-route="history" data-accent="slate" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="history" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>История</span>
        <span id="history-badge" class="ml-auto badge badge-muted hidden">0</span>
      </a>
      <a data-route="empty" data-accent="pink" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="alert-circle" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Пустые</span>
        <span id="empty-badge" class="ml-auto badge badge-rose hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Инструменты -->
      <a data-route="calculator" data-accent="teal" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="calculator" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Калькулятор</span>
      </a>
      <a data-route="inventory" data-accent="blue" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="clipboard-list" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Инвентаризация</span>
        <span id="inventory-badge" class="ml-auto badge badge-blue hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Настройки -->
      <a data-route="settings" data-accent="zinc" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="settings" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Настройки</span>
      </a>
    </nav>
    <div class="p-3 border-t border-slate-100">
      <div class="flex items-center gap-3 px-3 py-2">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">А</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">Анна</div>
          <div class="text-xs text-slate-500">Администратор</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto scrollbar">

<!-- ═══ МОБИЛЬНАЯ ШАПКА (только телефон) ═══ -->
<header id="mobile-header">
  <div class="mh-brand">
    <div class="mh-logo">M</div>
    <div>
      <div class="mh-app">MiniBar OS</div>
      <div class="mh-section" id="mobile-section-title">Обзор</div>
    </div>
  </div>
  <div class="mh-date" id="mobile-date"></div>
</header>

    <div class="p-8 max-w-7xl mx-auto">
      
      <!-- DASHBOARD -->
      <section id="view-dashboard" class="tab-content fade-in">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-slate-900">Добро пожаловать, Анна</h1>
          <p class="text-slate-600 mt-2">Суббота, 14 июня 2026 · Смена: утренняя</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl p-6 border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-slate-900">Выручка за неделю</h3>
              <span class="text-xs text-slate-500">Обновлено 5 мин назад</span>
            </div>
            <div class="text-3xl font-bold text-slate-900">₽ 245,800</div>
            <div class="text-sm text-emerald-600 mt-2">↑ 12% к прошлой неделе</div>
          </div>
          <div class="bg-white rounded-xl p-6 border border-slate-100">
            <h3 class="font-semibold text-slate-900 mb-4">Топ продукты</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-700">Heineken 0.33</span>
                <span class="text-sm font-semibold">142 шт</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-700">Evian 0.5</span>
                <span class="text-sm font-semibold">98 шт</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-700">Chianti Classico</span>
                <span class="text-sm font-semibold">67 шт</span>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-6 border border-slate-100">
            <h3 class="font-semibold text-slate-900 mb-4">Последние события</h3>
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
                <div class="flex-1">
                  <div class="text-sm text-slate-700">Проверка номера 512</div>
                  <div class="text-xs text-slate-500">2 минуты назад</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                <div class="flex-1">
                  <div class="text-sm text-slate-700">Пополнение минибара 718</div>
                  <div class="text-xs text-slate-500">15 минут назад</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- EXCISE -->
<section id="view-excise" class="tab-content fade-in">
  
  <!-- Заголовок с кнопкой -->
  <div class="flex items-start justify-between mb-6">
    <h1 class="text-2xl font-bold text-slate-900">Акцизы</h1>
    <div class="flex gap-2">
      <button id="excise-copy-all-btn" class="btn btn-outline">
        <i data-lucide="copy" class="w-4 h-4"></i> Копировать все
      </button>
      <button id="excise-clear-all-btn" class="btn btn-outline" style="color: var(--danger);">
        <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить все
      </button>
    </div>
  </div>

  <!-- Статистика (3 блока с градиентами) -->
  <div class="grid grid-cols-3 gap-4 mb-6">
    <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Всего</span>
        <i data-lucide="layers" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="excise-stat-total">0</div>
      <div class="text-xs opacity-80 mt-1">акцизных марок</div>
    </div>
    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Валидные</span>
        <i data-lucide="check-circle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="excise-stat-valid">0</div>
      <div class="text-xs opacity-80 mt-1" id="excise-stat-valid-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Невалидные</span>
        <i data-lucide="alert-circle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="excise-stat-invalid">0</div>
      <div class="text-xs opacity-80 mt-1" id="excise-stat-invalid-pct">0%</div>
    </div>
  </div>

  <!-- Поле ввода -->
  <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm mb-6">
    <div class="flex gap-3">
      <div class="flex-1 relative">
        <i data-lucide="scan-line" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
        <input 
          type="text" 
          id="excise-input"
          placeholder="Введите или отсканируйте акцизную марку..."
          class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autocomplete="off"
        />
      </div>
      </div>
    <p class="text-xs text-slate-500 mt-2">
      Можно вводить по одной или несколько через пробел/перенос строки
    </p>
  </div>

  <!-- Сетка акцизов в стиле номеров -->
  <div id="excise-list-container" class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
    <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <i data-lucide="list" class="w-4 h-4 text-slate-500"></i>
        <h3 class="font-semibold text-slate-900 text-sm">Список акцизов</h3>
      </div>
      <span class="text-xs text-slate-500" id="excise-list-count">0 марок</span>
    </div>
    <div id="excise-list" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      <!-- Карточки акцизов будут рендериться здесь -->
    </div>
    <div id="excise-empty-state" class="hidden text-center py-12 text-slate-400">
      <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p class="text-sm">Нет добавленных акцизов</p>
      <p class="text-xs mt-1">Введите марку в поле выше</p>
    </div>
  </div>
</section>

      <!-- ARRIVALS -->
<section id="view-arrivals" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Arrivals</h1>
      <p class="text-slate-600 mt-1">Заезды гостей на сегодня</p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-outline"><i data-lucide="calendar" class="w-4 h-4"></i> Сегодня</button>
      <button class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Новый заезд</button>
    </div>
  </div>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Всего заездов</div>
      <div class="text-2xl font-bold">24</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">VIP</div>
      <div class="text-2xl font-bold text-indigo-600">3</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Стандарт</div>
      <div class="text-2xl font-bold">15</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Люкс</div>
      <div class="text-2xl font-bold">6</div>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
      <h3 class="font-semibold text-slate-900">Список заездов</h3>
      <input type="text" placeholder="Поиск по номеру или гостю..." class="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64" />
    </div>
    <div class="p-8 text-center text-slate-400">
      <i data-lucide="plane-landing" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p>Нет заездов на сегодня</p>
    </div>
  </div>
</section>

<!-- DEPARTURES -->
<section id="view-departures" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Departures</h1>
      <p class="text-slate-600 mt-1">Выезды гостей на сегодня</p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-outline"><i data-lucide="calendar" class="w-4 h-4"></i> Сегодня</button>
      <button class="btn btn-primary"><i data-lucide="check-circle" class="w-4 h-4"></i> Проверить все</button>
    </div>
  </div>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Всего выездов</div>
      <div class="text-2xl font-bold">18</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Проверено</div>
      <div class="text-2xl font-bold text-emerald-600">12</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Ожидают</div>
      <div class="text-2xl font-bold text-amber-600">6</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">С списаниями</div>
      <div class="text-2xl font-bold text-rose-600">4</div>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div class="p-5 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Номера к выезду</h3>
    </div>
    <div class="p-8 text-center text-slate-400">
      <i data-lucide="plane-takeoff" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p>Нет выездов на сегодня</p>
    </div>
  </div>
</section>

<!-- GIH -->
<section id="view-gih" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">GIH</h1>
      <p class="text-slate-600 mt-1">Guest In House — проверка минибаров занятых номеров</p>
    </div>
    <button class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Новая проверка</button>
  </div>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <i data-lucide="check-circle" class="w-5 h-5 text-emerald-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">142</div>
          <div class="text-xs text-slate-500">Всё на месте</div>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <i data-lucide="package" class="w-5 h-5 text-amber-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">23</div>
          <div class="text-xs text-slate-500">Выложили</div>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">8</div>
          <div class="text-xs text-slate-500">Не пополнено</div>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <i data-lucide="door-closed" class="w-5 h-5 text-slate-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">5</div>
          <div class="text-xs text-slate-500">DND</div>
        </div>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
      <h3 class="font-semibold text-slate-900">Номера для проверки</h3>
      <div class="flex gap-2">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option>Все этажи</option>
          <option>Этаж 5</option>
          <option>Этаж 6</option>
          <option>Этаж 7</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option>Все статусы</option>
          <option>Не проверены</option>
          <option>Проверены</option>
        </select>
      </div>
    </div>
    <div class="p-8 text-center text-slate-400">
      <i data-lucide="clipboard-check" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p>Нет номеров для проверки</p>
    </div>
  </div>
</section>

<!-- INVENTORY -->
<section id="view-inventory" class="tab-content fade-in">
  <!-- Вкладки категорий -->
  <div class="cat-tabs blue" id="inventory-tabs"></div>

  <div class="split-layout">
    <!-- Продукты -->
    <div id="inventory-products-container" class="products-grid"></div>

    <!-- Сводка (десктоп) -->
    <aside class="side-panel">
      <div class="side-panel-header">
        <span class="side-panel-title">Сводка</span>
        <button id="inventory-clear-btn" class="btn btn-ghost btn-sm">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Очистить
        </button>
      </div>
      <div id="inventory-summary-empty" class="side-panel-empty">
        <i data-lucide="clipboard-list"></i>
        <p>Введите количество продуктов</p>
      </div>
      <div id="inventory-summary-list" class="side-panel-body hidden"></div>
      <div class="side-panel-footer">
        <div class="total-row">
          <span class="total-row-label">Итоговый объём</span>
          <span class="total-row-value" id="inventory-total-volume">0 л</span>
        </div>
      </div>
    </aside>
  </div>

  <!-- Мобильная мини-панель -->
  <div id="inventory-mobile-bar" class="mobile-action-bar hidden">
    <div class="mobile-action-bar-info">
      <span class="mobile-action-bar-label" id="inventory-mobile-count">0 продуктов</span>
      <span class="mobile-action-bar-value" id="inventory-mobile-total">0 л</span>
    </div>
    <button id="inventory-mobile-expand" class="btn btn-primary">
      Развернуть <i data-lucide="chevron-up" class="w-4 h-4"></i>
    </button>
  </div>

  <!-- Мобильная шторка сводки -->
  <div id="inventory-summary-modal" class="sheet-modal hidden">
    <div class="sheet-modal-backdrop" id="inventory-summary-modal-backdrop"></div>
    <div class="sheet-modal-content">
      <div class="sheet-modal-header">
        <span class="sheet-modal-title">Сводка</span>
        <button id="inventory-summary-modal-close" class="btn btn-ghost btn-sm">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="inventory-summary-modal-list" class="sheet-modal-body"></div>
      <div class="sheet-modal-footer">
        <div class="total-row" style="margin-bottom:12px;">
          <span class="total-row-label">Итоговый объём</span>
          <span class="total-row-value" id="inventory-summary-modal-total">0 л</span>
        </div>
        <button id="inventory-summary-modal-clear" class="btn btn-outline" style="width:100%;">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить всё
        </button>
      </div>
    </div>
  </div>
</section>

      <!-- DEADLINES -->
<section id="view-deadlines" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <h1 class="text-2xl font-bold text-slate-900">Сроки годности</h1>
    <div class="flex items-center gap-2">
      <button id="deadlines-month-products-btn" class="btn btn-outline">
        <i data-lucide="calendar-check" class="w-4 h-4"></i> Добавить сроки
      </button>
      <button id="deadlines-reset-all-btn" class="btn btn-outline" style="color: var(--danger);">
        <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Сбросить все номера
      </button>
    </div>
  </div>

  <!-- Статистика -->
  <div class="grid grid-cols-4 gap-4 mb-4">
    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">В порядке</span>
        <i data-lucide="check-circle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-valid">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-valid-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Пустые</span>
        <i data-lucide="inbox" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-empty">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-empty-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Заменить</span>
        <i data-lucide="alert-triangle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-needs-replacement">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-needs-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Не проверены</span>
        <i data-lucide="clock" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-neutral">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-neutral-pct">0%</div>
    </div>
  </div>

  <!-- Динамика -->
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="col-span-3 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
  <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i data-lucide="trending-up" class="w-4 h-4 text-slate-500"></i>
        <h3 class="font-semibold text-slate-900">Динамика проверок</h3>
      </div>
    </div>
    <!-- Нижний ряд: График + Цели (ДВА ОТДЕЛЬНЫХ БЛОКА) -->
  
  <!-- БЛОК 1: График (занимает 3/4 ширины) -->
    <div id="stat-dynamics" class="h-64">
      <canvas id="deadlines-chart" class="w-full h-full"></canvas>
    </div>
</div>

<!-- БЛОК 2: Цели (занимает 1/4 ширины) — ОТДЕЛЬНЫЙ РАВНОПРАВНЫЙ БЛОК -->
<div class="col-span-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
  <div id="targets-container">
    <div class="flex items-center justify-center py-12 text-slate-400">
      <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i>
    </div>
  </div>
</div>
</div>


  <!-- Продукты месяца + Требуют замены -->
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="col-span-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col min-h-[140px]">
      <div class="flex items-center gap-2 mb-3">
        <i data-lucide="calendar-check" class="w-4 h-4 text-slate-500"></i>
        <h3 class="font-semibold text-slate-900 text-sm">На проверку</h3>
      </div>
      <div id="deadlines-month-products-container" class="flex-1">
        <div class="flex items-center justify-center py-6 text-slate-400 text-xs">
          <i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Загрузка...
        </div>
      </div>
    </div>
    <div class="col-span-3 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-500"></i>
          <h3 class="font-semibold text-slate-900 text-sm">Требуют замены</h3>
        </div>
        <span id="deadlines-replacement-total" class="text-xs font-medium text-rose-600"></span>
      </div>
      <div id="deadlines-replacement-container">
        <div class="flex items-center justify-center py-6 text-slate-400 text-xs">
          <i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Загрузка...
        </div>
      </div>
    </div>
  </div>

  <!-- Сетка номеров -->
  <div id="deadlines-floors-container" class="space-y-3">
    <div class="flex items-center justify-center py-12 text-slate-400">
      <i data-lucide="loader-2" class="w-6 h-6 animate-spin mr-2"></i>
      Загрузка номеров...
    </div>
  </div>
</section>

<!-- Модальное окно -->
<div id="deadline-modal-backdrop" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col fade-in">
    <div class="p-4 border-b border-slate-100 flex items-start justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">Номер <span id="deadline-modal-room-number"></span></h3>
        <p class="text-xs text-slate-500 mt-0.5" id="deadline-modal-room-info"></p>
      </div>
      <button onclick="App.deadlinesModule.closeModal()" class="btn btn-ghost">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

      <div id="deadline-modal-products" class="p-4 overflow-y-auto scrollbar flex-1">
      </div>

    <div class="p-4 border-t border-slate-100 bg-slate-50">
      <div class="flex items-center justify-between">
        <button onclick="App.deadlinesModule.reset()" class="btn btn-outline">
          <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Сброс
        </button>
        <div class="flex gap-2">
          <button onclick="App.deadlinesModule.setEmpty()" class="btn bg-sky-500 hover:bg-sky-600 text-white">
            <i data-lucide="inbox" class="w-4 h-4"></i> Опустошён
          </button>
          <button onclick="App.deadlinesModule.setValid()" class="btn bg-emerald-500 hover:bg-emerald-600 text-white">
            <i data-lucide="check-circle" class="w-4 h-4"></i> В порядке
          </button>
          <button onclick="App.deadlinesModule.save()" class="btn btn-primary">
            <i data-lucide="save" class="w-4 h-4"></i> Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Модальное окно: продукты месяца -->
<div id="deadline-month-modal-backdrop" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col fade-in">
    <div class="p-4 border-b border-slate-100 flex items-start justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">Добавление сроков</h3>
      </div>
      <button id="deadline-month-modal-close" class="btn btn-ghost">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <div id="deadline-month-modal-list" class="p-4 overflow-y-auto scrollbar flex-1 space-y-2">
      <div class="flex items-center justify-center py-8 text-slate-400 text-sm">
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i> Загрузка...
      </div>
    </div>
  </div>
</div>

      <!-- HISTORY -->
      <section id="view-history" class="tab-content fade-in">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900">История операций</h1>
          <p class="text-slate-600 mt-2">Полный журнал действий в системе</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div class="p-5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <input type="text" placeholder="Поиск..." class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <button class="btn btn-outline">Фильтры</button>
            </div>
          </div>
          <div class="p-5 text-center text-slate-400">Загрузка...</div>
        </div>
      </section>

      <!-- EMPTY -->
      <section id="view-empty" class="tab-content fade-in">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900">Пустые минибары</h1>
          <p class="text-slate-600 mt-2">Требуют пополнения или обслуживания</p>
        </div>
        <div id="empty-rooms-container">
          <div class="flex items-center justify-center py-12">
            <div class="text-slate-400">
              <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
              <p class="text-sm">Загрузка данных...</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CALCULATOR -->
      <section id="view-calculator" class="tab-content fade-in">
  <!-- Вкладки категорий -->
  <div class="cat-tabs teal" id="calculator-tabs"></div>

  <div class="split-layout">
    <!-- Продукты -->
    <div id="calculator-products-container" class="products-grid"></div>

    <!-- Счёт (десктоп) -->
    <aside class="side-panel">
      <div class="side-panel-header">
        <span class="side-panel-title">Счёт</span>
        <button id="calculator-clear-btn" class="btn btn-ghost btn-sm">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Очистить
        </button>
      </div>
      <div id="calculator-bill-empty" class="side-panel-empty">
        <i data-lucide="shopping-cart"></i>
        <p>Выберите продукты</p>
      </div>
      <div id="calculator-bill-list" class="side-panel-body hidden"></div>
      <div class="side-panel-footer">
        <div class="total-row">
          <span class="total-row-label" id="calculator-bill-count">0 позиций</span>
          <span class="total-row-value" id="calculator-bill-total">0 ₽</span>
        </div>
      </div>
    </aside>
  </div>

  <!-- Мобильная мини-панель -->
  <div id="calculator-mobile-bar" class="mobile-action-bar hidden">
    <div class="mobile-action-bar-info">
      <span class="mobile-action-bar-label" id="calculator-mobile-count">0 позиций</span>
      <span class="mobile-action-bar-value" id="calculator-mobile-total">0 ₽</span>
    </div>
    <button id="calculator-mobile-expand" class="btn btn-primary">
      Развернуть <i data-lucide="chevron-up" class="w-4 h-4"></i>
    </button>
  </div>

  <!-- Мобильная шторка счёта -->
  <div id="calculator-bill-modal" class="sheet-modal hidden">
    <div class="sheet-modal-backdrop" id="calculator-bill-modal-backdrop"></div>
    <div class="sheet-modal-content">
      <div class="sheet-modal-header">
        <span class="sheet-modal-title">Счёт</span>
        <button id="calculator-bill-modal-close" class="btn btn-ghost btn-sm">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="calculator-bill-modal-list" class="sheet-modal-body"></div>
      <div class="sheet-modal-footer">
        <div class="total-row" style="margin-bottom:12px;">
          <span class="total-row-label" id="calculator-bill-modal-count">0 позиций</span>
          <span class="total-row-value" id="calculator-bill-modal-total">0 ₽</span>
        </div>
        <button id="calculator-bill-modal-clear" class="btn btn-outline" style="width:100%;">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить счёт
        </button>
      </div>
    </div>
  </div>
</section>

      <!-- SETTINGS -->
      <section id="view-settings" class="tab-content fade-in">
        <div class="flex items-start justify-between mb-6">
          <h1 class="text-2xl font-bold text-slate-900">Настройки</h1>
        </div>

        <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
          <button data-settings-tab="products" class="settings-tab px-4 py-1.5 text-sm rounded-md bg-white shadow-sm font-medium">Продукты</button>
          <button data-settings-tab="templates" class="settings-tab px-4 py-1.5 text-sm rounded-md text-slate-600">Шаблоны наполнения</button>
        </div>

        <div id="settings-products" class="settings-panel">
          <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 class="font-semibold text-slate-900">Список продуктов</h3>
              <button id="add-product-btn" class="btn btn-primary">
                <i data-lucide="plus" class="w-4 h-4"></i> Добавить продукт
              </button>
            </div>
            <div id="products-table-container" class="p-5">
              <div class="flex items-center justify-center py-12 text-slate-400">
                <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
              </div>
            </div>
          </div>
        </div>

        <div id="settings-templates" class="settings-panel hidden">
          <div class="grid grid-cols-2 gap-6">
            <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div class="p-5 border-b border-slate-100 bg-slate-50">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  <h3 class="font-semibold text-slate-900">Стандарт</h3>
                </div>
              </div>
              <div class="p-5 template-items-container" data-category="standard">
                <div class="text-center py-8 text-slate-400 text-sm">Загрузка...</div>
              </div>
            </div>
            <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div class="p-5 border-b border-slate-100 bg-slate-50">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                  <h3 class="font-semibold text-slate-900">Люкс</h3>
                </div>
              </div>
              <div class="p-5 template-items-container" data-category="lux">
                <div class="text-center py-8 text-slate-400 text-sm">Загрузка...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </main>
</div>

<!-- Модальное окно продукта -->
<div id="product-modal-backdrop" class="hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 fade-in">
    <div class="flex items-start justify-between mb-4">
      <h3 id="product-modal-title" class="text-lg font-bold text-slate-900">Новый продукт</h3>
      <button onclick="App.settingsModule.closeProductModal()" class="btn btn-ghost">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form id="product-form" class="space-y-3">
      <input type="hidden" id="product-id" />
      <div>
        <label class="text-xs font-medium text-slate-600 mb-1.5 block">Название *</label>
        <input id="product-name" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Heineken 0.33" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Категория</label>
          <select id="product-category" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="Дверца">Дверца</option>
            <option value="Напитки">Напитки</option>
            <option value="Алкоголь">Алкоголь</option>
            <option value="Соки">Соки</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Единица</label>
          <select id="product-unit" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="шт">шт</option>
            <option value="л">л</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Объём *</label>
          <input id="product-volume" type="number" step="0.001" min="0" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="0.33" />
        </div>
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Цена (₽) *</label>
          <input id="product-price" type="number" step="0.01" min="0" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="450" />
        </div>
      </div>
      <div>
        <label class="text-xs font-medium text-slate-600 mb-1.5 block">Эмодзи и цвет фона</label>
        <div class="flex items-center gap-2">
          <input id="product-emoji" class="w-9 h-9 border border-slate-200 rounded-lg text-xl text-center cursor-pointer hover:bg-slate-50" placeholder="📦" maxlength="4" />
          <div id="product-color-picker" class="flex flex-wrap gap-2 flex-1">
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="amber" style="background: #fef3c7;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="red" style="background: #fee2e2;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="blue" style="background: #dbeafe;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="yellow" style="background: #fef9c3;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="purple" style="background: #f3e8ff;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="emerald" style="background: #d1fae5;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="rose" style="background: #ffe4e6;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="orange" style="background: #ffedd5;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="slate" style="background: #f1f5f9;"></button>
          </div>
        </div>
        <input type="hidden" id="product-bg-color" value="slate" />
      </div>
      
      <div>
        <label class="text-xs font-medium text-slate-600 mb-1.5 block">Предпросмотр</label>
        <div id="product-preview" class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div id="preview-icon" class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">📦</div>
          <div class="flex-1">
            <div id="preview-name" class="text-sm font-semibold text-slate-900">Название продукта</div>
            <div id="preview-details" class="text-xs text-slate-500 mt-0.5">0.33 шт · 450 ₽</div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2 pt-1">
        <input id="product-has-expiry" type="checkbox" class="w-4 h-4 rounded border-slate-300" checked />
        <label for="product-has-expiry" class="text-sm">Есть срок годности</label>
      </div>
      <div class="flex justify-end gap-2 pt-3">
        <button type="button" onclick="App.settingsModule.closeProductModal()" class="btn btn-outline">Отмена</button>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </div>
    </form>
  </div>
</div>


<script src="config.js?v=m4"></script>
<script src="js/utils.js?v=m4"></script>
<script src="js/app-core.js?v=m4"></script>
<script src="js/excise-module.js?v=m4"></script>
<script src="js/deadlines-module.js?v=m4"></script>
<script src="js/settings-module.js?v=m4"></script>
<script src="js/calculator-module.js?v=m4"></script>
<script src="js/inventory-module.js?v=m4"></script>
<script src="js/route-handlers.js?v=m4"></script>
<script src="js/init.js?v=m4"></script>


<!-- ═══ МОБИЛЬНЫЙ ТАБ-БАР (только телефон) ═══ -->
<nav id="mobile-tabbar">
  <a class="mobile-tab" data-route="dashboard" href="#"><i data-lucide="layout-dashboard"></i><span>Обзор</span></a>
  <a class="mobile-tab" data-route="excise" href="#"><i data-lucide="stamp"></i><span>Акцизы</span><span class="mt-badge b-amber hidden" id="excise-badge-m">0</span></a>
  <a class="mobile-tab" data-route="deadlines" href="#"><i data-lucide="calendar"></i><span>Сроки</span><span class="mt-badge b-rose hidden" id="deadlines-badge-m">0</span></a>
  <a class="mobile-tab" data-route="gih" href="#"><i data-lucide="clipboard-check"></i><span>GIH</span></a>
  <a class="mobile-tab" data-route="more" href="#"><i data-lucide="grid-3x3"></i><span>Ещё</span></a>
</nav>

<!-- ═══ ШТОРКА «ЕЩЁ» ═══ -->
<div id="mobile-more-backdrop" class="hidden">
  <div id="mobile-more-sheet">
    <div class="ms-handle"></div>
    <div class="ms-title">Разделы</div>
    <div class="ms-grid">
      <a class="ms-item" data-route="arrivals" href="#"><i data-lucide="plane-landing"></i><span>Arrivals</span></a>
      <a class="ms-item" data-route="departures" href="#"><i data-lucide="plane-takeoff"></i><span>Departures</span></a>
      <a class="ms-item" data-route="history" href="#"><i data-lucide="history"></i><span>История</span></a>
      <a class="ms-item" data-route="empty" href="#"><i data-lucide="alert-circle"></i><span>Пустые</span></a>
      <a class="ms-item" data-route="calculator" href="#"><i data-lucide="calculator"></i><span>Калькулятор</span></a>
      <a class="ms-item" data-route="inventory" href="#"><i data-lucide="clipboard-list"></i><span>Инвентаризация</span></a>
      <a class="ms-item" data-route="settings" href="#"><i data-lucide="settings"></i><span>Настройки</span></a>
    </div>
  </div>
</div>

<script src="js/mobile-nav.js?v=m4"></script>
</body>
</html>
```

=== FILE: frontend/styles.css ===
```
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
  }
  * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  body { background: var(--bg); }
  .scrollbar::-webkit-scrollbar { width: 6px; }
  .scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  .fade-in { animation: fadeIn 0.25s ease-out; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px; font-weight: 500; font-size: 13px;
    transition: all 0.15s ease; cursor: pointer; border: none;
  }
  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover { background: var(--primary-dark); }
  .btn-outline { background: white; color: #0f172a; border: 1px solid var(--border); }
  .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
  .btn-ghost { background: transparent; color: #64748b; }
  .btn-ghost:hover { background: #f1f5f9; color: #0f172a; }
  .nav-item {
    transition: all 0.15s ease;
  }
  /* Базовый стиль активной вкладки */
.nav-item.active {
  background: var(--nav-active-bg, #eef2ff);
  color: var(--nav-active-color, #4f46e5);
  font-weight: 600;
}

.nav-item.active .nav-icon {
  color: var(--nav-active-color, #4f46e5) !important;
}

/* Обзор — индиго (главный дашборд) */
.nav-item.active[data-accent="indigo"] {
  --nav-active-bg: #eef2ff;
  --nav-active-color: #4f46e5;
}

/* Акцизы — янтарный */
.nav-item.active[data-accent="amber"] {
  --nav-active-bg: #fffbeb;
  --nav-active-color: #d97706;
}

/* Сроки — красный */
.nav-item.active[data-accent="rose"] {
  --nav-active-bg: #fff1f2;
  --nav-active-color: #e11d48;
}

/* Arrivals — зелёный */
.nav-item.active[data-accent="emerald"] {
  --nav-active-bg: #ecfdf5;
  --nav-active-color: #059669;
}

/* Departures — голубой */
.nav-item.active[data-accent="sky"] {
  --nav-active-bg: #f0f9ff;
  --nav-active-color: #0284c7;
}

/* GIH — фиолетовый */
.nav-item.active[data-accent="violet"] {
  --nav-active-bg: #f5f3ff;
  --nav-active-color: #7c3aed;
}

/* История — серый */
.nav-item.active[data-accent="slate"] {
  --nav-active-bg: #f1f5f9;
  --nav-active-color: #475569;
}

/* Пустые — розовый */
.nav-item.active[data-accent="pink"] {
  --nav-active-bg: #fdf2f8;
  --nav-active-color: #db2777;
}

/* Калькулятор — бирюзовый */
.nav-item.active[data-accent="teal"] {
  --nav-active-bg: #f0fdfa;
  --nav-active-color: #0d9488;
}

/* Инвентаризация — синий */
.nav-item.active[data-accent="blue"] {
  --nav-active-bg: #eff6ff;
  --nav-active-color: #2563eb;
}

/* Настройки — темно-серый */
.nav-item.active[data-accent="zinc"] {
  --nav-active-bg: #f4f4f5;
  --nav-active-color: #3f3f46;
}
  .nav-item.active .nav-icon {
    color: var(--primary);
  }
  .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

/* Акцизы — янтарный (операционная задача) */
.badge-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* Сроки — красный (проблема, требует замены) */
.badge-danger {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Arrivals — зелёный (позитивное событие) */
.badge-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

/* Departures — голубой (информационный) */
.badge-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

/* GIH — индиго (рабочий процесс) */
.badge-primary {
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #c7d2fe;
}

/* История — серый (архив, пассивный) */
.badge-muted {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

/* Пустые — розовый (предупреждение о проблеме) */
.badge-rose {
  background: #ffe4e6;
  color: #9f1239;
  border: 1px solid #fecdd3;
}

/* Калькулятор — бирюзовый (инструмент) */
.badge-teal {
  background: #ccfbf1;
  color: #115e59;
  border: 1px solid #99f6e4;
}

/* Инвентаризация — синий (плановая задача) */
.badge-blue {
  background: #e0f2fe;
  color: #075985;
  border: 1px solid #bae6fd;
}

/* Настройки — slate (системный, редко используется) */
.badge-slate {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  input, select, textarea {
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .hidden { display: none !important; }

  .status-icon-container {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.status-icon-container.valid {
  background-color: #10b981;
}

.status-icon-container.invalid {
  background-color: #f43f5e;
}

.status-icon-container:hover {
  background-color: white;
  border-color: #dc2626;
  transform: scale(1.1);
}

.status-icon-default,
.status-icon-hover {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.status-icon-default {
  opacity: 1;
}

.status-icon-hover {
  opacity: 0;
}

.status-icon-container:hover .status-icon-default {
  opacity: 0;
}

.status-icon-container:hover .status-icon-hover {
  opacity: 1;
}

.group:hover .status-icon {
  transform: scale(1.1);
}

  .template-item[draggable="true"] {
  user-select: none;
}


.template-item {
  position: relative;
  transition: opacity 0.15s ease;
}

.template-item.dragging {
  opacity: 0.4;
}

.drag-handle {
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.template-item.drag-over-top::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

.template-item.drag-over-bottom::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

.floor-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  padding: 16px 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.floor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 8px;
}

.room-cell {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.room-cell:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
  z-index: 2;
}

.deadline-product-card {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  background: white;
  user-select: none;
}

.deadline-product-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.1);
}

.deadline-product-card.selected {
  border-color: #dc2626;
  background: #fee2e2;
  box-shadow: 0 0 0 1px #dc2626;
}

.deadline-product-counter {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.deadlines-month-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
}

.deadlines-month-item-emoji {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.deadlines-month-item-name {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deadlines-month-item-period {
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.deadlines-replacement-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.deadlines-replacement-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #fecdd3;
  background: #fff1f2;
  min-width: 0;
}

.deadlines-replacement-card-emoji {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.deadlines-replacement-card-name {
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deadlines-replacement-card-qty {
  font-size: 12px;
  font-weight: 700;
  color: #e11d48;
  min-width: 18px;
  text-align: center;
}

.deadline-month-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border, #e2e8f0);
  background: white;
}

.deadline-month-row-product {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 140px;
}

.deadline-month-saved-dates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.deadline-month-saved-date {
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.15s ease;
  user-select: none;
}

.deadline-month-saved-date:hover {
  color: #e11d48;
}

.deadline-month-add {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.deadline-month-row-info {
  flex: 1;
  min-width: 0;
}

.deadline-month-row-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.deadline-month-row-meta {
  font-size: 11px;
  color: #64748b;
}

.deadline-month-period-input {
  width: 72px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.deadline-month-period-input:focus {
  outline: none;
  border-color: var(--primary, #6366f1);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.excise-card {
  position: relative;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: filter 0.1s ease;
  user-select: none;
  overflow: hidden;
}

.excise-card:hover {
  filter: brightness(1.05);
}

.excise-card.valid {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
}

.excise-card.invalid {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(244, 63, 94, 0.35);
}

.excise-card-mark {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  word-break: break-all;
  line-height: 1.4;
  margin-right: 25px;
}

.excise-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 11px;
  opacity: 0.85;
}

.excise-status-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.excise-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  display: none;
  align-items: center;
  justify-content: center;
  transition: background 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.excise-delete-btn:hover {
  background: #fee2e2;
}

.excise-delete-btn svg {
  width: 12px;
  height: 12px;
  stroke: #dc2626;
}

.excise-card:hover .excise-status-icon {
  display: none;
}

.excise-card:hover .excise-delete-btn {
  display: flex;
}

/* Calculator */
.calculator-bill-panel {
  position: sticky;
  top: 1rem;
}

.calculator-categories-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.calculator-category-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.calculator-category-header {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.calculator-category-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calculator-category-empty {
  text-align: center;
  padding: 8px 0;
  color: #cbd5e1;
  font-size: 11px;
}

.calculator-product-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 4px 5px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: white;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.calculator-product-card.has-qty {
  border-color: #5eead4;
  background: #f0fdfa;
}

.calculator-product-main {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.calculator-product-emoji {
  width: 36px;
  height: 36px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.calculator-product-info {
  flex: 1;
  min-width: 0;
}

.calculator-product-name {
  font-size: 14px;
  color: #0f172a;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calculator-product-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.calculator-product-price {
  font-size: 10px;
  color: #64748b;
  white-space: nowrap;
}

.calculator-product-qty {
  font-size: 10px;
  font-weight: 700;
  color: #0d9488;
  min-width: 10px;
}

.calculator-product-card:not(.has-qty) .calculator-product-qty {
  color: #94a3b8;
  font-weight: 500;
}

.calculator-product-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.calculator-qty-btn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: white;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.calculator-qty-btn:hover:not(:disabled) {
  border-color: #0d9488;
  color: #0d9488;
  background: #f0fdfa;
}

.calculator-qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.calculator-bill-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.calculator-bill-dec {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.calculator-bill-dec:hover {
  border-color: #fca5a5;
  color: #dc2626;
  background: #fef2f2;
}

/* Inventory */
.inventory-product-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 5px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: white;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.inventory-product-card.has-qty {
  border-color: #93c5fd;
  background: #eff6ff;
}

.inventory-product-main {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.inventory-product-fields {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.inventory-field-input {
  width: 32px;
  padding: 3px 2px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.inventory-field-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.inventory-field-input::placeholder {
  color: #cbd5e1;
  font-weight: 400;
}

.inventory-product-result {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  min-width: 44px;
  line-height: 1.1;
}

.inventory-product-qty {
  font-size: 11px;
  font-weight: 700;
  color: #3b82f6;
  font-variant-numeric: tabular-nums;
}

.inventory-product-card:not(.has-qty) .inventory-product-qty {
  color: #94a3b8;
  font-weight: 500;
}

.inventory-product-volume {
  font-size: 13px;
  font-weight: 700;
  color: #1e40af;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.inventory-product-card:not(.has-qty) .inventory-product-volume {
  color: #94a3b8;
  font-weight: 500;
  font-size: 11px;
}


/* ═══════════════════════════════════════════════════════════════
   МОБИЛЬНАЯ ВЕРСИЯ (<=768px): шапка, таб-бар, шторка «Ещё»
   ═══════════════════════════════════════════════════════════════ */
#mobile-header, #mobile-tabbar, #mobile-more-backdrop { display: none; }

/* ═══════════════════════════════════════════════════════════════
   МОБИЛЬНАЯ ВЕРСИЯ (≤768px) — профессиональная верстка
   ═══════════════════════════════════════════════════════════════ */

/* Скрываем мобильные элементы на десктопе */
#mobile-header,
#mobile-tabbar,
#mobile-more-backdrop {
  display: none;
}

@media (max-width: 768px) {
  
  /* ── Сброс и базовая структура ── */
  * {
    -webkit-tap-highlight-color: transparent;
  }
  
  body {
    overflow-x: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* Скрываем сайдбар */
  aside {
    display: none !important;
  }
  
  /* Убираем padding с main */
  main {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* ── Шапка (fixed, не скроллится) ── */
  #mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    height: 60px;
    background: rgba(255, 255, 255, 0.95);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e2e8f0;
    padding: 0 16px;
    padding-top: env(safe-area-inset-top, 0);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  }
  
  .mh-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .mh-logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: #fff;
    font-weight: 800;
    font-size: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    flex-shrink: 0;
  }
  
  .mh-app {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  
  .mh-section {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin-top: 1px;
  }
  
  .mh-date {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 10px;
    white-space: nowrap;
  }
  
  /* ── Нижний таб-бар (fixed) ── */
  #mobile-tabbar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    height: 64px;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  
  .mobile-tab {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 4px;
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  
  .mobile-tab::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: currentColor;
    transform: translateX(-50%);
    transition: width 0.2s ease;
  }
  
  .mobile-tab.active::before {
    width: 28px;
  }
  
  .mobile-tab svg {
    width: 24px;
    height: 24px;
    transition: transform 0.15s ease;
  }
  
  .mobile-tab.active svg {
    transform: translateY(-1px) scale(1.05);
  }
  
  .mobile-tab:active {
    transform: scale(0.95);
  }
  
  /* Акцентные цвета вкладок */
  .mobile-tab.active[data-route="dashboard"] { color: #4f46e5; }
  .mobile-tab.active[data-route="excise"] { color: #d97706; }
  .mobile-tab.active[data-route="deadlines"] { color: #e11d48; }
  .mobile-tab.active[data-route="gih"] { color: #7c3aed; }
  .mobile-tab.active[data-route="more"] { color: #4f46e5; }
  
  /* Бейджи на вкладках */
  .mt-badge {
    position: absolute;
    top: 6px;
    right: calc(50% - 24px);
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 800;
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px #fff;
    animation: mt-badge-pop 0.25s ease;
  }
  
  .mt-badge.hidden {
    display: none !important;
  }
  
  .mt-badge.b-amber { background: #d97706; }
  .mt-badge.b-rose { background: #e11d48; }
  
  @keyframes mt-badge-pop {
    from { transform: scale(0.5); }
    to { transform: scale(1); }
  }
  
  /* ── Шторка «Ещё» ── */
  #mobile-more-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(15, 23, 42, 0.5);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  
  #mobile-more-backdrop.hidden {
    display: none !important;
  }
  
  #mobile-more-backdrop:not(.hidden) {
    display: block;
  }
  
  #mobile-more-backdrop.show {
    opacity: 1;
  }
  
  #mobile-more-sheet {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 24px 24px 0 0;
    padding: 12px 20px calc(24px + env(safe-area-inset-bottom, 0));
    box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
    transform: translateY(102%);
    transition: transform 0.3s cubic-bezier(0.32, 0.72, 0.24, 1);
  }
  
  #mobile-more-sheet.open {
    transform: translateY(0);
  }
  
  .ms-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #e2e8f0;
    margin: 0 auto 16px;
  }
  
  .ms-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 16px;
    letter-spacing: -0.01em;
  }
  
  .ms-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  
  .ms-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 4px;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    text-decoration: none;
    transition: transform 0.12s ease, background 0.15s ease, color 0.15s ease;
  }
  
  .ms-item svg {
    width: 22px;
    height: 22px;
    color: #64748b;
    transition: color 0.15s ease;
  }
  
  .ms-item:active {
    transform: scale(0.95);
  }
  
  .ms-item.active {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #4f46e5;
  }
  
  .ms-item.active svg {
    color: #4f46e5;
  }
  
  /* ── Контент: правильные отступы ── */
  .tab-content {
    padding: 76px 16px calc(88px + env(safe-area-inset-bottom, 0)) !important;
    min-height: 100vh;
    box-sizing: border-box;
  }
  
  /* ── Типографика ── */
  h1 {
    font-size: 1.5rem !important;
    line-height: 1.3 !important;
    margin-bottom: 16px !important;
  }
  
  h2 {
    font-size: 1.25rem !important;
    margin-bottom: 12px !important;
  }
  
  h3 {
    font-size: 1.1rem !important;
    margin-bottom: 10px !important;
  }
  
  p {
    font-size: 14px !important;
    line-height: 1.6 !important;
  }
  
  /* ── Сетки ── */
  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
  
  .grid:has(> [class*="col-span-"]) {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  
  [class*="col-span-"] {
    grid-column: auto !important;
  }
  
  /* ── Карточки статистики ── */
  .grid-cols-4 > div {
    padding: 16px !important;
  }
  
  /* ── Сетка номеров ── */
  .rooms-grid {
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)) !important;
    gap: 8px !important;
  }
  
  .room-cell {
    min-height: 48px;
    font-size: 12px !important;
    border-radius: 10px !important;
  }
  
  .floor-header {
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px !important;
  }
  
  /* ── График ── */
  #deadlines-chart {
    height: 240px !important;
    width: 100% !important;
  }
  
  /* ── Кнопки (touch-friendly) ── */
  .btn {
    min-height: 44px !important;
    padding: 12px 20px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
  }
  
  .btn-sm {
    min-height: 36px !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
  }
  
  /* ── Инпуты (iOS не зумит при 16px) ── */
  input,
  select,
  textarea {
    font-size: 16px !important;
    padding: 12px 14px !important;
    border-radius: 10px !important;
  }
  
  /* ── Модалки (поверх таб-бара, z-index: 100) ── */
  #deadline-modal-backdrop,
  #deadline-month-modal-backdrop {
    z-index: 100 !important;
    position: fixed !important;
    inset: 0 !important;
  }
  
  #deadline-modal-backdrop > div,
  #deadline-month-modal-backdrop > div {
    width: 100% !important;
    max-width: none !important;
    height: 100%;
    max-height: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0)) !important;
    overflow-y: auto !important;
    box-sizing: border-box;
  }
  
  /* ── Таблицы ── */
  table {
    font-size: 13px !important;
  }
  
  th,
  td {
    padding: 10px 8px !important;
  }
  
  /* ── Отступы между элементами ── */
  .space-y-4 > * + * {
    margin-top: 16px !important;
  }
  
  .space-y-6 > * + * {
    margin-top: 20px !important;
  }
  
  .mb-6 {
    margin-bottom: 20px !important;
  }
  
  .mb-4 {
    margin-bottom: 16px !important;
  }
  
  .gap-4 {
    gap: 12px !important;
  }
  
  .gap-6 {
    gap: 16px !important;
  }
  
  /* ── Убираем лишнюю прокрутку ── */
  .flex.h-screen {
    height: auto !important;
  }
  
  .overflow-hidden {
    overflow: visible !important;
  }
}


/* ═══════════════════════════════════════════════════════════════
   ЕДИНЫЙ ДИЗАЙН: КАЛЬКУЛЯТОР + ИНВЕНТАРИЗАЦИЯ (v2)
   ═══════════════════════════════════════════════════════════════ */

/* Вкладки категорий */
.cat-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}
.cat-tabs::-webkit-scrollbar { display: none; }
.cat-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  user-select: none;
}
.cat-tab:hover { border-color: #cbd5e1; color: #334155; }
.cat-tab-count {
  font-size: 11px;
  font-weight: 700;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 8px;
}
.cat-tabs.teal .cat-tab.active { background: #f0fdfa; border-color: #0d9488; color: #0d9488; }
.cat-tabs.teal .cat-tab.active .cat-tab-count { background: #ccfbf1; color: #0d9488; }
.cat-tabs.blue .cat-tab.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; }
.cat-tabs.blue .cat-tab.active .cat-tab-count { background: #dbeafe; color: #2563eb; }

/* Макет: продукты + боковая панель */
.split-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: start;
}

/* Сетка продуктов */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

/* Карточка продукта (унифицированная) */
.product-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: white;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.product-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
.product-card-emoji {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.product-card-info { flex: 1; min-width: 0; }
.product-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.product-card-meta { font-size: 12px; color: #64748b; margin-top: 2px; }

/* Калькулятор: карточка с количеством */
.calc-card.has-qty { border-color: #5eead4; background: #f0fdfa; }
.calc-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.calc-qty-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: white;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}
.calc-qty-btn:hover:not(:disabled) { border-color: #0d9488; color: #0d9488; background: #f0fdfa; }
.calc-qty-btn:active:not(:disabled) { transform: scale(0.92); }
.calc-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.calc-qty-value {
  min-width: 28px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.calc-card:not(.has-qty) .calc-qty-value { color: #cbd5e1; }

/* Инвентаризация: карточка с полями */
.inv-card.has-qty { border-color: #93c5fd; background: #eff6ff; }
.inv-fields { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.inv-field {
  width: 56px;
  height: 40px;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
  transition: all 0.15s ease;
}
.inv-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
.inv-field::placeholder { color: #cbd5e1; font-weight: 400; }
.inv-plus { font-size: 16px; font-weight: 600; color: #94a3b8; }
.inv-result { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; min-width: 64px; }
.inv-result-qty { font-size: 13px; font-weight: 700; color: #3b82f6; font-variant-numeric: tabular-nums; }
.inv-result-vol { font-size: 15px; font-weight: 800; color: #1e40af; font-variant-numeric: tabular-nums; white-space: nowrap; }
.inv-card:not(.has-qty) .inv-result-qty,
.inv-card:not(.has-qty) .inv-result-vol { color: #cbd5e1; font-weight: 600; }

/* Боковая панель (счёт / сводка) */
.side-panel {
  position: sticky;
  top: 20px;
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06);
  overflow: hidden;
}
.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.side-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }
.side-panel-body { padding: 8px 20px; max-height: 400px; overflow-y: auto; }
.side-panel-footer { padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
.side-panel-empty { text-align: center; padding: 32px 20px; color: #94a3b8; }
.side-panel-empty svg { width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.4; }
.side-panel-empty p { font-size: 13px; }

/* Строка счёта / сводки */
.bill-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
.bill-row:last-child { border-bottom: none; }
.bill-row-info { flex: 1; min-width: 0; }
.bill-row-name { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bill-row-meta { font-size: 11px; color: #64748b; margin-top: 1px; }
.bill-row-sum { font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; }
.bill-row-del {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.bill-row-del:hover { border-color: #fca5a5; color: #dc2626; background: #fef2f2; }

/* Итог */
.total-row { display: flex; align-items: baseline; justify-content: space-between; }
.total-row-label { font-size: 13px; color: #64748b; }
.total-row-value { font-size: 22px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }

/* Мобильная мини-панель (по умолчанию скрыта) */
.mobile-action-bar { display: none; }

/* Шторка (мобильный модал) */
.sheet-modal { position: fixed; inset: 0; z-index: 100; }
.sheet-modal.hidden { display: none; }
.sheet-modal-backdrop { position: absolute; inset: 0; background: rgba(15,23,42,0.5); }
.sheet-modal-content {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: white;
  border-radius: 24px 24px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
  animation: sheetUp 0.3s cubic-bezier(0.32, 0.72, 0.24, 1);
}
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
  border-bottom: 1px solid #f1f5f9;
}
.sheet-modal-title { font-size: 17px; font-weight: 800; color: #0f172a; }
.sheet-modal-body { flex: 1; overflow-y: auto; padding: 8px 20px; }
.sheet-modal-footer { padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #f8fafc; }

/* ── Мобильная адаптация нового дизайна ── */
@media (max-width: 768px) {
  /* Заголовки h1 скрыты на мобильном (они в шапке) */
  .tab-content h1 { display: none !important; }

  .split-layout { grid-template-columns: 1fr !important; }
  .side-panel { display: none !important; }
  .products-grid { grid-template-columns: 1fr !important; gap: 10px !important; }

  /* Мини-панель над таб-баром */
  .mobile-action-bar {
    display: flex;
    position: fixed;
    left: 0; right: 0;
    bottom: calc(64px + env(safe-area-inset-bottom, 0));
    z-index: 45;
    align-items: center;
    justify-content: space-between;
    background: white;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -4px 16px rgba(15,23,42,0.08);
    padding: 10px 16px;
  }
  .mobile-action-bar.hidden { display: none !important; }
  .mobile-action-bar-info { display: flex; flex-direction: column; }
  .mobile-action-bar-label { font-size: 11px; color: #64748b; }
  .mobile-action-bar-value { font-size: 17px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }

  /* Доп. нижний отступ, чтобы контент не прятался под мини-панелью */
  #view-calculator, #view-inventory {
    padding-bottom: calc(150px + env(safe-area-inset-bottom, 0)) !important;
  }

  /* Карточка инвентаризации: перенос на 2 строки */
  .inv-card { flex-wrap: wrap; }
  .inv-result { order: 2; margin-left: auto; flex-direction: row; align-items: baseline; gap: 8px; }
  .inv-fields { order: 3; flex-basis: 100%; margin-top: 10px; justify-content: flex-start; }
}
```

=== FILE: frontend/config.js ===
```
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

async function apiRequest(path, options = {}) {
  const headers = {
    'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  async getDeadlineTargets() {
    return apiRequest(`/deadlines/targets?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getDeadlineStats() {
    return apiRequest(`/deadlines/stats?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getRoomProductStatuses(roomId) {
    return apiRequest(`/rooms/${roomId}/product-statuses`);
  },
  async saveRoomProductStatuses(roomId, items, roomStatus) {
    return apiRequest(`/rooms/${roomId}/product-statuses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, roomStatus })
    });
  },
  async clearRoomProductStatuses(roomId, roomStatus) {
    return apiRequest(`/rooms/${roomId}/product-statuses`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomStatus })
    });
  },
  async resetAllDeadlines() {
    return apiRequest('/rooms/reset-all-deadlines', { method: 'POST' });
  },
  async getRooms(filters = {}) {
    const params = new URLSearchParams(filters);
    const query = params.toString();
    return apiRequest(`/rooms${query ? `?${query}` : ''}`);
  },
  async updateRoomStatus(roomId, status) {
    return apiRequest(`/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryStatus: status })
    });
  },
  async getProducts() {
    return apiRequest('/products');
  },
  async createProduct(data) {
    return apiRequest('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async updateProduct(id, data) {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async deleteProduct(id) {
    return apiRequest(`/products/${id}`, { method: 'DELETE' });
  },
  async getTemplates() {
    return apiRequest('/templates');
  },
  async updateTemplateItems(templateId, items) {
    return apiRequest(`/templates/${templateId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
  },
  async getChecks(limit = 50) {
    return apiRequest(`/checks?limit=${limit}`);
  },
  async getExcises() {
    return apiRequest('/excises');
  },
  async createExcise(markNumber) {
    return apiRequest('/excises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_number: markNumber })
    });
  },
  async deleteExcise(id) {
    return apiRequest(`/excises/${id}`, { method: 'DELETE' });
  },
  async deleteAllExcises() {
    return apiRequest('/excises', { method: 'DELETE' });
  },
  async getLists() {
    return apiRequest('/lists');
  },
  async getMonthProducts() {
    return apiRequest(`/deadlines/month-products?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getMonthProductsManage() {
    return apiRequest(`/deadlines/month-products/manage?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async setMonthProduct(productId, period, checkId = null) {
    return apiRequest(`/deadlines/month-products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, checkId })
    });
  },
  async deleteMonthCheck(checkId) {
    return apiRequest(`/deadlines/month-products/check/${checkId}`, { method: 'DELETE' });
  },
  async deleteMonthProduct(productId) {
    return apiRequest(`/deadlines/month-products/${productId}`, { method: 'DELETE' });
  },
  async getReplacementSummary() {
    return apiRequest(`/deadlines/replacement-summary?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  }
};

window.api = api;
window.API_BASE = API_BASE;

document.addEventListener('DOMContentLoaded', () => {
  if (window.App) {
    window.App.api = api;
  }
});```

=== FILE: frontend/nginx.conf ===
```
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}```

=== FILE: frontend/js/utils.js ===
```
function pluralize(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function waitForApi(maxAttempts = 30, intervalMs = 100) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const check = () => {
      if (window.api) {
        resolve(window.api);
      } else if (attempt >= maxAttempts) {
        reject(new Error('API not available'));
      } else {
        attempt += 1;
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

function showToast(message, durationMs = 2000) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

function parseDbDate(iso) {
  const d = new Date(iso);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

window.AppUtils = { pluralize, escapeHtml, waitForApi, showToast, parseDbDate };
```

=== FILE: frontend/js/app-core.js ===
```
const App = {
  state: { currentRoute: 'dashboard' },
  events: {
    listeners: {},
    on(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    },
    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => cb(data));
    }
  },
  views: {
    dashboard: { onEnter() {}, onLeave() {} },
    excise: { onEnter() {}, onLeave() {} },
    deadlines: { onEnter() {}, onLeave() {} },
    arrivals: { onEnter() {}, onLeave() {} },
    departures: { onEnter() {}, onLeave() {} },
    gih: { onEnter() {}, onLeave() {} },
    history: { onEnter() {}, onLeave() {} },
    empty: { onEnter() {}, onLeave() {} },
    calculator: { onEnter() {}, onLeave() {} },
    inventory: { onEnter() {}, onLeave() {} },
    settings: { onEnter() {}, onLeave() {} }
  },
  router: {
    urlToRoute: {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/excise': 'excise',
      '/deadlines': 'deadlines',
      '/arrivals': 'arrivals',
      '/departures': 'departures',
      '/gih': 'gih',
      '/history': 'history',
      '/empty': 'empty',
      '/calculator': 'calculator',
      '/inventory': 'inventory',
      '/settings': 'settings'
    },
    routeToUrl: {
      dashboard: '/dashboard',
      excise: '/excise',
      deadlines: '/deadlines',
      arrivals: '/arrivals',
      departures: '/departures',
      gih: '/gih',
      history: '/history',
      empty: '/empty',
      calculator: '/calculator',
      inventory: '/inventory',
      settings: '/settings'
    },
    go(route, pushToHistory = true) {
      try {
        App.state.currentRoute = route;

        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

        const view = document.getElementById('view-' + route);
        if (view) view.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(el => {
          el.classList.toggle('active', el.dataset.route === route);
        });

        const url = this.routeToUrl[route] || '/';
        if (pushToHistory && window.location.pathname !== url) {
          window.history.pushState({ route }, '', url);
        }

        if (window.lucide) {
          try { lucide.createIcons(); } catch (e) { /* ignore */ }
        }

        App.events.emit('route:change', route);
      } catch (err) {
        console.error('Router.go error:', err);
      }
    },
    currentFromUrl() {
      return this.urlToRoute[window.location.pathname] || 'dashboard';
    },
    current() {
      return App.state.currentRoute;
    }
  }
};

App.badges = {
  _updaters: {},

  register(name, updaterFn) {
    this._updaters[name] = updaterFn;
  },

  async update(name) {
    try {
      const updater = this._updaters[name];
      if (!updater) return;

      const badge = document.getElementById(`${name}-badge`);
      if (!badge) return;

      const count = await updater();
      if (typeof count === 'number' && count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch (err) {
      console.warn(`Badge ${name} update failed:`, err);
    }
  },

  async updateAll(retryCount = 0) {
    const maxRetries = 10;
    const results = await Promise.allSettled(
      Object.keys(this._updaters).map(name => this.update(name))
    );

    const hasApiErrors = results.some(r =>
      r.status === 'rejected' || (r.value === undefined && retryCount < maxRetries)
    );

    if (hasApiErrors && retryCount < maxRetries) {
      setTimeout(() => this.updateAll(retryCount + 1), 500);
    }
  }
};

window.App = App;
```

=== FILE: frontend/js/init.js ===
```
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const route = item.dataset.route;
      if (route && App.router) {
        App.router.go(route);
      }
    });
  });

  window.addEventListener('popstate', (event) => {
    const route = event.state?.route || App.router.currentFromUrl();
    App.router.go(route, false);
  });

  const initialRoute = App.router.currentFromUrl();
  App.router.go(initialRoute, false);

  const bootstrap = async () => {
    try {
      await window.AppUtils.waitForApi();
      App.badges.updateAll();
      if (window.lucide) lucide.createIcons();

      if (initialRoute === 'excise' && App.exciseModule) {
        App.exciseModule.init();
      }
      if (initialRoute === 'deadlines' && App.deadlinesModule) {
        App.deadlinesModule.init();
      }
      if (initialRoute === 'settings' && App.settingsModule) {
        App.settingsModule.init();
      }
      if (initialRoute === 'calculator' && App.calculatorModule) {
        App.calculatorModule.init();
      }
      if (initialRoute === 'inventory' && App.inventoryModule) {
        App.inventoryModule.init();
      }
    } catch (e) {
      console.warn('Bootstrap failed:', e);
    }
  };

  setTimeout(bootstrap, 100);
});
```

=== FILE: frontend/js/route-handlers.js ===
```
function initModuleWhenApiReady(moduleName, initFn, maxAttempts = 20, intervalMs = 100) {
  const tryInit = (attempt = 1) => {
    if (window.api && initFn) {
      initFn();
    } else if (attempt < maxAttempts) {
      setTimeout(() => tryInit(attempt + 1), intervalMs);
    }
  };
  tryInit();
}

App.events.on('route:change', (route) => {
  try {
    if (App.badges?._updaters[route]) {
      setTimeout(() => App.badges.update(route), 100);
    }
  } catch (e) {
    console.warn('Badge update failed:', e);
  }

  if (route === 'deadlines' && App.deadlinesModule) {
    initModuleWhenApiReady('deadlines', () => App.deadlinesModule.init());
  }

  if (route === 'excise' && App.exciseModule) {
    setTimeout(() => App.exciseModule.init(), 50);
  }

  if (route === 'settings' && App.settingsModule) {
    setTimeout(() => App.settingsModule.init(), 50);
  }

  if (route === 'calculator' && App.calculatorModule) {
    initModuleWhenApiReady('calculator', () => App.calculatorModule.init());
  }

  if (route === 'inventory' && App.inventoryModule) {
    initModuleWhenApiReady('inventory', () => App.inventoryModule.init());
  }
});
```

=== FILE: frontend/js/mobile-nav.js ===
```
// ═══════════════════════════════════════════════════════════════
// МОБИЛЬНАЯ НАВИГАЦИЯ: нижний таб-бар + шторка «Ещё»
// ═══════════════════════════════════════════════════════════════
(function () {
  var routeTitles = {
    dashboard: 'Обзор', excise: 'Акцизы', deadlines: 'Сроки',
    arrivals: 'Arrivals', departures: 'Departures', gih: 'GIH',
    history: 'История', empty: 'Пустые', calculator: 'Калькулятор',
    inventory: 'Инвентаризация', settings: 'Настройки'
  };

  function init() {
    // Клики по таб-бару
    document.querySelectorAll('.mobile-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var route = tab.dataset.route;
        if (route === 'more') openMoreSheet();
        else if (route && window.App && App.router) App.router.go(route);
      });
    });

    // Клики по шторке
    document.querySelectorAll('.ms-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var route = item.dataset.route;
        closeMoreSheet();
        if (route && window.App && App.router) App.router.go(route);
      });
    });

    // Закрытие по фону
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target.id === 'mobile-more-backdrop') closeMoreSheet();
      });
    }

    // Синхронизация активной вкладки и заголовка
    if (window.App && App.events) {
      App.events.on('route:change', function (route) {
        syncActive(route);
        closeMoreSheet();
      });
    }

    // Дата в шапке
    var dateEl = document.getElementById('mobile-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    // Тень шапки при скролле
    var header = document.getElementById('mobile-header');
    var mainEl = document.querySelector('main');
    var onScroll = function () {
      var y = window.scrollY || (mainEl ? mainEl.scrollTop : 0);
      if (header) header.classList.toggle('scrolled', y > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });

    // Зеркалим бейджи из сайдбара в таб-бар
    setInterval(mirrorBadges, 1500);
    mirrorBadges();

    if (window.App && App.state && App.state.currentRoute) syncActive(App.state.currentRoute);
  }

  function syncActive(route) {
    document.querySelectorAll('.mobile-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.route === route);
    });
    document.querySelectorAll('.ms-item').forEach(function (i) {
      i.classList.toggle('active', i.dataset.route === route);
    });
    // «Ещё» подсвечивается, если открыт раздел из шторки
    var moreTab = document.querySelector('.mobile-tab[data-route="more"]');
    if (moreTab) {
      var inSheet = !!document.querySelector('.ms-item[data-route="' + route + '"]');
      moreTab.classList.toggle('active', inSheet);
    }
    var titleEl = document.getElementById('mobile-section-title');
    if (titleEl) titleEl.textContent = routeTitles[route] || 'MiniBar OS';
  }

  function mirrorBadges() {
    ['excise', 'deadlines'].forEach(function (name) {
      var src = document.getElementById(name + '-badge');
      var dst = document.getElementById(name + '-badge-m');
      if (src && dst) {
        dst.textContent = src.textContent;
        dst.classList.toggle('hidden', src.classList.contains('hidden'));
      }
    });
  }

  function openMoreSheet() {
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('show');
        var sheet = document.getElementById('mobile-more-sheet');
        if (sheet) sheet.classList.add('open');
      });
    });
  }

  function closeMoreSheet() {
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;
    backdrop.classList.remove('show');
    var sheet = document.getElementById('mobile-more-sheet');
    if (sheet) sheet.classList.remove('open');
    setTimeout(function () { backdrop.classList.add('hidden'); }, 280);
  }

  // Ждём готовности App
  function tryInit(attempt) {
    attempt = attempt || 1;
    if (window.App && App.router && App.events) {
      init();
      if (window.lucide) lucide.createIcons();
    } else if (attempt < 30) {
      setTimeout(function () { tryInit(attempt + 1); }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tryInit(1); });
  } else {
    tryInit(1);
  }
})();
```

=== FILE: frontend/js/excise-module.js ===
```
// МОДУЛЬ АКЦИЗОВ
// ═══════════════════════════════════════════════════════════════
App.exciseModule = (() => {
  const RU_TO_EN = {
    'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
    'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",
    'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.','ё':'`',
    'Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P','Х':'{','Ъ':'}',
    'Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L','Ж':':','Э':'"',
    'Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M','Б':'<','Ю':'>','Ё':'~'
  };
  let excises = [];
let isInitialized = false;  
let isProcessing = false;   
  let debounceTimer = null;
  let isBound = false;
  let isLoaded = false;

  const api = () => window.api;
  const { pluralize, escapeHtml, showToast } = window.AppUtils;

  /** Единая проверка: карточки, счётчики и «Копировать все» используют одни правила */
  function isValidMark(mark) {
    if (!mark || typeof mark !== 'string') return false;
    const trimmed = mark.trim();
    if (trimmed.length < 20) return false;
    return /^\d/.test(trimmed);
  }

  function convertLayout(text) {
    return text.split('').map(c => RU_TO_EN[c] || c).join('');
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function render() {
  const list = document.getElementById('excise-list');
  const emptyState = document.getElementById('excise-empty-state');
  const countEl = document.getElementById('excise-list-count');
  
  if (!list) return;

  if (excises.length === 0) {
    list.innerHTML = '';
    emptyState?.classList.remove('hidden');
    if (countEl) countEl.textContent = '0 марок';
  } else {
    emptyState?.classList.add('hidden');
    if (countEl) countEl.textContent = `${excises.length} ${pluralize(excises.length, ['марка', 'марки', 'марок'])}`;
    
    list.innerHTML = excises.map(e => {
      const isValid = isValidMark(e.mark_number);
      const statusClass = isValid ? 'valid' : 'invalid';
      const date = new Date(e.created_at);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      const safeMark = String(e.mark_number).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="excise-card ${statusClass}" 
             onclick="App.exciseModule.copyToClipboard('${safeMark}')"
             title="Кликните, чтобы скопировать">
          
          <!-- Статус-иконка (видна всегда, кроме hover) -->
          <div class="excise-status-icon">
            ${isValid 
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            }
          </div>
          
          <!-- Корзина при наведении -->
          <div class="excise-delete-btn" 
               onclick="event.stopPropagation(); App.exciseModule.deleteExcise('${e.id}')"
               title="Удалить">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            </svg>
          </div>
          
          <!-- Номер марки -->
          <div class="excise-card-mark">${escapeHtml(e.mark_number)}</div>
          
          <!-- Мета -->
          <div class="excise-card-meta">
            <span>${isValid ? '✓ Валидна' : '✕ Ошибка'}</span>
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStats();
  if (window.lucide) lucide.createIcons();
}

  function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Можно добавить toast-уведомление
    console.log('Скопировано:', text);
  }).catch(err => {
    console.error('Ошибка копирования:', err);
  });
}

function updateStats() {
  const total = excises.length;
  const valid = excises.filter(e => isValidMark(e.mark_number)).length;
  const invalid = total - valid;
  
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  setText('excise-stat-total', total);
  setText('excise-stat-valid', valid);
  setText('excise-stat-invalid', invalid);
  
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
  setText('excise-stat-valid-pct', pct(valid));
  setText('excise-stat-invalid-pct', pct(invalid));
  
  // Обновляем бейдж в сайдбаре
  if (App.badges) {
    App.badges.update('excise');
  }
}

  async function processInput() {
    const input = document.getElementById('excise-input');
    if (!input) return;
    const raw = input.value;
    if (!raw.trim()) return;
    
    const parts = raw.split(/[\s]+/).filter(s => s.length > 0);
    const now = new Date().toISOString();
    const newItems = [];
    let duplicatesCount = 0;
    
    for (const part of parts) {
      const converted = convertLayout(part);
      
      if (excises.some(e => e.mark_number === converted)) {
        duplicatesCount++;
        continue;
      }
      
      const newItem = {
  id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
  mark_number: converted,
  created_at: now
};
      newItems.push(newItem);
      
      if (api() && api().createExcise) {
        api().createExcise(converted)
  .then(saved => {
    const tempId = newItem.id;
    if (saved._duplicate) {
      const idx = excises.findIndex(e => String(e.id) === String(tempId));
      if (idx !== -1) excises.splice(idx, 1);
      render();
      updateStats();
    } else {
      const idx = excises.findIndex(e => String(e.id) === String(tempId));
      if (idx !== -1) {
        excises[idx].id = saved.id;
        excises[idx].created_at = saved.createdAt || saved.created_at;
        // ВАЖНО: перерендериваем, чтобы onclick обновился с новым ID
        render();
        updateStats();
      }
    }
  })
  .catch(err => console.error('Ошибка сохранения:', err));
      }
    }
    
    if (newItems.length > 0) {
      excises = [...newItems, ...excises];
      render();
    }
    
    input.value = '';
    if (duplicatesCount > 0) console.log(`⚠️ Пропущено дубликатов: ${duplicatesCount}`);
  }

  async function deleteExcise(idRaw) {
  // Всегда работаем со строкой для сравнения
  const id = String(idRaw).replace(/^['"]|['"]$/g, ''); // Убираем кавычки если есть
  
  console.log('🗑️ Удаляем акциз, ID:', id);
  
  // Ищем элемент в массиве (сравниваем строки)
  const idx = excises.findIndex(e => String(e.id) === id);
  
  if (idx === -1) {
    console.warn('⚠️ Акциз не найден в списке, ID:', id, 'доступные:', excises.map(e => String(e.id)));
    return;
  }
  
  // Сохраняем элемент для возможного отката
  const removedItem = excises[idx];
  
  // Оптимистичное удаление
  excises.splice(idx, 1);
  console.log('✅ Удалён из списка, осталось:', excises.length);
  
  // Сразу обновляем UI
  render();

  // Если временный ID — не удаляем из БД
  if (id.startsWith('temp_')) {
    return;
  }

  // Удаляем из БД
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid ID: ' + id);
    await api().deleteExcise(numericId);
  } catch (err) {
    console.error('❌ Ошибка удаления из БД:', err);
    excises.splice(idx, 0, removedItem);
    render();
    alert('Не удалось удалить акциз из базы данных');
  }
}

  async function copyValid() {
    const valid = excises.filter(e => isValidMark(e.mark_number)).map(e => e.mark_number);
    if (valid.length === 0) {
      alert('Нет валидных акцизов для копирования');
      return;
    }

    try {
      await navigator.clipboard.writeText(valid.join('\n'));
      const shouldClear = confirm(`✓ Скопировано ${valid.length} акциз\n\nОчистить список после копирования?`);
      if (shouldClear) {
        await api().deleteAllExcises();
        excises = [];
        render();
      }
    } catch (err) {
      alert('Не удалось скопировать');
    }
  }

  async function clearList() {
    if (excises.length === 0) return;
    if (!confirm(`Удалить все ${excises.length} акциз из базы данных?`)) return;
    
    try {
      await api().deleteAllExcises();
      excises = [];
      render();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  async function loadFromDB() {
    if (isLoaded) return;
    if (!api() || !api().getExcises) {
      setTimeout(loadFromDB, 200);
      return;
    }
    try {
      const data = await api().getExcises();
      excises = data.map(e => ({
        id: e.id,
        mark_number: e.markNumber || e.mark_number,
        created_at: e.createdAt || e.created_at
      }));
      isLoaded = true;
      render();
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  }

  function bindEvents() {
    if (isBound) return;
    
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'excise-input') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processInput, 500);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'excise-input' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        processInput();
      }
    });
    
    isBound = true;
  }

  function init() {
    if (!isInitialized) {
      document.getElementById('excise-copy-all-btn')?.addEventListener('click', () => copyValid());

      document.getElementById('excise-clear-all-btn')?.addEventListener('click', () => clearList());

      bindEvents();
      isInitialized = true;
    }
    loadFromDB();
  }

  // Бейдж — из локального списка (не из API: при удалении API ещё не успел обновиться)
  App.badges.register('excise', async () => excises.length);

  return { init, refresh: render, deleteExcise, copyToClipboard };
})();
```

=== FILE: frontend/js/deadlines-module.js ===
```
// МОДУЛЬ СРОКИ ГОДНОСТИ
// ═══════════════════════════════════════════════════════════════
App.deadlinesModule = (() => {
  let rooms = [];
  let currentRoom = null;
  let productSelections = {};
  let modalProductos = [];
  let isInitialized = false;
  let monthManageProducts = [];
  
  // Кэш для целей (чтобы избежать race condition)
  let _cachedTargetsData = null;
  let _cachedTargetsTime = 0;
  const TARGETS_CACHE_MS = 500;
  
  const api = () => window.api;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };

  const categories = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  const statusLabels = {
    'neutral': 'Не проверен',
    'valid': 'В порядке',
    'empty': 'Пустой',
    'needs_replacement': 'Требует замены'
  };

  function invalidateTargetsCache() {
    _cachedTargetsData = null;
    _cachedTargetsTime = 0;
  }

  async function loadRooms() {
    try {
      rooms = await api().getRooms();
      render();
    } catch (err) {
      console.error('❌ Ошибка загрузки номеров:', err);
      const container = document.getElementById('deadlines-floors-container');
      if (container) container.innerHTML =
        `<div class="text-center py-12 text-rose-500">Ошибка: ${err.message}</div>`;
    }
  }

  function render() {
    renderStats();
    renderFloors();
  }

  function renderStats() {
    const total = rooms.length || 1;
    const counts = {
      valid: rooms.filter(r => r.expiryStatus === 'valid').length,
      empty: rooms.filter(r => r.expiryStatus === 'empty').length,
      needs_replacement: rooms.filter(r => r.expiryStatus === 'needs_replacement').length,
      neutral: rooms.filter(r => r.expiryStatus === 'neutral').length
    };

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    set('stat-valid', counts.valid);
    set('stat-empty', counts.empty);
    set('stat-needs-replacement', counts.needs_replacement);
    set('stat-neutral', counts.neutral);

    const pct = (n) => Math.round((n / total) * 100) + '%';
    set('stat-valid-pct', pct(counts.valid));
    set('stat-empty-pct', pct(counts.empty));
    set('stat-needs-pct', pct(counts.needs_replacement));
    set('stat-neutral-pct', pct(counts.neutral));
  }

  async function renderChart() {
    try {
      const data = await _loadChartStats();
      const canvas = document.getElementById('deadlines-chart');
      if (!canvas) return;
  
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
  
      const width = rect.width;
      const height = rect.height;
      const padding = { top: 30, right: 70, bottom: 30, left: 40 };
  
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
  
      const now = new Date();
      const todayDay = now.getDate();
      const chartYear = data.currentYear || now.getFullYear();
      const chartMonth = data.currentMonth || (now.getMonth() + 1);
      const prevMonth = chartMonth === 1 ? 12 : chartMonth - 1;
      const prevYear = chartMonth === 1 ? chartYear - 1 : chartYear;
      const { parseDbDate } = window.AppUtils;
  
      // Текущий месяц — только до сегодняшнего дня
      const fillCurrentMonth = (stats) => {
        const filled = [];
        for (let day = 1; day <= todayDay; day++) {
          const existing = stats.find(s => {
            const p = parseDbDate(s.date);
            return p.day === day && p.month === chartMonth && p.year === chartYear;
          });
          filled.push(existing || {
            date: new Date(Date.UTC(chartYear, chartMonth - 1, day)),
            validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0
          });
        }
        return filled;
      };
  
      // Прошлый месяц — ПОЛНОСТЬЮ
      const fillPrevMonth = (stats) => {
        const filled = [];
        const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
        for (let day = 1; day <= daysInPrevMonth; day++) {
          const existing = stats.find(s => {
            const p = parseDbDate(s.date);
            return p.day === day && p.month === prevMonth && p.year === prevYear;
          });
          filled.push(existing || {
            date: new Date(Date.UTC(prevYear, prevMonth - 1, day)),
            validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0
          });
        }
        return filled;
      };
  
      const currentStats = fillCurrentMonth(data.current || []);
      const prevStats = fillPrevMonth(data.previous || []);
  
      if (currentStats.length === 0 && prevStats.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Данные появятся после первых проверок', width / 2, height / 2);
        return;
      }
  
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      const allStats = [...currentStats, ...prevStats];
      const maxCount = Math.max(10, ...allStats.map(s => Math.max(s.validCount, s.emptyCount, s.needsReplacementCount)));
      const yMax = Math.ceil(maxCount / 5) * 5;
  
      // Единая шкала X: оба месяца рисуются в одном масштабе дней
      const maxDays = Math.max(currentStats.length, prevStats.length);
      const getX = (i) => padding.left + (chartWidth / Math.max(1, maxDays - 1)) * i;
      const getY = (value) => padding.top + chartHeight - (value / yMax) * chartHeight;
  
      // Горизонтальная сетка
      const gridLines = 5;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
  
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        const value = Math.round(yMax - (yMax / gridLines) * i);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(value.toString(), padding.left - 10, y);
      }
  
      // Подписи дней по оси X (до maxDays)
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
  
      for (let i = 0; i < maxDays; i++) {
        const day = i + 1;
        if (day === 1 || day % 5 === 0 || day === maxDays) {
          ctx.fillText(day.toString(), getX(i), padding.top + chartHeight + 8);
        }
      }
  
      const lines = [
        { key: 'validCount', label: 'В порядке', color: '#10b981', fillStart: 'rgba(16, 185, 129, 0.20)', fillEnd: 'rgba(16, 185, 129, 0)' },
        { key: 'emptyCount', label: 'Пустые', color: '#0ea5e9', fillStart: 'rgba(14, 165, 233, 0.20)', fillEnd: 'rgba(14, 165, 233, 0)' },
        { key: 'needsReplacementCount', label: 'Заменить', color: '#f43f5e', fillStart: 'rgba(244, 63, 94, 0.20)', fillEnd: 'rgba(244, 63, 94, 0)' }
      ];
  
      // Плавная кривая с ограничением прогибов
      const drawSmoothLine = (points) => {
        if (points.length < 2) {
          if (points.length === 1) ctx.moveTo(points[0].x, points[0].y);
          return;
        }
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          
          const tension = 0.2;
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          
          let cp1y = p1.y + (p2.y - p0.y) * tension;
          let cp2y = p2.y - (p3.y - p1.y) * tension;
          
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);
          cp1y = Math.max(minY, Math.min(maxY, cp1y));
          cp2y = Math.max(minY, Math.min(maxY, cp2y));
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      };
  
      const drawLines = (stats, config) => {
        lines.forEach(line => {
          if (stats.length === 0) return;
          const points = stats.map((s, i) => ({ x: getX(i), y: getY(s[line.key]) }));
      
          ctx.globalAlpha = config.opacity;
      
          // Градиентная заливка
          if (config.showFill) {
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
            gradient.addColorStop(0, line.fillStart);
            gradient.addColorStop(1, line.fillEnd);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartHeight);
            ctx.lineTo(points[0].x, points[0].y);
            drawSmoothLine(points);
            ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            ctx.closePath();
            ctx.fill();
          }
      
          // Линия
          ctx.strokeStyle = line.color;
          ctx.lineWidth = config.lineWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.setLineDash(config.dash);
          ctx.beginPath();
          drawSmoothLine(points);
          ctx.stroke();
          ctx.setLineDash([]);
      
          // Точки на всех днях с данными > 0 (кроме последней, если там бейдж)
          if (config.showPoints) {
            const lastPointValue = stats[stats.length - 1][line.key];
            const showBadgeOnLast = config.showCurrentValue && lastPointValue > 0;
            
            points.forEach((p, i) => {
              const value = stats[i][line.key];
              const isLast = i === points.length - 1;
              if (value > 0 && !(isLast && showBadgeOnLast)) {
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = line.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
              }
            });
          }
      
          // Бейдж ВСЕГДА на последней точке (сегодняшний день)
          if (config.showCurrentValue) {
            const lastPoint = points[points.length - 1];
            const lastValue = stats[stats.length - 1][line.key];
            
            // Если значение 0 — бейдж не рисуем (линия сама заканчивается в 0)
            if (lastValue <= 0) return;
            
            const label = lastValue.toString();
            const radius = label.length === 1 ? 12 : label.length === 2 ? 14 : 16;
            
            // Фон бейджа
            ctx.fillStyle = line.color;
            ctx.beginPath(); ctx.arc(lastPoint.x, lastPoint.y, radius, 0, Math.PI * 2); ctx.fill();
            
            // Белая обводка
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(lastPoint.x, lastPoint.y, radius, 0, Math.PI * 2); ctx.stroke();
            
            // Цифра внутри
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${label.length > 2 ? 10 : 11}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lastPoint.x, lastPoint.y + 0.5);
          }
          
          ctx.globalAlpha = 1;
        });
      };
  
      // Прошлый месяц (полупрозрачный пунктир, полный)
      if (prevStats.length > 0 && prevStats.some(s => s.validCount + s.emptyCount + s.needsReplacementCount > 0)) {
        drawLines(prevStats, { opacity: 0.3, lineWidth: 1.5, dash: [4, 4], showFill: false, showPoints: false, showCurrentValue: false });
      }
  
      // Текущий месяц (полная яркость, до сегодня)
      drawLines(currentStats, { opacity: 1, lineWidth: 2.5, dash: [], showFill: true, showPoints: true, showCurrentValue: true });
  
      // Заголовок
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      const currentMonthName = monthNames[chartMonth - 1];
      const prevMonthName = monthNames[prevMonth - 1];
  
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${currentMonthName} vs ${prevMonthName}`, padding.left, 6);
  
      // Легенда
      let legendX = width - padding.right;
      const legendY = 10;
      ctx.textBaseline = 'middle';
      [...lines].reverse().forEach(line => {
        ctx.fillStyle = '#475569'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        const textWidth = ctx.measureText(line.label).width;
        ctx.fillText(line.label, legendX, legendY);
        legendX -= textWidth + 6;
        ctx.strokeStyle = line.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(legendX - 16, legendY); ctx.lineTo(legendX, legendY); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(legendX - 8, legendY, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = line.color; ctx.beginPath(); ctx.arc(legendX - 8, legendY, 2, 0, Math.PI * 2); ctx.fill();
        legendX -= 28;
      });
    } catch (err) {
      console.error('Ошибка рендера графика:', err);
    }
  }

  function getRoomClasses(status) {
    const base = 'room-cell text-white font-bold shadow-md';
    const map = {
      'neutral': base + ' bg-gradient-to-br from-slate-400 to-slate-500',
      'valid': base + ' bg-gradient-to-br from-emerald-500 to-emerald-600',
      'empty': base + ' bg-gradient-to-br from-sky-500 to-sky-600',
      'needs_replacement': base + ' bg-gradient-to-br from-rose-500 to-rose-600'
    };
    return map[status] || map['neutral'];
  }

  function renderFloors() {
    const container = document.getElementById('deadlines-floors-container');
    if (!container) return;

    const byFloor = {};
    rooms.forEach(r => {
      if (!byFloor[r.floor]) byFloor[r.floor] = [];
      byFloor[r.floor].push(r);
    });

    const floors = Object.keys(byFloor).map(Number).sort((a, b) => a - b);

    if (floors.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400">Нет номеров</div>';
      return;
    }

    container.innerHTML = floors.map(floor => {
      const floorRooms = byFloor[floor].sort((a, b) => a.number - b.number);
      const counts = {
        neutral: floorRooms.filter(r => r.expiryStatus === 'neutral').length,
        valid: floorRooms.filter(r => r.expiryStatus === 'valid').length,
        empty: floorRooms.filter(r => r.expiryStatus === 'empty').length,
        needs: floorRooms.filter(r => r.expiryStatus === 'needs_replacement').length
      };

      return `
        <div class="floor-section">
          <div class="floor-header">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <span class="font-bold text-sm text-slate-700">${floor}</span>
              </div>
              <div>
                <div class="font-semibold text-sm text-slate-900">Этаж ${floor}</div>
                <div class="text-xs text-slate-500">${floorRooms.length} номеров</div>
              </div>
            </div>
            <div class="flex gap-2 text-xs">
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                <span class="text-slate-600">${counts.neutral}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-slate-600">${counts.valid}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                <span class="text-slate-600">${counts.empty}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                <span class="text-slate-600">${counts.needs}</span>
              </span>
            </div>
          </div>
          <div class="rooms-grid">
            ${floorRooms.map(r => `
              <div class="${getRoomClasses(r.expiryStatus)}" 
                   onclick="App.deadlinesModule.openRoomModal(${r.id})"
                   title="${r.number} · ${statusLabels[r.expiryStatus] || r.expiryStatus}">
                ${r.number}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  async function openRoomModal(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    currentRoom = room;
    productSelections = {};

    const items = room.template?.items || [];
    modalProductos = items
      .filter(i => i.product.hasExpiry)
      .map(i => ({
        id: i.product.id,
        name: i.product.name,
        volume: i.product.volume,
        unit: i.product.unit,
        emoji: i.product.emoji,
        bgColor: i.product.bgColor,
        category: i.product.category,
        maxQty: i.qty
      }));

    try {
      const statuses = await _loadStatuses(roomId);
      statuses.forEach(s => {
        if (s.qtyToReplace > 0) {
          productSelections[s.productId] = s.qtyToReplace;
        }
      });
    } catch (err) {
      console.warn('Не удалось загрузить статусы продуктов:', err);
    }

    document.getElementById('deadline-modal-room-number').textContent = room.number;
    document.getElementById('deadline-modal-room-info').textContent =
      `Этаж ${room.floor} · ${room.category === 'lux' ? 'Люкс' : 'Стандарт'} · ${statusLabels[room.expiryStatus] || room.expiryStatus}`;

    renderModalProducts();
    document.getElementById('deadline-modal-backdrop').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function renderModalProducts() {
    const container = document.getElementById('deadline-modal-products');
    if (!container) return;

    if (modalProductos.length === 0) {
      container.innerHTML = `
        <div class="col-span-4 text-center py-6 text-slate-400">
          <i data-lucide="package-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p class="text-xs">Нет продуктов со сроком годности</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    modalProductos.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    container.innerHTML = `<div class="grid grid-cols-4 gap-3">
      ${categories.map(cat => { 
        const items = grouped[cat] || []; 
        return `
        <div class="flex flex-col">
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">${cat}</span>
          </div>
          <div class="space-y-2 flex-1">
            ${items.length === 0
              ? `<div class="text-center py-4 text-slate-300 text-xs">—</div>`
              : items.map(p => {
                  const count = productSelections[p.id] || 0;
                  const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                  const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
                  return `
                    <div class="deadline-product-card ${count > 0 ? 'selected' : ''}" 
                         onclick="App.deadlinesModule.clickProduct(${p.id})">
                      ${count > 0 ? `<div class="deadline-product-counter">${count}</div>` : ''}
                      <div class="flex items-center gap-2">
                        <div class="w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center text-lg flex-shrink-0">
                          ${emoji}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="deadline-product-name text-xs font-semibold text-slate-900 truncate">${p.name}</div>
                          <div class="deadline-product-meta text-[10px] text-slate-500">${p.volume || '—'} ${p.unit || 'шт'}</div>
                        </div>
                      </div>
                    </div>`;
                }).join('')
            }
          </div>
        </div>`; 
      }).join('')}
    </div>`;

    if (window.lucide) lucide.createIcons();
  }

  function clickProduct(productId) {
    const product = modalProductos.find(p => p.id === productId);
    if (!product) return;
    const current = productSelections[productId] || 0;
    const next = current >= product.maxQty ? 0 : current + 1;

    if (next === 0) {
      delete productSelections[productId];
    } else {
      productSelections[productId] = next;
    }

    renderModalProducts();
  }

  async function _loadChartStats() {
    return api().getDeadlineStats();
  }

  async function _saveStatuses(roomId, items, roomStatus) {
    return api().saveRoomProductStatuses(roomId, items, roomStatus);
  }

  async function _clearStatuses(roomId, roomStatus) {
    return api().clearRoomProductStatuses(roomId, roomStatus);
  }

  async function _loadStatuses(roomId) {
    return api().getRoomProductStatuses(roomId);
  }

  async function _loadTargets() {
    const now = Date.now();
    if (_cachedTargetsData && (now - _cachedTargetsTime) < TARGETS_CACHE_MS) {
      console.log('🎯 Targets from cache (age:', now - _cachedTargetsTime, 'ms)');
      return _cachedTargetsData;
    }
    const data = await api().getDeadlineTargets();
    _cachedTargetsData = data;
    _cachedTargetsTime = now;
    return data;
  }

  async function renderTargets() {
    try {
      const data = await _loadTargets();
      console.log('🎯 Targets response:', {
        today_processed: data.today?.processed,
        today_target: data.today?.target,
        today_startBad: data.today?.startBadCount,
        today_pct: data.today?.percentage,
        tomorrow_target: data.tomorrow?.target,
        summary_badCount: data.summary?.badCount,
        responseTime: new Date().toISOString()
      });
      
      const container = document.getElementById('targets-container');
      if (!container) return;

      const { today, tomorrow, summary } = data;
      const remaining = Math.max(0, today.target - today.processed);

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <i data-lucide="target" class="w-4 h-4 text-amber-600"></i>
            <h3 class="font-bold text-amber-600 text-sm">Цели</h3>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Сегодня</span>
              <span class="text-xs font-semibold text-slate-900">${today.processed} / ${today.target}</span>
            </div>

            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-4xl font-bold text-slate-900 leading-none">${today.processed}</span>
              <span class="text-base text-slate-400 font-medium">/ ${today.target}</span>
            </div>

            <div class="relative h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                today.percentage >= 100 
                  ? 'bg-emerald-500' 
                  : today.percentage >= 50 
                    ? 'bg-sky-500'
                    : 'bg-rose-500'
              }" style="width: ${Math.min(100, today.percentage)}%"></div>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500">
                ${today.percentage >= 100 ? '✓ Цель выполнена' : `Осталось ${remaining}`}
              </span>
              <span class="text-xs font-bold text-slate-700">${today.percentage}%</span>
            </div>
          </div>

          <div class="border-t border-slate-100"></div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Завтра</span>
              <span class="text-[10px] text-slate-400">прогноз</span>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-xl font-bold text-slate-700">${tomorrow.target}</span>
              <span class="text-xs text-slate-500">номеров</span>
            </div>
          </div>

          <div class="border-t border-slate-100"></div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">До конца месяца</span>
              <span class="font-semibold text-slate-700">${tomorrow.daysLeft + 1} дн.</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Осталось номеров</span>
              <span class="font-semibold text-slate-900">${summary.badCount}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Прогресс месяца</span>
              <span class="font-semibold text-slate-900">
                ${summary.totalRooms > 0 ? Math.round((summary.goodCount / summary.totalRooms) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка рендера целей:', err);
    }
  }

  function formatPeriodInput(value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  function productEmoji(product) {
    return product.emoji || (product.name || '?').charAt(0).toUpperCase();
  }

  async function renderMonthProducts() {
    const container = document.getElementById('deadlines-month-products-container');
    if (!container) return;
    try {
      const items = await api().getMonthProducts();
      if (items.length === 0) {
        container.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            <i data-lucide="calendar-off" class="w-5 h-5 mx-auto mb-1 opacity-50"></i>
            Нет продуктов на текущий и следующий месяц
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = items.map(item => {
        const p = item.product;
        const emoji = productEmoji(p);
        const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
        return `
          <div class="deadlines-month-item mb-1.5">
            <div class="deadlines-month-item-emoji ${colorClass}">${emoji}</div>
            <span class="deadlines-month-item-name" title="${p.name}">${p.name}</span>
            <span class="deadlines-month-item-period">${item.period}</span>
          </div>`;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка загрузки продуктов месяца:', err);
      container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">${err.message}</div>`;
    }
  }

  async function renderReplacementSummary() {
    const container = document.getElementById('deadlines-replacement-container');
    const totalEl = document.getElementById('deadlines-replacement-total');
    if (!container) return;
    try {
      const data = await api().getReplacementSummary();
      const items = data.items || [];
      if (totalEl) {
        totalEl.textContent = items.length > 0 ? `Всего: ${data.totalQty || 0} шт.` : '';
      }

      if (items.length === 0) {
        container.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            <i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 opacity-50"></i>
            Нет продуктов, требующих замены
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = `
        <div class="deadlines-replacement-grid">
          ${items.map(item => {
            const p = item.product;
            const emoji = productEmoji(p);
            const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
            return `
              <div class="deadlines-replacement-card" title="${p.name}">
                <div class="deadlines-replacement-card-emoji ${colorClass}">${emoji}</div>
                <span class="deadlines-replacement-card-name">${p.name}</span>
                <span class="deadlines-replacement-card-qty">${item.totalQty}</span>
              </div>`;
          }).join('')}
        </div>`;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка загрузки замен:', err);
      container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">${err.message}</div>`;
    }
  }

  async function refreshDeadlinesExtras() {
    await Promise.all([renderMonthProducts(), renderReplacementSummary()]);
  }

  function renderMonthModalList() {
    const container = document.getElementById('deadline-month-modal-list');
    if (!container) return;
    if (monthManageProducts.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">Нет продуктов со сроком годности</div>`;
      return;
    }

    container.innerHTML = monthManageProducts.map(p => {
      const emoji = productEmoji(p);
      const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
      const checks = p.monthChecks || [];
      const savedDates = checks.map(c => `
        <span class="deadline-month-saved-date" data-check-id="${c.id}" title="Нажмите, чтобы удалить">${c.period}</span>
      `).join('');

      return `
        <div class="deadline-month-row" data-product-id="${p.id}">
          <div class="deadline-month-row-product">
            <div class="w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center text-lg flex-shrink-0">${emoji}</div>
            <div class="deadline-month-row-info">
              <div class="deadline-month-row-name">${p.name}</div>
              <div class="deadline-month-row-meta">${p.volume || '—'} ${p.unit || 'шт'}</div>
            </div>
          </div>
          <div class="deadline-month-saved-dates">${savedDates}</div>
          <div class="deadline-month-add">
            <input type="text" class="deadline-month-period-input" maxlength="5"
                   placeholder="ММ.ГГ" data-product-id="${p.id}"
                   inputmode="numeric" autocomplete="off" />
            <button type="button" class="btn btn-primary text-xs py-1.5 px-2.5 deadline-month-save-btn"
                    data-product-id="${p.id}" title="Сохранить">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.deadline-month-period-input').forEach(input => {
      input.addEventListener('input', () => {
        input.value = formatPeriodInput(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveMonthProduct(parseInt(input.dataset.productId, 10), input.value, input);
        }
      });
    });

    container.querySelectorAll('.deadline-month-save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = parseInt(btn.dataset.productId, 10);
        const row = btn.closest('.deadline-month-row');
        const input = row?.querySelector('.deadline-month-period-input');
        saveMonthProduct(productId, input?.value || '', input);
      });
    });

    container.querySelectorAll('.deadline-month-saved-date').forEach(el => {
      el.addEventListener('click', () => {
        clearMonthCheck(parseInt(el.dataset.checkId, 10));
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  async function openMonthModal() {
    const backdrop = document.getElementById('deadline-month-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');

    const list = document.getElementById('deadline-month-modal-list');
    if (list) {
      list.innerHTML = `
        <div class="flex items-center justify-center py-8 text-slate-400 text-sm">
          <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i>
          Загрузка...
        </div>`;
    }

    if (window.lucide) lucide.createIcons();

    try {
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
    } catch (err) {
      console.error('Ошибка загрузки настроек месяца:', err);
      if (list) list.innerHTML = `<div class="text-center py-8 text-rose-500 text-sm">${err.message}</div>`;
    }
  }

  function closeMonthModal() {
    document.getElementById('deadline-month-modal-backdrop')?.classList.add('hidden');
    monthManageProducts = [];
  }

  async function saveMonthProduct(productId, rawPeriod, inputEl = null) {
    const period = formatPeriodInput(rawPeriod);
    if (period.length !== 5) {
      alert('Введите период в формате ММ.ГГ (например 11.26)');
      return;
    }
    try {
      await api().setMonthProduct(productId, period);
      if (inputEl) inputEl.value = '';
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
      await renderMonthProducts();
    } catch (err) {
      console.error('Ошибка сохранения периода:', err);
      alert(err.message || 'Не удалось сохранить');
    }
  }

  async function clearMonthCheck(checkId) {
    try {
      await api().deleteMonthCheck(checkId);
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
      await renderMonthProducts();
    } catch (err) {
      console.error('Ошибка удаления периода:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  async function clearProductsAndSetStatus(newStatus) {
    if (!currentRoom) return;
    try {
      await _clearStatuses(currentRoom.id, newStatus);
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
      productSelections = {};
      closeModal();
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Не удалось обновить: ' + err.message);
    }
  }

  async function saveSelections() {
    if (!currentRoom) return;
    const hasSelections = Object.values(productSelections).some(c => c > 0);
    const newRoomStatus = hasSelections ? 'needs_replacement' : 'neutral';
    console.log('💾 Сохраняем:', {
      roomId: currentRoom.id,
      hasSelections,
      newRoomStatus,
      productSelections
    });

    const items = Object.entries(productSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId: parseInt(productId),
        qtyToReplace: qty,
        expiryStatus: 'needs_replacement'
      }));

    try {
      const result = await _saveStatuses(currentRoom.id, items, newRoomStatus);
      console.log('✅ Сохранено:', result);
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
      productSelections = {};
      closeModal();
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Не удалось сохранить: ' + err.message);
    }
  }

  function setEmpty() { clearProductsAndSetStatus('empty'); }
  function setValid() { clearProductsAndSetStatus('valid'); }
  function reset() { clearProductsAndSetStatus('neutral'); }
  function save() { saveSelections(); }

  function closeModal() {
    document.getElementById('deadline-modal-backdrop')?.classList.add('hidden');
    currentRoom = null;
    productSelections = {};
    App.badges.update('deadlines');
  }

  function init() {
    if (!isInitialized) {
      document.getElementById('deadline-modal-backdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'deadline-modal-backdrop') closeModal();
      });
      document.getElementById('deadline-month-modal-backdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'deadline-month-modal-backdrop') closeMonthModal();
      });
      document.getElementById('deadline-month-modal-close')?.addEventListener('click', closeMonthModal);
      document.getElementById('deadlines-month-products-btn')?.addEventListener('click', openMonthModal);
      document.getElementById('deadlines-reset-all-btn')?.addEventListener('click', resetAllRooms);
      isInitialized = true;
    }
    
    // ПОСЛЕДОВАТЕЛЬНО: чтобы не было race condition
    loadRooms()
      .then(() => renderChart())
      .then(() => renderTargets())
      .then(() => refreshDeadlinesExtras());
  }

  async function resetAllRooms() {
    if (!confirm('Сбросить статусы всех номеров и продуктов? Это действие нельзя отменить.')) return;
    try {
      await api().resetAllDeadlines();
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
    } catch (err) {
      console.error('❌ Ошибка сброса:', err);
      alert('Не удалось сбросить: ' + err.message);
    }
  }

  App.badges.register('deadlines', async () => {
    try {
      const data = await api().getDeadlineTargets();
      return Math.max(0, (data.today?.target || 0) - (data.today?.processed || 0));
    } catch {
      return 0;
    }
  });

  return {
    init, openRoomModal, clickProduct, closeModal,
    setEmpty, setValid, save, reset,
    openMonthModal, closeMonthModal
  };
})();```

=== FILE: frontend/js/calculator-module.js ===
```
// МОДУЛЬ КАЛЬКУЛЯТОРА
// ═══════════════════════════════════════════════════════════════
App.calculatorModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  /** @type {Record<number, number>} productId → qty */
  let cart = {};
  let isInitialized = false;
  let isLoaded = false;

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function formatMoney(value) {
    return parseFloat(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' ₽';
  }

  function getQty(productId) {
    return cart[productId] || 0;
  }

  function changeQty(productId, delta) {
    const next = getQty(productId) + delta;
    if (next <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = next;
    }
    renderProducts();
    renderBill();
  }

  function clearBill() {
    cart = {};
    renderProducts();
    renderBill();
  }

  function getProductsByCategory() {
    const grouped = {};
    products.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return CATEGORY_ORDER.map(name => ({
      name,
      items: grouped[name] || []
    }));
  }

  function renderProducts() {
    const container = document.getElementById('calculator-products-container');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }

    const groups = getProductsByCategory();
    container.innerHTML = `
      <div class="calculator-categories-grid">
        ${groups.map(group => `
          <div class="calculator-category-col">
            <div class="calculator-category-header">${escapeHtml(group.name)}</div>
            <div class="calculator-category-items">
              ${group.items.length === 0
                ? '<div class="calculator-category-empty">—</div>'
                : group.items.map(p => {
                    const qty = getQty(p.id);
                    const price = parseFloat(p.price);
                    const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                    return `
                      <div class="calculator-product-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
                        <div class="calculator-product-main">
                          <div class="calculator-product-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
                          <div class="calculator-product-info">
                            <div class="calculator-product-name">${escapeHtml(p.name)}</div>
                            <div class="calculator-product-meta">
                              <span class="calculator-product-price">${formatMoney(price)}</span>
                              <span class="calculator-product-qty">${qty}</span>
                            </div>
                          </div>
                        </div>
                        <div class="calculator-product-controls">
                          <button type="button" class="calc-dec-btn calculator-qty-btn" data-product-id="${p.id}" aria-label="Уменьшить" ${qty === 0 ? 'disabled' : ''}>
                            <i data-lucide="minus" class="w-3 h-3"></i>
                          </button>
                          <button type="button" class="calc-inc-btn calculator-qty-btn" data-product-id="${p.id}" aria-label="Увеличить">
                            <i data-lucide="plus" class="w-3 h-3"></i>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  function renderBill() {
    const emptyEl = document.getElementById('calculator-bill-empty');
    const listEl = document.getElementById('calculator-bill-list');
    const totalEl = document.getElementById('calculator-bill-total');
    const countEl = document.getElementById('calculator-bill-count');
    if (!listEl || !totalEl) return;

    const entries = Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id, 10));
        if (!product) return null;
        const price = parseFloat(product.price);
        return { product, qty, price, subtotal: price * qty };
      })
      .filter(Boolean)
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ru'));

    const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
    const totalSum = entries.reduce((sum, e) => sum + e.subtotal, 0);

    if (countEl) {
      countEl.textContent = totalQty === 0
        ? '0 позиций'
        : `${totalQty} ${pluralize(totalQty, ['позиция', 'позиции', 'позиций'])}`;
    }

    if (entries.length === 0) {
      emptyEl?.classList.remove('hidden');
      listEl.classList.add('hidden');
      listEl.innerHTML = '';
      totalEl.textContent = '0 ₽';
      return;
    }

    emptyEl?.classList.add('hidden');
    listEl.classList.remove('hidden');
    listEl.innerHTML = entries.map(({ product, qty, price, subtotal }) => `
      <div class="calculator-bill-row">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">${escapeHtml(product.name)}</div>
          <div class="text-xs text-slate-500">${qty} × ${formatMoney(price)}</div>
        </div>
        <div class="text-sm font-semibold text-slate-900 whitespace-nowrap ml-3">${formatMoney(subtotal)}</div>
        <button type="button" class="calc-dec-btn calculator-bill-dec ml-2" data-product-id="${product.id}" title="Убрать">
          <i data-lucide="minus" class="w-3 h-3"></i>
        </button>
      </div>
    `).join('');

    totalEl.textContent = formatMoney(totalSum);
    if (window.lucide) lucide.createIcons();
  }

  async function loadProducts() {
    const container = document.getElementById('calculator-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
      renderBill();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
    }
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('calculator-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) clearBill();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#view-calculator')) return;

      const inc = e.target.closest('.calc-inc-btn');
      if (inc) {
        changeQty(parseInt(inc.dataset.productId, 10), 1);
        return;
      }

      const dec = e.target.closest('.calc-dec-btn');
      if (dec) {
        changeQty(parseInt(dec.dataset.productId, 10), -1);
      }
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
      renderBill();
    }
  }

  return { init, clearBill, changeQty };
})();
```

=== FILE: frontend/js/inventory-module.js ===
```
// МОДУЛЬ ИНВЕНТАРИЗАЦИИ
// ═══════════════════════════════════════════════════════════════
App.inventoryModule = (() => {
  const api = () => window.api;
  const { escapeHtml } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  /** @type {Record<number, { a: string, b: string }>} */
  let entries = {};
  let isInitialized = false;
  let isLoaded = false;

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function parseCount(value) {
    const n = parseInt(String(value).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getEntry(productId) {
    return entries[productId] || { a: '', b: '' };
  }

  function getQtySum(productId) {
    const { a, b } = getEntry(productId);
    return parseCount(a) + parseCount(b);
  }

  function getTotalVolume(product) {
    const qty = getQtySum(product.id);
    const unitVol = parseFloat(product.volume) || 0;
    return qty * unitVol;
  }

  function formatVolume(product, total) {
    const unit = product.unit || 'шт';
    if (!total) return `0 ${unit}`;
    const formatted = total.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
    return `${formatted} ${unit}`;
  }

  function getProductsByCategory() {
    const grouped = {};
    products.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return CATEGORY_ORDER.map(name => ({
      name,
      items: grouped[name] || []
    }));
  }

  function updateProductSummary(productId) {
    const product = products.find(p => p.id === productId);
    const card = document.querySelector(`.inventory-product-card[data-product-id="${productId}"]`);
    if (!product || !card) return;

    const qty = getQtySum(productId);
    const totalVol = getTotalVolume(product);

    const qtyEl = card.querySelector('.inventory-product-qty');
    const volEl = card.querySelector('.inventory-product-volume');
    if (qtyEl) qtyEl.textContent = qty;
    if (volEl) volEl.textContent = formatVolume(product, totalVol);
    card.classList.toggle('has-qty', qty > 0);
  }

  function renderProducts() {
    const container = document.getElementById('inventory-products-container');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }

    const groups = getProductsByCategory();
    container.innerHTML = `
      <div class="calculator-categories-grid">
        ${groups.map(group => `
          <div class="calculator-category-col">
            <div class="calculator-category-header">${escapeHtml(group.name)}</div>
            <div class="calculator-category-items">
              ${group.items.length === 0
                ? '<div class="calculator-category-empty">—</div>'
                : group.items.map(p => {
                    const entry = getEntry(p.id);
                    const qty = getQtySum(p.id);
                    const totalVol = getTotalVolume(p);
                    const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                    return `
                      <div class="inventory-product-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
                        <div class="inventory-product-main">
                          <div class="calculator-product-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
                          <div class="calculator-product-name">${escapeHtml(p.name)}</div>
                        </div>
                        <div class="inventory-product-fields">
                          <input type="text" class="inventory-field-input" maxlength="4"
                                 placeholder="0" value="${entry.a}"
                                 data-product-id="${p.id}" data-field="a"
                                 inputmode="numeric" autocomplete="off" />
                          <input type="text" class="inventory-field-input" maxlength="4"
                                 placeholder="0" value="${entry.b}"
                                 data-product-id="${p.id}" data-field="b"
                                 inputmode="numeric" autocomplete="off" />
                        </div>
                        <div class="inventory-product-result">
                          <span class="inventory-product-qty">${qty}</span>
                          <span class="inventory-product-volume">${formatVolume(p, totalVol)}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function clearAll() {
    entries = {};
    renderProducts();
  }

  async function loadProducts() {
    const container = document.getElementById('inventory-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
    }
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('inventory-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(entries).length === 0) return;
      if (confirm('Очистить все введённые данные?')) clearAll();
    });

    document.getElementById('inventory-products-container')?.addEventListener('input', (e) => {
      const input = e.target.closest('.inventory-field-input');
      if (!input) return;

      const productId = parseInt(input.dataset.productId, 10);
      const field = input.dataset.field;
      input.value = input.value.replace(/\D/g, '').slice(0, 4);

      if (!entries[productId]) entries[productId] = { a: '', b: '' };
      entries[productId][field] = input.value;

      if (!input.value && !entries[productId][field === 'a' ? 'b' : 'a']) {
        delete entries[productId];
      }

      updateProductSummary(productId);
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
    }
  }

  return { init, clearAll };
})();
```

=== FILE: frontend/js/settings-module.js ===
```
// МОДУЛЬ НАСТРОЕК
// ═══════════════════════════════════════════════════════════════
App.settingsModule = (() => {
  const api = () => window.api;
  let products = [];
  let templates = [];
  let activeTab = 'products';
  let moduleInitialized = false;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const COLORS = ['amber', 'red', 'blue', 'yellow', 'purple', 'emerald', 'rose', 'orange', 'slate'];

  function getColorClass(color) { return colorMap[color] || 'bg-slate-100'; }
  function getRandomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.settings-tab').forEach(b => {
      const isActive = b.dataset.settingsTab === tab;
      b.classList.toggle('bg-white', isActive);
      b.classList.toggle('shadow-sm', isActive);
      b.classList.toggle('font-medium', isActive);
      b.classList.toggle('text-slate-600', !isActive);
    });
    document.getElementById('settings-products')?.classList.toggle('hidden', tab !== 'products');
    document.getElementById('settings-templates')?.classList.toggle('hidden', tab !== 'templates');
  }

  async function loadProducts() {
    try {
      products = await api().getProducts();
      renderProductsTable();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      const container = document.getElementById('products-table-container');
      if (container) container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Ошибка загрузки</div>';
    }
  }

  function renderProductsTable() {
    const container = document.getElementById('products-table-container');
    if (!container) return;
    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }
    container.innerHTML = `
      <table class="w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Продукт</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Объём</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Цена</th>
            <th class="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-2">Срок</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${products.map(p => `
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg ${getColorClass(p.bgColor)} flex items-center justify-center text-xl">${p.emoji || p.name.charAt(0).toUpperCase()}</div>
                  <span class="text-sm font-medium text-slate-900">${p.name}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">${p.volume || '—'} ${p.unit || 'шт'}</td>
              <td class="px-4 py-3 text-sm text-right">${parseFloat(p.price).toLocaleString('ru-RU')} ₽</td>
              <td class="px-4 py-3 text-center">
                ${p.hasExpiry ? '<span class="badge badge-success">Да</span>' : '<span class="badge badge-muted">Нет</span>'}
              </td>
              <td class="px-4 py-3 text-right">
                <button class="btn btn-ghost edit-product-btn" data-id="${p.id}" title="Редактировать">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button class="btn btn-ghost delete-product-btn" data-id="${p.id}" data-name="${p.name.replace(/"/g, '&quot;')}" title="Удалить" style="color: var(--danger);">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    if (window.lucide) lucide.createIcons();
  }

  function openProductModal(product = null) {
  const title = document.getElementById('product-modal-title');
  if (!title) return;

  title.textContent = product ? 'Редактировать продукт' : 'Новый продукт';
  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('product-name').value = product ? product.name : '';
  document.getElementById('product-price').value = product ? product.price : '';
  document.getElementById('product-volume').value = product ? product.volume : '';
  document.getElementById('product-unit').value = product ? (product.unit || 'шт') : 'шт';
  document.getElementById('product-category').value = product ? (product.category || 'Напитки') : 'Напитки';
  document.getElementById('product-emoji').value = product ? (product.emoji || '') : '';
  document.getElementById('product-has-expiry').checked = product ? product.hasExpiry : true;

  const bgColor = product ? (product.bgColor || 'slate') : getRandomColor();
  document.getElementById('product-bg-color').value = bgColor;

  document.querySelectorAll('.color-option').forEach(btn => {
    if (btn.dataset.color === bgColor) {
      btn.classList.add('border-slate-900', 'ring-2', 'ring-slate-900/20');
    } else {
      btn.classList.remove('border-slate-900', 'ring-2', 'ring-slate-900/20');
    }
  });

  document.getElementById('product-modal-backdrop').classList.remove('hidden');
  setTimeout(updatePreview, 50);
  if (window.lucide) lucide.createIcons();
}

  function closeProductModal() {
    document.getElementById('product-modal-backdrop')?.classList.add('hidden');
  }

  function updatePreview() {
  const name = document.getElementById('product-name')?.value || '';
  const volume = document.getElementById('product-volume')?.value || '0';
  const unit = document.getElementById('product-unit')?.value || 'шт';
  const price = document.getElementById('product-price')?.value || '0';
  const emoji = document.getElementById('product-emoji')?.value;
  const bgColor = document.getElementById('product-bg-color')?.value || 'slate';

  const displayEmoji = emoji || (name ? name.charAt(0).toUpperCase() : '📦');
  const displayName = name ? (name.charAt(0).toUpperCase() + name.slice(1)) : 'Название продукта';

  const previewIcon = document.getElementById('preview-icon');
  const previewName = document.getElementById('preview-name');
  const previewDetails = document.getElementById('preview-details');

  if (previewIcon) {
    previewIcon.className = `w-12 h-12 rounded-lg ${getColorClass(bgColor)} flex items-center justify-center text-2xl`;
    previewIcon.textContent = displayEmoji;
  }
  if (previewName) previewName.textContent = displayName;
  if (previewDetails) previewDetails.textContent = `${volume} ${unit} · ${parseFloat(price || 0).toLocaleString('ru-RU')} ₽`;
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = document.getElementById('product-price').value;
  const volume = document.getElementById('product-volume').value;

  if (!name || price === '' || volume === '') {
    alert('Заполните обязательные поля');
    return;
  }

  const data = {
    name,
    price: parseFloat(price),
    volume: parseFloat(volume),
    unit: document.getElementById('product-unit').value,
    category: document.getElementById('product-category').value,
    emoji: document.getElementById('product-emoji').value || null,
    bgColor: document.getElementById('product-bg-color').value || 'slate',
    hasExpiry: document.getElementById('product-has-expiry').checked
  };

  try {
    let savedProduct;
    if (id) {
      savedProduct = await api().updateProduct(parseInt(id), data);
      // Обновляем локально
      const idx = products.findIndex(p => p.id === parseInt(id));
      if (idx !== -1) products[idx] = savedProduct;
    } else {
      savedProduct = await api().createProduct(data);
      products.push(savedProduct);
    }
    
    closeProductModal();
    renderProductsTable();
    
    // ВСЕГДА перезагружаем шаблоны, чтобы учесть смену категории
    await loadTemplates();
    
  } catch (err) {
    alert('Ошибка сохранения: ' + err.message);
  }
}

  async function deleteProduct(id, name) {
    if (!confirm(`Удалить продукт "${name}"?`)) return;
    try {
      await api().deleteProduct(id);
      await loadProducts();
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadTemplates() {
    try {
      templates = await api().getTemplates();
      if (!products.length) await loadProducts();
      renderTemplates();
    } catch (err) {
      console.error('Ошибка загрузки шаблонов:', err);
    }
  }

  function renderTemplates() {
  ['standard', 'lux'].forEach(cat => {
    const container = document.querySelector(`.template-items-container[data-category="${cat}"]`);
    if (!container) return;
    const template = templates.find(t => t.category === cat);

    if (!template) {
      container.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Шаблон не найден</div>';
      return;
    }

    const items = template.items || [];
    
    // Группируем по категориям
    const categories = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];
    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    
    items.forEach(item => {
  // Берём актуальную категорию из глобального products массива
  const freshProduct = products.find(p => p.id === item.productId);
  const cat = (freshProduct?.category) || item.product.category || 'Напитки';
  
  // Обновляем данные продукта в item для корректного отображения
  if (freshProduct) {
    item.product = { ...item.product, ...freshProduct };
  }
  
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(item);
});

    container.innerHTML = `
      <div class="space-y-4 template-items-list" data-template-id="${template.id}">
        ${categories.map(category => {
          const catItems = grouped[category] || [];
          if (catItems.length === 0) return '';
          return `
            <div class="template-category" data-category-name="${category}">
              <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">${category}</div>
              <div class="space-y-2 sortable-list" data-category="${category}">
                ${catItems.map(item => `
  <div class="template-item flex items-center gap-2 p-2 bg-slate-50 rounded-lg" draggable="true" data-product-id="${item.productId}" data-sort-order="${item.sortOrder}">
    <div class="drag-handle text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
      <i data-lucide="grip-vertical" class="w-4 h-4 pointer-events-none"></i>
    </div>
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(item.product.bgColor)}">${item.product.emoji || item.product.name.charAt(0).toUpperCase()}</div>
      <span class="text-sm font-medium text-slate-900 truncate">${item.product.name}</span>
    </div>
    <div class="text-xs text-slate-500">${item.product.volume || ''} ${item.product.unit || 'шт'}</div>
    <input type="number" min="0" value="${item.qty}" class="qty-input w-16 text-center border border-slate-200 rounded-md px-2 py-1 text-sm" data-product-id="${item.productId}" />
    <button class="remove-item-btn w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500" data-product-id="${item.productId}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
  </div>
`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="mt-3 pt-3 border-t border-slate-100">
        <select class="add-product-select w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white mb-2">
          <option value="">+ Добавить продукт...</option>
          ${products.filter(p => !items.some(i => i.productId === p.id)).map(p => `<option value="${p.id}">${p.emoji || p.name.charAt(0).toUpperCase()} ${p.name} ${p.volume || ''} ${p.unit || 'шт'} (${p.category || 'Напитки'})</option>`).join('')}
        </select>
        <button class="save-template-btn btn btn-primary w-full justify-center"><i data-lucide="save" class="w-4 h-4"></i> Сохранить шаблон</button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    
    // Инициализируем drag-and-drop
    initDragAndDrop(container);
  });
}

function initDragAndDrop(container) {
  let draggedItem = null;
  let isDraggingFromHandle = false;

  // Делегирование: mousedown на всём контейнере
  container.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.drag-handle');
    const item = e.target.closest('.template-item');
    // Запоминаем, был ли клик именно на handle
    isDraggingFromHandle = !!(handle && item);
  });

  // Делегирование: dragstart
  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.template-item');
    if (!item) return;

    // Если начали тянуть НЕ за handle — отменяем
    if (!isDraggingFromHandle) {
      e.preventDefault();
      return;
    }

    draggedItem = item;
    const category = item.closest('.sortable-list')?.dataset.category;
    item.dataset.dragCategory = category;
    setTimeout(() => item.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.productId);
  });

  // Делегирование: dragover
  container.addEventListener('dragover', (e) => {
    if (!draggedItem) return;
    e.preventDefault();

    const targetItem = e.target.closest('.template-item');
    if (!targetItem || targetItem === draggedItem) return;

    // Только внутри той же категории
    const targetCategory = targetItem.closest('.sortable-list')?.dataset.category;
    const draggedCategory = draggedItem.dataset.dragCategory;
    if (targetCategory !== draggedCategory) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    e.dataTransfer.dropEffect = 'move';

    // Определяем позицию
    const rect = targetItem.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    // Убираем старые индикаторы в пределах той же категории
    const parentList = targetItem.closest('.sortable-list');
    parentList.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    if (e.clientY < midpoint) {
      targetItem.classList.add('drag-over-top');
    } else {
      targetItem.classList.add('drag-over-bottom');
    }
  });

  // Делегирование: dragleave
  container.addEventListener('dragleave', (e) => {
    const targetItem = e.target.closest('.template-item');
    if (targetItem) {
      targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });

  // Делегирование: drop
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetItem = e.target.closest('.template-item');
    if (!targetItem || targetItem === draggedItem) return;

    const targetCategory = targetItem.closest('.sortable-list')?.dataset.category;
    const draggedCategory = draggedItem.dataset.dragCategory;
    if (targetCategory !== draggedCategory) return;

    const parent = targetItem.closest('.sortable-list');

    if (targetItem.classList.contains('drag-over-top')) {
      parent.insertBefore(draggedItem, targetItem);
    } else if (targetItem.classList.contains('drag-over-bottom')) {
      parent.insertBefore(draggedItem, targetItem.nextSibling);
    }

    // Очищаем индикаторы
    parent.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  // Делегирование: dragend
  container.addEventListener('dragend', (e) => {
    const item = e.target.closest('.template-item');
    if (item) {
      item.classList.remove('dragging');
      delete item.dataset.dragCategory;
    }
    // Очищаем все индикаторы
    container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    draggedItem = null;
    isDraggingFromHandle = false;
  });
}

function getTemplateState(category) {
  const container = document.querySelector(`.template-items-container[data-category="${category}"]`);
  if (!container) return { templateId: null, items: [] };
  const list = container.querySelector('.template-items-list');
  const templateId = list?.dataset.templateId;
  const items = [];
  let sortOrder = 0;
  container.querySelectorAll('.template-item').forEach(el => {
    const productId = el.dataset.productId;
    const qty = parseInt(el.querySelector('.qty-input').value) || 0;
    if (qty > 0) {
      items.push({ productId, qty, sortOrder: sortOrder++ });
    }
  });
  return { templateId, items };
}

  async function saveTemplate(category) {
    const { templateId, items } = getTemplateState(category);
    if (!templateId) return;
    try {
      await api().updateTemplateItems(templateId, items);
      alert('Шаблон сохранён');
      await loadTemplates();
    } catch (err) {
      alert('Ошибка сохранения: ' + err.message);
    }
  }

  function setupGlobalListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#add-product-btn')) {
        e.preventDefault();
        openProductModal();
        return;
      }

      const editBtn = e.target.closest('.edit-product-btn');
      if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        const product = products.find(p => p.id === id);
        if (product) openProductModal(product);
        return;
      }

      const delBtn = e.target.closest('.delete-product-btn');
      if (delBtn) {
        deleteProduct(parseInt(delBtn.dataset.id), delBtn.dataset.name);
        return;
      }

      const tabBtn = e.target.closest('.settings-tab');
      if (tabBtn) {
        switchTab(tabBtn.dataset.settingsTab);
        return;
      }

      const colorBtn = e.target.closest('.color-option');
      if (colorBtn) {
        document.querySelectorAll('.color-option').forEach(btn => {
          btn.classList.remove('border-slate-900', 'ring-2', 'ring-slate-900/20');
        });
        colorBtn.classList.add('border-slate-900', 'ring-2', 'ring-slate-900/20');
        document.getElementById('product-bg-color').value = colorBtn.dataset.color;
        updatePreview();
        return;
      }

      const incBtn = e.target.closest('.qty-inc-btn');
      if (incBtn) {
        const container = incBtn.closest('.template-items-container');
        const input = container.querySelector(`.qty-input[data-product-id="${incBtn.dataset.productId}"]`);
        if (input) input.value = parseInt(input.value) + 1;
        return;
      }
      const decBtn = e.target.closest('.qty-dec-btn');
      if (decBtn) {
        const container = decBtn.closest('.template-items-container');
        const input = container.querySelector(`.qty-input[data-product-id="${decBtn.dataset.productId}"]`);
        if (input) { const v = parseInt(input.value); if (v > 0) input.value = v - 1; }
        return;
      }

      const removeBtn = e.target.closest('.remove-item-btn');
      if (removeBtn) {
        removeBtn.closest('.template-item')?.remove();
        return;
      }

      const saveBtn = e.target.closest('.save-template-btn');
      if (saveBtn) {
        const category = saveBtn.closest('.template-items-container').dataset.category;
        saveTemplate(category);
        return;
      }
    });

    document.addEventListener('input', (e) => {
      if (['product-name', 'product-volume', 'product-unit', 'product-price', 'product-emoji'].includes(e.target.id)) {
        updatePreview();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'product-unit') updatePreview();

      if (e.target.classList.contains('add-product-select') && e.target.value) {
        const productId = parseInt(e.target.value);
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const list = e.target.closest('.template-items-container').querySelector('.template-items-list');

        const item = document.createElement('div');
        item.className = 'flex items-center gap-2 p-2 bg-slate-50 rounded-lg template-item';
        item.dataset.productId = productId;
        item.innerHTML = `
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(product.bgColor)}">${product.emoji || product.name.charAt(0).toUpperCase()}</div>
            <span class="text-sm font-medium text-slate-900 truncate">${product.name}</span>
          </div>
          <div class="text-xs text-slate-500">${product.volume || ''} ${product.unit || 'шт'}</div>
          <div class="flex items-center gap-1">
            <button class="qty-dec-btn w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center" data-product-id="${productId}"><i data-lucide="minus" class="w-3 h-3"></i></button>
            <input type="number" min="0" value="1" class="qty-input w-14 text-center border border-slate-200 rounded-md px-2 py-1 text-sm" data-product-id="${productId}" />
            <button class="qty-inc-btn w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center" data-product-id="${productId}"><i data-lucide="plus" class="w-3 h-3"></i></button>
          </div>
          <button class="remove-item-btn w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500" data-product-id="${productId}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        `;
        list.appendChild(item);
        e.target.value = '';
        if (window.lucide) lucide.createIcons();
      }
    });

    document.addEventListener('submit', (e) => {
      if (e.target.id === 'product-form') {
        e.preventDefault();
        handleProductSubmit(e);
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.id === 'product-modal-backdrop') closeProductModal();
    });

    document.addEventListener('input', (e) => {
  if (['product-name', 'product-volume', 'product-unit', 'product-price', 'product-emoji'].includes(e.target.id)) {
    updatePreview();
  }
});
  }

  function init() {
    if (!moduleInitialized) {
      setupGlobalListeners();
      moduleInitialized = true;
    }
    loadProducts();
    loadTemplates();
  }

  return { init, closeProductModal };
})();
```

=== FILE: backend/src/app.js ===
```
import express from 'express';
import cors from 'cors';
import deadlinesRouter from './routes/deadlines.js';
import roomsRouter from './routes/rooms.js';
import productsRouter from './routes/products.js';
import templatesRouter from './routes/templates.js';
import checksRouter from './routes/checks.js';
import excisesRouter from './routes/excises.js';
import listsRouter from './routes/lists.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

  app.use('/api/deadlines', deadlinesRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/checks', checksRouter);
  app.use('/api/excises', excisesRouter);
  app.use('/api/lists', listsRouter);

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
```

=== FILE: backend/src/routes/deadlines.js ===
```
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  buildTargetsResponse,
  upsertTodayRoomStats,
  updateAllTargets
} from '../services/deadlines.js';
import {
  parsePeriod,
  formatPeriod,
  isAssignmentActive,
  isCurrentOrNextCheckMonth,
  purgeExpiredMonthChecks
} from '../services/monthChecks.js';
import { clientOffset, getLocalParts, dateFromParts, endOfLocalMonth } from '../lib/timezone.js';

const router = Router();

router.get('/month-products', async (req, res) => {
  try {
    const offset = clientOffset(req);  // ← ДОБАВЛЕНО
    await purgeExpiredMonthChecks(prisma, offset);
    const now = new Date();
    const items = await prisma.productMonthCheck.findMany({
      include: { product: true },
      orderBy: { product: { name: 'asc' } }
    });

    const active = items.filter(i =>
      isAssignmentActive(i.checkMonth, i.checkYear, now, offset) &&
      isCurrentOrNextCheckMonth(i.checkMonth, i.checkYear, now, offset)
    );

    res.json(active.map(i => ({
      id: i.id,
      productId: i.productId,
      checkMonth: i.checkMonth,
      checkYear: i.checkYear,
      period: formatPeriod(i.checkMonth, i.checkYear),
      product: i.product
    })));
  } catch (err) {
    console.error('GET deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/month-products/manage', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await purgeExpiredMonthChecks(prisma, offset);
    const [products, checks] = await Promise.all([
      prisma.product.findMany({
        where: { hasExpiry: true },
        orderBy: { name: 'asc' }
      }),
      prisma.productMonthCheck.findMany({ orderBy: [{ checkYear: 'asc' }, { checkMonth: 'asc' }] })
    ]);

    const checksByProduct = {};
    checks.forEach(c => {
      if (!isAssignmentActive(c.checkMonth, c.checkYear, new Date(), offset)) return;
      if (!checksByProduct[c.productId]) checksByProduct[c.productId] = [];
      checksByProduct[c.productId].push({
        id: c.id,
        checkMonth: c.checkMonth,
        checkYear: c.checkYear,
        period: formatPeriod(c.checkMonth, c.checkYear)
      });
    });

    res.json(products.map(p => ({
      ...p,
      monthChecks: checksByProduct[p.id] || []
    })));
  } catch (err) {
    console.error('GET deadlines/month-products/manage error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/month-products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const checkId = req.body.checkId ? parseInt(req.body.checkId, 10) : null;
    const parsed = parsePeriod(req.body.period);
    if (!parsed) {
      return res.status(400).json({ error: 'Укажите период в формате MM.YY (например 11.26)' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Продукт не найден' });

    if (checkId) {
      const existing = await prisma.productMonthCheck.findFirst({
        where: { id: checkId, productId }
      });
      if (!existing) return res.status(404).json({ error: 'Запись не найдена' });

      const duplicate = await prisma.productMonthCheck.findFirst({
        where: {
          productId,
          checkMonth: parsed.month,
          checkYear: parsed.year,
          NOT: { id: checkId }
        }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Такой период уже добавлен для этого продукта' });
      }

      const result = await prisma.productMonthCheck.update({
        where: { id: checkId },
        data: { checkMonth: parsed.month, checkYear: parsed.year },
        include: { product: true }
      });

      return res.json({
        ...result,
        period: formatPeriod(result.checkMonth, result.checkYear)
      });
    }

    const duplicate = await prisma.productMonthCheck.findFirst({
      where: {
        productId,
        checkMonth: parsed.month,
        checkYear: parsed.year
      }
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Такой период уже добавлен для этого продукта' });
    }

    const result = await prisma.productMonthCheck.create({
      data: { productId, checkMonth: parsed.month, checkYear: parsed.year },
      include: { product: true }
    });

    res.json({
      ...result,
      period: formatPeriod(result.checkMonth, result.checkYear)
    });
  } catch (err) {
    console.error('PUT deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/month-products/check/:checkId', async (req, res) => {
  try {
    const checkId = parseInt(req.params.checkId, 10);
    await prisma.productMonthCheck.deleteMany({ where: { id: checkId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE deadlines/month-products/check error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/month-products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    await prisma.productMonthCheck.deleteMany({ where: { productId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/replacement-summary', async (req, res) => {
  try {
    const rows = await prisma.roomProductStatus.findMany({
      where: { qtyToReplace: { gt: 0 } },
      include: { product: true }
    });

    const byProduct = {};
    rows.forEach(row => {
      if (!byProduct[row.productId]) {
        byProduct[row.productId] = {
          productId: row.productId,
          product: row.product,
          totalQty: 0
        };
      }
      byProduct[row.productId].totalQty += row.qtyToReplace;
    });

    const items = Object.values(byProduct).sort((a, b) =>
      a.product.name.localeCompare(b.product.name, 'ru')
    );

    res.json({ items, totalQty: items.reduce((s, i) => s + i.totalQty, 0) });
  } catch (err) {
    console.error('GET deadlines/replacement-summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/targets', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const result = await prisma.$transaction(tx => buildTargetsResponse(tx, offset));
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    res.json(result);
  } catch (err) {
    console.error('GET deadlines/targets error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const now = new Date();
    const parts = getLocalParts(now, offset);
    const currentMonthStart = dateFromParts({ year: parts.year, month: parts.month, day: 1 });
    const prevMonth = parts.month === 1 ? 12 : parts.month - 1;
    const prevYear = parts.month === 1 ? parts.year - 1 : parts.year;
    const prevMonthStart = dateFromParts({ year: prevYear, month: prevMonth, day: 1 });
    const prevMonthEnd = endOfLocalMonth(prevMonthStart, offset);

    const [currentStats, prevStats] = await Promise.all([
      prisma.deadlineDailyStat.findMany({
        where: { date: { gte: currentMonthStart } },
        orderBy: { date: 'asc' }
      }),
      prisma.deadlineDailyStat.findMany({
        where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
        orderBy: { date: 'asc' }
      })
    ]);

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    res.json({
      current: currentStats,
      previous: prevStats,
      currentMonth: parts.month,
      currentYear: parts.year
    });
  } catch (err) {
    console.error('GET deadlines/stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/update-stats', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const result = await prisma.$transaction(tx => upsertTodayRoomStats(tx, offset));
    res.json(result);
  } catch (err) {
    console.error('POST deadlines/update-stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;```

=== FILE: backend/src/routes/rooms.js ===
```
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { upsertTodayRoomStats, updateAllTargets } from '../services/deadlines.js';
import { clientOffset, startOfLocalDay } from '../lib/timezone.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { floor, category, status } = req.query;
    const where = {};
    if (floor) where.floor = parseInt(floor, 10);
    if (category) where.category = category;
    if (status) where.expiryStatus = status;

    const rooms = await prisma.room.findMany({
      where,
      include: { template: { include: { items: { include: { product: true } } } } },
      orderBy: { number: 'asc' }
    });
    res.json(rooms);
  } catch (err) {
    console.error('GET rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-all-deadlines', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({});
      await tx.room.updateMany({ data: { expiryStatus: 'neutral' } });
      
      const today = startOfLocalDay(new Date(), offset);
      const totalRooms = await tx.room.count();

      await tx.deadlineDailyStat.upsert({
        where: { date: today },
        update: {
          validCount: 0,
          emptyCount: 0,
          needsReplacementCount: 0,
          neutralCount: totalRooms
        },
        create: {
          date: today,
          validCount: 0,
          emptyCount: 0,
          needsReplacementCount: 0,
          neutralCount: totalRooms
        }
      });
      
      // ПЕРЕСОЗДАЁМ цель на сегодня: после сброса все neutral = все плохие
      // startBadCount = totalRooms, и при обработке номера processed будет расти правильно
      await tx.deadlineTarget.deleteMany({ where: { date: today } });
      
      // updateAllTargets создаст новую запись с правильным startBadCount = badCount (= totalRooms)
      await updateAllTargets(tx, offset);
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset all deadlines error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        template: { include: { items: { include: { product: true } } } },
        customs: { include: { product: true } },
        replacementItems: { include: { product: true } }
      }
    });
    if (!room) return res.status(404).json({ error: 'Not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body
    });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/product-statuses', async (req, res) => {
  try {
    const statuses = await prisma.roomProductStatus.findMany({
      where: { roomId: parseInt(req.params.id, 10) },
      include: { product: true }
    });
    res.json(statuses);
  } catch (err) {
    console.error('GET product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { items, roomStatus } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({ where: { roomId } });

      if (items?.length > 0) {
        const toCreate = items
          .filter(i => (i.qtyToReplace && i.qtyToReplace > 0) || i.expiryStatus === 'needs_replacement')
          .map(i => ({
            roomId,
            productId: parseInt(i.productId, 10),
            expiryStatus: i.expiryStatus || 'needs_replacement',
            qtyToReplace: parseInt(i.qtyToReplace, 10) || 0,
            checkedAt: new Date()
          }));

        if (toCreate.length > 0) {
          await tx.roomProductStatus.createMany({ data: toCreate });
        }
      }

      if (roomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { expiryStatus: roomStatus }
        });
      }

      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    const updated = await prisma.roomProductStatus.findMany({
      where: { roomId },
      include: { product: true }
    });
    res.json({ ok: true, statuses: updated });
  } catch (err) {
    console.error('PUT product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { roomStatus } = req.body || {};

    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({ where: { roomId } });
      if (roomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { expiryStatus: roomStatus }
        });
      }
      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

=== FILE: backend/src/routes/excises.js ===
```
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const excises = await prisma.excise.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(excises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { mark_number } = req.body;
    if (!mark_number) return res.status(400).json({ error: 'mark_number required' });

    const existing = await prisma.excise.findFirst({ where: { markNumber: mark_number } });
    if (existing) return res.json({ ...existing, _duplicate: true });

    const excise = await prisma.excise.create({ data: { markNumber: mark_number } });
    res.json({ ...excise, _duplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const result = await prisma.excise.deleteMany({});
    res.json({ ok: true, deleted: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.excise.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

=== FILE: backend/src/routes/products.js ===
```
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (err) {
    console.error('GET products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price, volume, unit, hasExpiry, emoji, bgColor, category } = req.body;
    if (!name || price === undefined || volume === undefined) {
      return res.status(400).json({ error: 'Название, цена и объём обязательны' });
    }
    const product = await prisma.product.create({
      data: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        price: parseFloat(price),
        volume: parseFloat(volume),
        unit: unit || 'шт',
        emoji: emoji || null,
        bgColor: bgColor || 'slate',
        category: category || 'Напитки',
        hasExpiry: hasExpiry !== false && hasExpiry !== 'false'
      }
    });
    res.json(product);
  } catch (err) {
    console.error('POST products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, price, volume, unit, hasExpiry, emoji, bgColor, category } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id, 10) },
      data: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        price: parseFloat(price),
        volume: parseFloat(volume),
        unit: unit || 'шт',
        emoji: emoji || null,
        bgColor: bgColor || 'slate',
        category: category || 'Напитки',
        hasExpiry: hasExpiry !== false && hasExpiry !== 'false'
      }
    });
    res.json(product);
  } catch (err) {
    console.error('PUT products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const inTemplate = await prisma.templateItem.count({ where: { productId } });
    if (inTemplate > 0) {
      return res.status(400).json({
        error: `Продукт используется в ${inTemplate} шаблон(ах). Сначала удалите его из шаблонов.`
      });
    }
    await prisma.product.delete({ where: { id: productId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

=== FILE: backend/src/services/deadlines.js ===
```
import {
  startOfLocalDay,
  endOfLocalMonth,
  addLocalDays,
  daysLeftInclusive
} from '../lib/timezone.js';

const BAD_STATUSES = ['neutral', 'needs_replacement'];

export async function getBadCount(tx) {
  return tx.room.count({
    where: { expiryStatus: { in: BAD_STATUSES } }
  });
}

export async function recalcTomorrowTarget(tx, offsetMinutes = null) {
  const now = new Date();
  const tomorrow = addLocalDays(startOfLocalDay(now, offsetMinutes), 1, offsetMinutes);
  const monthEnd = endOfLocalMonth(now, offsetMinutes);
  const daysLeft = daysLeftInclusive(tomorrow, monthEnd);
  const badCount = await getBadCount(tx);
  const target = Math.ceil(badCount / daysLeft);
  
  await tx.deadlineTarget.upsert({
    where: { date: tomorrow },
    update: { targetCount: target },
    create: { date: tomorrow, targetCount: target, startBadCount: 0, lockedAt: null }
  });
  
  return { target, daysLeft, badCount };
}

export async function ensureTodayTarget(tx, offsetMinutes = null) {
  const today = startOfLocalDay(new Date(), offsetMinutes);
  
  // Пытаемся найти существующую запись
  let todayTarget = await tx.deadlineTarget.findUnique({ where: { date: today } });
  
  // КРИТИЧНО: если цель УЖЕ зафиксирована — возвращаем как есть, НИЧЕГО не меняем
  if (todayTarget?.lockedAt) {
    console.log('🔒 Today target locked:', { 
      date: today.toISOString().split('T')[0],
      startBad: todayTarget.startBadCount,
      target: todayTarget.targetCount
    });
    return todayTarget;
  }
  
  const badCount = await getBadCount(tx);
  const daysLeft = daysLeftInclusive(today, endOfLocalMonth(new Date(), offsetMinutes));
  const target = Math.ceil(badCount / Math.max(1, daysLeft));
  
  if (!todayTarget) {
    console.log('🆕 Creating today target:', { 
      date: today.toISOString().split('T')[0], 
      badCount, 
      target 
    });
    return tx.deadlineTarget.create({
      data: {
        date: today,
        targetCount: target,
        startBadCount: badCount,
        lockedAt: new Date()
      }
    });
  }
  
  // Обновляем незафиксированную запись
  console.log('🔧 Locking existing target:', { 
    date: today.toISOString().split('T')[0], 
    badCount, 
    target 
  });
  return tx.deadlineTarget.update({
    where: { date: today },
    data: { lockedAt: new Date(), startBadCount: badCount, targetCount: target }
  });
}

export async function updateAllTargets(tx, offsetMinutes = null) {
  await ensureTodayTarget(tx, offsetMinutes);
  await recalcTomorrowTarget(tx, offsetMinutes);
}

export async function upsertTodayRoomStats(tx, offsetMinutes = null) {
  const today = startOfLocalDay(new Date(), offsetMinutes);
  const counts = await tx.room.groupBy({
    by: ['expiryStatus'],
    _count: { id: true }
  });
  const stats = { valid: 0, empty: 0, needs_replacement: 0, neutral: 0 };
  counts.forEach(c => { stats[c.expiryStatus] = c._count.id; });
  
  return tx.deadlineDailyStat.upsert({
    where: { date: today },
    update: {
      validCount: stats.valid,
      emptyCount: stats.empty,
      needsReplacementCount: stats.needs_replacement,
      neutralCount: stats.neutral
    },
    create: {
      date: today,
      validCount: stats.valid,
      emptyCount: stats.empty,
      needsReplacementCount: stats.needs_replacement,
      neutralCount: stats.neutral
    }
  });
}

export async function buildTargetsResponse(tx, offsetMinutes = null) {
  const todayTarget = await ensureTodayTarget(tx, offsetMinutes);
  const tomorrowData = await recalcTomorrowTarget(tx, offsetMinutes);
  const badCount = await getBadCount(tx);
  const totalRooms = await tx.room.count();
  const processedToday = Math.max(0, todayTarget.startBadCount - badCount);
  
  console.log('🎯 Targets:', {
    date: todayTarget.date,
    startBadCount: todayTarget.startBadCount,
    currentBadCount: badCount,
    target: todayTarget.targetCount,
    processed: processedToday,
    lockedAt: todayTarget.lockedAt
  });
  
  const percentage = todayTarget.targetCount > 0
    ? Math.min(100, Math.round((processedToday / todayTarget.targetCount) * 100))
    : 0;

  return {
    today: {
      target: todayTarget.targetCount,
      processed: processedToday,
      percentage,
      startBadCount: todayTarget.startBadCount
    },
    tomorrow: {
      target: tomorrowData.target,
      daysLeft: tomorrowData.daysLeft
    },
    summary: {
      badCount,
      totalRooms,
      goodCount: totalRooms - badCount
    }
  };
}```

=== FILE: backend/src/services/monthChecks.js ===
```
/** MM.YY — год двумя цифрами (26 → 2026) */
import { getLocalParts } from '../lib/timezone.js';

export function fullYearFromShort(year2) {
  return 2000 + year2;
}

export function formatPeriod(month, year2) {
  return `${String(month).padStart(2, '0')}.${String(year2).padStart(2, '0')}`;
}

/** Парсит "11.26" или "1126" */
export function parsePeriod(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 4) return null;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = parseInt(digits.slice(2, 4), 10);
  if (month < 1 || month > 12) return null;
  return { month, year, period: formatPeriod(month, year) };
}

/** Активна до начала месяца, следующего за указанным (11.26 → до 12.26) */
export function isAssignmentActive(month, year2, now = new Date(), offsetMinutes = null) {
  const fullYear = fullYearFromShort(year2);
  const expiryYear = month === 12 ? fullYear + 1 : fullYear;
  const expiryMonth = month === 12 ? 1 : month + 1;
  const { year: cy, month: cm } = getLocalParts(now, offsetMinutes);
  if (cy < expiryYear) return true;
  if (cy === expiryYear && cm < expiryMonth) return true;
  return false;
}

export function isCurrentCheckMonth(month, year2, now = new Date(), offsetMinutes = null) {
  const { month: cm, year: cy } = getLocalParts(now, offsetMinutes);
  return cm === month && cy === fullYearFromShort(year2);
}

/** Текущий или следующий календарный месяц (12.25 → 01.26) */
export function isCurrentOrNextCheckMonth(month, year2, now = new Date(), offsetMinutes = null) {
  if (isCurrentCheckMonth(month, year2, now, offsetMinutes)) return true;

  const { month: cm, year: cy } = getLocalParts(now, offsetMinutes);
  const nextMonth = cm === 12 ? 1 : cm + 1;
  const nextYear = cm === 12 ? cy + 1 : cy;

  return month === nextMonth && fullYearFromShort(year2) === nextYear;
}

export async function purgeExpiredMonthChecks(prisma, offsetMinutes = null) {
  const all = await prisma.productMonthCheck.findMany();
  const now = new Date();
  const expiredIds = all
    .filter(r => !isAssignmentActive(r.checkMonth, r.checkYear, now, offsetMinutes))
    .map(r => r.id);
  if (expiredIds.length > 0) {
    await prisma.productMonthCheck.deleteMany({ where: { id: { in: expiredIds } } });
  }
  return expiredIds.length;
}
```

=== FILE: backend/src/lib/timezone.js ===
```
/** Смещение клиента: минуты UTC−local (как Date.getTimezoneOffset()) */
export function clientOffset(req) {
  const raw = req?.headers?.['x-timezone-offset'];
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function fallbackTimeZone() {
  return process.env.APP_TIMEZONE || process.env.TZ || 'Europe/Moscow';
}

/** Календарная дата в локальной зоне клиента или APP_TIMEZONE */
export function getLocalParts(date = new Date(), offsetMinutes = null) {
  if (offsetMinutes != null) {
    const localMs = date.getTime() - offsetMinutes * 60 * 1000;
    const ld = new Date(localMs);
    return {
      year: ld.getUTCFullYear(),
      month: ld.getUTCMonth() + 1,
      day: ld.getUTCDate()
    };
  }

  const tz = fallbackTimeZone();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [year, month, day] = formatter.format(date).split('-').map(Number);
  return { year, month, day };
}

/** Date-only для Prisma @db.Date (полночь UTC календарного дня) */
export function dateFromParts({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfLocalDay(date = new Date(), offsetMinutes = null) {
  const { year, month, day } = getLocalParts(date, offsetMinutes);
  return dateFromParts({ year, month, day });
}

export function endOfLocalMonth(date = new Date(), offsetMinutes = null) {
  const { year, month } = getLocalParts(date, offsetMinutes);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return dateFromParts({ year, month, day: lastDay });
}

export function addLocalDays(date, days, offsetMinutes = null) {
  const { year, month, day } = getLocalParts(date, offsetMinutes);
  return new Date(Date.UTC(year, month - 1, day + days));
}

export function daysLeftInclusive(fromDate, endDate) {
  return Math.max(1, Math.ceil((endDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
}
```

=== FILE: backend/prisma/schema.prisma ===
```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RoomCategory {
  standard
  lux
}

enum ExpiryStatus {
  neutral
  valid
  needs_replacement
  empty
}

enum CheckType {
  checked
  emptied
  gih
}

enum GihRoomSt {
  dnd
  all_in_place
  all_out
  empty
}

enum GihItemSt {
  replenished
  in_place
  out
  not_replenished
}

model Product {
  id         Int      @id @default(autoincrement())
  name       String   @db.VarChar(200)
  price      Decimal  @db.Decimal(10,2)
  volume     Decimal? @db.Decimal(10,3)
  unit       String?  @default("шт") @db.VarChar(10)
  emoji      String?  @db.VarChar(10)
  bgColor    String?  @default("slate") @map("bg_color") @db.VarChar(20)
  category   String?  @default("Напитки") @db.VarChar(50)
  hasExpiry  Boolean  @default(true) @map("has_expiry")
  createdAt  DateTime @default(now()) @map("created_at")

  templateItems     TemplateItem[]
  roomCustoms       RoomCustom[]
  replacementItems  ReplacementItem[]
  gihItems          GihItem[]
  productStatuses   RoomProductStatus[]
  monthChecks         ProductMonthCheck[]

  @@map("products")
}

model FillTemplate {
  id         Int            @id @default(autoincrement())
  name       String         @db.VarChar(150)
  category   RoomCategory
  isDefault  Boolean        @default(false) @map("is_default")
  createdAt  DateTime       @default(now()) @map("created_at")

  items  TemplateItem[]
  rooms  Room[]

  @@unique([category, name])
  @@map("fill_templates")
}

model TemplateItem {
  id          Int @id @default(autoincrement())
  templateId  Int @map("template_id")
  productId   Int @map("product_id")
  qty         Int
  sortOrder   Int @default(0) @map("sort_order")

  template FillTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  product  Product      @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([templateId, productId])
  @@map("template_items")
}

model Room {
  id             Int           @id @default(autoincrement())
  number         Int           @unique
  floor          Int
  category       RoomCategory
  expiryStatus   ExpiryStatus  @default(neutral) @map("expiry_status")
  templateId     Int?          @map("template_id")
  notes          String?
  updatedAt      DateTime      @default(now()) @updatedAt @map("updated_at")

  template         FillTemplate?       @relation(fields: [templateId], references: [id])
  customs          RoomCustom[]
  replacementItems ReplacementItem[]
  checks           Check[]
  listRooms        ListRoom[]
  productStatuses  RoomProductStatus[]

  @@map("rooms")
}

model RoomProductStatus {
  id             Int      @id @default(autoincrement())
  roomId         Int      @map("room_id")
  productId      Int      @map("product_id")
  expiryStatus   String   @default("ok") @map("expiry_status") @db.VarChar(20)
  qtyToReplace   Int      @default(0) @map("qty_to_replace")
  checkedAt      DateTime @default(now()) @map("checked_at")

  room    Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([roomId, productId])
  @@map("room_product_statuses")
}

model RoomCustom {
  id        Int     @id @default(autoincrement())
  roomId    Int     @map("room_id")
  productId Int     @map("product_id")
  qty       Int
  isEnabled Boolean @default(true) @map("is_enabled")

  room    Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([roomId, productId])
  @@map("room_customs")
}

model ReplacementItem {
  id        Int     @id @default(autoincrement())
  roomId    Int     @map("room_id")
  productId Int     @map("product_id")
  notes     String?

  room    Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([roomId, productId])
  @@map("replacement_items")
}

model Check {
  id             Int         @id @default(autoincrement())
  roomId         Int         @map("room_id")
  checkDate      DateTime    @default(now()) @map("check_date")
  type           CheckType
  gihRoomStatus  GihRoomSt?  @map("gih_room_status")
  inspectorName  String?     @db.VarChar(150) @map("inspector_name")
  notes          String?
  createdAt      DateTime    @default(now()) @map("created_at")

  room     Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  gihItems GihItem[]

  @@map("checks")
}

model GihItem {
  id         Int       @id @default(autoincrement())
  checkId    Int       @map("check_id")
  productId  Int       @map("product_id")
  itemStatus GihItemSt @default(in_place) @map("item_status")
  notes      String?

  check   Check   @relation(fields: [checkId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([checkId, productId])
  @@map("gih_items")
}

model Excise {
  id          Int      @id @default(autoincrement())
  markNumber  String   @map("mark_number")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("excises")
}

model ActiveList {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(150)
  listType  String   @default("active") @map("list_type")
  createdAt DateTime @default(now()) @map("created_at")

  rooms ListRoom[]

  @@map("active_lists")
}

model ListRoom {
  id       Int      @id @default(autoincrement())
  listId   Int      @map("list_id")
  roomId   Int      @map("room_id")
  addedAt  DateTime @default(now()) @map("added_at")

  list ActiveList @relation(fields: [listId], references: [id], onDelete: Cascade)
  room Room       @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([listId, roomId])
  @@map("list_rooms")
}

model Setting {
  key       String   @id @db.VarChar(100)
  value     String?
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("settings")
}

model DeadlineDailyStat {
  id                     Int      @id @default(autoincrement())
  date                   DateTime @db.Date
  validCount             Int      @default(0) @map("valid_count")
  emptyCount             Int      @default(0) @map("empty_count")
  needsReplacementCount  Int      @default(0) @map("needs_replacement_count")
  neutralCount           Int      @default(0) @map("neutral_count")
  updatedAt              DateTime @default(now()) @updatedAt @map("updated_at")

  @@unique([date])
  @@map("deadline_daily_stats")
}

model DeadlineTarget {
  id            Int       @id @default(autoincrement())
  date          DateTime  @db.Date
  targetCount   Int       @map("target_count")
  startBadCount Int       @default(0) @map("start_bad_count")
  lockedAt      DateTime? @map("locked_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@unique([date])
  @@map("deadline_targets")
}

model ProductMonthCheck {
  id         Int      @id @default(autoincrement())
  productId  Int      @map("product_id")
  checkMonth Int      @map("check_month")
  checkYear  Int      @map("check_year")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, checkMonth, checkYear])
  @@map("product_month_checks")
}```

=== FILE: docker-compose.yml ===
```
services:
  db:
    image: postgres:15-alpine
    container_name: minibar-db
    environment:
      POSTGRES_DB: minibar_db
      POSTGRES_USER: minibar
      POSTGRES_PASSWORD: minibar_pass
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minibar -d minibar_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: minibar-api
    environment:
      DATABASE_URL: postgresql://minibar:minibar_pass@db:5432/minibar_db
      PORT: 3000
      NODE_ENV: development
      TZ: Europe/Moscow
      APP_TIMEZONE: Europe/Moscow
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: minibar-web
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  db_data:```

```

---

## `minibar-os/docker-compose.yml`

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: minibar-db
    environment:
      POSTGRES_DB: minibar_db
      POSTGRES_USER: minibar
      POSTGRES_PASSWORD: minibar_pass
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minibar -d minibar_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: minibar-api
    environment:
      DATABASE_URL: postgresql://minibar:minibar_pass@db:5432/minibar_db
      PORT: 3000
      NODE_ENV: development
      TZ: Europe/Moscow
      APP_TIMEZONE: Europe/Moscow
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: minibar-web
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  db_data:
```

---

## `minibar-os/frontend/Dockerfile`

```
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY config.js /usr/share/nginx/html/config.js
COPY styles.css /usr/share/nginx/html/styles.css
COPY js/ /usr/share/nginx/html/js/
COPY nginx.conf /etc/nginx/conf.d/default.conf

```

---

## `minibar-os/frontend/config.js`

```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

async function apiRequest(path, options = {}) {
  const headers = {
    'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  async getDeadlineTargets() {
    return apiRequest(`/deadlines/targets?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getDeadlineStats() {
    return apiRequest(`/deadlines/stats?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getRoomProductStatuses(roomId) {
    return apiRequest(`/rooms/${roomId}/product-statuses`);
  },
  async saveRoomProductStatuses(roomId, items, roomStatus) {
    return apiRequest(`/rooms/${roomId}/product-statuses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, roomStatus })
    });
  },
  async clearRoomProductStatuses(roomId, roomStatus) {
    return apiRequest(`/rooms/${roomId}/product-statuses`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomStatus })
    });
  },
  async resetAllDeadlines() {
    return apiRequest('/rooms/reset-all-deadlines', { method: 'POST' });
  },
  async getRooms(filters = {}) {
    const params = new URLSearchParams(filters);
    const query = params.toString();
    return apiRequest(`/rooms${query ? `?${query}` : ''}`);
  },
  async updateRoomStatus(roomId, status) {
    return apiRequest(`/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryStatus: status })
    });
  },
  async getProducts() {
    return apiRequest('/products');
  },
  async createProduct(data) {
    return apiRequest('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async updateProduct(id, data) {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async deleteProduct(id) {
    return apiRequest(`/products/${id}`, { method: 'DELETE' });
  },
  async getTemplates() {
    return apiRequest('/templates');
  },
  async updateTemplateItems(templateId, items) {
    return apiRequest(`/templates/${templateId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
  },
  async getChecks(limit = 50) {
    return apiRequest(`/checks?limit=${limit}`);
  },
  async getExcises() {
    return apiRequest('/excises');
  },
  async createExcise(markNumber) {
    return apiRequest('/excises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_number: markNumber })
    });
  },
  async deleteExcise(id) {
    return apiRequest(`/excises/${id}`, { method: 'DELETE' });
  },
  async deleteAllExcises() {
    return apiRequest('/excises', { method: 'DELETE' });
  },
  async getLists() {
    return apiRequest('/lists');
  },
  async getMonthProducts() {
    return apiRequest(`/deadlines/month-products?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getMonthProductsManage() {
    return apiRequest(`/deadlines/month-products/manage?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async setMonthProduct(productId, period, checkId = null) {
    return apiRequest(`/deadlines/month-products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, checkId })
    });
  },
  async deleteMonthCheck(checkId) {
    return apiRequest(`/deadlines/month-products/check/${checkId}`, { method: 'DELETE' });
  },
  async deleteMonthProduct(productId) {
    return apiRequest(`/deadlines/month-products/${productId}`, { method: 'DELETE' });
  },
  async getReplacementSummary() {
    return apiRequest(`/deadlines/replacement-summary?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  }
};

window.api = api;
window.API_BASE = API_BASE;

document.addEventListener('DOMContentLoaded', () => {
  if (window.App) {
    window.App.api = api;
  }
});
```

---

## `minibar-os/frontend/index.html`

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MiniBar OS</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/index.css" />
<link rel="stylesheet" href="styles.css?v=m4" />
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
</head>
<body class="antialiased">

<div class="flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="w-64 bg-white border-r border-slate-200 flex flex-col">
    <div class="p-5 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <i data-lucide="box" class="w-4 h-4 text-white"></i>
        </div>
        <span class="font-bold text-slate-900">MiniBar OS</span>
      </div>
    </div>
    <nav class="flex-1 p-3 overflow-y-auto scrollbar">
      <!-- Обзор -->
      <a data-route="dashboard" data-accent="indigo" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="layout-dashboard" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Обзор</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Акцизы и Сроки -->
      <a data-route="excise" data-accent="amber" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="stamp" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Акцизы</span>
        <span id="excise-badge" class="ml-auto badge badge-warning hidden">0</span>
      </a>
      <a data-route="deadlines" data-accent="rose" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="calendar" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Сроки</span>
        <span id="deadlines-badge" class="ml-auto badge badge-danger hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Операции с номерами -->
      <a data-route="arrivals" data-accent="emerald" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="plane-landing" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Arrivals</span>
        <span id="arrivals-badge" class="ml-auto badge badge-success hidden">0</span>
      </a>
      <a data-route="departures" data-accent="sky" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="plane-takeoff" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Departures</span>
        <span id="departures-badge" class="ml-auto badge badge-info hidden">0</span>
      </a>
      <a data-route="gih" data-accent="violet" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="clipboard-check" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>GIH</span>
        <span id="gih-badge" class="ml-auto badge badge-primary hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Отчёты -->
      <a data-route="history" data-accent="slate" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="history" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>История</span>
        <span id="history-badge" class="ml-auto badge badge-muted hidden">0</span>
      </a>
      <a data-route="empty" data-accent="pink" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="alert-circle" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Пустые</span>
        <span id="empty-badge" class="ml-auto badge badge-rose hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Инструменты -->
      <a data-route="calculator" data-accent="teal" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="calculator" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Калькулятор</span>
      </a>
      <a data-route="inventory" data-accent="blue" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="clipboard-list" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Инвентаризация</span>
        <span id="inventory-badge" class="ml-auto badge badge-blue hidden">0</span>
      </a>
    
      <div class="my-2 border-t border-slate-100"></div>
    
      <!-- Настройки -->
      <a data-route="settings" data-accent="zinc" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-pointer">
        <i data-lucide="settings" class="nav-icon w-4 h-4 text-slate-500"></i>
        <span>Настройки</span>
      </a>
    </nav>
    <div class="p-3 border-t border-slate-100">
      <div class="flex items-center gap-3 px-3 py-2">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">А</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">Анна</div>
          <div class="text-xs text-slate-500">Администратор</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto scrollbar">

<!-- ═══ МОБИЛЬНАЯ ШАПКА (только телефон) ═══ -->
<header id="mobile-header">
  <div class="mh-brand">
    <div class="mh-logo">M</div>
    <div>
      <div class="mh-app">MiniBar OS</div>
      <div class="mh-section" id="mobile-section-title">Обзор</div>
    </div>
  </div>
  <div class="mh-date" id="mobile-date"></div>
</header>

    <div class="p-8 max-w-7xl mx-auto">
      
      <!-- DASHBOARD -->
      <section id="view-dashboard" class="tab-content fade-in">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-slate-900">Добро пожаловать, Анна</h1>
          <p class="text-slate-600 mt-2">Суббота, 14 июня 2026 · Смена: утренняя</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl p-6 border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-slate-900">Выручка за неделю</h3>
              <span class="text-xs text-slate-500">Обновлено 5 мин назад</span>
            </div>
            <div class="text-3xl font-bold text-slate-900">₽ 245,800</div>
            <div class="text-sm text-emerald-600 mt-2">↑ 12% к прошлой неделе</div>
          </div>
          <div class="bg-white rounded-xl p-6 border border-slate-100">
            <h3 class="font-semibold text-slate-900 mb-4">Топ продукты</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-700">Heineken 0.33</span>
                <span class="text-sm font-semibold">142 шт</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-700">Evian 0.5</span>
                <span class="text-sm font-semibold">98 шт</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-700">Chianti Classico</span>
                <span class="text-sm font-semibold">67 шт</span>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-6 border border-slate-100">
            <h3 class="font-semibold text-slate-900 mb-4">Последние события</h3>
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
                <div class="flex-1">
                  <div class="text-sm text-slate-700">Проверка номера 512</div>
                  <div class="text-xs text-slate-500">2 минуты назад</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                <div class="flex-1">
                  <div class="text-sm text-slate-700">Пополнение минибара 718</div>
                  <div class="text-xs text-slate-500">15 минут назад</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- EXCISE -->
<section id="view-excise" class="tab-content fade-in">
  
  <!-- Заголовок с кнопкой -->
  <div class="flex items-start justify-between mb-6">
    <h1 class="text-2xl font-bold text-slate-900">Акцизы</h1>
    <div class="flex gap-2">
      <button id="excise-copy-all-btn" class="btn btn-outline">
        <i data-lucide="copy" class="w-4 h-4"></i> Копировать все
      </button>
      <button id="excise-clear-all-btn" class="btn btn-outline" style="color: var(--danger);">
        <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить все
      </button>
    </div>
  </div>

  <!-- Статистика (3 блока с градиентами) -->
  <div class="grid grid-cols-3 gap-4 mb-6">
    <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Всего</span>
        <i data-lucide="layers" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="excise-stat-total">0</div>
      <div class="text-xs opacity-80 mt-1">акцизных марок</div>
    </div>
    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Валидные</span>
        <i data-lucide="check-circle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="excise-stat-valid">0</div>
      <div class="text-xs opacity-80 mt-1" id="excise-stat-valid-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Невалидные</span>
        <i data-lucide="alert-circle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="excise-stat-invalid">0</div>
      <div class="text-xs opacity-80 mt-1" id="excise-stat-invalid-pct">0%</div>
    </div>
  </div>

  <!-- Поле ввода -->
  <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm mb-6">
    <div class="flex gap-3">
      <div class="flex-1 relative">
        <i data-lucide="scan-line" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
        <input 
          type="text" 
          id="excise-input"
          placeholder="Введите или отсканируйте акцизную марку..."
          class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autocomplete="off"
        />
      </div>
      </div>
    <p class="text-xs text-slate-500 mt-2">
      Можно вводить по одной или несколько через пробел/перенос строки
    </p>
  </div>

  <!-- Сетка акцизов в стиле номеров -->
  <div id="excise-list-container" class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
    <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <i data-lucide="list" class="w-4 h-4 text-slate-500"></i>
        <h3 class="font-semibold text-slate-900 text-sm">Список акцизов</h3>
      </div>
      <span class="text-xs text-slate-500" id="excise-list-count">0 марок</span>
    </div>
    <div id="excise-list" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      <!-- Карточки акцизов будут рендериться здесь -->
    </div>
    <div id="excise-empty-state" class="hidden text-center py-12 text-slate-400">
      <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p class="text-sm">Нет добавленных акцизов</p>
      <p class="text-xs mt-1">Введите марку в поле выше</p>
    </div>
  </div>
</section>

      <!-- ARRIVALS -->
<section id="view-arrivals" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Arrivals</h1>
      <p class="text-slate-600 mt-1">Заезды гостей на сегодня</p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-outline"><i data-lucide="calendar" class="w-4 h-4"></i> Сегодня</button>
      <button class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Новый заезд</button>
    </div>
  </div>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Всего заездов</div>
      <div class="text-2xl font-bold">24</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">VIP</div>
      <div class="text-2xl font-bold text-indigo-600">3</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Стандарт</div>
      <div class="text-2xl font-bold">15</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Люкс</div>
      <div class="text-2xl font-bold">6</div>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
      <h3 class="font-semibold text-slate-900">Список заездов</h3>
      <input type="text" placeholder="Поиск по номеру или гостю..." class="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64" />
    </div>
    <div class="p-8 text-center text-slate-400">
      <i data-lucide="plane-landing" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p>Нет заездов на сегодня</p>
    </div>
  </div>
</section>

<!-- DEPARTURES -->
<section id="view-departures" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Departures</h1>
      <p class="text-slate-600 mt-1">Выезды гостей на сегодня</p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-outline"><i data-lucide="calendar" class="w-4 h-4"></i> Сегодня</button>
      <button class="btn btn-primary"><i data-lucide="check-circle" class="w-4 h-4"></i> Проверить все</button>
    </div>
  </div>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Всего выездов</div>
      <div class="text-2xl font-bold">18</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Проверено</div>
      <div class="text-2xl font-bold text-emerald-600">12</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Ожидают</div>
      <div class="text-2xl font-bold text-amber-600">6</div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">С списаниями</div>
      <div class="text-2xl font-bold text-rose-600">4</div>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div class="p-5 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Номера к выезду</h3>
    </div>
    <div class="p-8 text-center text-slate-400">
      <i data-lucide="plane-takeoff" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p>Нет выездов на сегодня</p>
    </div>
  </div>
</section>

<!-- GIH -->
<section id="view-gih" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">GIH</h1>
      <p class="text-slate-600 mt-1">Guest In House — проверка минибаров занятых номеров</p>
    </div>
    <button class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Новая проверка</button>
  </div>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <i data-lucide="check-circle" class="w-5 h-5 text-emerald-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">142</div>
          <div class="text-xs text-slate-500">Всё на месте</div>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <i data-lucide="package" class="w-5 h-5 text-amber-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">23</div>
          <div class="text-xs text-slate-500">Выложили</div>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">8</div>
          <div class="text-xs text-slate-500">Не пополнено</div>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-5 border border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <i data-lucide="door-closed" class="w-5 h-5 text-slate-600"></i>
        </div>
        <div>
          <div class="text-2xl font-bold">5</div>
          <div class="text-xs text-slate-500">DND</div>
        </div>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
      <h3 class="font-semibold text-slate-900">Номера для проверки</h3>
      <div class="flex gap-2">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option>Все этажи</option>
          <option>Этаж 5</option>
          <option>Этаж 6</option>
          <option>Этаж 7</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option>Все статусы</option>
          <option>Не проверены</option>
          <option>Проверены</option>
        </select>
      </div>
    </div>
    <div class="p-8 text-center text-slate-400">
      <i data-lucide="clipboard-check" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
      <p>Нет номеров для проверки</p>
    </div>
  </div>
</section>

<!-- INVENTORY -->
<section id="view-inventory" class="tab-content fade-in">
  <!-- Вкладки категорий -->
  <div class="cat-tabs blue" id="inventory-tabs"></div>

  <div class="split-layout">
    <!-- Продукты -->
    <div id="inventory-products-container" class="products-grid"></div>

    <!-- Сводка (десктоп) -->
    <aside class="side-panel">
      <div class="side-panel-header">
        <span class="side-panel-title">Сводка</span>
        <button id="inventory-clear-btn" class="btn btn-ghost btn-sm">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Очистить
        </button>
      </div>
      <div id="inventory-summary-empty" class="side-panel-empty">
        <i data-lucide="clipboard-list"></i>
        <p>Введите количество продуктов</p>
      </div>
      <div id="inventory-summary-list" class="side-panel-body hidden"></div>
      <div class="side-panel-footer">
        <div class="total-row">
          <span class="total-row-label">Итоговый объём</span>
          <span class="total-row-value" id="inventory-total-volume">0 л</span>
        </div>
      </div>
    </aside>
  </div>

  <!-- Мобильная мини-панель -->
  <div id="inventory-mobile-bar" class="mobile-action-bar hidden">
    <div class="mobile-action-bar-info">
      <span class="mobile-action-bar-label" id="inventory-mobile-count">0 продуктов</span>
      <span class="mobile-action-bar-value" id="inventory-mobile-total">0 л</span>
    </div>
    <button id="inventory-mobile-expand" class="btn btn-primary">
      Развернуть <i data-lucide="chevron-up" class="w-4 h-4"></i>
    </button>
  </div>

  <!-- Мобильная шторка сводки -->
  <div id="inventory-summary-modal" class="sheet-modal hidden">
    <div class="sheet-modal-backdrop" id="inventory-summary-modal-backdrop"></div>
    <div class="sheet-modal-content">
      <div class="sheet-modal-header">
        <span class="sheet-modal-title">Сводка</span>
        <button id="inventory-summary-modal-close" class="btn btn-ghost btn-sm">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="inventory-summary-modal-list" class="sheet-modal-body"></div>
      <div class="sheet-modal-footer">
        <div class="total-row" style="margin-bottom:12px;">
          <span class="total-row-label">Итоговый объём</span>
          <span class="total-row-value" id="inventory-summary-modal-total">0 л</span>
        </div>
        <button id="inventory-summary-modal-clear" class="btn btn-outline" style="width:100%;">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить всё
        </button>
      </div>
    </div>
  </div>
</section>

      <!-- DEADLINES -->
<section id="view-deadlines" class="tab-content fade-in">
  <div class="flex items-start justify-between mb-6">
    <h1 class="text-2xl font-bold text-slate-900">Сроки годности</h1>
    <div class="flex items-center gap-2">
      <button id="deadlines-month-products-btn" class="btn btn-outline">
        <i data-lucide="calendar-check" class="w-4 h-4"></i> Добавить сроки
      </button>
      <button id="deadlines-reset-all-btn" class="btn btn-outline" style="color: var(--danger);">
        <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Сбросить все номера
      </button>
    </div>
  </div>

  <!-- Статистика -->
  <div class="grid grid-cols-4 gap-4 mb-4">
    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">В порядке</span>
        <i data-lucide="check-circle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-valid">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-valid-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Пустые</span>
        <i data-lucide="inbox" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-empty">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-empty-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Заменить</span>
        <i data-lucide="alert-triangle" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-needs-replacement">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-needs-pct">0%</div>
    </div>
    <div class="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-5 text-white shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium uppercase tracking-wider opacity-90">Не проверены</span>
        <i data-lucide="clock" class="w-5 h-5 opacity-80"></i>
      </div>
      <div class="text-3xl font-bold" id="stat-neutral">0</div>
      <div class="text-xs opacity-80 mt-1" id="stat-neutral-pct">0%</div>
    </div>
  </div>

  <!-- Динамика -->
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="col-span-3 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
  <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i data-lucide="trending-up" class="w-4 h-4 text-slate-500"></i>
        <h3 class="font-semibold text-slate-900">Динамика проверок</h3>
      </div>
    </div>
    <!-- Нижний ряд: График + Цели (ДВА ОТДЕЛЬНЫХ БЛОКА) -->
  
  <!-- БЛОК 1: График (занимает 3/4 ширины) -->
    <div id="stat-dynamics" class="h-64">
      <canvas id="deadlines-chart" class="w-full h-full"></canvas>
    </div>
</div>

<!-- БЛОК 2: Цели (занимает 1/4 ширины) — ОТДЕЛЬНЫЙ РАВНОПРАВНЫЙ БЛОК -->
<div class="col-span-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
  <div id="targets-container">
    <div class="flex items-center justify-center py-12 text-slate-400">
      <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i>
    </div>
  </div>
</div>
</div>


  <!-- Продукты месяца + Требуют замены -->
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="col-span-1 bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col min-h-[140px]">
      <div class="flex items-center gap-2 mb-3">
        <i data-lucide="calendar-check" class="w-4 h-4 text-slate-500"></i>
        <h3 class="font-semibold text-slate-900 text-sm">На проверку</h3>
      </div>
      <div id="deadlines-month-products-container" class="flex-1">
        <div class="flex items-center justify-center py-6 text-slate-400 text-xs">
          <i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Загрузка...
        </div>
      </div>
    </div>
    <div class="col-span-3 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-500"></i>
          <h3 class="font-semibold text-slate-900 text-sm">Требуют замены</h3>
        </div>
        <span id="deadlines-replacement-total" class="text-xs font-medium text-rose-600"></span>
      </div>
      <div id="deadlines-replacement-container">
        <div class="flex items-center justify-center py-6 text-slate-400 text-xs">
          <i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Загрузка...
        </div>
      </div>
    </div>
  </div>

  <!-- Сетка номеров -->
  <div id="deadlines-floors-container" class="space-y-3">
    <div class="flex items-center justify-center py-12 text-slate-400">
      <i data-lucide="loader-2" class="w-6 h-6 animate-spin mr-2"></i>
      Загрузка номеров...
    </div>
  </div>
</section>

<!-- Модальное окно -->
<div id="deadline-modal-backdrop" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col fade-in">
    <div class="p-4 border-b border-slate-100 flex items-start justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">Номер <span id="deadline-modal-room-number"></span></h3>
        <p class="text-xs text-slate-500 mt-0.5" id="deadline-modal-room-info"></p>
      </div>
      <button onclick="App.deadlinesModule.closeModal()" class="btn btn-ghost">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

      <div id="deadline-modal-products" class="p-4 overflow-y-auto scrollbar flex-1">
      </div>

    <div class="p-4 border-t border-slate-100 bg-slate-50">
      <div class="flex items-center justify-between">
        <button onclick="App.deadlinesModule.reset()" class="btn btn-outline">
          <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Сброс
        </button>
        <div class="flex gap-2">
          <button onclick="App.deadlinesModule.setEmpty()" class="btn bg-sky-500 hover:bg-sky-600 text-white">
            <i data-lucide="inbox" class="w-4 h-4"></i> Опустошён
          </button>
          <button onclick="App.deadlinesModule.setValid()" class="btn bg-emerald-500 hover:bg-emerald-600 text-white">
            <i data-lucide="check-circle" class="w-4 h-4"></i> В порядке
          </button>
          <button onclick="App.deadlinesModule.save()" class="btn btn-primary">
            <i data-lucide="save" class="w-4 h-4"></i> Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Модальное окно: продукты месяца -->
<div id="deadline-month-modal-backdrop" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col fade-in">
    <div class="p-4 border-b border-slate-100 flex items-start justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">Добавление сроков</h3>
      </div>
      <button id="deadline-month-modal-close" class="btn btn-ghost">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <div id="deadline-month-modal-list" class="p-4 overflow-y-auto scrollbar flex-1 space-y-2">
      <div class="flex items-center justify-center py-8 text-slate-400 text-sm">
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i> Загрузка...
      </div>
    </div>
  </div>
</div>

      <!-- HISTORY -->
      <section id="view-history" class="tab-content fade-in">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900">История операций</h1>
          <p class="text-slate-600 mt-2">Полный журнал действий в системе</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div class="p-5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <input type="text" placeholder="Поиск..." class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <button class="btn btn-outline">Фильтры</button>
            </div>
          </div>
          <div class="p-5 text-center text-slate-400">Загрузка...</div>
        </div>
      </section>

      <!-- EMPTY -->
      <section id="view-empty" class="tab-content fade-in">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900">Пустые минибары</h1>
          <p class="text-slate-600 mt-2">Требуют пополнения или обслуживания</p>
        </div>
        <div id="empty-rooms-container">
          <div class="flex items-center justify-center py-12">
            <div class="text-slate-400">
              <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
              <p class="text-sm">Загрузка данных...</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CALCULATOR -->
      <section id="view-calculator" class="tab-content fade-in">
  <!-- Вкладки категорий -->
  <div class="cat-tabs teal" id="calculator-tabs"></div>

  <div class="split-layout">
    <!-- Продукты -->
    <div id="calculator-products-container" class="products-grid"></div>

    <!-- Счёт (десктоп) -->
    <aside class="side-panel">
      <div class="side-panel-header">
        <span class="side-panel-title">Счёт</span>
        <button id="calculator-clear-btn" class="btn btn-ghost btn-sm">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Очистить
        </button>
      </div>
      <div id="calculator-bill-empty" class="side-panel-empty">
        <i data-lucide="shopping-cart"></i>
        <p>Выберите продукты</p>
      </div>
      <div id="calculator-bill-list" class="side-panel-body hidden"></div>
      <div class="side-panel-footer">
        <div class="total-row">
          <span class="total-row-label" id="calculator-bill-count">0 позиций</span>
          <span class="total-row-value" id="calculator-bill-total">0 ₽</span>
        </div>
      </div>
    </aside>
  </div>

  <!-- Мобильная мини-панель -->
  <div id="calculator-mobile-bar" class="mobile-action-bar hidden">
    <div class="mobile-action-bar-info">
      <span class="mobile-action-bar-label" id="calculator-mobile-count">0 позиций</span>
      <span class="mobile-action-bar-value" id="calculator-mobile-total">0 ₽</span>
    </div>
    <button id="calculator-mobile-expand" class="btn btn-primary">
      Развернуть <i data-lucide="chevron-up" class="w-4 h-4"></i>
    </button>
  </div>

  <!-- Мобильная шторка счёта -->
  <div id="calculator-bill-modal" class="sheet-modal hidden">
    <div class="sheet-modal-backdrop" id="calculator-bill-modal-backdrop"></div>
    <div class="sheet-modal-content">
      <div class="sheet-modal-header">
        <span class="sheet-modal-title">Счёт</span>
        <button id="calculator-bill-modal-close" class="btn btn-ghost btn-sm">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="calculator-bill-modal-list" class="sheet-modal-body"></div>
      <div class="sheet-modal-footer">
        <div class="total-row" style="margin-bottom:12px;">
          <span class="total-row-label" id="calculator-bill-modal-count">0 позиций</span>
          <span class="total-row-value" id="calculator-bill-modal-total">0 ₽</span>
        </div>
        <button id="calculator-bill-modal-clear" class="btn btn-outline" style="width:100%;">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить счёт
        </button>
      </div>
    </div>
  </div>
</section>

      <!-- SETTINGS -->
      <section id="view-settings" class="tab-content fade-in">
        <div class="flex items-start justify-between mb-6">
          <h1 class="text-2xl font-bold text-slate-900">Настройки</h1>
        </div>

        <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
          <button data-settings-tab="products" class="settings-tab px-4 py-1.5 text-sm rounded-md bg-white shadow-sm font-medium">Продукты</button>
          <button data-settings-tab="templates" class="settings-tab px-4 py-1.5 text-sm rounded-md text-slate-600">Шаблоны наполнения</button>
        </div>

        <div id="settings-products" class="settings-panel">
          <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 class="font-semibold text-slate-900">Список продуктов</h3>
              <button id="add-product-btn" class="btn btn-primary">
                <i data-lucide="plus" class="w-4 h-4"></i> Добавить продукт
              </button>
            </div>
            <div id="products-table-container" class="p-5">
              <div class="flex items-center justify-center py-12 text-slate-400">
                <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
              </div>
            </div>
          </div>
        </div>

        <div id="settings-templates" class="settings-panel hidden">
          <div class="grid grid-cols-2 gap-6">
            <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div class="p-5 border-b border-slate-100 bg-slate-50">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  <h3 class="font-semibold text-slate-900">Стандарт</h3>
                </div>
              </div>
              <div class="p-5 template-items-container" data-category="standard">
                <div class="text-center py-8 text-slate-400 text-sm">Загрузка...</div>
              </div>
            </div>
            <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div class="p-5 border-b border-slate-100 bg-slate-50">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                  <h3 class="font-semibold text-slate-900">Люкс</h3>
                </div>
              </div>
              <div class="p-5 template-items-container" data-category="lux">
                <div class="text-center py-8 text-slate-400 text-sm">Загрузка...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </main>
</div>

<!-- Модальное окно продукта -->
<div id="product-modal-backdrop" class="hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 fade-in">
    <div class="flex items-start justify-between mb-4">
      <h3 id="product-modal-title" class="text-lg font-bold text-slate-900">Новый продукт</h3>
      <button onclick="App.settingsModule.closeProductModal()" class="btn btn-ghost">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form id="product-form" class="space-y-3">
      <input type="hidden" id="product-id" />
      <div>
        <label class="text-xs font-medium text-slate-600 mb-1.5 block">Название *</label>
        <input id="product-name" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Heineken 0.33" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Категория</label>
          <select id="product-category" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="Дверца">Дверца</option>
            <option value="Напитки">Напитки</option>
            <option value="Алкоголь">Алкоголь</option>
            <option value="Соки">Соки</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Единица</label>
          <select id="product-unit" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="шт">шт</option>
            <option value="л">л</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Объём *</label>
          <input id="product-volume" type="number" step="0.001" min="0" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="0.33" />
        </div>
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1.5 block">Цена (₽) *</label>
          <input id="product-price" type="number" step="0.01" min="0" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="450" />
        </div>
      </div>
      <div>
        <label class="text-xs font-medium text-slate-600 mb-1.5 block">Эмодзи и цвет фона</label>
        <div class="flex items-center gap-2">
          <input id="product-emoji" class="w-9 h-9 border border-slate-200 rounded-lg text-xl text-center cursor-pointer hover:bg-slate-50" placeholder="📦" maxlength="4" />
          <div id="product-color-picker" class="flex flex-wrap gap-2 flex-1">
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="amber" style="background: #fef3c7;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="red" style="background: #fee2e2;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="blue" style="background: #dbeafe;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="yellow" style="background: #fef9c3;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="purple" style="background: #f3e8ff;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="emerald" style="background: #d1fae5;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="rose" style="background: #ffe4e6;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="orange" style="background: #ffedd5;"></button>
            <button type="button" class="color-option w-9 h-9 rounded-lg border-2 border-transparent hover:scale-110 transition" data-color="slate" style="background: #f1f5f9;"></button>
          </div>
        </div>
        <input type="hidden" id="product-bg-color" value="slate" />
      </div>
      
      <div>
        <label class="text-xs font-medium text-slate-600 mb-1.5 block">Предпросмотр</label>
        <div id="product-preview" class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div id="preview-icon" class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">📦</div>
          <div class="flex-1">
            <div id="preview-name" class="text-sm font-semibold text-slate-900">Название продукта</div>
            <div id="preview-details" class="text-xs text-slate-500 mt-0.5">0.33 шт · 450 ₽</div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2 pt-1">
        <input id="product-has-expiry" type="checkbox" class="w-4 h-4 rounded border-slate-300" checked />
        <label for="product-has-expiry" class="text-sm">Есть срок годности</label>
      </div>
      <div class="flex justify-end gap-2 pt-3">
        <button type="button" onclick="App.settingsModule.closeProductModal()" class="btn btn-outline">Отмена</button>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </div>
    </form>
  </div>
</div>


<script src="config.js?v=m4"></script>
<script src="js/utils.js?v=m4"></script>
<script src="js/app-core.js?v=m4"></script>
<script src="js/excise-module.js?v=m4"></script>
<script src="js/deadlines-module.js?v=m4"></script>
<script src="js/settings-module.js?v=m4"></script>
<script src="js/calculator-module.js?v=m4"></script>
<script src="js/inventory-module.js?v=m4"></script>
<script src="js/route-handlers.js?v=m4"></script>
<script src="js/init.js?v=m4"></script>


<!-- ═══ МОБИЛЬНЫЙ ТАБ-БАР (только телефон) ═══ -->
<nav id="mobile-tabbar">
  <a class="mobile-tab" data-route="dashboard" href="#"><i data-lucide="layout-dashboard"></i><span>Обзор</span></a>
  <a class="mobile-tab" data-route="excise" href="#"><i data-lucide="stamp"></i><span>Акцизы</span><span class="mt-badge b-amber hidden" id="excise-badge-m">0</span></a>
  <a class="mobile-tab" data-route="deadlines" href="#"><i data-lucide="calendar"></i><span>Сроки</span><span class="mt-badge b-rose hidden" id="deadlines-badge-m">0</span></a>
  <a class="mobile-tab" data-route="gih" href="#"><i data-lucide="clipboard-check"></i><span>GIH</span></a>
  <a class="mobile-tab" data-route="more" href="#"><i data-lucide="grid-3x3"></i><span>Ещё</span></a>
</nav>

<!-- ═══ ШТОРКА «ЕЩЁ» ═══ -->
<div id="mobile-more-backdrop" class="hidden">
  <div id="mobile-more-sheet">
    <div class="ms-handle"></div>
    <div class="ms-title">Разделы</div>
    <div class="ms-grid">
      <a class="ms-item" data-route="arrivals" href="#"><i data-lucide="plane-landing"></i><span>Arrivals</span></a>
      <a class="ms-item" data-route="departures" href="#"><i data-lucide="plane-takeoff"></i><span>Departures</span></a>
      <a class="ms-item" data-route="history" href="#"><i data-lucide="history"></i><span>История</span></a>
      <a class="ms-item" data-route="empty" href="#"><i data-lucide="alert-circle"></i><span>Пустые</span></a>
      <a class="ms-item" data-route="calculator" href="#"><i data-lucide="calculator"></i><span>Калькулятор</span></a>
      <a class="ms-item" data-route="inventory" href="#"><i data-lucide="clipboard-list"></i><span>Инвентаризация</span></a>
      <a class="ms-item" data-route="settings" href="#"><i data-lucide="settings"></i><span>Настройки</span></a>
    </div>
  </div>
</div>

<script src="js/mobile-nav.js?v=m4"></script>
</body>
</html>

```

---

## `minibar-os/frontend/js/app-core.js`

```javascript
const App = {
  state: { currentRoute: 'dashboard' },
  events: {
    listeners: {},
    on(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    },
    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => cb(data));
    }
  },
  views: {
    dashboard: { onEnter() {}, onLeave() {} },
    excise: { onEnter() {}, onLeave() {} },
    deadlines: { onEnter() {}, onLeave() {} },
    arrivals: { onEnter() {}, onLeave() {} },
    departures: { onEnter() {}, onLeave() {} },
    gih: { onEnter() {}, onLeave() {} },
    history: { onEnter() {}, onLeave() {} },
    empty: { onEnter() {}, onLeave() {} },
    calculator: { onEnter() {}, onLeave() {} },
    inventory: { onEnter() {}, onLeave() {} },
    settings: { onEnter() {}, onLeave() {} }
  },
  router: {
    urlToRoute: {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/excise': 'excise',
      '/deadlines': 'deadlines',
      '/arrivals': 'arrivals',
      '/departures': 'departures',
      '/gih': 'gih',
      '/history': 'history',
      '/empty': 'empty',
      '/calculator': 'calculator',
      '/inventory': 'inventory',
      '/settings': 'settings'
    },
    routeToUrl: {
      dashboard: '/dashboard',
      excise: '/excise',
      deadlines: '/deadlines',
      arrivals: '/arrivals',
      departures: '/departures',
      gih: '/gih',
      history: '/history',
      empty: '/empty',
      calculator: '/calculator',
      inventory: '/inventory',
      settings: '/settings'
    },
    go(route, pushToHistory = true) {
      try {
        App.state.currentRoute = route;

        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

        const view = document.getElementById('view-' + route);
        if (view) view.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(el => {
          el.classList.toggle('active', el.dataset.route === route);
        });

        const url = this.routeToUrl[route] || '/';
        if (pushToHistory && window.location.pathname !== url) {
          window.history.pushState({ route }, '', url);
        }

        if (window.lucide) {
          try { lucide.createIcons(); } catch (e) { /* ignore */ }
        }

        App.events.emit('route:change', route);
      } catch (err) {
        console.error('Router.go error:', err);
      }
    },
    currentFromUrl() {
      return this.urlToRoute[window.location.pathname] || 'dashboard';
    },
    current() {
      return App.state.currentRoute;
    }
  }
};

App.badges = {
  _updaters: {},

  register(name, updaterFn) {
    this._updaters[name] = updaterFn;
  },

  async update(name) {
    try {
      const updater = this._updaters[name];
      if (!updater) return;

      const badge = document.getElementById(`${name}-badge`);
      if (!badge) return;

      const count = await updater();
      if (typeof count === 'number' && count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch (err) {
      console.warn(`Badge ${name} update failed:`, err);
    }
  },

  async updateAll(retryCount = 0) {
    const maxRetries = 10;
    const results = await Promise.allSettled(
      Object.keys(this._updaters).map(name => this.update(name))
    );

    const hasApiErrors = results.some(r =>
      r.status === 'rejected' || (r.value === undefined && retryCount < maxRetries)
    );

    if (hasApiErrors && retryCount < maxRetries) {
      setTimeout(() => this.updateAll(retryCount + 1), 500);
    }
  }
};

window.App = App;

```

---

## `minibar-os/frontend/js/calculator-module.js`

```javascript
// МОДУЛЬ КАЛЬКУЛЯТОРА (v2 — единый дизайн)
// ═══════════════════════════════════════════════════════════════
App.calculatorModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  let cart = {};
  let activeCategory = CATEGORY_ORDER[0];
  let isInitialized = false;
  let isLoaded = false;

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function formatMoney(value) {
    return parseFloat(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' ₽';
  }

  function getQty(productId) {
    return cart[productId] || 0;
  }

  function changeQty(productId, delta) {
    const next = getQty(productId) + delta;
    if (next <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = next;
    }
    renderProducts();
    renderBill();
  }

  function clearBill() {
    cart = {};
    renderProducts();
    renderBill();
  }

  function getProductsByCategory() {
    const grouped = {};
    products.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return CATEGORY_ORDER.map(name => ({ name, items: grouped[name] || [] }));
  }

  function renderTabs() {
    const tabsEl = document.getElementById('calculator-tabs');
    if (!tabsEl) return;
    const groups = getProductsByCategory();
    tabsEl.innerHTML = groups.map(g => {
      const count = g.items.reduce((s, p) => s + getQty(p.id), 0);
      const active = g.name === activeCategory ? ' active' : '';
      return `<button type="button" class="cat-tab${active}" data-category="${escapeHtml(g.name)}">
        ${escapeHtml(g.name)}
        ${count > 0 ? `<span class="cat-tab-count">${count}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderProducts() {
    const container = document.getElementById('calculator-products-container');
    if (!container) return;
    renderTabs();

    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }

    const groups = getProductsByCategory();
    const group = groups.find(g => g.name === activeCategory) || groups[0];

    if (group.items.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов в этой категории</div>';
      return;
    }

    container.innerHTML = group.items.map(p => {
      const qty = getQty(p.id);
      const price = parseFloat(p.price);
      const emoji = p.emoji || p.name.charAt(0).toUpperCase();
      return `
        <div class="product-card calc-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
          <div class="product-card-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
          <div class="product-card-info">
            <div class="product-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="product-card-meta">${formatMoney(price)}</div>
          </div>
          <div class="calc-controls">
            <button type="button" class="calc-qty-btn calc-dec-btn" data-product-id="${p.id}" aria-label="Уменьшить" ${qty === 0 ? 'disabled' : ''}>
              <i data-lucide="minus" class="w-4 h-4"></i>
            </button>
            <span class="calc-qty-value">${qty}</span>
            <button type="button" class="calc-qty-btn calc-inc-btn" data-product-id="${p.id}" aria-label="Увеличить">
              <i data-lucide="plus" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  function getBillEntries() {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id, 10));
        if (!product) return null;
        const price = parseFloat(product.price);
        return { product, qty, price, subtotal: price * qty };
      })
      .filter(Boolean)
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ru'));
  }

  function billRowHtml(e) {
    return `
      <div class="bill-row">
        <div class="bill-row-info">
          <div class="bill-row-name">${escapeHtml(e.product.name)}</div>
          <div class="bill-row-meta">${e.qty} × ${formatMoney(e.price)}</div>
        </div>
        <div class="bill-row-sum">${formatMoney(e.subtotal)}</div>
        <button type="button" class="bill-row-del calc-dec-btn" data-product-id="${e.product.id}" title="Убрать">
          <i data-lucide="minus" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }

  function renderBill() {
    const entries = getBillEntries();
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    const totalSum = entries.reduce((s, e) => s + e.subtotal, 0);
    const countText = totalQty === 0
      ? '0 позиций'
      : `${totalQty} ${pluralize(totalQty, ['позиция', 'позиции', 'позиций'])}`;
    const totalText = formatMoney(totalSum);
    const rowsHtml = entries.map(billRowHtml).join('');
    const isEmpty = entries.length === 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    // Десктоп-панель
    const emptyEl = document.getElementById('calculator-bill-empty');
    const listEl = document.getElementById('calculator-bill-list');
    if (emptyEl) emptyEl.classList.toggle('hidden', !isEmpty);
    if (listEl) {
      listEl.classList.toggle('hidden', isEmpty);
      listEl.innerHTML = rowsHtml;
    }
    set('calculator-bill-count', countText);
    set('calculator-bill-total', totalText);

    // Мобильная мини-панель
    const mobileBar = document.getElementById('calculator-mobile-bar');
    if (mobileBar) mobileBar.classList.toggle('hidden', isEmpty);
    set('calculator-mobile-count', countText);
    set('calculator-mobile-total', totalText);

    // Мобильная шторка
    set('calculator-bill-modal-count', countText);
    set('calculator-bill-modal-total', totalText);
    const modalList = document.getElementById('calculator-bill-modal-list');
    if (modalList) {
      modalList.innerHTML = isEmpty
        ? '<div class="text-center py-8 text-slate-400 text-sm">Счёт пуст</div>'
        : rowsHtml;
    }

    if (window.lucide) lucide.createIcons();
  }

  async function loadProducts() {
    const container = document.getElementById('calculator-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
      renderBill();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
    }
  }

  function openBillModal() {
    document.getElementById('calculator-bill-modal')?.classList.remove('hidden');
  }
  function closeBillModal() {
    document.getElementById('calculator-bill-modal')?.classList.add('hidden');
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('calculator-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      activeCategory = tab.dataset.category;
      renderProducts();
    });

    document.getElementById('calculator-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) clearBill();
    });

    document.getElementById('calculator-mobile-expand')?.addEventListener('click', openBillModal);
    document.getElementById('calculator-bill-modal-close')?.addEventListener('click', closeBillModal);
    document.getElementById('calculator-bill-modal-backdrop')?.addEventListener('click', closeBillModal);
    document.getElementById('calculator-bill-modal-clear')?.addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) {
        clearBill();
        closeBillModal();
      }
    });

    // Делегирование кликов по +/− (работает и в сетке, и в счёте, и в шторке)
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#view-calculator')) return;
      const inc = e.target.closest('.calc-inc-btn');
      if (inc) {
        changeQty(parseInt(inc.dataset.productId, 10), 1);
        return;
      }
      const dec = e.target.closest('.calc-dec-btn');
      if (dec) {
        changeQty(parseInt(dec.dataset.productId, 10), -1);
      }
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
      renderBill();
    }
  }

  return { init, clearBill, changeQty };
})();

```

---

## `minibar-os/frontend/js/deadlines-module.js`

```javascript
// МОДУЛЬ СРОКИ ГОДНОСТИ
// ═══════════════════════════════════════════════════════════════
App.deadlinesModule = (() => {
  let rooms = [];
  let currentRoom = null;
  let productSelections = {};
  let modalProductos = [];
  let isInitialized = false;
  let monthManageProducts = [];
  
  // Кэш для целей (чтобы избежать race condition)
  let _cachedTargetsData = null;
  let _cachedTargetsTime = 0;
  const TARGETS_CACHE_MS = 500;
  
  const api = () => window.api;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };

  const categories = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  const statusLabels = {
    'neutral': 'Не проверен',
    'valid': 'В порядке',
    'empty': 'Пустой',
    'needs_replacement': 'Требует замены'
  };

  function invalidateTargetsCache() {
    _cachedTargetsData = null;
    _cachedTargetsTime = 0;
  }

  async function loadRooms() {
    try {
      rooms = await api().getRooms();
      render();
    } catch (err) {
      console.error('❌ Ошибка загрузки номеров:', err);
      const container = document.getElementById('deadlines-floors-container');
      if (container) container.innerHTML =
        `<div class="text-center py-12 text-rose-500">Ошибка: ${err.message}</div>`;
    }
  }

  function render() {
    renderStats();
    renderFloors();
  }

  function renderStats() {
    const total = rooms.length || 1;
    const counts = {
      valid: rooms.filter(r => r.expiryStatus === 'valid').length,
      empty: rooms.filter(r => r.expiryStatus === 'empty').length,
      needs_replacement: rooms.filter(r => r.expiryStatus === 'needs_replacement').length,
      neutral: rooms.filter(r => r.expiryStatus === 'neutral').length
    };

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    set('stat-valid', counts.valid);
    set('stat-empty', counts.empty);
    set('stat-needs-replacement', counts.needs_replacement);
    set('stat-neutral', counts.neutral);

    const pct = (n) => Math.round((n / total) * 100) + '%';
    set('stat-valid-pct', pct(counts.valid));
    set('stat-empty-pct', pct(counts.empty));
    set('stat-needs-pct', pct(counts.needs_replacement));
    set('stat-neutral-pct', pct(counts.neutral));
  }

  async function renderChart() {
    try {
      const data = await _loadChartStats();
      const canvas = document.getElementById('deadlines-chart');
      if (!canvas) return;
  
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
  
      const width = rect.width;
      const height = rect.height;
      const padding = { top: 30, right: 70, bottom: 30, left: 40 };
  
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
  
      const now = new Date();
      const todayDay = now.getDate();
      const chartYear = data.currentYear || now.getFullYear();
      const chartMonth = data.currentMonth || (now.getMonth() + 1);
      const prevMonth = chartMonth === 1 ? 12 : chartMonth - 1;
      const prevYear = chartMonth === 1 ? chartYear - 1 : chartYear;
      const { parseDbDate } = window.AppUtils;
  
      // Текущий месяц — только до сегодняшнего дня
      const fillCurrentMonth = (stats) => {
        const filled = [];
        for (let day = 1; day <= todayDay; day++) {
          const existing = stats.find(s => {
            const p = parseDbDate(s.date);
            return p.day === day && p.month === chartMonth && p.year === chartYear;
          });
          filled.push(existing || {
            date: new Date(Date.UTC(chartYear, chartMonth - 1, day)),
            validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0
          });
        }
        return filled;
      };
  
      // Прошлый месяц — ПОЛНОСТЬЮ
      const fillPrevMonth = (stats) => {
        const filled = [];
        const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
        for (let day = 1; day <= daysInPrevMonth; day++) {
          const existing = stats.find(s => {
            const p = parseDbDate(s.date);
            return p.day === day && p.month === prevMonth && p.year === prevYear;
          });
          filled.push(existing || {
            date: new Date(Date.UTC(prevYear, prevMonth - 1, day)),
            validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0
          });
        }
        return filled;
      };
  
      const currentStats = fillCurrentMonth(data.current || []);
      const prevStats = fillPrevMonth(data.previous || []);
  
      if (currentStats.length === 0 && prevStats.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Данные появятся после первых проверок', width / 2, height / 2);
        return;
      }
  
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      const allStats = [...currentStats, ...prevStats];
      const maxCount = Math.max(10, ...allStats.map(s => Math.max(s.validCount, s.emptyCount, s.needsReplacementCount)));
      const yMax = Math.ceil(maxCount / 5) * 5;
  
      // Единая шкала X: оба месяца рисуются в одном масштабе дней
      const maxDays = Math.max(currentStats.length, prevStats.length);
      const getX = (i) => padding.left + (chartWidth / Math.max(1, maxDays - 1)) * i;
      const getY = (value) => padding.top + chartHeight - (value / yMax) * chartHeight;
  
      // Горизонтальная сетка
      const gridLines = 5;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
  
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        const value = Math.round(yMax - (yMax / gridLines) * i);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(value.toString(), padding.left - 10, y);
      }
  
      // Подписи дней по оси X (до maxDays)
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
  
      for (let i = 0; i < maxDays; i++) {
        const day = i + 1;
        if (day === 1 || day % 5 === 0 || day === maxDays) {
          ctx.fillText(day.toString(), getX(i), padding.top + chartHeight + 8);
        }
      }
  
      const lines = [
        { key: 'validCount', label: 'В порядке', color: '#10b981', fillStart: 'rgba(16, 185, 129, 0.20)', fillEnd: 'rgba(16, 185, 129, 0)' },
        { key: 'emptyCount', label: 'Пустые', color: '#0ea5e9', fillStart: 'rgba(14, 165, 233, 0.20)', fillEnd: 'rgba(14, 165, 233, 0)' },
        { key: 'needsReplacementCount', label: 'Заменить', color: '#f43f5e', fillStart: 'rgba(244, 63, 94, 0.20)', fillEnd: 'rgba(244, 63, 94, 0)' }
      ];
  
      // Плавная кривая с ограничением прогибов
      const drawSmoothLine = (points) => {
        if (points.length < 2) {
          if (points.length === 1) ctx.moveTo(points[0].x, points[0].y);
          return;
        }
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          
          const tension = 0.2;
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          
          let cp1y = p1.y + (p2.y - p0.y) * tension;
          let cp2y = p2.y - (p3.y - p1.y) * tension;
          
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);
          cp1y = Math.max(minY, Math.min(maxY, cp1y));
          cp2y = Math.max(minY, Math.min(maxY, cp2y));
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      };
  
      const drawLines = (stats, config) => {
        lines.forEach(line => {
          if (stats.length === 0) return;
          const points = stats.map((s, i) => ({ x: getX(i), y: getY(s[line.key]) }));
      
          ctx.globalAlpha = config.opacity;
      
          // Градиентная заливка
          if (config.showFill) {
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
            gradient.addColorStop(0, line.fillStart);
            gradient.addColorStop(1, line.fillEnd);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartHeight);
            ctx.lineTo(points[0].x, points[0].y);
            drawSmoothLine(points);
            ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            ctx.closePath();
            ctx.fill();
          }
      
          // Линия
          ctx.strokeStyle = line.color;
          ctx.lineWidth = config.lineWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.setLineDash(config.dash);
          ctx.beginPath();
          drawSmoothLine(points);
          ctx.stroke();
          ctx.setLineDash([]);
      
          // Точки на всех днях с данными > 0 (кроме последней, если там бейдж)
          if (config.showPoints) {
            const lastPointValue = stats[stats.length - 1][line.key];
            const showBadgeOnLast = config.showCurrentValue && lastPointValue > 0;
            
            points.forEach((p, i) => {
              const value = stats[i][line.key];
              const isLast = i === points.length - 1;
              if (value > 0 && !(isLast && showBadgeOnLast)) {
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = line.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
              }
            });
          }
      
          // Бейдж ВСЕГДА на последней точке (сегодняшний день)
          if (config.showCurrentValue) {
            const lastPoint = points[points.length - 1];
            const lastValue = stats[stats.length - 1][line.key];
            
            // Если значение 0 — бейдж не рисуем (линия сама заканчивается в 0)
            if (lastValue <= 0) return;
            
            const label = lastValue.toString();
            const radius = label.length === 1 ? 12 : label.length === 2 ? 14 : 16;
            
            // Фон бейджа
            ctx.fillStyle = line.color;
            ctx.beginPath(); ctx.arc(lastPoint.x, lastPoint.y, radius, 0, Math.PI * 2); ctx.fill();
            
            // Белая обводка
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(lastPoint.x, lastPoint.y, radius, 0, Math.PI * 2); ctx.stroke();
            
            // Цифра внутри
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${label.length > 2 ? 10 : 11}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lastPoint.x, lastPoint.y + 0.5);
          }
          
          ctx.globalAlpha = 1;
        });
      };
  
      // Прошлый месяц (полупрозрачный пунктир, полный)
      if (prevStats.length > 0 && prevStats.some(s => s.validCount + s.emptyCount + s.needsReplacementCount > 0)) {
        drawLines(prevStats, { opacity: 0.3, lineWidth: 1.5, dash: [4, 4], showFill: false, showPoints: false, showCurrentValue: false });
      }
  
      // Текущий месяц (полная яркость, до сегодня)
      drawLines(currentStats, { opacity: 1, lineWidth: 2.5, dash: [], showFill: true, showPoints: true, showCurrentValue: true });
  
      // Заголовок
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      const currentMonthName = monthNames[chartMonth - 1];
      const prevMonthName = monthNames[prevMonth - 1];
  
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${currentMonthName} vs ${prevMonthName}`, padding.left, 6);
  
      // Легенда
      let legendX = width - padding.right;
      const legendY = 10;
      ctx.textBaseline = 'middle';
      [...lines].reverse().forEach(line => {
        ctx.fillStyle = '#475569'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        const textWidth = ctx.measureText(line.label).width;
        ctx.fillText(line.label, legendX, legendY);
        legendX -= textWidth + 6;
        ctx.strokeStyle = line.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(legendX - 16, legendY); ctx.lineTo(legendX, legendY); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(legendX - 8, legendY, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = line.color; ctx.beginPath(); ctx.arc(legendX - 8, legendY, 2, 0, Math.PI * 2); ctx.fill();
        legendX -= 28;
      });
    } catch (err) {
      console.error('Ошибка рендера графика:', err);
    }
  }

  function getRoomClasses(status) {
    const base = 'room-cell text-white font-bold shadow-md';
    const map = {
      'neutral': base + ' bg-gradient-to-br from-slate-400 to-slate-500',
      'valid': base + ' bg-gradient-to-br from-emerald-500 to-emerald-600',
      'empty': base + ' bg-gradient-to-br from-sky-500 to-sky-600',
      'needs_replacement': base + ' bg-gradient-to-br from-rose-500 to-rose-600'
    };
    return map[status] || map['neutral'];
  }

  function renderFloors() {
    const container = document.getElementById('deadlines-floors-container');
    if (!container) return;

    const byFloor = {};
    rooms.forEach(r => {
      if (!byFloor[r.floor]) byFloor[r.floor] = [];
      byFloor[r.floor].push(r);
    });

    const floors = Object.keys(byFloor).map(Number).sort((a, b) => a - b);

    if (floors.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400">Нет номеров</div>';
      return;
    }

    container.innerHTML = floors.map(floor => {
      const floorRooms = byFloor[floor].sort((a, b) => a.number - b.number);
      const counts = {
        neutral: floorRooms.filter(r => r.expiryStatus === 'neutral').length,
        valid: floorRooms.filter(r => r.expiryStatus === 'valid').length,
        empty: floorRooms.filter(r => r.expiryStatus === 'empty').length,
        needs: floorRooms.filter(r => r.expiryStatus === 'needs_replacement').length
      };

      return `
        <div class="floor-section">
          <div class="floor-header">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <span class="font-bold text-sm text-slate-700">${floor}</span>
              </div>
              <div>
                <div class="font-semibold text-sm text-slate-900">Этаж ${floor}</div>
                <div class="text-xs text-slate-500">${floorRooms.length} номеров</div>
              </div>
            </div>
            <div class="flex gap-2 text-xs">
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                <span class="text-slate-600">${counts.neutral}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-slate-600">${counts.valid}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                <span class="text-slate-600">${counts.empty}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                <span class="text-slate-600">${counts.needs}</span>
              </span>
            </div>
          </div>
          <div class="rooms-grid">
            ${floorRooms.map(r => `
              <div class="${getRoomClasses(r.expiryStatus)}" 
                   onclick="App.deadlinesModule.openRoomModal(${r.id})"
                   title="${r.number} · ${statusLabels[r.expiryStatus] || r.expiryStatus}">
                ${r.number}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  async function openRoomModal(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    currentRoom = room;
    productSelections = {};

    const items = room.template?.items || [];
    modalProductos = items
      .filter(i => i.product.hasExpiry)
      .map(i => ({
        id: i.product.id,
        name: i.product.name,
        volume: i.product.volume,
        unit: i.product.unit,
        emoji: i.product.emoji,
        bgColor: i.product.bgColor,
        category: i.product.category,
        maxQty: i.qty
      }));

    try {
      const statuses = await _loadStatuses(roomId);
      statuses.forEach(s => {
        if (s.qtyToReplace > 0) {
          productSelections[s.productId] = s.qtyToReplace;
        }
      });
    } catch (err) {
      console.warn('Не удалось загрузить статусы продуктов:', err);
    }

    document.getElementById('deadline-modal-room-number').textContent = room.number;
    document.getElementById('deadline-modal-room-info').textContent =
      `Этаж ${room.floor} · ${room.category === 'lux' ? 'Люкс' : 'Стандарт'} · ${statusLabels[room.expiryStatus] || room.expiryStatus}`;

    renderModalProducts();
    document.getElementById('deadline-modal-backdrop').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function renderModalProducts() {
    const container = document.getElementById('deadline-modal-products');
    if (!container) return;

    if (modalProductos.length === 0) {
      container.innerHTML = `
        <div class="col-span-4 text-center py-6 text-slate-400">
          <i data-lucide="package-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p class="text-xs">Нет продуктов со сроком годности</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    modalProductos.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    container.innerHTML = `<div class="grid grid-cols-4 gap-3">
      ${categories.map(cat => { 
        const items = grouped[cat] || []; 
        return `
        <div class="flex flex-col">
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">${cat}</span>
          </div>
          <div class="space-y-2 flex-1">
            ${items.length === 0
              ? `<div class="text-center py-4 text-slate-300 text-xs">—</div>`
              : items.map(p => {
                  const count = productSelections[p.id] || 0;
                  const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                  const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
                  return `
                    <div class="deadline-product-card ${count > 0 ? 'selected' : ''}" 
                         onclick="App.deadlinesModule.clickProduct(${p.id})">
                      ${count > 0 ? `<div class="deadline-product-counter">${count}</div>` : ''}
                      <div class="flex items-center gap-2">
                        <div class="w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center text-lg flex-shrink-0">
                          ${emoji}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="deadline-product-name text-xs font-semibold text-slate-900 truncate">${p.name}</div>
                          <div class="deadline-product-meta text-[10px] text-slate-500">${p.volume || '—'} ${p.unit || 'шт'}</div>
                        </div>
                      </div>
                    </div>`;
                }).join('')
            }
          </div>
        </div>`; 
      }).join('')}
    </div>`;

    if (window.lucide) lucide.createIcons();
  }

  function clickProduct(productId) {
    const product = modalProductos.find(p => p.id === productId);
    if (!product) return;
    const current = productSelections[productId] || 0;
    const next = current >= product.maxQty ? 0 : current + 1;

    if (next === 0) {
      delete productSelections[productId];
    } else {
      productSelections[productId] = next;
    }

    renderModalProducts();
  }

  async function _loadChartStats() {
    return api().getDeadlineStats();
  }

  async function _saveStatuses(roomId, items, roomStatus) {
    return api().saveRoomProductStatuses(roomId, items, roomStatus);
  }

  async function _clearStatuses(roomId, roomStatus) {
    return api().clearRoomProductStatuses(roomId, roomStatus);
  }

  async function _loadStatuses(roomId) {
    return api().getRoomProductStatuses(roomId);
  }

  async function _loadTargets() {
    const now = Date.now();
    if (_cachedTargetsData && (now - _cachedTargetsTime) < TARGETS_CACHE_MS) {
      console.log('🎯 Targets from cache (age:', now - _cachedTargetsTime, 'ms)');
      return _cachedTargetsData;
    }
    const data = await api().getDeadlineTargets();
    _cachedTargetsData = data;
    _cachedTargetsTime = now;
    return data;
  }

  async function renderTargets() {
    try {
      const data = await _loadTargets();
      console.log('🎯 Targets response:', {
        today_processed: data.today?.processed,
        today_target: data.today?.target,
        today_startBad: data.today?.startBadCount,
        today_pct: data.today?.percentage,
        tomorrow_target: data.tomorrow?.target,
        summary_badCount: data.summary?.badCount,
        responseTime: new Date().toISOString()
      });
      
      const container = document.getElementById('targets-container');
      if (!container) return;

      const { today, tomorrow, summary } = data;
      const remaining = Math.max(0, today.target - today.processed);

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <i data-lucide="target" class="w-4 h-4 text-amber-600"></i>
            <h3 class="font-bold text-amber-600 text-sm">Цели</h3>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Сегодня</span>
              <span class="text-xs font-semibold text-slate-900">${today.processed} / ${today.target}</span>
            </div>

            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-4xl font-bold text-slate-900 leading-none">${today.processed}</span>
              <span class="text-base text-slate-400 font-medium">/ ${today.target}</span>
            </div>

            <div class="relative h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                today.percentage >= 100 
                  ? 'bg-emerald-500' 
                  : today.percentage >= 50 
                    ? 'bg-sky-500'
                    : 'bg-rose-500'
              }" style="width: ${Math.min(100, today.percentage)}%"></div>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500">
                ${today.percentage >= 100 ? '✓ Цель выполнена' : `Осталось ${remaining}`}
              </span>
              <span class="text-xs font-bold text-slate-700">${today.percentage}%</span>
            </div>
          </div>

          <div class="border-t border-slate-100"></div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Завтра</span>
              <span class="text-[10px] text-slate-400">прогноз</span>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-xl font-bold text-slate-700">${tomorrow.target}</span>
              <span class="text-xs text-slate-500">номеров</span>
            </div>
          </div>

          <div class="border-t border-slate-100"></div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">До конца месяца</span>
              <span class="font-semibold text-slate-700">${tomorrow.daysLeft + 1} дн.</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Осталось номеров</span>
              <span class="font-semibold text-slate-900">${summary.badCount}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Прогресс месяца</span>
              <span class="font-semibold text-slate-900">
                ${summary.totalRooms > 0 ? Math.round((summary.goodCount / summary.totalRooms) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка рендера целей:', err);
    }
  }

  function formatPeriodInput(value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  function productEmoji(product) {
    return product.emoji || (product.name || '?').charAt(0).toUpperCase();
  }

  async function renderMonthProducts() {
    const container = document.getElementById('deadlines-month-products-container');
    if (!container) return;
    try {
      const items = await api().getMonthProducts();
      if (items.length === 0) {
        container.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            <i data-lucide="calendar-off" class="w-5 h-5 mx-auto mb-1 opacity-50"></i>
            Нет продуктов на текущий и следующий месяц
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = items.map(item => {
        const p = item.product;
        const emoji = productEmoji(p);
        const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
        return `
          <div class="deadlines-month-item mb-1.5">
            <div class="deadlines-month-item-emoji ${colorClass}">${emoji}</div>
            <span class="deadlines-month-item-name" title="${p.name}">${p.name}</span>
            <span class="deadlines-month-item-period">${item.period}</span>
          </div>`;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка загрузки продуктов месяца:', err);
      container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">${err.message}</div>`;
    }
  }

  async function renderReplacementSummary() {
    const container = document.getElementById('deadlines-replacement-container');
    const totalEl = document.getElementById('deadlines-replacement-total');
    if (!container) return;
    try {
      const data = await api().getReplacementSummary();
      const items = data.items || [];
      if (totalEl) {
        totalEl.textContent = items.length > 0 ? `Всего: ${data.totalQty || 0} шт.` : '';
      }

      if (items.length === 0) {
        container.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            <i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 opacity-50"></i>
            Нет продуктов, требующих замены
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = `
        <div class="deadlines-replacement-grid">
          ${items.map(item => {
            const p = item.product;
            const emoji = productEmoji(p);
            const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
            return `
              <div class="deadlines-replacement-card" title="${p.name}">
                <div class="deadlines-replacement-card-emoji ${colorClass}">${emoji}</div>
                <span class="deadlines-replacement-card-name">${p.name}</span>
                <span class="deadlines-replacement-card-qty">${item.totalQty}</span>
              </div>`;
          }).join('')}
        </div>`;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка загрузки замен:', err);
      container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">${err.message}</div>`;
    }
  }

  async function refreshDeadlinesExtras() {
    await Promise.all([renderMonthProducts(), renderReplacementSummary()]);
  }

  function renderMonthModalList() {
    const container = document.getElementById('deadline-month-modal-list');
    if (!container) return;
    if (monthManageProducts.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">Нет продуктов со сроком годности</div>`;
      return;
    }

    container.innerHTML = monthManageProducts.map(p => {
      const emoji = productEmoji(p);
      const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
      const checks = p.monthChecks || [];
      const savedDates = checks.map(c => `
        <span class="deadline-month-saved-date" data-check-id="${c.id}" title="Нажмите, чтобы удалить">${c.period}</span>
      `).join('');

      return `
        <div class="deadline-month-row" data-product-id="${p.id}">
          <div class="deadline-month-row-product">
            <div class="w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center text-lg flex-shrink-0">${emoji}</div>
            <div class="deadline-month-row-info">
              <div class="deadline-month-row-name">${p.name}</div>
              <div class="deadline-month-row-meta">${p.volume || '—'} ${p.unit || 'шт'}</div>
            </div>
          </div>
          <div class="deadline-month-saved-dates">${savedDates}</div>
          <div class="deadline-month-add">
            <input type="text" class="deadline-month-period-input" maxlength="5"
                   placeholder="ММ.ГГ" data-product-id="${p.id}"
                   inputmode="numeric" autocomplete="off" />
            <button type="button" class="btn btn-primary text-xs py-1.5 px-2.5 deadline-month-save-btn"
                    data-product-id="${p.id}" title="Сохранить">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.deadline-month-period-input').forEach(input => {
      input.addEventListener('input', () => {
        input.value = formatPeriodInput(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveMonthProduct(parseInt(input.dataset.productId, 10), input.value, input);
        }
      });
    });

    container.querySelectorAll('.deadline-month-save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = parseInt(btn.dataset.productId, 10);
        const row = btn.closest('.deadline-month-row');
        const input = row?.querySelector('.deadline-month-period-input');
        saveMonthProduct(productId, input?.value || '', input);
      });
    });

    container.querySelectorAll('.deadline-month-saved-date').forEach(el => {
      el.addEventListener('click', () => {
        clearMonthCheck(parseInt(el.dataset.checkId, 10));
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  async function openMonthModal() {
    const backdrop = document.getElementById('deadline-month-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');

    const list = document.getElementById('deadline-month-modal-list');
    if (list) {
      list.innerHTML = `
        <div class="flex items-center justify-center py-8 text-slate-400 text-sm">
          <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i>
          Загрузка...
        </div>`;
    }

    if (window.lucide) lucide.createIcons();

    try {
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
    } catch (err) {
      console.error('Ошибка загрузки настроек месяца:', err);
      if (list) list.innerHTML = `<div class="text-center py-8 text-rose-500 text-sm">${err.message}</div>`;
    }
  }

  function closeMonthModal() {
    document.getElementById('deadline-month-modal-backdrop')?.classList.add('hidden');
    monthManageProducts = [];
  }

  async function saveMonthProduct(productId, rawPeriod, inputEl = null) {
    const period = formatPeriodInput(rawPeriod);
    if (period.length !== 5) {
      alert('Введите период в формате ММ.ГГ (например 11.26)');
      return;
    }
    try {
      await api().setMonthProduct(productId, period);
      if (inputEl) inputEl.value = '';
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
      await renderMonthProducts();
    } catch (err) {
      console.error('Ошибка сохранения периода:', err);
      alert(err.message || 'Не удалось сохранить');
    }
  }

  async function clearMonthCheck(checkId) {
    try {
      await api().deleteMonthCheck(checkId);
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
      await renderMonthProducts();
    } catch (err) {
      console.error('Ошибка удаления периода:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  async function clearProductsAndSetStatus(newStatus) {
    if (!currentRoom) return;
    try {
      await _clearStatuses(currentRoom.id, newStatus);
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
      productSelections = {};
      closeModal();
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Не удалось обновить: ' + err.message);
    }
  }

  async function saveSelections() {
    if (!currentRoom) return;
    const hasSelections = Object.values(productSelections).some(c => c > 0);
    const newRoomStatus = hasSelections ? 'needs_replacement' : 'neutral';
    console.log('💾 Сохраняем:', {
      roomId: currentRoom.id,
      hasSelections,
      newRoomStatus,
      productSelections
    });

    const items = Object.entries(productSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId: parseInt(productId),
        qtyToReplace: qty,
        expiryStatus: 'needs_replacement'
      }));

    try {
      const result = await _saveStatuses(currentRoom.id, items, newRoomStatus);
      console.log('✅ Сохранено:', result);
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
      productSelections = {};
      closeModal();
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Не удалось сохранить: ' + err.message);
    }
  }

  function setEmpty() { clearProductsAndSetStatus('empty'); }
  function setValid() { clearProductsAndSetStatus('valid'); }
  function reset() { clearProductsAndSetStatus('neutral'); }
  function save() { saveSelections(); }

  function closeModal() {
    document.getElementById('deadline-modal-backdrop')?.classList.add('hidden');
    currentRoom = null;
    productSelections = {};
    App.badges.update('deadlines');
  }

  function init() {
    if (!isInitialized) {
      document.getElementById('deadline-modal-backdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'deadline-modal-backdrop') closeModal();
      });
      document.getElementById('deadline-month-modal-backdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'deadline-month-modal-backdrop') closeMonthModal();
      });
      document.getElementById('deadline-month-modal-close')?.addEventListener('click', closeMonthModal);
      document.getElementById('deadlines-month-products-btn')?.addEventListener('click', openMonthModal);
      document.getElementById('deadlines-reset-all-btn')?.addEventListener('click', resetAllRooms);
      isInitialized = true;
    }
    
    // ПОСЛЕДОВАТЕЛЬНО: чтобы не было race condition
    loadRooms()
      .then(() => renderChart())
      .then(() => renderTargets())
      .then(() => refreshDeadlinesExtras());
  }

  async function resetAllRooms() {
    if (!confirm('Сбросить статусы всех номеров и продуктов? Это действие нельзя отменить.')) return;
    try {
      await api().resetAllDeadlines();
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
    } catch (err) {
      console.error('❌ Ошибка сброса:', err);
      alert('Не удалось сбросить: ' + err.message);
    }
  }

  App.badges.register('deadlines', async () => {
    try {
      const data = await api().getDeadlineTargets();
      return Math.max(0, (data.today?.target || 0) - (data.today?.processed || 0));
    } catch {
      return 0;
    }
  });

  return {
    init, openRoomModal, clickProduct, closeModal,
    setEmpty, setValid, save, reset,
    openMonthModal, closeMonthModal
  };
})();
```

---

## `minibar-os/frontend/js/excise-module.js`

```javascript
// МОДУЛЬ АКЦИЗОВ
// ═══════════════════════════════════════════════════════════════
App.exciseModule = (() => {
  const RU_TO_EN = {
    'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
    'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",
    'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.','ё':'`',
    'Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P','Х':'{','Ъ':'}',
    'Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L','Ж':':','Э':'"',
    'Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M','Б':'<','Ю':'>','Ё':'~'
  };
  let excises = [];
let isInitialized = false;  
let isProcessing = false;   
  let debounceTimer = null;
  let isBound = false;
  let isLoaded = false;

  const api = () => window.api;
  const { pluralize, escapeHtml, showToast } = window.AppUtils;

  /** Единая проверка: карточки, счётчики и «Копировать все» используют одни правила */
  function isValidMark(mark) {
    if (!mark || typeof mark !== 'string') return false;
    const trimmed = mark.trim();
    if (trimmed.length < 20) return false;
    return /^\d/.test(trimmed);
  }

  function convertLayout(text) {
    return text.split('').map(c => RU_TO_EN[c] || c).join('');
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function render() {
  const list = document.getElementById('excise-list');
  const emptyState = document.getElementById('excise-empty-state');
  const countEl = document.getElementById('excise-list-count');
  
  if (!list) return;

  if (excises.length === 0) {
    list.innerHTML = '';
    emptyState?.classList.remove('hidden');
    if (countEl) countEl.textContent = '0 марок';
  } else {
    emptyState?.classList.add('hidden');
    if (countEl) countEl.textContent = `${excises.length} ${pluralize(excises.length, ['марка', 'марки', 'марок'])}`;
    
    list.innerHTML = excises.map(e => {
      const isValid = isValidMark(e.mark_number);
      const statusClass = isValid ? 'valid' : 'invalid';
      const date = new Date(e.created_at);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      const safeMark = String(e.mark_number).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="excise-card ${statusClass}" 
             onclick="App.exciseModule.copyToClipboard('${safeMark}')"
             title="Кликните, чтобы скопировать">
          
          <!-- Статус-иконка (видна всегда, кроме hover) -->
          <div class="excise-status-icon">
            ${isValid 
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            }
          </div>
          
          <!-- Корзина при наведении -->
          <div class="excise-delete-btn" 
               onclick="event.stopPropagation(); App.exciseModule.deleteExcise('${e.id}')"
               title="Удалить">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            </svg>
          </div>
          
          <!-- Номер марки -->
          <div class="excise-card-mark">${escapeHtml(e.mark_number)}</div>
          
          <!-- Мета -->
          <div class="excise-card-meta">
            <span>${isValid ? '✓ Валидна' : '✕ Ошибка'}</span>
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStats();
  if (window.lucide) lucide.createIcons();
}

  function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Можно добавить toast-уведомление
    console.log('Скопировано:', text);
  }).catch(err => {
    console.error('Ошибка копирования:', err);
  });
}

function updateStats() {
  const total = excises.length;
  const valid = excises.filter(e => isValidMark(e.mark_number)).length;
  const invalid = total - valid;
  
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  setText('excise-stat-total', total);
  setText('excise-stat-valid', valid);
  setText('excise-stat-invalid', invalid);
  
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
  setText('excise-stat-valid-pct', pct(valid));
  setText('excise-stat-invalid-pct', pct(invalid));
  
  // Обновляем бейдж в сайдбаре
  if (App.badges) {
    App.badges.update('excise');
  }
}

  async function processInput() {
    const input = document.getElementById('excise-input');
    if (!input) return;
    const raw = input.value;
    if (!raw.trim()) return;
    
    const parts = raw.split(/[\s]+/).filter(s => s.length > 0);
    const now = new Date().toISOString();
    const newItems = [];
    let duplicatesCount = 0;
    
    for (const part of parts) {
      const converted = convertLayout(part);
      
      if (excises.some(e => e.mark_number === converted)) {
        duplicatesCount++;
        continue;
      }
      
      const newItem = {
  id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
  mark_number: converted,
  created_at: now
};
      newItems.push(newItem);
      
      if (api() && api().createExcise) {
        api().createExcise(converted)
  .then(saved => {
    const tempId = newItem.id;
    if (saved._duplicate) {
      const idx = excises.findIndex(e => String(e.id) === String(tempId));
      if (idx !== -1) excises.splice(idx, 1);
      render();
      updateStats();
    } else {
      const idx = excises.findIndex(e => String(e.id) === String(tempId));
      if (idx !== -1) {
        excises[idx].id = saved.id;
        excises[idx].created_at = saved.createdAt || saved.created_at;
        // ВАЖНО: перерендериваем, чтобы onclick обновился с новым ID
        render();
        updateStats();
      }
    }
  })
  .catch(err => console.error('Ошибка сохранения:', err));
      }
    }
    
    if (newItems.length > 0) {
      excises = [...newItems, ...excises];
      render();
    }
    
    input.value = '';
    if (duplicatesCount > 0) console.log(`⚠️ Пропущено дубликатов: ${duplicatesCount}`);
  }

  async function deleteExcise(idRaw) {
  // Всегда работаем со строкой для сравнения
  const id = String(idRaw).replace(/^['"]|['"]$/g, ''); // Убираем кавычки если есть
  
  console.log('🗑️ Удаляем акциз, ID:', id);
  
  // Ищем элемент в массиве (сравниваем строки)
  const idx = excises.findIndex(e => String(e.id) === id);
  
  if (idx === -1) {
    console.warn('⚠️ Акциз не найден в списке, ID:', id, 'доступные:', excises.map(e => String(e.id)));
    return;
  }
  
  // Сохраняем элемент для возможного отката
  const removedItem = excises[idx];
  
  // Оптимистичное удаление
  excises.splice(idx, 1);
  console.log('✅ Удалён из списка, осталось:', excises.length);
  
  // Сразу обновляем UI
  render();

  // Если временный ID — не удаляем из БД
  if (id.startsWith('temp_')) {
    return;
  }

  // Удаляем из БД
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid ID: ' + id);
    await api().deleteExcise(numericId);
  } catch (err) {
    console.error('❌ Ошибка удаления из БД:', err);
    excises.splice(idx, 0, removedItem);
    render();
    alert('Не удалось удалить акциз из базы данных');
  }
}

  async function copyValid() {
    const valid = excises.filter(e => isValidMark(e.mark_number)).map(e => e.mark_number);
    if (valid.length === 0) {
      alert('Нет валидных акцизов для копирования');
      return;
    }

    try {
      await navigator.clipboard.writeText(valid.join('\n'));
      const shouldClear = confirm(`✓ Скопировано ${valid.length} акциз\n\nОчистить список после копирования?`);
      if (shouldClear) {
        await api().deleteAllExcises();
        excises = [];
        render();
      }
    } catch (err) {
      alert('Не удалось скопировать');
    }
  }

  async function clearList() {
    if (excises.length === 0) return;
    if (!confirm(`Удалить все ${excises.length} акциз из базы данных?`)) return;
    
    try {
      await api().deleteAllExcises();
      excises = [];
      render();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  async function loadFromDB() {
    if (isLoaded) return;
    if (!api() || !api().getExcises) {
      setTimeout(loadFromDB, 200);
      return;
    }
    try {
      const data = await api().getExcises();
      excises = data.map(e => ({
        id: e.id,
        mark_number: e.markNumber || e.mark_number,
        created_at: e.createdAt || e.created_at
      }));
      isLoaded = true;
      render();
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  }

  function bindEvents() {
    if (isBound) return;
    
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'excise-input') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processInput, 500);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'excise-input' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        processInput();
      }
    });
    
    isBound = true;
  }

  function init() {
    if (!isInitialized) {
      document.getElementById('excise-copy-all-btn')?.addEventListener('click', () => copyValid());

      document.getElementById('excise-clear-all-btn')?.addEventListener('click', () => clearList());

      bindEvents();
      isInitialized = true;
    }
    loadFromDB();
  }

  // Бейдж — из локального списка (не из API: при удалении API ещё не успел обновиться)
  App.badges.register('excise', async () => excises.length);

  return { init, refresh: render, deleteExcise, copyToClipboard };
})();

```

---

## `minibar-os/frontend/js/init.js`

```javascript
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const route = item.dataset.route;
      if (route && App.router) {
        App.router.go(route);
      }
    });
  });

  window.addEventListener('popstate', (event) => {
    const route = event.state?.route || App.router.currentFromUrl();
    App.router.go(route, false);
  });

  const initialRoute = App.router.currentFromUrl();
  App.router.go(initialRoute, false);

  const bootstrap = async () => {
    try {
      await window.AppUtils.waitForApi();
      App.badges.updateAll();
      if (window.lucide) lucide.createIcons();

      if (initialRoute === 'excise' && App.exciseModule) {
        App.exciseModule.init();
      }
      if (initialRoute === 'deadlines' && App.deadlinesModule) {
        App.deadlinesModule.init();
      }
      if (initialRoute === 'settings' && App.settingsModule) {
        App.settingsModule.init();
      }
      if (initialRoute === 'calculator' && App.calculatorModule) {
        App.calculatorModule.init();
      }
      if (initialRoute === 'inventory' && App.inventoryModule) {
        App.inventoryModule.init();
      }
    } catch (e) {
      console.warn('Bootstrap failed:', e);
    }
  };

  setTimeout(bootstrap, 100);
});

```

---

## `minibar-os/frontend/js/inventory-module.js`

```javascript
// МОДУЛЬ ИНВЕНТАРИЗАЦИИ (v2 — единый дизайн)
// ═══════════════════════════════════════════════════════════════
App.inventoryModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  let entries = {};
  let activeCategory = CATEGORY_ORDER[0];
  let isInitialized = false;
  let isLoaded = false;

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function parseCount(value) {
    const n = parseInt(String(value).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getEntry(productId) {
    return entries[productId] || { a: '', b: '' };
  }

  function getQtySum(productId) {
    const { a, b } = getEntry(productId);
    return parseCount(a) + parseCount(b);
  }

  function getTotalVolume(product) {
    const qty = getQtySum(product.id);
    const unitVol = parseFloat(product.volume) || 0;
    return qty * unitVol;
  }

  function formatVolume(product, total) {
    const unit = product.unit || 'шт';
    if (!total) return `0 ${unit}`;
    const formatted = total.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
    return `${formatted} ${unit}`;
  }

  function getProductsByCategory() {
    const grouped = {};
    products.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return CATEGORY_ORDER.map(name => ({ name, items: grouped[name] || [] }));
  }

  function renderTabs() {
    const tabsEl = document.getElementById('inventory-tabs');
    if (!tabsEl) return;
    const groups = getProductsByCategory();
    tabsEl.innerHTML = groups.map(g => {
      const count = g.items.filter(p => getQtySum(p.id) > 0).length;
      const active = g.name === activeCategory ? ' active' : '';
      return `<button type="button" class="cat-tab${active}" data-category="${escapeHtml(g.name)}">
        ${escapeHtml(g.name)}
        ${count > 0 ? `<span class="cat-tab-count">${count}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderProducts() {
    const container = document.getElementById('inventory-products-container');
    if (!container) return;
    renderTabs();

    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }

    const groups = getProductsByCategory();
    const group = groups.find(g => g.name === activeCategory) || groups[0];

    if (group.items.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов в этой категории</div>';
      return;
    }

    container.innerHTML = group.items.map(p => {
      const entry = getEntry(p.id);
      const qty = getQtySum(p.id);
      const totalVol = getTotalVolume(p);
      const emoji = p.emoji || p.name.charAt(0).toUpperCase();
      return `
        <div class="product-card inv-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
          <div class="product-card-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
          <div class="product-card-info">
            <div class="product-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="product-card-meta">${p.volume || '—'} ${p.unit || 'шт'}</div>
          </div>
          <div class="inv-fields">
            <input type="text" class="inv-field" maxlength="4" placeholder="0" value="${entry.a}"
                   data-product-id="${p.id}" data-field="a" inputmode="numeric" autocomplete="off" />
            <span class="inv-plus">+</span>
            <input type="text" class="inv-field" maxlength="4" placeholder="0" value="${entry.b}"
                   data-product-id="${p.id}" data-field="b" inputmode="numeric" autocomplete="off" />
          </div>
          <div class="inv-result">
            <span class="inv-result-qty">= ${qty}</span>
            <span class="inv-result-vol">${formatVolume(p, totalVol)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Точечное обновление карточки при вводе (чтобы не терять фокус)
  function updateProductSummary(productId) {
    const product = products.find(p => p.id === productId);
    const card = document.querySelector(`.inv-card[data-product-id="${productId}"]`);
    if (!product || !card) return;
    const qty = getQtySum(productId);
    const totalVol = getTotalVolume(product);
    const qtyEl = card.querySelector('.inv-result-qty');
    const volEl = card.querySelector('.inv-result-vol');
    if (qtyEl) qtyEl.textContent = '= ' + qty;
    if (volEl) volEl.textContent = formatVolume(product, totalVol);
    card.classList.toggle('has-qty', qty > 0);
  }

  function getSummaryEntries() {
    return products
      .filter(p => getQtySum(p.id) > 0)
      .map(p => ({ product: p, qty: getQtySum(p.id), volume: getTotalVolume(p) }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ru'));
  }

  function renderSummary() {
    const list = getSummaryEntries();
    const totalVolume = list.reduce((s, e) => s + e.volume, 0);
    const countText = list.length === 0
      ? '0 продуктов'
      : `${list.length} ${pluralize(list.length, ['продукт', 'продукта', 'продуктов'])}`;
    const totalText = totalVolume.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    const isEmpty = list.length === 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    const rowsHtml = list.map(e => `
      <div class="bill-row">
        <div class="bill-row-info">
          <div class="bill-row-name">${escapeHtml(e.product.name)}</div>
          <div class="bill-row-meta">${e.qty} шт</div>
        </div>
        <div class="bill-row-sum">${formatVolume(e.product, e.volume)}</div>
      </div>
    `).join('');

    // Десктоп
    const emptyEl = document.getElementById('inventory-summary-empty');
    const listEl = document.getElementById('inventory-summary-list');
    if (emptyEl) emptyEl.classList.toggle('hidden', !isEmpty);
    if (listEl) {
      listEl.classList.toggle('hidden', isEmpty);
      listEl.innerHTML = rowsHtml;
    }
    set('inventory-total-volume', totalText);

    // Мобильная мини-панель
    const mobileBar = document.getElementById('inventory-mobile-bar');
    if (mobileBar) mobileBar.classList.toggle('hidden', isEmpty);
    set('inventory-mobile-count', countText);
    set('inventory-mobile-total', totalText);

    // Мобильная шторка
    set('inventory-summary-modal-total', totalText);
    const modalList = document.getElementById('inventory-summary-modal-list');
    if (modalList) {
      modalList.innerHTML = isEmpty
        ? '<div class="text-center py-8 text-slate-400 text-sm">Нет введённых данных</div>'
        : rowsHtml;
    }
  }

  function clearAll() {
    entries = {};
    renderProducts();
    renderSummary();
  }

  async function loadProducts() {
    const container = document.getElementById('inventory-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
      renderSummary();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
    }
  }

  function openSummaryModal() {
    document.getElementById('inventory-summary-modal')?.classList.remove('hidden');
  }
  function closeSummaryModal() {
    document.getElementById('inventory-summary-modal')?.classList.add('hidden');
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('inventory-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      activeCategory = tab.dataset.category;
      renderProducts();
    });

    document.getElementById('inventory-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(entries).length === 0) return;
      if (confirm('Очистить все введённые данные?')) clearAll();
    });

    document.getElementById('inventory-mobile-expand')?.addEventListener('click', openSummaryModal);
    document.getElementById('inventory-summary-modal-close')?.addEventListener('click', closeSummaryModal);
    document.getElementById('inventory-summary-modal-backdrop')?.addEventListener('click', closeSummaryModal);
    document.getElementById('inventory-summary-modal-clear')?.addEventListener('click', () => {
      if (Object.keys(entries).length === 0) return;
      if (confirm('Очистить все введённые данные?')) {
        clearAll();
        closeSummaryModal();
      }
    });

    // Ввод в поля (без перерисовки сетки — фокус не теряется)
    document.getElementById('inventory-products-container')?.addEventListener('input', (e) => {
      const input = e.target.closest('.inv-field');
      if (!input) return;
      const productId = parseInt(input.dataset.productId, 10);
      const field = input.dataset.field;
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      if (!entries[productId]) entries[productId] = { a: '', b: '' };
      entries[productId][field] = input.value;
      if (!entries[productId].a && !entries[productId].b) {
        delete entries[productId];
      }
      updateProductSummary(productId);
      renderTabs();
      renderSummary();
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
      renderSummary();
    }
  }

  return { init, clearAll };
})();

```

---

## `minibar-os/frontend/js/mobile-nav.js`

```javascript
// ═══════════════════════════════════════════════════════════════
// МОБИЛЬНАЯ НАВИГАЦИЯ: нижний таб-бар + шторка «Ещё»
// ═══════════════════════════════════════════════════════════════
(function () {
  var routeTitles = {
    dashboard: 'Обзор', excise: 'Акцизы', deadlines: 'Сроки',
    arrivals: 'Arrivals', departures: 'Departures', gih: 'GIH',
    history: 'История', empty: 'Пустые', calculator: 'Калькулятор',
    inventory: 'Инвентаризация', settings: 'Настройки'
  };

  function init() {
    // Клики по таб-бару
    document.querySelectorAll('.mobile-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var route = tab.dataset.route;
        if (route === 'more') openMoreSheet();
        else if (route && window.App && App.router) App.router.go(route);
      });
    });

    // Клики по шторке
    document.querySelectorAll('.ms-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var route = item.dataset.route;
        closeMoreSheet();
        if (route && window.App && App.router) App.router.go(route);
      });
    });

    // Закрытие по фону
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target.id === 'mobile-more-backdrop') closeMoreSheet();
      });
    }

    // Синхронизация активной вкладки и заголовка
    if (window.App && App.events) {
      App.events.on('route:change', function (route) {
        syncActive(route);
        closeMoreSheet();
      });
    }

    // Дата в шапке
    var dateEl = document.getElementById('mobile-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    // Тень шапки при скролле
    var header = document.getElementById('mobile-header');
    var mainEl = document.querySelector('main');
    var onScroll = function () {
      var y = window.scrollY || (mainEl ? mainEl.scrollTop : 0);
      if (header) header.classList.toggle('scrolled', y > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });

    // Зеркалим бейджи из сайдбара в таб-бар
    setInterval(mirrorBadges, 1500);
    mirrorBadges();

    if (window.App && App.state && App.state.currentRoute) syncActive(App.state.currentRoute);
  }

  function syncActive(route) {
    document.querySelectorAll('.mobile-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.route === route);
    });
    document.querySelectorAll('.ms-item').forEach(function (i) {
      i.classList.toggle('active', i.dataset.route === route);
    });
    // «Ещё» подсвечивается, если открыт раздел из шторки
    var moreTab = document.querySelector('.mobile-tab[data-route="more"]');
    if (moreTab) {
      var inSheet = !!document.querySelector('.ms-item[data-route="' + route + '"]');
      moreTab.classList.toggle('active', inSheet);
    }
    var titleEl = document.getElementById('mobile-section-title');
    if (titleEl) titleEl.textContent = routeTitles[route] || 'MiniBar OS';
  }

  function mirrorBadges() {
    ['excise', 'deadlines'].forEach(function (name) {
      var src = document.getElementById(name + '-badge');
      var dst = document.getElementById(name + '-badge-m');
      if (src && dst) {
        dst.textContent = src.textContent;
        dst.classList.toggle('hidden', src.classList.contains('hidden'));
      }
    });
  }

  function openMoreSheet() {
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('show');
        var sheet = document.getElementById('mobile-more-sheet');
        if (sheet) sheet.classList.add('open');
      });
    });
  }

  function closeMoreSheet() {
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;
    backdrop.classList.remove('show');
    var sheet = document.getElementById('mobile-more-sheet');
    if (sheet) sheet.classList.remove('open');
    setTimeout(function () { backdrop.classList.add('hidden'); }, 280);
  }

  // Ждём готовности App
  function tryInit(attempt) {
    attempt = attempt || 1;
    if (window.App && App.router && App.events) {
      init();
      if (window.lucide) lucide.createIcons();
    } else if (attempt < 30) {
      setTimeout(function () { tryInit(attempt + 1); }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tryInit(1); });
  } else {
    tryInit(1);
  }
})();

```

---

## `minibar-os/frontend/js/route-handlers.js`

```javascript
function initModuleWhenApiReady(moduleName, initFn, maxAttempts = 20, intervalMs = 100) {
  const tryInit = (attempt = 1) => {
    if (window.api && initFn) {
      initFn();
    } else if (attempt < maxAttempts) {
      setTimeout(() => tryInit(attempt + 1), intervalMs);
    }
  };
  tryInit();
}

App.events.on('route:change', (route) => {
  try {
    if (App.badges?._updaters[route]) {
      setTimeout(() => App.badges.update(route), 100);
    }
  } catch (e) {
    console.warn('Badge update failed:', e);
  }

  if (route === 'deadlines' && App.deadlinesModule) {
    initModuleWhenApiReady('deadlines', () => App.deadlinesModule.init());
  }

  if (route === 'excise' && App.exciseModule) {
    setTimeout(() => App.exciseModule.init(), 50);
  }

  if (route === 'settings' && App.settingsModule) {
    setTimeout(() => App.settingsModule.init(), 50);
  }

  if (route === 'calculator' && App.calculatorModule) {
    initModuleWhenApiReady('calculator', () => App.calculatorModule.init());
  }

  if (route === 'inventory' && App.inventoryModule) {
    initModuleWhenApiReady('inventory', () => App.inventoryModule.init());
  }
});

```

---

## `minibar-os/frontend/js/settings-module.js`

```javascript
// МОДУЛЬ НАСТРОЕК
// ═══════════════════════════════════════════════════════════════
App.settingsModule = (() => {
  const api = () => window.api;
  let products = [];
  let templates = [];
  let activeTab = 'products';
  let moduleInitialized = false;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const COLORS = ['amber', 'red', 'blue', 'yellow', 'purple', 'emerald', 'rose', 'orange', 'slate'];

  function getColorClass(color) { return colorMap[color] || 'bg-slate-100'; }
  function getRandomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.settings-tab').forEach(b => {
      const isActive = b.dataset.settingsTab === tab;
      b.classList.toggle('bg-white', isActive);
      b.classList.toggle('shadow-sm', isActive);
      b.classList.toggle('font-medium', isActive);
      b.classList.toggle('text-slate-600', !isActive);
    });
    document.getElementById('settings-products')?.classList.toggle('hidden', tab !== 'products');
    document.getElementById('settings-templates')?.classList.toggle('hidden', tab !== 'templates');
  }

  async function loadProducts() {
    try {
      products = await api().getProducts();
      renderProductsTable();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      const container = document.getElementById('products-table-container');
      if (container) container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Ошибка загрузки</div>';
    }
  }

  function renderProductsTable() {
    const container = document.getElementById('products-table-container');
    if (!container) return;
    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }
    container.innerHTML = `
      <table class="w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Продукт</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Объём</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Цена</th>
            <th class="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-2">Срок</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${products.map(p => `
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg ${getColorClass(p.bgColor)} flex items-center justify-center text-xl">${p.emoji || p.name.charAt(0).toUpperCase()}</div>
                  <span class="text-sm font-medium text-slate-900">${p.name}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">${p.volume || '—'} ${p.unit || 'шт'}</td>
              <td class="px-4 py-3 text-sm text-right">${parseFloat(p.price).toLocaleString('ru-RU')} ₽</td>
              <td class="px-4 py-3 text-center">
                ${p.hasExpiry ? '<span class="badge badge-success">Да</span>' : '<span class="badge badge-muted">Нет</span>'}
              </td>
              <td class="px-4 py-3 text-right">
                <button class="btn btn-ghost edit-product-btn" data-id="${p.id}" title="Редактировать">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button class="btn btn-ghost delete-product-btn" data-id="${p.id}" data-name="${p.name.replace(/"/g, '&quot;')}" title="Удалить" style="color: var(--danger);">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    if (window.lucide) lucide.createIcons();
  }

  function openProductModal(product = null) {
  const title = document.getElementById('product-modal-title');
  if (!title) return;

  title.textContent = product ? 'Редактировать продукт' : 'Новый продукт';
  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('product-name').value = product ? product.name : '';
  document.getElementById('product-price').value = product ? product.price : '';
  document.getElementById('product-volume').value = product ? product.volume : '';
  document.getElementById('product-unit').value = product ? (product.unit || 'шт') : 'шт';
  document.getElementById('product-category').value = product ? (product.category || 'Напитки') : 'Напитки';
  document.getElementById('product-emoji').value = product ? (product.emoji || '') : '';
  document.getElementById('product-has-expiry').checked = product ? product.hasExpiry : true;

  const bgColor = product ? (product.bgColor || 'slate') : getRandomColor();
  document.getElementById('product-bg-color').value = bgColor;

  document.querySelectorAll('.color-option').forEach(btn => {
    if (btn.dataset.color === bgColor) {
      btn.classList.add('border-slate-900', 'ring-2', 'ring-slate-900/20');
    } else {
      btn.classList.remove('border-slate-900', 'ring-2', 'ring-slate-900/20');
    }
  });

  document.getElementById('product-modal-backdrop').classList.remove('hidden');
  setTimeout(updatePreview, 50);
  if (window.lucide) lucide.createIcons();
}

  function closeProductModal() {
    document.getElementById('product-modal-backdrop')?.classList.add('hidden');
  }

  function updatePreview() {
  const name = document.getElementById('product-name')?.value || '';
  const volume = document.getElementById('product-volume')?.value || '0';
  const unit = document.getElementById('product-unit')?.value || 'шт';
  const price = document.getElementById('product-price')?.value || '0';
  const emoji = document.getElementById('product-emoji')?.value;
  const bgColor = document.getElementById('product-bg-color')?.value || 'slate';

  const displayEmoji = emoji || (name ? name.charAt(0).toUpperCase() : '📦');
  const displayName = name ? (name.charAt(0).toUpperCase() + name.slice(1)) : 'Название продукта';

  const previewIcon = document.getElementById('preview-icon');
  const previewName = document.getElementById('preview-name');
  const previewDetails = document.getElementById('preview-details');

  if (previewIcon) {
    previewIcon.className = `w-12 h-12 rounded-lg ${getColorClass(bgColor)} flex items-center justify-center text-2xl`;
    previewIcon.textContent = displayEmoji;
  }
  if (previewName) previewName.textContent = displayName;
  if (previewDetails) previewDetails.textContent = `${volume} ${unit} · ${parseFloat(price || 0).toLocaleString('ru-RU')} ₽`;
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = document.getElementById('product-price').value;
  const volume = document.getElementById('product-volume').value;

  if (!name || price === '' || volume === '') {
    alert('Заполните обязательные поля');
    return;
  }

  const data = {
    name,
    price: parseFloat(price),
    volume: parseFloat(volume),
    unit: document.getElementById('product-unit').value,
    category: document.getElementById('product-category').value,
    emoji: document.getElementById('product-emoji').value || null,
    bgColor: document.getElementById('product-bg-color').value || 'slate',
    hasExpiry: document.getElementById('product-has-expiry').checked
  };

  try {
    let savedProduct;
    if (id) {
      savedProduct = await api().updateProduct(parseInt(id), data);
      // Обновляем локально
      const idx = products.findIndex(p => p.id === parseInt(id));
      if (idx !== -1) products[idx] = savedProduct;
    } else {
      savedProduct = await api().createProduct(data);
      products.push(savedProduct);
    }
    
    closeProductModal();
    renderProductsTable();
    
    // ВСЕГДА перезагружаем шаблоны, чтобы учесть смену категории
    await loadTemplates();
    
  } catch (err) {
    alert('Ошибка сохранения: ' + err.message);
  }
}

  async function deleteProduct(id, name) {
    if (!confirm(`Удалить продукт "${name}"?`)) return;
    try {
      await api().deleteProduct(id);
      await loadProducts();
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadTemplates() {
    try {
      templates = await api().getTemplates();
      if (!products.length) await loadProducts();
      renderTemplates();
    } catch (err) {
      console.error('Ошибка загрузки шаблонов:', err);
    }
  }

  function renderTemplates() {
  ['standard', 'lux'].forEach(cat => {
    const container = document.querySelector(`.template-items-container[data-category="${cat}"]`);
    if (!container) return;
    const template = templates.find(t => t.category === cat);

    if (!template) {
      container.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Шаблон не найден</div>';
      return;
    }

    const items = template.items || [];
    
    // Группируем по категориям
    const categories = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];
    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    
    items.forEach(item => {
  // Берём актуальную категорию из глобального products массива
  const freshProduct = products.find(p => p.id === item.productId);
  const cat = (freshProduct?.category) || item.product.category || 'Напитки';
  
  // Обновляем данные продукта в item для корректного отображения
  if (freshProduct) {
    item.product = { ...item.product, ...freshProduct };
  }
  
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(item);
});

    container.innerHTML = `
      <div class="space-y-4 template-items-list" data-template-id="${template.id}">
        ${categories.map(category => {
          const catItems = grouped[category] || [];
          if (catItems.length === 0) return '';
          return `
            <div class="template-category" data-category-name="${category}">
              <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">${category}</div>
              <div class="space-y-2 sortable-list" data-category="${category}">
                ${catItems.map(item => `
  <div class="template-item flex items-center gap-2 p-2 bg-slate-50 rounded-lg" draggable="true" data-product-id="${item.productId}" data-sort-order="${item.sortOrder}">
    <div class="drag-handle text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
      <i data-lucide="grip-vertical" class="w-4 h-4 pointer-events-none"></i>
    </div>
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(item.product.bgColor)}">${item.product.emoji || item.product.name.charAt(0).toUpperCase()}</div>
      <span class="text-sm font-medium text-slate-900 truncate">${item.product.name}</span>
    </div>
    <div class="text-xs text-slate-500">${item.product.volume || ''} ${item.product.unit || 'шт'}</div>
    <input type="number" min="0" value="${item.qty}" class="qty-input w-16 text-center border border-slate-200 rounded-md px-2 py-1 text-sm" data-product-id="${item.productId}" />
    <button class="remove-item-btn w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500" data-product-id="${item.productId}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
  </div>
`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="mt-3 pt-3 border-t border-slate-100">
        <select class="add-product-select w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white mb-2">
          <option value="">+ Добавить продукт...</option>
          ${products.filter(p => !items.some(i => i.productId === p.id)).map(p => `<option value="${p.id}">${p.emoji || p.name.charAt(0).toUpperCase()} ${p.name} ${p.volume || ''} ${p.unit || 'шт'} (${p.category || 'Напитки'})</option>`).join('')}
        </select>
        <button class="save-template-btn btn btn-primary w-full justify-center"><i data-lucide="save" class="w-4 h-4"></i> Сохранить шаблон</button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    
    // Инициализируем drag-and-drop
    initDragAndDrop(container);
  });
}

function initDragAndDrop(container) {
  let draggedItem = null;
  let isDraggingFromHandle = false;

  // Делегирование: mousedown на всём контейнере
  container.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.drag-handle');
    const item = e.target.closest('.template-item');
    // Запоминаем, был ли клик именно на handle
    isDraggingFromHandle = !!(handle && item);
  });

  // Делегирование: dragstart
  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.template-item');
    if (!item) return;

    // Если начали тянуть НЕ за handle — отменяем
    if (!isDraggingFromHandle) {
      e.preventDefault();
      return;
    }

    draggedItem = item;
    const category = item.closest('.sortable-list')?.dataset.category;
    item.dataset.dragCategory = category;
    setTimeout(() => item.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.productId);
  });

  // Делегирование: dragover
  container.addEventListener('dragover', (e) => {
    if (!draggedItem) return;
    e.preventDefault();

    const targetItem = e.target.closest('.template-item');
    if (!targetItem || targetItem === draggedItem) return;

    // Только внутри той же категории
    const targetCategory = targetItem.closest('.sortable-list')?.dataset.category;
    const draggedCategory = draggedItem.dataset.dragCategory;
    if (targetCategory !== draggedCategory) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    e.dataTransfer.dropEffect = 'move';

    // Определяем позицию
    const rect = targetItem.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    // Убираем старые индикаторы в пределах той же категории
    const parentList = targetItem.closest('.sortable-list');
    parentList.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    if (e.clientY < midpoint) {
      targetItem.classList.add('drag-over-top');
    } else {
      targetItem.classList.add('drag-over-bottom');
    }
  });

  // Делегирование: dragleave
  container.addEventListener('dragleave', (e) => {
    const targetItem = e.target.closest('.template-item');
    if (targetItem) {
      targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });

  // Делегирование: drop
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetItem = e.target.closest('.template-item');
    if (!targetItem || targetItem === draggedItem) return;

    const targetCategory = targetItem.closest('.sortable-list')?.dataset.category;
    const draggedCategory = draggedItem.dataset.dragCategory;
    if (targetCategory !== draggedCategory) return;

    const parent = targetItem.closest('.sortable-list');

    if (targetItem.classList.contains('drag-over-top')) {
      parent.insertBefore(draggedItem, targetItem);
    } else if (targetItem.classList.contains('drag-over-bottom')) {
      parent.insertBefore(draggedItem, targetItem.nextSibling);
    }

    // Очищаем индикаторы
    parent.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  // Делегирование: dragend
  container.addEventListener('dragend', (e) => {
    const item = e.target.closest('.template-item');
    if (item) {
      item.classList.remove('dragging');
      delete item.dataset.dragCategory;
    }
    // Очищаем все индикаторы
    container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    draggedItem = null;
    isDraggingFromHandle = false;
  });
}

function getTemplateState(category) {
  const container = document.querySelector(`.template-items-container[data-category="${category}"]`);
  if (!container) return { templateId: null, items: [] };
  const list = container.querySelector('.template-items-list');
  const templateId = list?.dataset.templateId;
  const items = [];
  let sortOrder = 0;
  container.querySelectorAll('.template-item').forEach(el => {
    const productId = el.dataset.productId;
    const qty = parseInt(el.querySelector('.qty-input').value) || 0;
    if (qty > 0) {
      items.push({ productId, qty, sortOrder: sortOrder++ });
    }
  });
  return { templateId, items };
}

  async function saveTemplate(category) {
    const { templateId, items } = getTemplateState(category);
    if (!templateId) return;
    try {
      await api().updateTemplateItems(templateId, items);
      alert('Шаблон сохранён');
      await loadTemplates();
    } catch (err) {
      alert('Ошибка сохранения: ' + err.message);
    }
  }

  function setupGlobalListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#add-product-btn')) {
        e.preventDefault();
        openProductModal();
        return;
      }

      const editBtn = e.target.closest('.edit-product-btn');
      if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        const product = products.find(p => p.id === id);
        if (product) openProductModal(product);
        return;
      }

      const delBtn = e.target.closest('.delete-product-btn');
      if (delBtn) {
        deleteProduct(parseInt(delBtn.dataset.id), delBtn.dataset.name);
        return;
      }

      const tabBtn = e.target.closest('.settings-tab');
      if (tabBtn) {
        switchTab(tabBtn.dataset.settingsTab);
        return;
      }

      const colorBtn = e.target.closest('.color-option');
      if (colorBtn) {
        document.querySelectorAll('.color-option').forEach(btn => {
          btn.classList.remove('border-slate-900', 'ring-2', 'ring-slate-900/20');
        });
        colorBtn.classList.add('border-slate-900', 'ring-2', 'ring-slate-900/20');
        document.getElementById('product-bg-color').value = colorBtn.dataset.color;
        updatePreview();
        return;
      }

      const incBtn = e.target.closest('.qty-inc-btn');
      if (incBtn) {
        const container = incBtn.closest('.template-items-container');
        const input = container.querySelector(`.qty-input[data-product-id="${incBtn.dataset.productId}"]`);
        if (input) input.value = parseInt(input.value) + 1;
        return;
      }
      const decBtn = e.target.closest('.qty-dec-btn');
      if (decBtn) {
        const container = decBtn.closest('.template-items-container');
        const input = container.querySelector(`.qty-input[data-product-id="${decBtn.dataset.productId}"]`);
        if (input) { const v = parseInt(input.value); if (v > 0) input.value = v - 1; }
        return;
      }

      const removeBtn = e.target.closest('.remove-item-btn');
      if (removeBtn) {
        removeBtn.closest('.template-item')?.remove();
        return;
      }

      const saveBtn = e.target.closest('.save-template-btn');
      if (saveBtn) {
        const category = saveBtn.closest('.template-items-container').dataset.category;
        saveTemplate(category);
        return;
      }
    });

    document.addEventListener('input', (e) => {
      if (['product-name', 'product-volume', 'product-unit', 'product-price', 'product-emoji'].includes(e.target.id)) {
        updatePreview();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'product-unit') updatePreview();

      if (e.target.classList.contains('add-product-select') && e.target.value) {
        const productId = parseInt(e.target.value);
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const list = e.target.closest('.template-items-container').querySelector('.template-items-list');

        const item = document.createElement('div');
        item.className = 'flex items-center gap-2 p-2 bg-slate-50 rounded-lg template-item';
        item.dataset.productId = productId;
        item.innerHTML = `
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(product.bgColor)}">${product.emoji || product.name.charAt(0).toUpperCase()}</div>
            <span class="text-sm font-medium text-slate-900 truncate">${product.name}</span>
          </div>
          <div class="text-xs text-slate-500">${product.volume || ''} ${product.unit || 'шт'}</div>
          <div class="flex items-center gap-1">
            <button class="qty-dec-btn w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center" data-product-id="${productId}"><i data-lucide="minus" class="w-3 h-3"></i></button>
            <input type="number" min="0" value="1" class="qty-input w-14 text-center border border-slate-200 rounded-md px-2 py-1 text-sm" data-product-id="${productId}" />
            <button class="qty-inc-btn w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center" data-product-id="${productId}"><i data-lucide="plus" class="w-3 h-3"></i></button>
          </div>
          <button class="remove-item-btn w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500" data-product-id="${productId}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        `;
        list.appendChild(item);
        e.target.value = '';
        if (window.lucide) lucide.createIcons();
      }
    });

    document.addEventListener('submit', (e) => {
      if (e.target.id === 'product-form') {
        e.preventDefault();
        handleProductSubmit(e);
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.id === 'product-modal-backdrop') closeProductModal();
    });

    document.addEventListener('input', (e) => {
  if (['product-name', 'product-volume', 'product-unit', 'product-price', 'product-emoji'].includes(e.target.id)) {
    updatePreview();
  }
});
  }

  function init() {
    if (!moduleInitialized) {
      setupGlobalListeners();
      moduleInitialized = true;
    }
    loadProducts();
    loadTemplates();
  }

  return { init, closeProductModal };
})();

```

---

## `minibar-os/frontend/js/utils.js`

```javascript
function pluralize(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function waitForApi(maxAttempts = 30, intervalMs = 100) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const check = () => {
      if (window.api) {
        resolve(window.api);
      } else if (attempt >= maxAttempts) {
        reject(new Error('API not available'));
      } else {
        attempt += 1;
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

function showToast(message, durationMs = 2000) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

function parseDbDate(iso) {
  const d = new Date(iso);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

window.AppUtils = { pluralize, escapeHtml, waitForApi, showToast, parseDbDate };

```

---

## `minibar-os/frontend/nginx.conf`

```
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## `minibar-os/frontend/styles.css`

```css
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
  }
  * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  body { background: var(--bg); }
  .scrollbar::-webkit-scrollbar { width: 6px; }
  .scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  .fade-in { animation: fadeIn 0.25s ease-out; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px; font-weight: 500; font-size: 13px;
    transition: all 0.15s ease; cursor: pointer; border: none;
  }
  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover { background: var(--primary-dark); }
  .btn-outline { background: white; color: #0f172a; border: 1px solid var(--border); }
  .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
  .btn-ghost { background: transparent; color: #64748b; }
  .btn-ghost:hover { background: #f1f5f9; color: #0f172a; }
  .nav-item {
    transition: all 0.15s ease;
  }
  /* Базовый стиль активной вкладки */
.nav-item.active {
  background: var(--nav-active-bg, #eef2ff);
  color: var(--nav-active-color, #4f46e5);
  font-weight: 600;
}

.nav-item.active .nav-icon {
  color: var(--nav-active-color, #4f46e5) !important;
}

/* Обзор — индиго (главный дашборд) */
.nav-item.active[data-accent="indigo"] {
  --nav-active-bg: #eef2ff;
  --nav-active-color: #4f46e5;
}

/* Акцизы — янтарный */
.nav-item.active[data-accent="amber"] {
  --nav-active-bg: #fffbeb;
  --nav-active-color: #d97706;
}

/* Сроки — красный */
.nav-item.active[data-accent="rose"] {
  --nav-active-bg: #fff1f2;
  --nav-active-color: #e11d48;
}

/* Arrivals — зелёный */
.nav-item.active[data-accent="emerald"] {
  --nav-active-bg: #ecfdf5;
  --nav-active-color: #059669;
}

/* Departures — голубой */
.nav-item.active[data-accent="sky"] {
  --nav-active-bg: #f0f9ff;
  --nav-active-color: #0284c7;
}

/* GIH — фиолетовый */
.nav-item.active[data-accent="violet"] {
  --nav-active-bg: #f5f3ff;
  --nav-active-color: #7c3aed;
}

/* История — серый */
.nav-item.active[data-accent="slate"] {
  --nav-active-bg: #f1f5f9;
  --nav-active-color: #475569;
}

/* Пустые — розовый */
.nav-item.active[data-accent="pink"] {
  --nav-active-bg: #fdf2f8;
  --nav-active-color: #db2777;
}

/* Калькулятор — бирюзовый */
.nav-item.active[data-accent="teal"] {
  --nav-active-bg: #f0fdfa;
  --nav-active-color: #0d9488;
}

/* Инвентаризация — синий */
.nav-item.active[data-accent="blue"] {
  --nav-active-bg: #eff6ff;
  --nav-active-color: #2563eb;
}

/* Настройки — темно-серый */
.nav-item.active[data-accent="zinc"] {
  --nav-active-bg: #f4f4f5;
  --nav-active-color: #3f3f46;
}
  .nav-item.active .nav-icon {
    color: var(--primary);
  }
  .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

/* Акцизы — янтарный (операционная задача) */
.badge-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* Сроки — красный (проблема, требует замены) */
.badge-danger {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Arrivals — зелёный (позитивное событие) */
.badge-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

/* Departures — голубой (информационный) */
.badge-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

/* GIH — индиго (рабочий процесс) */
.badge-primary {
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #c7d2fe;
}

/* История — серый (архив, пассивный) */
.badge-muted {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

/* Пустые — розовый (предупреждение о проблеме) */
.badge-rose {
  background: #ffe4e6;
  color: #9f1239;
  border: 1px solid #fecdd3;
}

/* Калькулятор — бирюзовый (инструмент) */
.badge-teal {
  background: #ccfbf1;
  color: #115e59;
  border: 1px solid #99f6e4;
}

/* Инвентаризация — синий (плановая задача) */
.badge-blue {
  background: #e0f2fe;
  color: #075985;
  border: 1px solid #bae6fd;
}

/* Настройки — slate (системный, редко используется) */
.badge-slate {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  input, select, textarea {
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .hidden { display: none !important; }

  .status-icon-container {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.status-icon-container.valid {
  background-color: #10b981;
}

.status-icon-container.invalid {
  background-color: #f43f5e;
}

.status-icon-container:hover {
  background-color: white;
  border-color: #dc2626;
  transform: scale(1.1);
}

.status-icon-default,
.status-icon-hover {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.status-icon-default {
  opacity: 1;
}

.status-icon-hover {
  opacity: 0;
}

.status-icon-container:hover .status-icon-default {
  opacity: 0;
}

.status-icon-container:hover .status-icon-hover {
  opacity: 1;
}

.group:hover .status-icon {
  transform: scale(1.1);
}

  .template-item[draggable="true"] {
  user-select: none;
}


.template-item {
  position: relative;
  transition: opacity 0.15s ease;
}

.template-item.dragging {
  opacity: 0.4;
}

.drag-handle {
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.template-item.drag-over-top::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

.template-item.drag-over-bottom::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

.floor-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  padding: 16px 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.floor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 8px;
}

.room-cell {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.room-cell:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
  z-index: 2;
}

.deadline-product-card {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  background: white;
  user-select: none;
}

.deadline-product-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.1);
}

.deadline-product-card.selected {
  border-color: #dc2626;
  background: #fee2e2;
  box-shadow: 0 0 0 1px #dc2626;
}

.deadline-product-counter {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.deadlines-month-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
}

.deadlines-month-item-emoji {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.deadlines-month-item-name {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deadlines-month-item-period {
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.deadlines-replacement-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.deadlines-replacement-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #fecdd3;
  background: #fff1f2;
  min-width: 0;
}

.deadlines-replacement-card-emoji {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.deadlines-replacement-card-name {
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deadlines-replacement-card-qty {
  font-size: 12px;
  font-weight: 700;
  color: #e11d48;
  min-width: 18px;
  text-align: center;
}

.deadline-month-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border, #e2e8f0);
  background: white;
}

.deadline-month-row-product {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 140px;
}

.deadline-month-saved-dates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.deadline-month-saved-date {
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.15s ease;
  user-select: none;
}

.deadline-month-saved-date:hover {
  color: #e11d48;
}

.deadline-month-add {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.deadline-month-row-info {
  flex: 1;
  min-width: 0;
}

.deadline-month-row-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.deadline-month-row-meta {
  font-size: 11px;
  color: #64748b;
}

.deadline-month-period-input {
  width: 72px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.deadline-month-period-input:focus {
  outline: none;
  border-color: var(--primary, #6366f1);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.excise-card {
  position: relative;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: filter 0.1s ease;
  user-select: none;
  overflow: hidden;
}

.excise-card:hover {
  filter: brightness(1.05);
}

.excise-card.valid {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
}

.excise-card.invalid {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(244, 63, 94, 0.35);
}

.excise-card-mark {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  word-break: break-all;
  line-height: 1.4;
  margin-right: 25px;
}

.excise-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 11px;
  opacity: 0.85;
}

.excise-status-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.excise-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  display: none;
  align-items: center;
  justify-content: center;
  transition: background 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.excise-delete-btn:hover {
  background: #fee2e2;
}

.excise-delete-btn svg {
  width: 12px;
  height: 12px;
  stroke: #dc2626;
}

.excise-card:hover .excise-status-icon {
  display: none;
}

.excise-card:hover .excise-delete-btn {
  display: flex;
}

/* Calculator */
.calculator-bill-panel {
  position: sticky;
  top: 1rem;
}

.calculator-categories-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.calculator-category-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.calculator-category-header {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.calculator-category-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calculator-category-empty {
  text-align: center;
  padding: 8px 0;
  color: #cbd5e1;
  font-size: 11px;
}

.calculator-product-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 4px 5px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: white;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.calculator-product-card.has-qty {
  border-color: #5eead4;
  background: #f0fdfa;
}

.calculator-product-main {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.calculator-product-emoji {
  width: 36px;
  height: 36px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.calculator-product-info {
  flex: 1;
  min-width: 0;
}

.calculator-product-name {
  font-size: 14px;
  color: #0f172a;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calculator-product-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.calculator-product-price {
  font-size: 10px;
  color: #64748b;
  white-space: nowrap;
}

.calculator-product-qty {
  font-size: 10px;
  font-weight: 700;
  color: #0d9488;
  min-width: 10px;
}

.calculator-product-card:not(.has-qty) .calculator-product-qty {
  color: #94a3b8;
  font-weight: 500;
}

.calculator-product-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.calculator-qty-btn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: white;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.calculator-qty-btn:hover:not(:disabled) {
  border-color: #0d9488;
  color: #0d9488;
  background: #f0fdfa;
}

.calculator-qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.calculator-bill-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.calculator-bill-dec {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.calculator-bill-dec:hover {
  border-color: #fca5a5;
  color: #dc2626;
  background: #fef2f2;
}

/* Inventory */
.inventory-product-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 5px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: white;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.inventory-product-card.has-qty {
  border-color: #93c5fd;
  background: #eff6ff;
}

.inventory-product-main {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.inventory-product-fields {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.inventory-field-input {
  width: 32px;
  padding: 3px 2px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.inventory-field-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.inventory-field-input::placeholder {
  color: #cbd5e1;
  font-weight: 400;
}

.inventory-product-result {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  min-width: 44px;
  line-height: 1.1;
}

.inventory-product-qty {
  font-size: 11px;
  font-weight: 700;
  color: #3b82f6;
  font-variant-numeric: tabular-nums;
}

.inventory-product-card:not(.has-qty) .inventory-product-qty {
  color: #94a3b8;
  font-weight: 500;
}

.inventory-product-volume {
  font-size: 13px;
  font-weight: 700;
  color: #1e40af;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.inventory-product-card:not(.has-qty) .inventory-product-volume {
  color: #94a3b8;
  font-weight: 500;
  font-size: 11px;
}


/* ═══════════════════════════════════════════════════════════════
   МОБИЛЬНАЯ ВЕРСИЯ (<=768px): шапка, таб-бар, шторка «Ещё»
   ═══════════════════════════════════════════════════════════════ */
#mobile-header, #mobile-tabbar, #mobile-more-backdrop { display: none; }

/* ═══════════════════════════════════════════════════════════════
   МОБИЛЬНАЯ ВЕРСИЯ (≤768px) — профессиональная верстка
   ═══════════════════════════════════════════════════════════════ */

/* Скрываем мобильные элементы на десктопе */
#mobile-header,
#mobile-tabbar,
#mobile-more-backdrop {
  display: none;
}

@media (max-width: 768px) {
  
  /* ── Сброс и базовая структура ── */
  * {
    -webkit-tap-highlight-color: transparent;
  }
  
  body {
    overflow-x: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* Скрываем сайдбар */
  aside {
    display: none !important;
  }
  
  /* Убираем padding с main */
  main {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* ── Шапка (fixed, не скроллится) ── */
  #mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    height: 60px;
    background: rgba(255, 255, 255, 0.95);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e2e8f0;
    padding: 0 16px;
    padding-top: env(safe-area-inset-top, 0);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  }
  
  .mh-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .mh-logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: #fff;
    font-weight: 800;
    font-size: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    flex-shrink: 0;
  }
  
  .mh-app {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  
  .mh-section {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin-top: 1px;
  }
  
  .mh-date {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 10px;
    white-space: nowrap;
  }
  
  /* ── Нижний таб-бар (fixed) ── */
  #mobile-tabbar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    height: 64px;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  
  .mobile-tab {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 4px;
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  
  .mobile-tab::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: currentColor;
    transform: translateX(-50%);
    transition: width 0.2s ease;
  }
  
  .mobile-tab.active::before {
    width: 28px;
  }
  
  .mobile-tab svg {
    width: 24px;
    height: 24px;
    transition: transform 0.15s ease;
  }
  
  .mobile-tab.active svg {
    transform: translateY(-1px) scale(1.05);
  }
  
  .mobile-tab:active {
    transform: scale(0.95);
  }
  
  /* Акцентные цвета вкладок */
  .mobile-tab.active[data-route="dashboard"] { color: #4f46e5; }
  .mobile-tab.active[data-route="excise"] { color: #d97706; }
  .mobile-tab.active[data-route="deadlines"] { color: #e11d48; }
  .mobile-tab.active[data-route="gih"] { color: #7c3aed; }
  .mobile-tab.active[data-route="more"] { color: #4f46e5; }
  
  /* Бейджи на вкладках */
  .mt-badge {
    position: absolute;
    top: 6px;
    right: calc(50% - 24px);
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 800;
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px #fff;
    animation: mt-badge-pop 0.25s ease;
  }
  
  .mt-badge.hidden {
    display: none !important;
  }
  
  .mt-badge.b-amber { background: #d97706; }
  .mt-badge.b-rose { background: #e11d48; }
  
  @keyframes mt-badge-pop {
    from { transform: scale(0.5); }
    to { transform: scale(1); }
  }
  
  /* ── Шторка «Ещё» ── */
  #mobile-more-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(15, 23, 42, 0.5);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  
  #mobile-more-backdrop.hidden {
    display: none !important;
  }
  
  #mobile-more-backdrop:not(.hidden) {
    display: block;
  }
  
  #mobile-more-backdrop.show {
    opacity: 1;
  }
  
  #mobile-more-sheet {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 24px 24px 0 0;
    padding: 12px 20px calc(24px + env(safe-area-inset-bottom, 0));
    box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
    transform: translateY(102%);
    transition: transform 0.3s cubic-bezier(0.32, 0.72, 0.24, 1);
  }
  
  #mobile-more-sheet.open {
    transform: translateY(0);
  }
  
  .ms-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #e2e8f0;
    margin: 0 auto 16px;
  }
  
  .ms-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 16px;
    letter-spacing: -0.01em;
  }
  
  .ms-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  
  .ms-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 4px;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    text-decoration: none;
    transition: transform 0.12s ease, background 0.15s ease, color 0.15s ease;
  }
  
  .ms-item svg {
    width: 22px;
    height: 22px;
    color: #64748b;
    transition: color 0.15s ease;
  }
  
  .ms-item:active {
    transform: scale(0.95);
  }
  
  .ms-item.active {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #4f46e5;
  }
  
  .ms-item.active svg {
    color: #4f46e5;
  }
  
  /* ── Контент: правильные отступы ── */
  .tab-content {
    padding: 76px 16px calc(88px + env(safe-area-inset-bottom, 0)) !important;
    min-height: 100vh;
    box-sizing: border-box;
  }
  
  /* ── Типографика ── */
  h1 {
    font-size: 1.5rem !important;
    line-height: 1.3 !important;
    margin-bottom: 16px !important;
  }
  
  h2 {
    font-size: 1.25rem !important;
    margin-bottom: 12px !important;
  }
  
  h3 {
    font-size: 1.1rem !important;
    margin-bottom: 10px !important;
  }
  
  p {
    font-size: 14px !important;
    line-height: 1.6 !important;
  }
  
  /* ── Сетки ── */
  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
  
  .grid:has(> [class*="col-span-"]) {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  
  [class*="col-span-"] {
    grid-column: auto !important;
  }
  
  /* ── Карточки статистики ── */
  .grid-cols-4 > div {
    padding: 16px !important;
  }
  
  /* ── Сетка номеров ── */
  .rooms-grid {
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)) !important;
    gap: 8px !important;
  }
  
  .room-cell {
    min-height: 48px;
    font-size: 12px !important;
    border-radius: 10px !important;
  }
  
  .floor-header {
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px !important;
  }
  
  /* ── График ── */
  #deadlines-chart {
    height: 240px !important;
    width: 100% !important;
  }
  
  /* ── Кнопки (touch-friendly) ── */
  .btn {
    min-height: 44px !important;
    padding: 12px 20px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
  }
  
  .btn-sm {
    min-height: 36px !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
  }
  
  /* ── Инпуты (iOS не зумит при 16px) ── */
  input,
  select,
  textarea {
    font-size: 16px !important;
    padding: 12px 14px !important;
    border-radius: 10px !important;
  }
  
  /* ── Модалки (поверх таб-бара, z-index: 100) ── */
  #deadline-modal-backdrop,
  #deadline-month-modal-backdrop {
    z-index: 100 !important;
    position: fixed !important;
    inset: 0 !important;
  }
  
  #deadline-modal-backdrop > div,
  #deadline-month-modal-backdrop > div {
    width: 100% !important;
    max-width: none !important;
    height: 100%;
    max-height: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0)) !important;
    overflow-y: auto !important;
    box-sizing: border-box;
  }
  
  /* ── Таблицы ── */
  table {
    font-size: 13px !important;
  }
  
  th,
  td {
    padding: 10px 8px !important;
  }
  
  /* ── Отступы между элементами ── */
  .space-y-4 > * + * {
    margin-top: 16px !important;
  }
  
  .space-y-6 > * + * {
    margin-top: 20px !important;
  }
  
  .mb-6 {
    margin-bottom: 20px !important;
  }
  
  .mb-4 {
    margin-bottom: 16px !important;
  }
  
  .gap-4 {
    gap: 12px !important;
  }
  
  .gap-6 {
    gap: 16px !important;
  }
  
  /* ── Убираем лишнюю прокрутку ── */
  .flex.h-screen {
    height: auto !important;
  }
  
  .overflow-hidden {
    overflow: visible !important;
  }
}


/* ═══════════════════════════════════════════════════════════════
   ЕДИНЫЙ ДИЗАЙН: КАЛЬКУЛЯТОР + ИНВЕНТАРИЗАЦИЯ (v2)
   ═══════════════════════════════════════════════════════════════ */

/* Вкладки категорий */
.cat-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}
.cat-tabs::-webkit-scrollbar { display: none; }
.cat-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  user-select: none;
}
.cat-tab:hover { border-color: #cbd5e1; color: #334155; }
.cat-tab-count {
  font-size: 11px;
  font-weight: 700;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 8px;
}
.cat-tabs.teal .cat-tab.active { background: #f0fdfa; border-color: #0d9488; color: #0d9488; }
.cat-tabs.teal .cat-tab.active .cat-tab-count { background: #ccfbf1; color: #0d9488; }
.cat-tabs.blue .cat-tab.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; }
.cat-tabs.blue .cat-tab.active .cat-tab-count { background: #dbeafe; color: #2563eb; }

/* Макет: продукты + боковая панель */
.split-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: start;
}

/* Сетка продуктов */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

/* Карточка продукта (унифицированная) */
.product-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: white;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.product-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
.product-card-emoji {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.product-card-info { flex: 1; min-width: 0; }
.product-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.product-card-meta { font-size: 12px; color: #64748b; margin-top: 2px; }

/* Калькулятор: карточка с количеством */
.calc-card.has-qty { border-color: #5eead4; background: #f0fdfa; }
.calc-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.calc-qty-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: white;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}
.calc-qty-btn:hover:not(:disabled) { border-color: #0d9488; color: #0d9488; background: #f0fdfa; }
.calc-qty-btn:active:not(:disabled) { transform: scale(0.92); }
.calc-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.calc-qty-value {
  min-width: 28px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.calc-card:not(.has-qty) .calc-qty-value { color: #cbd5e1; }

/* Инвентаризация: карточка с полями */
.inv-card.has-qty { border-color: #93c5fd; background: #eff6ff; }
.inv-fields { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.inv-field {
  width: 56px;
  height: 40px;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
  transition: all 0.15s ease;
}
.inv-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
.inv-field::placeholder { color: #cbd5e1; font-weight: 400; }
.inv-plus { font-size: 16px; font-weight: 600; color: #94a3b8; }
.inv-result { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; min-width: 64px; }
.inv-result-qty { font-size: 13px; font-weight: 700; color: #3b82f6; font-variant-numeric: tabular-nums; }
.inv-result-vol { font-size: 15px; font-weight: 800; color: #1e40af; font-variant-numeric: tabular-nums; white-space: nowrap; }
.inv-card:not(.has-qty) .inv-result-qty,
.inv-card:not(.has-qty) .inv-result-vol { color: #cbd5e1; font-weight: 600; }

/* Боковая панель (счёт / сводка) */
.side-panel {
  position: sticky;
  top: 20px;
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06);
  overflow: hidden;
}
.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.side-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }
.side-panel-body { padding: 8px 20px; max-height: 400px; overflow-y: auto; }
.side-panel-footer { padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
.side-panel-empty { text-align: center; padding: 32px 20px; color: #94a3b8; }
.side-panel-empty svg { width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.4; }
.side-panel-empty p { font-size: 13px; }

/* Строка счёта / сводки */
.bill-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
.bill-row:last-child { border-bottom: none; }
.bill-row-info { flex: 1; min-width: 0; }
.bill-row-name { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bill-row-meta { font-size: 11px; color: #64748b; margin-top: 1px; }
.bill-row-sum { font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; }
.bill-row-del {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.bill-row-del:hover { border-color: #fca5a5; color: #dc2626; background: #fef2f2; }

/* Итог */
.total-row { display: flex; align-items: baseline; justify-content: space-between; }
.total-row-label { font-size: 13px; color: #64748b; }
.total-row-value { font-size: 22px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }

/* Мобильная мини-панель (по умолчанию скрыта) */
.mobile-action-bar { display: none; }

/* Шторка (мобильный модал) */
.sheet-modal { position: fixed; inset: 0; z-index: 100; }
.sheet-modal.hidden { display: none; }
.sheet-modal-backdrop { position: absolute; inset: 0; background: rgba(15,23,42,0.5); }
.sheet-modal-content {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: white;
  border-radius: 24px 24px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
  animation: sheetUp 0.3s cubic-bezier(0.32, 0.72, 0.24, 1);
}
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
  border-bottom: 1px solid #f1f5f9;
}
.sheet-modal-title { font-size: 17px; font-weight: 800; color: #0f172a; }
.sheet-modal-body { flex: 1; overflow-y: auto; padding: 8px 20px; }
.sheet-modal-footer { padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #f8fafc; }

/* ── Мобильная адаптация нового дизайна ── */
@media (max-width: 768px) {
  /* Заголовки h1 скрыты на мобильном (они в шапке) */
  .tab-content h1 { display: none !important; }

  .split-layout { grid-template-columns: 1fr !important; }
  .side-panel { display: none !important; }
  .products-grid { grid-template-columns: 1fr !important; gap: 10px !important; }

  /* Мини-панель над таб-баром */
  .mobile-action-bar {
    display: flex;
    position: fixed;
    left: 0; right: 0;
    bottom: calc(64px + env(safe-area-inset-bottom, 0));
    z-index: 45;
    align-items: center;
    justify-content: space-between;
    background: white;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -4px 16px rgba(15,23,42,0.08);
    padding: 10px 16px;
  }
  .mobile-action-bar.hidden { display: none !important; }
  .mobile-action-bar-info { display: flex; flex-direction: column; }
  .mobile-action-bar-label { font-size: 11px; color: #64748b; }
  .mobile-action-bar-value { font-size: 17px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }

  /* Доп. нижний отступ, чтобы контент не прятался под мини-панелью */
  #view-calculator, #view-inventory {
    padding-bottom: calc(150px + env(safe-area-inset-bottom, 0)) !important;
  }

  /* Карточка инвентаризации: перенос на 2 строки */
  .inv-card { flex-wrap: wrap; }
  .inv-result { order: 2; margin-left: auto; flex-direction: row; align-items: baseline; gap: 8px; }
  .inv-fields { order: 3; flex-basis: 100%; margin-top: 10px; justify-content: flex-start; }
}

```

---

## `minibar-os/make-context.sh`

```bash
#!/bin/bash
OUT="context.md"
echo "# MiniBar OS — контекст ($(date '+%Y-%m-%d %H:%M'))" > "$OUT"
for f in \
  frontend/index.html frontend/styles.css frontend/config.js frontend/nginx.conf \
  frontend/js/utils.js frontend/js/app-core.js frontend/js/init.js \
  frontend/js/route-handlers.js frontend/js/mobile-nav.js \
  frontend/js/excise-module.js frontend/js/deadlines-module.js \
  frontend/js/calculator-module.js frontend/js/inventory-module.js \
  frontend/js/settings-module.js \
  backend/src/app.js backend/src/routes/deadlines.js backend/src/routes/rooms.js \
  backend/src/routes/excises.js backend/src/routes/products.js \
  backend/src/services/deadlines.js backend/src/services/monthChecks.js \
  backend/src/lib/timezone.js backend/prisma/schema.prisma docker-compose.yml
do
  if [ -f "$f" ]; then
    { echo ""; echo "=== FILE: $f ==="; echo '```'; cat "$f"; echo '```'; } >> "$OUT"
  fi
done
wc -l "$OUT"
echo "Готово. В VS Code: правый клик по context.md -> Download"

```

---
> **Итог:** 39 файлов с кодом вставлено, 0 файлов только в списке структуры.
