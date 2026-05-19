import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, Crown, Pause, Play, Radio, Send, Share2, Users,
} from 'lucide-react';
import { useCommunity } from '../context/useCommunity';

export default function WatchPartyPage() {
  const { roomId } = useParams();
  const {
    parties, updateParty, member, addActivity,
  } = useCommunity();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  const party = useMemo(() => parties.find((item) => item.roomId === roomId), [parties, roomId]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyInvite = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const setStatus = (status) => {
    updateParty(roomId, { status });
    addActivity(status === 'Playing' ? 'started' : 'paused', party?.title || 'a watch party', member.name);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setChat((current) => [...current, {
      id: Date.now(),
      author: member.name,
      text: message.trim(),
    }]);
    setMessage('');
  };

  if (!party) {
    return (
      <main className="title-page">
        <Link className="back-link" to="/community">
          <ArrowLeft size={18} />
          Back to community
        </Link>
        <section className="empty-state">
          <Radio size={32} />
          <h3>Party room not found</h3>
          <p>Create a new room from the community page.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="party-page animate-fade-in">
      <Link className="back-link" to="/community">
        <ArrowLeft size={18} />
        Back to community
      </Link>

      <section className="party-room">
        <div className="party-stage">
          <span className="eyebrow"><Radio size={16} /> Room {party.roomId}</span>
          <h1>{party.title}</h1>
          <p>{party.status}</p>
          <div className="party-controls">
            <button className="primary-button" type="button" onClick={() => setStatus('Playing')}>
              <Play size={18} fill="currentColor" />
              Sync play
            </button>
            <button className="secondary-button" type="button" onClick={() => setStatus('Paused')}>
              <Pause size={18} />
              Pause room
            </button>
            <button className="secondary-button" type="button" onClick={copyInvite}>
              {copied ? <Copy size={18} /> : <Share2 size={18} />}
              {copied ? 'Copied' : 'Invite'}
            </button>
          </div>
        </div>

        <aside className="party-sidebar">
          <div className="party-panel">
            <span className="section-kicker">Members</span>
            <div className="member-list">
              {party.members.map((name, index) => (
                <div key={name} className="member-row">
                  {index === 0 ? <Crown size={17} /> : <Users size={17} />}
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="party-panel">
            <span className="section-kicker">Chat</span>
            <div className="party-chat">
              {chat.length ? chat.map((item) => (
                <div key={item.id}>
                  <strong>{item.author}</strong>
                  <p>{item.text}</p>
                </div>
              )) : <p className="sources-hint">No messages yet.</p>}
            </div>
            <form className="party-chat-form" onSubmit={sendMessage}>
              <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message the room" />
              <button className="icon-button" type="submit" aria-label="Send message">
                <Send size={18} />
              </button>
            </form>
          </div>
        </aside>
      </section>
    </main>
  );
}
