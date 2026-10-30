import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup" | "reset";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.session) setMessage("Check your inbox to confirm your email, then come back to sign in.");
        else setMessage("Your PoleBio account is ready.");
      } else if (mode === "reset") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (authError) throw authError;
        setMessage("If an account exists for that email, a password reset link is on its way.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function discord() {
    setBusy(true); setError(""); setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    const result = session
      ? await supabase.auth.linkIdentity({ provider: "discord", options: { redirectTo: window.location.origin } })
      : await supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin } });
    if (result.error) { setError(result.error.message); setBusy(false); }
  }

  const title = mode === "signup" ? "Make it yours." : mode === "reset" ? "Let's get you back." : "Your space awaits.";
  const subtitle = mode === "signup" ? "Create an account and start building your corner of the internet." : mode === "reset" ? "We'll send you a link to reset your password." : "Sign in to pick up where you left off.";

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" />
      <section className="auth-card">
        <a className="brand auth-brand" href="/"><span className="brand-mark">p</span><span>polebio</span></a>
        <div className="auth-eyebrow"><span /> YOUR LITTLE CORNER OF THE INTERNET</div>
        <h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>
        {mode !== "reset" && <button className="discord-button" onClick={discord} disabled={busy}><span className="discord-glyph">◉</span> Continue with Discord</button>}
        {mode !== "reset" && <div className="auth-divider"><span /> OR WITH EMAIL <span /></div>}
        <form onSubmit={submit} className="auth-form">
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          {mode !== "reset" && <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "One sec..." : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
        </form>
        {error && <div className="auth-message error">{error}</div>}
        {message && <div className="auth-message success">{message}</div>}
        <div className="auth-switch">
          {mode === "login" && <>New around here? <button onClick={() => {setMode("signup");setError("");setMessage("");}}>Create an account</button><button className="forgot-link" onClick={() => {setMode("reset");setError("");setMessage("");}}>Forgot password?</button></>}
          {mode === "signup" && <>Already have an account? <button onClick={() => {setMode("login");setError("");setMessage("");}}>Sign in</button></>}
          {mode === "reset" && <button onClick={() => {setMode("login");setError("");setMessage("");}}>← Back to sign in</button>}
        </div>
        <p className="auth-legal">By continuing, you're making a little home for yourself on the web.</p>
      </section>
      <footer className="auth-footer">POLEBIO <b>✳</b> <span>Small page. Big personality.</span></footer>
    </main>
  );
}
