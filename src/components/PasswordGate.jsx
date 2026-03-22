import { useState } from 'react';

const PASSWORD = '1014';
const STORAGE_KEY = 'igcse_auth';

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );
  const [input, setInput]   = useState('');
  const [shake,  setShake]  = useState(false);

  if (unlocked) return children;

  function attempt() {
    if (input === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      setUnlocked(true);
    } else {
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="pw-gate">
      <div className={`pw-card ${shake ? 'shake' : ''}`}>
        <div className="pw-logo">IGCSE</div>
        <div className="pw-sub">enter password to continue</div>
        <input
          className="pw-input"
          type="password"
          placeholder="••••"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          autoFocus
        />
        <button className="pw-btn" onClick={attempt}>Unlock</button>
      </div>
    </div>
  );
}
