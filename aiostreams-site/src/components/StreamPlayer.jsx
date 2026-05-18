import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { buildMagnetUri, isDirectPlayableUrl } from '../utils/streamUtils';

const WEBTORRENT_CDN = 'https://cdn.jsdelivr.net/npm/webtorrent@2.5.3/webtorrent.min.js';

function loadWebTorrent() {
  if (window.WebTorrent) return Promise.resolve(window.WebTorrent);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${WEBTORRENT_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.WebTorrent));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = WEBTORRENT_CDN;
    script.async = true;
    script.onload = () => resolve(window.WebTorrent);
    script.onerror = () => reject(new Error('Could not load WebTorrent'));
    document.head.appendChild(script);
  });
}

export default function StreamPlayer({ stream, title, onError }) {
  const videoRef = useRef(null);
  const clientRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [statusText, setStatusText] = useState('Preparing playback…');
  const [magnetLink, setMagnetLink] = useState('');

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    const fail = (message) => {
      if (cancelled) return;
      setStatus('error');
      setStatusText(message);
      onError?.(message);
    };

    const setup = async () => {
      if (!stream) {
        fail('No stream selected.');
        return;
      }

      if (stream.ytId) {
        setStatus('youtube');
        return;
      }

      if (stream.url && isDirectPlayableUrl(stream.url)) {
        setStatus('video');
        return;
      }

      if (stream.url) {
        setStatus('iframe');
        return;
      }

      if (stream.infoHash) {
        const magnet = buildMagnetUri(stream);
        setMagnetLink(magnet || '');
        setStatusText('Connecting to peers…');
        try {
          const WebTorrent = await loadWebTorrent();
          if (cancelled || !video) return;

          const client = new WebTorrent();
          clientRef.current = client;

          client.add(magnet, (torrent) => {
            if (cancelled) return;

            torrent.on('error', () => {
              if (!cancelled) fail('Torrent connection error.');
            });

            const file = torrent.files[stream.fileIdx || 0];
            if (!file) {
              fail('Could not find the video file in this torrent.');
              return;
            }
            setStatusText('Buffering…');
            file.renderTo(video, {
              autoplay: true,
              controls: true,
            }, (err) => {
              if (cancelled) return;
              if (err) {
                fail('Torrent playback failed. Try a smaller 1080p source or use the magnet link.');
                return;
              }
              setStatus('torrent');
            });
          });
        } catch {
          fail('In-browser torrent playback is not available. Use the magnet link below.');
        }
        return;
      }

      fail('No playable link. Enable debrid on your AIOStreams server for direct HTTP streams.');
    };

    setup();

    return () => {
      cancelled = true;
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [stream, onError]);

  if (status === 'youtube') {
    return (
      <div className="video-wrapper">
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${stream.ytId}?autoplay=1`}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (status === 'iframe' && stream.url) {
    return (
      <div className="video-wrapper">
        <iframe
          title={title}
          src={stream.url}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="player-error">
        <AlertTriangle size={28} />
        <p>{statusText}</p>
        {magnetLink && (
          <a className="primary-link" href={magnetLink}>
            Open magnet link
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="video-wrapper player-loading-wrap">
      {(status === 'loading' || status === 'torrent') && status !== 'video' && (
        <div className="player-loading">
          <Loader2 className="spin" size={32} />
          <span>{statusText}</span>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay={status === 'video'}
        src={status === 'video' ? stream.url : undefined}
      />
    </div>
  );
}
