import { getFileKind, fileKindLabel } from '../utils/fileType';

export default function FileTypeBadge({ filename }: { filename: string }) {
  const kind = getFileKind(filename);
  return <span className={`file-badge file-badge--${kind}`}>{fileKindLabel(kind)}</span>;
}
