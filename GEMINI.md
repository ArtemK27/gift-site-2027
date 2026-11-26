# Gift Site 2027 — Новогодняя мобильная открытка

Локальный контекст проекта для быстрого старта в новых сессиях. Правила ниже дополняют корневой `GEMINI.md` и имеют приоритет внутри `gift-site2`.

## 1. Цель и концепция

Делаем личную новогоднюю веб-открытку подруге (мобильный формат, ориентир — экран телефона `390×844`).

- **Этап 1 — «Красивая обёртка» (текущий главный фокус):**
  Листаемая праздничная страница ради сильного визуального «ВАУ-эффекта»: светлая молочно-голубая, жемчужная и пастельно-золотая эстетика, плавная живая хореография при скролле (ориентиры — `for reference/ex1.mp4` и `for reference/ex2.mp4`), 3D/WebGL, тактильные микро-интерактивы и процедурный звук.
- **Этап 2 — «Интерактив после перехода» (задел на будущее, концепт может измениться):**
  После праздничной обёртки планируется сюжетный переход в интерактивную часть. Текущая рабочая идея — перехват экрана и попадание во «взломанный/чужой телефон», где нужно походить по приложениям и найти код от сейфа, чтобы открыть подарок (под это в проекте уже есть заглушка `src/phone/PhonePlaceholder.tsx` и глитч-синтезатор `src/intro/audio/glitchSound.ts`). Финальная идея Этапа 2 ещё может поменяться — пока все силы идут на доведение листаемой страницы Этапа 1.

## 2. Текущий статус (делаем поэтапно)

- **Сцена 1 — Заледеневшее окно (`src/intro/scenes/frostWindow/*`):**
  **Готова на 10/10. НЕ ТРОГАТЬ без прямого запроса.**
  WebGL-рефракция инея, стирание пальцем + кнопка «Растопить», раскрытие новогоднего фото (`window-bg.webp`), типографика `2027 · С Новым годом` и плавный нижний переход в `#C2CDCE`.
- **Шаг 1 скролла — `WinterScrollScene` (`src/intro/scenes/winterScroll/*`):**
  **Готов.** Участок ~2.3 экрана под Сценой 1 без scroll-pin:
  - сквозной 3D-проводник (Three.js fixed-слой): гранёная 8-лучевая хрустальная звезда с золотым сердечником, процедурным студийным PMREM-окружением, двумя золотыми кольцами и орбитальными гранями; сопровождает скролл и мягко уходит вверх перед концом секции;
  - боковая еловая ветка у правого края (`branch-side.webp`) с пружинным покачиванием от скорости скролла и осыпающимися снежинками/золотой пылью;
  - кинетическая типографика (встречные сдвиги заголовков и фоновые эхо-слова) + 3 стеклянные параллакс-карточки (`card-1/2/3.webp`) с 3D-переворотом по тапу, личными записками и нотой `soundEngine.playChime()`; на 3-й карточке — интригующий намёк (`«В прошлом году была просто дверь. В этот раз всё иначе…»`) и короткое микро-мерцание при тапе;
  - внизу оставлена минимальная заглушка `Конец Шага 1` (`#step-1-end`).
- **Что НЕ реализовано на текущем этапе (добавляется в следующих шагах по запросу):**
  последующие скролл-блоки/интерактивы ниже Шага 1 (например, шарики на ниточках, сквиш-кот, финальный подарок/переход) и полноценный Этап 2.

## 3. Архитектура и карта файлов

- **Стек:** React 19, TypeScript (strict), Vite 6, Tailwind CSS 4, Lenis, GSAP + ScrollTrigger, Three.js, Vitest.
- **Точки входа и маршрутизация фаз:**
  - `index.html` — шрифты `Cormorant Garamond` (editorial serif), `Manrope` (UI sans), `JetBrains Mono` (terminal/indices).
  - `src/index.css` — палитра CSS-переменных, safe-area утилиты, GPU-анимации и классы 3D-переворота карточек.
  - `src/App.tsx` — переключает фазы `'intro'` (`IntroExperience`) и `'phone'` (`PhonePlaceholder`), поддерживает replay.
  - `src/intro/sceneParams.ts` — парсинг URL-параметров отладки: `?scene=1|2|3|4|phone` и `?debug=1`.
  - `src/intro/config.ts` — **единый источник правды** для всех текстов, подписей, путей к картинкам и палитры. Любые новые тексты и ассеты выносить сюда.
  - `src/intro/IntroExperience.tsx` — оркестратор Этапа 1 (Lenis + GSAP ScrollTrigger + `SnowParticles` + `SoundToggle` + `DebugSceneNav` + сцены).
