/**
 * Single source of truth for copy, asset paths, and palette tokens.
 * Edit text or feel here without touching scene logic.
 */

export type ChimeOrnamentKind =
  | 'faceted-sphere'
  | 'crystal-teardrop'
  | 'diamond-lantern'
  | 'pearl-sphere'
  | 'gold-star';

export interface ChimeOrnamentConfig {
  id: string;
  kind: ChimeOrnamentKind;
  label: string;
  anchorXNorm: number; // 0..1 across logical stage width
  stringLength: number; // px from catenary anchor to bob center
  radiusX: number; // horizontal collision/hit half-extent
  radiusY: number; // vertical collision/hit half-extent
  mass: number;
  chimePitch: number; // 0..1 normalized pitch for soundEngine.playChime
}

export interface Step1CardConfig {
  id: string;
  indexLabel: string;
  image: string;
  imageAlt: string;
  frontEyebrow: string;
  frontTitle: string;
  frontSubtitle: string;
  backEyebrow: string;
  backTitle: string;
  backBody: string;
  intrigueWhisper?: string;
  chimePitch: number;
  intrigue: boolean;
}

const assetUrl = (name: string): string => `${import.meta.env.BASE_URL}assets/${name}`;

export const INTRO_CONFIG = {
  assets: {
    windowBgFallback: assetUrl('window-bg.webp'),
    branchSide: assetUrl('branch-side.webp'),
    cards: [assetUrl('card-1.webp'), assetUrl('card-2.webp'), assetUrl('card-3.webp')],
  },

  palette: {
    windowMistBottom: '#C2CDCE',
    surfaceLight: '#EFF3F6',
    surfaceWarm: '#F5F1EA',
  },

  scene1Frost: {
    clearThreshold: 0.85, // 85% of interactive screen area triggers auto-melt reveal
    brushRadiusPx: 44,
    autoMeltDurationMs: 1350,
    hintText: 'Согрей стекло пальцем',
    skipLabel: 'Растопить',
    eyebrow: '31 декабря · Тайный Санта',
    titleYear: '2027',
    titleMain: 'С Новым годом',
    subtitle: 'Пусть эта зима начнётся с маленького чуда',
    scrollPrompt: 'Листай вниз',
  },

  step1Scroll: {
    eyebrow: 'Глава I · Зимний свет',
    headlineLine1: 'Тихий свет',
    headlineLine2: 'уходящего года',
    lead: 'Три момента, которые хочется удержать в ладонях — коснись любой карточки.',
    tapHint: 'Коснись',
    flipBackLabel: 'Вернуть фото',
    echoWords: ['ТЕПЛО', 'ТИШИНА', 'ИНАЧЕ'] as const,
    cards: [
      {
        id: 'card-1',
        indexLabel: '01',
        image: assetUrl('card-1.webp'),
        imageAlt: 'Гранёный хрустальный бокал с тёплыми огоньками на снегу',
        frontEyebrow: 'Свет внутри',
        frontTitle: 'Хрустальное тепло',
        frontSubtitle: 'Мороз за окном и тёплые огоньки рядом',
        backEyebrow: 'Записка · 01',
        backTitle: 'Береги своё тепло',
        backBody:
          'Пусть в новом году вокруг будет больше тихих вечеров, искренних разговоров и огней, от которых спокойно на душе.',
        chimePitch: 0.2,
        intrigue: false,
      },
      {
        id: 'card-2',
        indexLabel: '02',
        image: assetUrl('card-2.webp'),
        imageAlt: 'Морозные голубые и жемчужные ёлочные шары в искрящемся снегу',
        frontEyebrow: 'Чистый лист',
        frontTitle: 'Январский воздух',
        frontSubtitle: 'Хрупкая тишина перед новой главой',
        backEyebrow: 'Записка · 02',
        backTitle: 'Всё важное впереди',
        backBody:
          'Оставь лишнюю спешку старому декабрю. Впереди год, где маленькие совпадения складываются в настоящие чудеса.',
        chimePitch: 0.52,
        intrigue: false,
      },
      {
        id: 'card-3',
        indexLabel: '03',
        image: assetUrl('card-3.webp'),
        imageAlt: 'Парящая золотистая шёлковая лента над заснеженной хвоей',
        frontEyebrow: 'Тонкий след',
        frontTitle: 'Не просто подарок',
        frontSubtitle: 'В прошлом году была просто дверь…',
        backEyebrow: 'Записка · 03',
        backTitle: 'В этот раз всё иначе…',
        backBody:
          'В прошлом году была просто дверь. В этот раз всё иначе — присмотрись к деталям, история уже началась.',
        intrigueWhisper: 'SIGNAL // 31.12',
        chimePitch: 0.84,
        intrigue: true,
      },
    ] satisfies ReadonlyArray<Step1CardConfig>,
  },

  step2Chimes: {
    eyebrow: 'Глава II · Хрустальный перезвон',
    headlineLine1: 'Хрустальный',
    headlineLine2: 'перезвон',
    lead: 'Проведи пальцем по игрушкам или коснись любой — у каждой свой зимний голос.',
    swipeHint: 'Проведи пальцем по игрушкам',
    chimeCooldownMs: 240,
    ornaments: [
      {
        id: 'chime-faceted-sphere',
        kind: 'faceted-sphere',
        label: 'Гранёный хрустальный шар',
        anchorXNorm: 0.155,
        stringLength: 138,
        radiusX: 26,
        radiusY: 26,
        mass: 1.12,
        chimePitch: 0.08,
      },
      {
        id: 'chime-crystal-teardrop',
        kind: 'crystal-teardrop',
        label: 'Хрустальная капля-сосулька',
        anchorXNorm: 0.328,
        stringLength: 158,
        radiusX: 21,
        radiusY: 38,
        mass: 0.98,
        chimePitch: 0.28,
      },
      {
        id: 'chime-diamond-lantern',
        kind: 'diamond-lantern',
        label: 'Хрустальный ромб-фонарик',
        anchorXNorm: 0.5,
        stringLength: 136,
        radiusX: 28,
        radiusY: 36,
        mass: 1.24,
        chimePitch: 0.5,
      },
      {
        id: 'chime-pearl-sphere',
        kind: 'pearl-sphere',
        label: 'Матовая перламутровая сфера',
        anchorXNorm: 0.672,
        stringLength: 160,
        radiusX: 26,
        radiusY: 26,
        mass: 1.08,
        chimePitch: 0.72,
      },
      {
        id: 'chime-gold-star',
        kind: 'gold-star',
        label: 'Золотая восьмилучевая звезда',
        anchorXNorm: 0.845,
        stringLength: 140,
        radiusX: 23,
        radiusY: 26,
        mass: 0.8,
        chimePitch: 0.92,
      },
    ] satisfies ReadonlyArray<ChimeOrnamentConfig>,
    nextPlaceholder: {
      eyebrow: 'Продолжение следует',
      caption: 'Следующая глава зимней истории появится ниже',
    },
  },

  phonePlaceholder: {
    carrier: 'NO SIM · INTERCEPTED',
    dateLabel: 'Четверг, 31 декабря',
    badge: 'ЧУЖОЙ ТЕЛЕФОН · ЭТАП 2',
    notificationTitle: 'Неизвестный контакт',
    notificationBody: 'Ты всё-таки открыла коробку. Код от подарка спрятан внутри этого телефона…',
    stageNote: 'Стартовое интро завершено, WebGL и аудио освобождены. Здесь подключается мини-ОС Этапа\u00A02.',
    replayLabel: 'Пройти интро заново',
  },
} as const;

export type IntroConfig = typeof INTRO_CONFIG;
