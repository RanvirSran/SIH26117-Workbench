interface StatusBarProps {
  documentCount: number;
  version: string;
}

export default function StatusBar({ documentCount, version }: StatusBarProps) {
  return (
    <div className="statusbar">
      <div className="seg">
        <div className="item">
          <span className="dot" />
          Inference: local
        </div>
        <div className="item">
          <span className="dot" />
          Vector store: local
        </div>
        <div className="item">
          <span className="dot off" />
          Internet: disabled
        </div>
      </div>
      <div className="seg">
        <div className="item">{documentCount} documents indexed</div>
        <div className="item">{version}</div>
      </div>
    </div>
  );
}
