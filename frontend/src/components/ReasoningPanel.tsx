interface ReasoningPanelProps {
  /** Ordered list of step labels to render. */
  steps: string[];
  /**
   * True while this is the live, in-progress reasoning trace for a
   * message that hasn't finished yet — the last step gets the pulsing
   * "active" treatment instead of the static "done" one, and an empty
   * list still renders a generic "Thinking..." placeholder instead of
   * nothing. False (the default) is for a completed message's stored
   * trace, where every step is just shown as done.
   */
  live?: boolean;
}

export default function ReasoningPanel({ steps, live = false }: ReasoningPanelProps) {
  const items = steps.length > 0 ? steps : live ? ['Thinking...'] : [];

  return (
    <div className="reasoning-panel">
      {items.map((label, i) => {
        const isActive = live && i === items.length - 1;
        return (
          <div className={`reasoning-step${isActive ? ' active' : ' done'}`} key={`${i}-${label}`}>
            <span className="reasoning-step__marker" />
            <span className="reasoning-step__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
