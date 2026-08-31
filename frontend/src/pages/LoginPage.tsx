import { useEffect, useRef } from 'react';
import '../styles/login.css';

interface LoginPageProps {
  onSignIn: () => void;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Pulse {
  from: Node;
  to: Node;
  t: number;
}

export default function LoginPage({ onSignIn }: LoginPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let w = 0;
    let h = 0;
    const NODE_COUNT = 70;
    const MAX_DIST = 170;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let animationFrameId = 0;
    let spawnIntervalId = 0;

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      r: 1.1 + Math.random() * 1.6,
    }));

    function spawnPulse() {
      if (pulses.length > 7) return;
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      let best: Node | null = null;
      let bestD = Infinity;
      for (const b of nodes) {
        if (b === a) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < MAX_DIST && d < bestD) {
          bestD = d;
          best = b;
        }
      }
      if (best) pulses.push({ from: a, to: best, t: 0 });
    }
    spawnIntervalId = window.setInterval(spawnPulse, 600);

    function tick() {
      ctx!.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < MAX_DIST) {
            ctx!.strokeStyle = `rgba(190,180,210,${(1 - d / MAX_DIST) * 0.35})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx!.fillStyle = 'rgba(210,205,220,0.75)';
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      pulses = pulses.filter((p) => p.t < 1);
      for (const p of pulses) {
        p.t += 0.014;
        const x = p.from.x + (p.to.x - p.from.x) * p.t;
        const y = p.from.y + (p.to.y - p.from.y) * p.t;
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, 7);
        grad.addColorStop(0, 'rgba(189,127,224,1)');
        grad.addColorStop(1, 'rgba(189,127,224,0)');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(x, y, 7, 0, Math.PI * 2);
        ctx!.fill();
      }

      animationFrameId = requestAnimationFrame(tick);
    }
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      window.clearInterval(spawnIntervalId);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="login-page">
      <div className="lp-mesh" />
      <div className="lp-grid" />
      <canvas ref={canvasRef} className="lp-canvas" />
      <div className="lp-vignette" />

      <div className="lp-top-mark">
        <span className="lp-mark" />
        SOVEREIGN AI
      </div>
      <div className="lp-env-note">
        <span className="lp-led" />
        DEMO ENVIRONMENT
      </div>

      <div className="lp-page">
        <div className="lp-brand-panel">
          <div className="lp-eyebrow">SIH26117 · Agentic AI Workbench</div>
          <h1 className="lp-heading">
            AI that stays
            <strong>inside your infrastructure.</strong>
          </h1>
          <p className="lp-sub">
            A fully on-premise agentic AI workbench for searching industrial knowledge, working
            with documents, and executing secure AI-assisted workflows — with zero external data
            egress.
          </p>
          <div className="lp-stats">
            <div className="lp-stat">
              <div className="lp-num">248</div>
              <div className="lp-lbl">Documents indexed</div>
            </div>
            <div className="lp-stat">
              <div className="lp-num">0</div>
              <div className="lp-lbl">External requests</div>
            </div>
            <div className="lp-stat">
              <div className="lp-num">100%</div>
              <div className="lp-lbl">Local execution</div>
            </div>
          </div>
        </div>

        <div className="lp-auth-wrap">
          <div className="lp-auth-card">
            <div className="lp-auth-head">
              <div className="lp-auth-title">Sign in to your workbench</div>
              <div className="lp-auth-sub">On-premise deployment · Refinery Ops workspace</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSignIn();
              }}
            >
              <div className="lp-field">
                <label htmlFor="org">Organization ID</label>
                <input type="text" id="org" placeholder="mrpl-refinery-ops" />
              </div>
              <div className="lp-field">
                <label htmlFor="user">Username</label>
                <input type="text" id="user" placeholder="r.sharma" />
              </div>
              <div className="lp-field">
                <label htmlFor="pass">Password</label>
                <input type="password" id="pass" placeholder="••••••••••" />
              </div>

              <div className="lp-field-row">
                <label className="lp-remember">
                  <input type="checkbox" defaultChecked /> Stay signed in
                </label>
                <span className="lp-forgot">Forgot password?</span>
              </div>

              <button type="submit" className="lp-btn-signin">
                Sign in
              </button>
            </form>

            <div className="lp-divider">
              <span className="lp-line" />
              <span>OR</span>
              <span className="lp-line" />
            </div>

            <div className="lp-sso-row">
              <button className="lp-sso-btn">SSO / SAML</button>
              <button className="lp-sso-btn">Hardware key</button>
            </div>

            <div className="lp-auth-switch">
              No account? <a>Request access</a>
            </div>

            <div className="lp-trust-footer">
              <span>
                <span className="lp-dot" />
                Local auth
              </span>
              <span>
                <span className="lp-dot" />
                No internet
              </span>
              <span>
                <span className="lp-dot" />
                Audit logged
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-page-footer">SIH26117 · Sovereign On-Premise Agentic AI Workbench</div>
    </div>
  );
}
