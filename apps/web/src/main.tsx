import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="/" aria-label="PoleBio home">
          <span className="brand-mark">p</span>
          <span>polebio</span>
        </a>
        <span className="top-note"><span className="status-dot" /> early access build</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span /> A little space on the internet</div>
        <h1>Your space.<br /><span>Your story.</span></h1>
        <p className="intro">
          One link for the things that make you, <em>you</em>. A home for your
          links, projects, socials, and whatever else you want the world to see.
        </p>
        <div className="preview">
          <div className="preview-glow" />
          <div className="preview-top">
            <span className="window-dots"><i /><i /><i /></span>
            <span className="preview-url">username.polebio.l.cd</span>
            <span className="lock">⌑</span>
          </div>
          <div className="profile">
            <div className="avatar">you<span>✳</span></div>
            <div className="profile-copy">
              <div className="profile-name">Your name goes here</div>
              <div className="profile-handle">@username</div>
            </div>
            <div className="profile-chip">PERSONAL PAGE</div>
          </div>
          <div className="profile-bio">A short intro. Your interests. Your corner of the internet.</div>
          <div className="link-row"><span className="link-icon">↗</span><span>My latest project</span><b>↗</b></div>
          <div className="link-row"><span className="link-icon">⌘</span><span>Find me elsewhere</span><b>↗</b></div>
          <div className="link-row muted"><span className="link-icon">✳</span><span>Whatever you want to share</span><b>↗</b></div>
          <div className="preview-foot"><span>MADE WITH POLEBIO</span><span>✳</span></div>
        </div>
        <div className="coming-soon"><span className="pulse" /> The foundation is here. The profile builder is next.</div>
      </section>
      <footer><span>POLEBIO <span className="footer-dot">✳</span></span><span>Small page. Big personality.</span></footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
