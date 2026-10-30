import React, { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { AuthScreen } from "./components/AuthScreen";
import { BrandMark } from "./components/BrandMark";
import type { CSSProperties } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

type ProfileLink = { id: number; label: string; url: string };
type ProfileDraft = {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  accent: string;
  links: ProfileLink[];
};

const STORAGE_KEY = "polebio.profile-draft.v1";
const initialDraft: ProfileDraft = {
  displayName: "Your Name",
  username: "yourname",
  bio: "A little bit about me. Making things, learning things, and finding my own corner of the internet.",
  avatarUrl: "",
  accent: "#8b6ac8",
  links: [
    { id: 1, label: "My latest project", url: "https://example.com" },
    { id: 2, label: "Find me elsewhere", url: "https://example.com" }
  ]
};

function loadDraft(): ProfileDraft {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialDraft;
    const parsed = JSON.parse(saved) as Partial<ProfileDraft>;
    return {
      ...initialDraft,
      ...parsed,
      links: Array.isArray(parsed.links) ? parsed.links : initialDraft.links
    };
  } catch {
    return initialDraft;
  }
}

function Dashboard({ session }: { session: Session }) {
  const [draft, setDraft] = useState<ProfileDraft>(loadDraft);
  const [activeTab, setActiveTab] = useState<"overview" | "editor">("overview");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const profileUrl = useMemo(
    () => `${draft.username.trim() || "username"}.polebio.l.cd`,
    [draft.username]
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setNotice("Draft saved on this device");
  }

  function addLink() {
    setDraft((current) => ({
      ...current,
      links: [...current.links, { id: Date.now(), label: "", url: "" }]
    }));
  }

  function updateLink(id: number, key: "label" | "url", value: string) {
    setDraft((current) => ({
      ...current,
      links: current.links.map((link) => link.id === id ? { ...link, [key]: value } : link)
    }));
  }

  function removeLink(id: number) {
    setDraft((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== id)
    }));
  }

  const initials = draft.displayName.trim().slice(0, 1).toUpperCase() || "Y";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PoleBio home">
          <BrandMark size={34} /><span className="brand-wordmark">Pole<span>Bio</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
          <span className="nav-icon">⌂</span> Overview
        </button>
        <button className={`nav-item ${activeTab === "editor" ? "active" : ""}`} onClick={() => setActiveTab("editor")}>
          <span className="nav-icon">✎</span> Profile editor
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <span className="sidebar-card-icon">✳</span>
            <strong>Your page, your rules.</strong>
            <p>Make a little space that feels like you.</p>
          </div>
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div><strong>{draft.displayName || "Your profile"}</strong><span>Personal workspace</span></div>
            <span className="more">···</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="main-header">
          <div className="breadcrumb">Workspace <span>/</span> {activeTab === "overview" ? "Overview" : "Profile editor"}</div>
          <div className="header-actions">
            {savedAt && <span className="saved-indicator">Saved at {savedAt}</span>}
            <span className="account-email">{session.user.email ?? "Discord account"}</span>
            <button className="button button-quiet" onClick={() => void supabase.auth.signOut()}>Sign out</button>
            <button className="button button-quiet" onClick={() => setActiveTab("editor")}>Edit profile <span>↗</span></button>
            <button className="button button-primary" onClick={saveDraft}>Save draft</button>
          </div>
        </header>

        {activeTab === "overview" ? (
          <section className="content">
            <div className="page-heading">
              <div><div className="eyebrow"><span /> YOUR SPACE ON THE INTERNET</div><h1>Good to see you.</h1><p>Here's where your PoleBio page is taking shape.</p></div>
              <button className="button button-primary" onClick={() => setActiveTab("editor")}>✎ &nbsp; Customize page</button>
            </div>

            <div className="stats-grid">
              <article className="stat-card"><span className="stat-label">PROFILE STATUS</span><div className="stat-value"><span className="status-pill draft"><i /> Draft</span></div><p>Your page isn't public yet.</p></article>
              <article className="stat-card"><span className="stat-label">YOUR ADDRESS</span><div className="stat-value address-value">{profileUrl}</div><p>Your future home on the web.</p></article>
              <article className="stat-card"><span className="stat-label">PROFILE LINKS</span><div className="stat-value">{draft.links.length}<span className="stat-suffix"> links</span></div><p>Places people can find you.</p></article>
            </div>

            <div className="section-heading"><div><h2>Your profile</h2><p>A quick look at what visitors will see.</p></div><button className="text-button" onClick={() => setActiveTab("editor")}>Open editor <span>→</span></button></div>
            <ProfilePreview draft={draft} initials={initials} mode={previewMode} setMode={setPreviewMode} />
            <div className="publish-banner">
              <div className="publish-symbol">✦</div>
              <div><strong>Looking good. Not quite ready to publish.</strong><p>Publishing will unlock when cloud profile storage is connected. Your draft is saved locally for now.</p></div>
              <span className="coming-tag">IN PROGRESS</span>
            </div>
          </section>
        ) : (
          <section className="content editor-content">
            <div className="page-heading">
              <div><div className="eyebrow"><span /> MAKE IT YOURS</div><h1>Profile editor</h1><p>Put the important bits in place. You can preview as you go.</p></div>
              <button className="button button-primary" onClick={saveDraft}>Save draft</button>
            </div>
            <div className="editor-layout">
              <div className="editor-panels">
                <section className="panel">
                  <div className="panel-heading"><div><h2>About you</h2><p>The first things people will notice.</p></div><span className="panel-number">01</span></div>
                  <label className="field-label">DISPLAY NAME<input value={draft.displayName} maxLength={48} onChange={(e) => update("displayName", e.target.value)} placeholder="What should people call you?" /></label>
                  <div className="field-row">
                    <label className="field-label">USERNAME<div className="input-prefix"><span>@</span><input value={draft.username} maxLength={24} onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="yourname" /></div></label>
                    <label className="field-label">AVATAR IMAGE URL<input value={draft.avatarUrl} onChange={(e) => update("avatarUrl", e.target.value)} placeholder="https://..." /></label>
                  </div>
                  <label className="field-label">BIO <span className="field-count">{draft.bio.length}/160</span><textarea value={draft.bio} maxLength={160} onChange={(e) => update("bio", e.target.value)} placeholder="A little about yourself..." rows={3} /></label>
                </section>

                <section className="panel">
                  <div className="panel-heading"><div><h2>Your links</h2><p>Add the places, projects, and profiles you want to share.</p></div><span className="panel-number">02</span></div>
                  <div className="links-editor">
                    {draft.links.map((link, index) => (
                      <div className="link-edit-row" key={link.id}>
                        <span className="drag-handle">⠿</span>
                        <div className="link-edit-fields">
                          <input aria-label={`Link ${index + 1} title`} value={link.label} onChange={(e) => updateLink(link.id, "label", e.target.value)} placeholder="Link title" />
                          <input aria-label={`Link ${index + 1} URL`} value={link.url} onChange={(e) => updateLink(link.id, "url", e.target.value)} placeholder="https://example.com" />
                        </div>
                        <button className="icon-button remove-button" onClick={() => removeLink(link.id)} aria-label="Remove link">×</button>
                      </div>
                    ))}
                  </div>
                  <button className="add-link-button" onClick={addLink}><span>＋</span> Add a link</button>
                </section>

                <section className="panel">
                  <div className="panel-heading"><div><h2>Appearance</h2><p>A small accent can go a long way.</p></div><span className="panel-number">03</span></div>
                  <div className="color-options">
                    {["#8b6ac8", "#477d70", "#b87953", "#5278a7", "#ad648c"].map((color) => (
                      <button key={color} className={`color-swatch ${draft.accent === color ? "selected" : ""}`} style={{ "--swatch": color } as CSSProperties} onClick={() => update("accent", color)} aria-label={`Choose ${color} accent`} />
                    ))}
                  </div>
                </section>
                <div className="editor-footer"><span>Changes stay on this device until cloud saving is connected.</span><button className="button button-primary" onClick={saveDraft}>Save draft</button></div>
              </div>
              <div className="live-preview-column">
                <div className="live-preview-title"><span className="live-dot" /> LIVE PREVIEW</div>
                <ProfilePreview draft={draft} initials={initials} mode="mobile" setMode={() => undefined} compact />
                <div className="preview-address">{profileUrl}</div>
                <p className="preview-hint">This is a preview only. Your page isn't public yet.</p>
              </div>
            </div>
          </section>
        )}
        <footer className="app-footer"><span>POLEBIO <b>✳</b></span><span>Small page. Big personality.</span></footer>
      </main>
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </div>
  );
}

