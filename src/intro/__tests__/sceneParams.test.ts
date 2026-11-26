import { describe, expect, it } from 'vitest';
import { parseSceneParams, stripSceneParam } from '../sceneParams';

describe('parseSceneParams', () => {
  it('defaults to intro scene 1 without debug mode when query is empty', () => {
    expect(parseSceneParams('')).toEqual({
      initialPhase: 'intro',
      initialScene: 1,
      hasExplicitScene: false,
      debugMode: false,
    });
  });

  it('parses valid scenes 1..4 and enables debug mode', () => {
    expect(parseSceneParams('?scene=1')).toMatchObject({ initialPhase: 'intro', initialScene: 1, debugMode: true });
    expect(parseSceneParams('?scene=2')).toMatchObject({ initialPhase: 'intro', initialScene: 2, debugMode: true });
    expect(parseSceneParams('?scene=3')).toMatchObject({ initialPhase: 'intro', initialScene: 3, debugMode: true });
    expect(parseSceneParams('?scene=4')).toMatchObject({ initialPhase: 'intro', initialScene: 4, debugMode: true });
  });

  it('parses ?scene=phone case-insensitively', () => {
    expect(parseSceneParams('?scene=PHONE')).toMatchObject({
      initialPhase: 'phone',
      hasExplicitScene: true,
      debugMode: true,
    });
  });

  it('safely ignores out-of-range or malformed scene params', () => {
    expect(parseSceneParams('?scene=0')).toMatchObject({ initialPhase: 'intro', initialScene: 1, hasExplicitScene: false });
    expect(parseSceneParams('?scene=99')).toMatchObject({ initialPhase: 'intro', initialScene: 1, hasExplicitScene: false });
    expect(parseSceneParams('?scene=abc')).toMatchObject({ initialPhase: 'intro', initialScene: 1, hasExplicitScene: false });
    expect(parseSceneParams('?debug=1')).toMatchObject({ initialPhase: 'intro', initialScene: 1, debugMode: true });
  });
});

describe('stripSceneParam', () => {
  it('strips ?scene=1..4 and ?scene=phone cleanly for replay', () => {
    expect(stripSceneParam('https://example.com/?scene=4')).toEqual({
      nextUrl: '/',
      nextSearch: '',
      changed: true,
    });
    expect(stripSceneParam('https://example.com/?scene=phone')).toEqual({
      nextUrl: '/',
      nextSearch: '',
      changed: true,
    });
  });

  it('preserves unrelated query params such as debug=1 and hash fragments', () => {
    expect(stripSceneParam('https://example.com/intro?scene=3&debug=1#top')).toEqual({
      nextUrl: '/intro?debug=1#top',
      nextSearch: '?debug=1',
      changed: true,
    });
  });

  it('reports changed=false when no scene query param is present', () => {
    expect(stripSceneParam('https://example.com/?debug=1')).toEqual({
      nextUrl: '/?debug=1',
      nextSearch: '?debug=1',
      changed: false,
    });
  });
});
