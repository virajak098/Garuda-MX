import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Lock, Shield, Check, X, Trash2, Loader2, LogOut, Star } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "garuda_admin_token";

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(data || []);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        toast.error("Session expired — please login again");
      } else {
        toast.error("Failed to load reviews");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) loadReviews(); /* eslint-disable-next-line */ }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const { data } = await axios.post(`${API}/admin/login`, { password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
      toast.success("Welcome, admin");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Login failed");
    } finally { setLoggingIn(false); }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setReviews([]);
  };

  const approve = async (id, value) => {
    try {
      await axios.patch(`${API}/admin/reviews/${id}`,
        { approved: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(value ? "Approved" : "Hidden");
      loadReviews();
    } catch { toast.error("Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await axios.delete(`${API}/admin/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      loadReviews();
    } catch { toast.error("Failed"); }
  };

  if (!token) {
    return (
      <div data-testid="admin-login-page" className="min-h-screen flex items-center justify-center bg-garuda-app px-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm bg-garuda-panel border border-garuda-border rounded-sm p-8 space-y-5 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <img src={BRAND.logo} alt="Garuda" className="w-10 h-10 rounded-sm object-cover ring-1 ring-garuda-gold/50" />
            <div>
              <div className="font-heading text-lg font-bold">Admin Console</div>
              <div className="text-[10px] text-garuda-textTertiary uppercase tracking-[0.25em] font-mono">Garuda MX</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-garuda-textSecondary leading-relaxed border-l-2 border-garuda-gold pl-3">
            <Shield className="w-3.5 h-3.5 text-garuda-gold mt-0.5 shrink-0" />
            <span>Restricted area. Enter admin password to manage reviews.</span>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-garuda-textSecondary font-mono mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-garuda-textTertiary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                data-testid="admin-password-input"
                placeholder="••••••••"
                className="w-full bg-garuda-surface border border-garuda-border rounded-sm pl-9 pr-3 py-2 text-sm outline-none focus:border-garuda-gold"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loggingIn || !password}
            data-testid="admin-login-button"
            className="w-full bg-garuda-gold text-black py-2.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Sign In
          </button>
          <div className="text-center">
            <Link to="/" className="text-[11px] text-garuda-textTertiary hover:text-white underline">← back to home</Link>
          </div>
        </form>
      </div>
    );
  }

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-garuda-app text-white">
      <nav className="h-14 px-6 flex items-center justify-between border-b border-garuda-border bg-garuda-panel sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-3">
          <img src={BRAND.logo} alt="Garuda" className="w-8 h-8 rounded-sm object-cover ring-1 ring-garuda-gold/40" />
          <div className="font-heading font-bold">Garuda MX · Admin</div>
        </Link>
        <button
          onClick={logout}
          data-testid="admin-logout-button"
          className="text-xs text-garuda-textSecondary hover:text-destructive flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-garuda-gold font-mono mb-2">Moderation queue</div>
            <h1 className="font-heading text-3xl font-bold">Review Management</h1>
          </div>
          <div className="flex gap-4 text-xs text-garuda-textSecondary">
            <div>Total: <span className="font-mono text-white">{reviews.length}</span></div>
            <div>Pending: <span className="font-mono text-garuda-gold">{pending.length}</span></div>
            <div>Approved: <span className="font-mono text-emerald-400">{approved.length}</span></div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-garuda-gold" /></div>
        ) : reviews.length === 0 ? (
          <div className="py-24 text-center text-sm text-garuda-textTertiary">No reviews yet.</div>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <Section title="Pending approval" color="text-garuda-gold" data-testid="admin-pending-section">
                {pending.map((r) => (
                  <AdminReviewCard key={r.id} review={r} onApprove={() => approve(r.id, true)} onHide={() => approve(r.id, false)} onDelete={() => remove(r.id)} />
                ))}
              </Section>
            )}
            {approved.length > 0 && (
              <Section title="Approved (public)" color="text-emerald-400" data-testid="admin-approved-section">
                {approved.map((r) => (
                  <AdminReviewCard key={r.id} review={r} onApprove={() => approve(r.id, true)} onHide={() => approve(r.id, false)} onDelete={() => remove(r.id)} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children, ...rest }) {
  return (
    <section {...rest}>
      <h2 className={`font-heading text-lg font-semibold mb-4 ${color}`}>{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function AdminReviewCard({ review, onApprove, onHide, onDelete }) {
  return (
    <article
      data-testid={`admin-review-${review.id}`}
      className="bg-garuda-panel border border-garuda-border p-5 rounded-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-sm">{review.name}</div>
          <div className="text-[10px] text-garuda-textTertiary font-mono uppercase tracking-wider">
            {new Date(review.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className="w-3.5 h-3.5"
              fill={n <= review.rating ? "#f5c542" : "transparent"}
              stroke={n <= review.rating ? "#f5c542" : "#6b6b6b"}
              strokeWidth={2}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-garuda-textSecondary leading-relaxed whitespace-pre-wrap break-words mb-4">{review.text}</p>
      <div className="flex gap-2 pt-3 border-t border-garuda-border">
        {review.approved ? (
          <button
            onClick={onHide}
            data-testid={`admin-hide-${review.id}`}
            className="flex-1 bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border text-xs py-1.5 rounded-sm flex items-center justify-center gap-1.5"
          >
            <X className="w-3 h-3" /> Unapprove
          </button>
        ) : (
          <button
            onClick={onApprove}
            data-testid={`admin-approve-${review.id}`}
            className="flex-1 bg-garuda-gold text-black text-xs py-1.5 rounded-sm font-semibold hover:bg-garuda-goldHover flex items-center justify-center gap-1.5"
          >
            <Check className="w-3 h-3" /> Approve
          </button>
        )}
        <button
          onClick={onDelete}
          data-testid={`admin-delete-${review.id}`}
          className="flex-1 bg-garuda-surface hover:bg-destructive hover:text-white border border-garuda-border text-garuda-textSecondary text-xs py-1.5 rounded-sm flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </article>
  );
}
