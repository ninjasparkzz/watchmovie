import { Outlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clapperboard, Crown, LogIn, LogOut, Lock, X, AlertTriangle,
  UserRound, Globe2, KeyRound, Download, Users,
} from 'lucide-react';
import { useApp } from '../context/useApp';

function Modal({ children, onClose }) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.section
        className="settings-modal"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </motion.section>
    </motion.div>
  );
}

export default function Layout() {
  const {
    auth, canWatch, loginUrl, showSettings, setShowSettings,
    showAccessModal, setShowAccessModal, openSettings, saveSettings,
    logout, draftConfig, setDraftConfig, isDiscordConfigured,
  } = useApp();

  const isElectron = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && window.navigator.userAgent.toLowerCase().includes('electron');

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="WatchTV home">
          <span className="brand-mark"><Clapperboard size={22} /></span>
          <span>WatchTV</span>
        </Link>

        <div className="topbar-actions">
          <Link className="member-pill community-nav-pill" to="/community">
            <Users size={16} />
            <span>Community</span>
          </Link>
          {!isElectron && (
            <a href="/WatchTV-Setup.exe" className="member-pill is-allowed download-pill-nav" download style={{ textDecoration: 'none' }}>
              <Download size={16} />
              <span>Get App</span>
            </a>
          )}
          <button className="icon-button" type="button" onClick={openSettings} aria-label="Source settings">
            <KeyRound size={20} />
          </button>
          {auth ? (
            <button
              className={`member-pill ${canWatch ? 'is-allowed' : 'is-blocked'}`}
              type="button"
              onClick={() => setShowAccessModal(true)}
            >
              {canWatch ? <Crown size={16} /> : <Lock size={16} />}
              {auth.user?.global_name || auth.user?.username || 'Member'}
            </button>
          ) : (
            <button className="member-pill" type="button" onClick={() => setShowAccessModal(true)}>
              <LogIn size={16} />
              Sign in
            </button>
          )}
        </div>
      </header>

      <Outlet />

      <AnimatePresence>
        {showAccessModal && (
          <Modal onClose={() => setShowAccessModal(false)}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">Access</span>
                <h2>Discord membership</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setShowAccessModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {auth ? (
              <div className="access-card">
                <UserRound size={22} />
                <div>
                  <strong>{auth.user?.global_name || auth.user?.username}</strong>
                  <span>{canWatch ? 'Playback is unlocked.' : 'Signed in, but missing an allowed role.'}</span>
                </div>
              </div>
            ) : (
              <div className="access-card">
                <Lock size={22} />
                <div>
                  <strong>Sign in to watch</strong>
                  <span>Only approved Discord roles can open playback.</span>
                </div>
              </div>
            )}

            {!isDiscordConfigured() ? (
              <div className="notice">
                <AlertTriangle size={20} />
                <div>
                  <strong>Discord is not configured</strong>
                  <span>Add client id, guild id, and role ids in accessConfig.js.</span>
                </div>
              </div>
            ) : auth ? (
              <button className="secondary-button full-width" type="button" onClick={logout}>
                <LogOut size={18} />
                Sign out
              </button>
            ) : (
              <a className="primary-link full-width" href={loginUrl}>
                <LogIn size={18} />
                Continue with Discord
              </a>
            )}
          </Modal>
        )}

        {showSettings && (
          <Modal onClose={() => setShowSettings(false)}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">Service</span>
                <h2>Source settings</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setShowSettings(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <label className="field">
              <span><Globe2 size={16} /> Source URL</span>
              <input
                value={draftConfig.baseUrl}
                onChange={(event) => setDraftConfig({ ...draftConfig, baseUrl: event.target.value })}
                placeholder="https://stream.example.com"
              />
            </label>

            <div className="settings-grid">
              <label className="field">
                <span><UserRound size={16} /> User</span>
                <input
                  value={draftConfig.uuid}
                  onChange={(event) => setDraftConfig({ ...draftConfig, uuid: event.target.value })}
                />
              </label>
              <label className="field">
                <span><KeyRound size={16} /> Key</span>
                <input
                  type="password"
                  value={draftConfig.password}
                  onChange={(event) => setDraftConfig({ ...draftConfig, password: event.target.value })}
                />
              </label>
            </div>

            <button className="primary-button full-width" type="button" onClick={saveSettings}>
              Save settings
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
