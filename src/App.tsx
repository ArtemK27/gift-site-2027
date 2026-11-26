import { useCallback, useMemo, useState } from 'react';
import { IntroExperience } from './intro/IntroExperience';
import { parseSceneParams, stripSceneParam, type SceneId } from './intro/sceneParams';
import { PhonePlaceholder } from './phone/PhonePlaceholder';

export function App() {
  const initialRoute = useMemo(() => parseSceneParams(window.location.search), []);

  const [phase, setPhase] = useState<'intro' | 'phone'>(initialRoute.initialPhase);
  const [sceneStart, setSceneStart] = useState<SceneId>(initialRoute.initialScene);
  const [debugMode, setDebugMode] = useState<boolean>(initialRoute.debugMode);
  const [runKey, setRunKey] = useState(0);

  const handleIntroComplete = useCallback(() => {
    window.scrollTo(0, 0);
    setPhase('phone');
  }, []);

  const handleReplayIntro = useCallback(() => {
    // Strip any ?scene=1..4|phone on replay so URL & DebugSceneNav match Scene 1
    const stripped = stripSceneParam(window.location.href);
    if (stripped.changed) {
      window.history.replaceState({}, '', stripped.nextUrl);
      setDebugMode(parseSceneParams(stripped.nextSearch).debugMode);
    }
    window.scrollTo(0, 0);
    setSceneStart(1);
    setRunKey((k) => k + 1);
    setPhase('intro');
  }, []);

  if (phase === 'phone') {
    return <PhonePlaceholder onReplayIntro={handleReplayIntro} />;
  }

  return (
    <IntroExperience
      key={runKey}
      initialScene={sceneStart}
      debugMode={debugMode}
      onComplete={handleIntroComplete}
    />
  );
}

export default App;
