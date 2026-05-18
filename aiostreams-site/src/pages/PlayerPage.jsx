import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import StreamPlayer from '../components/StreamPlayer';

export default function PlayerPage() {
  const { type, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { stream, title } = location.state || {};

  if (!stream) {
    return (
      <main className="title-page">
        <p className="sources-hint">No stream selected.</p>
        <Link className="back-link" to={`/watch/${type}/${id}`}>
          <ArrowLeft size={18} />
          Back to title
        </Link>
      </main>
    );
  }

  return (
    <main className="player-page">
      <div className="player-page-bar">
        <button
          className="back-link as-button"
          type="button"
          onClick={() => navigate(`/watch/${type}/${id}`)}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h1>{title}</h1>
        <button
          className="icon-button"
          type="button"
          onClick={() => navigate(`/watch/${type}/${id}`)}
          aria-label="Close player"
        >
          <X size={22} />
        </button>
      </div>

      <section className="player-content player-content-page">
        <StreamPlayer stream={stream} title={title} />
        <div className="player-footer">
          <p>
            {stream.streamType === 'p2p' && (
              <>Streaming via WebTorrent — this can take a minute for large files. </>
            )}
            <Link to={`/watch/${type}/${id}`}>Pick another source</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
