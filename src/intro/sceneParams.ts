export type SceneId = 1 | 2 | 3 | 4;

export interface ParsedRouteParams {
  initialPhase: 'intro' | 'phone';
  initialScene: SceneId;
  hasExplicitScene: boolean;
  debugMode: boolean;
}

/**
 * Pure parser for URL search params (`?scene=1|2|3|4|phone` and `?debug=1`).
 */
export function parseSceneParams(search: string): ParsedRouteParams {
  const params = new URLSearchParams(search);
  const rawScene = params.get('scene')?.trim().toLowerCase() ?? '';
  const debugMode = params.get('debug') === '1' || rawScene.length > 0;

  if (rawScene === 'phone') {
    return {
      initialPhase: 'phone',
      initialScene: 1,
      hasExplicitScene: true,
      debugMode,
    };
  }

  const parsedNum = Number(rawScene);
  if (rawScene !== '' && Number.isInteger(parsedNum) && parsedNum >= 1 && parsedNum <= 4) {
    return {
      initialPhase: 'intro',
      initialScene: parsedNum as SceneId,
      hasExplicitScene: true,
      debugMode,
    };
  }

  return {
    initialPhase: 'intro',
    initialScene: 1,
    hasExplicitScene: false,
    debugMode: params.get('debug') === '1',
  };
}

export function buildSceneUrl(target: SceneId | 'phone'): string {
  const url = new URL(window.location.href);
  url.searchParams.set('scene', String(target));
  return `${url.pathname}${url.search}`;
}

/**
 * Removes any `?scene=...` query parameter (1..4, phone, or invalid) while
 * preserving unrelated params (e.g. `debug=1`) and hash fragments.
 */
export function stripSceneParam(href: string): {
  nextUrl: string;
  nextSearch: string;
  changed: boolean;
} {
  const url = new URL(href);
  if (!url.searchParams.has('scene')) {
    return {
      nextUrl: `${url.pathname}${url.search}${url.hash}`,
      nextSearch: url.search,
      changed: false,
    };
  }
  url.searchParams.delete('scene');
  return {
    nextUrl: `${url.pathname}${url.search}${url.hash}`,
    nextSearch: url.search,
    changed: true,
  };
}
