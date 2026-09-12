import FileTypeBadge from './FileTypeBadge';
import { IconDownload } from './Icons';
import { API_URL } from '../config';
import { formatFileSize } from '../utils/fileType';

interface FileCardProps {
  name: string;
  /** Relative or absolute URL to download the file. */
  url: string;
  size?: number;
  /** Shown under the filename when there's no byte size to display. */
  subtitle?: string;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url === '#') return url;
  return `${API_URL}${url}`;
}

export default function FileCard({ name, url, size, subtitle }: FileCardProps) {
  const sub = size != null ? formatFileSize(size) : subtitle;

  return (
    <a className="file-card" href={resolveUrl(url)} download target="_blank" rel="noreferrer">
      <FileTypeBadge filename={name} />
      <div className="file-card__meta">
        <div className="file-card__name">{name}</div>
        {sub && <div className="file-card__sub">{sub}</div>}
      </div>
      <span className="file-card__download" aria-label={`Download ${name}`}>
        <IconDownload />
      </span>
    </a>
  );
}
