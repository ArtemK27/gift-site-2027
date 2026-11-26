import { buildSceneUrl, type SceneId } from '../sceneParams';

interface DebugSceneNavProps {
  visible: boolean;
  current: SceneId | 'phone';
}

const ITEMS: Array<{ id: SceneId | 'phone'; label: string }> = [
  { id: 1, label: 'S1' },
  { id: 2, label: 'S2' },
  { id: 3, label: 'S3' },
  { id: 4, label: 'S4' },
  { id: 'phone', label: 'OS' },
];

export function DebugSceneNav({ visible, current }: DebugSceneNavProps) {
  if (!visible) return null;

  return (
    <nav
      aria-label="Навигация отладки сцен"
      className="fixed top-3 left-3 z-40 flex items-center gap-0.5 rounded-full border border-white/45 bg-[#141D26]/65 p-1 backdrop-blur-xl"
      style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {ITEMS.map((item) => {
        const active = item.id === current;
        return (
          <a
            key={String(item.id)}
            href={buildSceneUrl(item.id)}
            className={`flex h-6 min-w-[28px] items-center justify-center rounded-full px-1.5 font-terminal text-[10px] font-medium transition-transform active:scale-95 ${
              active ? 'bg-white text-[#141D26]' : 'text-white/80 hover:text-white'
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