- **Сцена 1 (НЕ ТРОГАТЬ):**
  - `src/intro/scenes/frostWindow/FrostWindowScene.tsx`
  - `src/intro/scenes/frostWindow/frostController.ts`
  - `src/intro/scenes/frostWindow/frostMask.ts`
  - `src/intro/scenes/frostWindow/frostShader.ts`
- **Шаг 1 скролла (`id="scene-2"`):**
  - `src/intro/scenes/winterScroll/WinterScrollScene.tsx` — поток секции, GSAP ScrollTrigger scrub, заглушка `#step-1-end`.
  - `src/intro/scenes/winterScroll/CrystalGuide3D.tsx` — fixed WebGLRenderer с автосном вне секции и полным `dispose()`.
  - `src/intro/scenes/winterScroll/crystalStarGeometry.ts` — процедурная 8-лучевая звезда и студийная PMREM-карта отражений.
  - `src/intro/scenes/winterScroll/starChoreography.ts` — нормализованная траектория, масштаб, углы и прозрачность звезды.
  - `src/intro/scenes/winterScroll/SideBranchAccent.tsx` — правая ветка с физикой покачивания и локальным canvas снега (`IntersectionObserver`).
  - `src/intro/scenes/winterScroll/ParallaxMemoryCard.tsx` — стеклянная 4:5 карточка с 3D-flip, звуком и микро-мерцанием.
- **Звук и общие компоненты:**
  - `src/intro/audio/soundEngine.ts` — процедурный Web Audio (`playFrostRub`, `playFrostReveal`, `playChime`, `playGlitchHijack`, `playTerminalTick`, `unlock`, `dispose`).
  - `src/intro/audio/glitchSound.ts` — синтез глитч-перехода и тиков терминала (задел для Этапа 2).
  - `src/intro/components/SnowParticles.tsx` — фоновый лёгкий снег (`z-30`).
  - `src/intro/components/SoundToggle.tsx` — кнопка звука (`z-40`).
  - `src/intro/components/DebugSceneNav.tsx` — панель быстрого перехода при `?debug=1` или `?scene=...`.
  - `src/intro/lib/visibility.ts` — хелпер для `IntersectionObserver`.
  - `src/phone/PhonePlaceholder.tsx` — заглушка экрана блокировки Этапа 2 (`?scene=phone`).
- **Тесты:**
  - `src/intro/__tests__/sceneParams.test.ts`
  - `src/intro/__tests__/starChoreography.test.ts`

## 4. Ассеты и референсы

- `public/assets/` — используемые сайтом оптимизированные `.webp` (`window-bg.webp`, `branch-side.webp`, `card-1.webp`, `card-2.webp`, `card-3.webp`) + исходные тяжёлые `.png`/`.jpg` сохранены рядом.
- `for reference/` — видео-референсы:
  - `ex1.mp4` — ориентир по сквозному 3D-объекту на fixed-слое, живой типографике и наслаиванию карточек;
  - `ex2.mp4` — ориентир по гранёной 8-лучевой звезде и «дорогой» 3D-подаче;
  - `Запись экрана какой вышел сайт до этого.mp4` — запись старого прототипа (от жёсткого scroll-pin отказались в пользу свободного скролла).
- `raw-assets/` и видео/фото в корне (`ветка_видео1.mp4`, `подарок_коробка_видео2.mp4`, `ветка_фонари_фото.jpg`) — исходные материалы.

## 5. Правила разработки и проверки

- **Скролл и 60 FPS:** никакого `pin: true` и искусственного «проталкивания». Анимировать только GPU-свойства (`transform`, `opacity`), соблюдать `prefers-reduced-motion`, усыплять off-screen циклы `requestAnimationFrame` и полностью освобождать WebGL/Three.js/Audio (`dispose()`).
- **Модульность:** держать файлы в пределах ~200–300 строк, разделять 3D-геометрию/хореографию и React-компоненты.
- **Скиллы:** при работе над интерфейсом и анимациями активировать и соблюдать `impeccable` и `review-animation`.
- **Z-index слои:** фон/эхо-слова (`z-[5]`), заголовки (`z-[10]`), ветка (`z-[15]`), карточки (`z-[20]`), 3D-проводник (`z-[24]`, `pointer-events-none`), глобальный снег (`z-30`), UI-кнопки (`z-40`).
- **Команды (PowerShell):**
  - `npm.cmd run dev` — локальный dev-сервер (Vite).
  - `npm.cmd run test` — юнит-тесты Vitest.
  - `npm.cmd run build` — проверка типов (`tsc --noEmit`) + production-сборка.
  - `npm.cmd run preview` — предпросмотр собранного `dist/` для проверки в Playwright (`390×844`, touch, 2x DPR, проверка отсутствия ошибок консоли и сохранности Сцены 1).
