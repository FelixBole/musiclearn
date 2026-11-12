import { useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../progress/settings';
import { computeStreak, db } from '../progress/db';
import { disableMidi, enableMidi, setMidiEcho } from '../engine/input/midi';
import { setVolume } from '../engine/audio';
import { TodayPage } from './pages/TodayPage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { PracticePage } from './pages/PracticePage';
import { DrillPage } from './pages/DrillPage';
import { ReviewPage } from './pages/ReviewPage';
import { ToolsPage } from './pages/ToolsPage';
import { PlaygroundPage } from './tools/PlaygroundPage';
import { ConnectPage } from './tools/ConnectPage';
import { MotifPage } from './tools/MotifPage';
import { SettingsPage } from './pages/SettingsPage';
import { DbGate, ErrorBoundary } from './Resilience';

/** Keeps engine state (MIDI, echo, volume) in sync with persisted settings. */
function EngineBridge() {
  const s = useSettings();
  useEffect(() => {
    if (s.midiEnabled) void enableMidi();
    else disableMidi();
  }, [s.midiEnabled]);
  useEffect(() => setMidiEcho(s.midiEcho), [s.midiEcho]);
  useEffect(() => setVolume(s.volume), [s.volume]);
  return null;
}

const NAV = [
  { to: '/', label: 'Today', icon: '☀' },
  { to: '/learn', label: 'Learn', icon: '📖' },
  { to: '/practice', label: 'Practice', icon: '🎯' },
  { to: '/tools', label: 'Tools', icon: '🎹' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function App() {
  // Error boundary + DB gate wrap everything that touches the database, so a broken
  // or blocked IndexedDB shows a recovery screen instead of spinning forever.
  return (
    <ErrorBoundary>
      <DbGate>
        <Shell />
      </DbGate>
    </ErrorBoundary>
  );
}

function Shell() {
  const days = useLiveQuery(() => db.days.toArray(), []);
  const streak = days ? computeStreak(days) : 0;
  return (
    <div className="app">
      <EngineBridge />
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">♪</span> MusicLearn
        </NavLink>
        <span className="streak" title="Day streak">
          🔥 {streak}
        </span>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:lessonId" element={<LessonPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/:exerciseId" element={<DrillPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/playground" element={<PlaygroundPage />} />
          <Route path="/tools/connect" element={<ConnectPage />} />
          <Route path="/tools/motif" element={<MotifPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </main>
      <nav className="bottomnav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon" aria-hidden>
              {n.icon}
            </span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
