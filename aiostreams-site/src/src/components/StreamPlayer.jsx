import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { buildMagnetUri, getTorrentTrackers, isDirectPlayableUrl } from '../utils/streamUtils';

const WEBTORRENT_CDN = 'https://cdn.jsdelivr.net/npm/webtorrent@2.5.3/webtorrent.min.js';
const PEER_TIMEOUT_MS = 120000;

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

function pickTorrentFile(torrent, fileIdx) {
  const videoExt = /\.(mp4|mkv|webm|avi|mov|m4v)$/i;
  if (torrent.files.length === 1) return torrent.files[0];
  const byIdx = torrent.files[fileIdx];
  if (byIdx && videoExt.test(byIdx.name)) return byIdx;
  return torrent.files.find((f) => videoExt.test(f.name)) || torrent.files[0];
}

export default function StreamPlayer({ stream, title, onError }) {
  const videoRef = useRef(null);
  const clientRef = useRef(null);
  const playingRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [statusText, setStatusText] = useState('Preparing playback…');
  const [magnetLink, setMagnetLink] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let peerTimer = null;
    const video = videoRef.current;

    const fail = (message) => {
      if (cancelled) return;
      if (peerTimer) clearTimeout(peerTimer);
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
        setStatusText('Finding peers… (try 1080p sources if this hangs)');

        try {
          const WebTorrent = await loadWebTorrent();
          if (cancelled || !video) return;

          const client = new WebTorrent({ dht: true });
          clientRef.current = client;

          peerTimer = window.setTimeout(() => {
            if (cancelled || playingRef.current) return;
            fail(
              'No peers found in time. Pick a 1080p/720p source, open the magnet in qBittorrent/VLC, or enable debrid on AIOStreams.',
            );
          }, PEER_TIMEOUT_MS);

          client.add(magnet, { announce: getTorrentTrackers() }, (torrent) => {
            if (cancelled) return;

            torrent.on('error', () => {
              if (!cancelled) fail('Torrent connection error.');
            });

            torrent.on('wire', () => {
              if (!cancelled) setStatusText('Connected — buffering…');
            });

            torrent.on('download', () => {
              if (cancelled || !torrent.length) return;
              const pct = Math.round((torrent.downloaded / torrent.length) * 100);
              setProgress(pct);
              setStatusText(`Buffering… ${pct}%`);
            });

            const file = pickTorrentFile(torrent, stream.fileIdx || 0);
            if (!file) {
              fail('Could not find a video file in this torrent.');
              return;
            }

            file.renderTo(video, {
              autoplay: true,
              controls: true,
            }, (err) => {
              if (cancelled) return;
              if (err) {
                fail('Could not play this file in the browser. Try another source or the magnet link.');
                return;
              }
              if (peerTimer) clearTimeout(peerTimer);
              playingRef.current = true;
              setStatus('playing');
              setProgress(0);
            });
          });
        } catch {
          fail('Could not start torrent player. Use the magnet link in VLC or qBittorrent.');
        }
        return;
      }

      fail('No playable link. Enable debrid on AIOStreams for instant HTTP playback.');
    };

    setup();

    return () => {
      cancelled = true;
      if (peerTimer) clearTimeout(peerTimer);
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

  const showOverlay = status === 'loading' || (status !== 'playing' && status !== 'video' && status !== 'iframe' && status !== 'youtube' && status !== 'error');

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
            Open magnet in external app
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="video-wrapper player-loading-wrap">
      {showOverlay && (
        <div className="player-loading">
          <Loader2 className="spin" size={32} />
          <span>{statusText}</span>
          {progress > 0 && (
            <div className="player-progress">
              <div className="player-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay={status === 'video'}
        src={status === 'video' ? stream.url : undefined}
        onPlaying={() => {
          playingRef.current = true;
          setStatus('playing');
          setProgress(0);
        }}
      />
    </div>
  );
}