function ProfilePreview({
  draft, initials, mode, setMode, compact = false
}: {
  draft: ProfileDraft;
  initials: string;
  mode: "desktop" | "mobile";
  setMode: (mode: "desktop" | "mobile") => void;
  compact?: boolean;
}) {
  return (
    <div className={`preview-frame ${compact ? "compact" : ""} ${mode === "mobile" ? "mobile-preview" : ""}`} style={{ "--accent": draft.accent } as React.CSSProperties}>
      {!compact && <div className="preview-toolbar"><div className="window-dots"><i /><i /><i /></div><span>{draft.username || "username"}.polebio.l.cd</span><div className="preview-switch"><button className={mode === "desktop" ? "chosen" : ""} onClick={() => setMode("desktop")}>Desktop</button><button className={mode === "mobile" ? "chosen" : ""} onClick={() => setMode("mobile")}>Mobile</button></div></div>}
      <div className="public-profile">
        <div className="public-avatar">
          {draft.avatarUrl ? <img src={draft.avatarUrl} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : initials}
          <span>✳</span>
        </div>
        <h3>{draft.displayName || "Your name"}</h3>
        <div className="public-handle">@{draft.username || "username"}</div>
        <p className="public-bio">{draft.bio || "Your bio will show up here."}</p>
        <div className="public-links">
          {draft.links.filter((link) => link.label.trim() && link.url.trim()).map((link) => (
            <a href={link.url.startsWith("http://") || link.url.startsWith("https://") ? link.url : "#"} key={link.id} target="_blank" rel="noreferrer"><span>↗</span>{link.label}<b>↗</b></a>
          ))}
          {draft.links.every((link) => !link.label.trim() || !link.url.trim()) && <div className="empty-links">Your links will appear here.</div>}
        </div>
        <div className="public-brand">MADE WITH <b>POLEBIO ✳</b></div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.error("Could not restore session:", error.message);
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return <div className="auth-loading"><BrandMark size={42} /><p>Loading your account…</p></div>;
  }
  return session ? <Dashboard session={session} /> : <AuthScreen />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
