import React, { useEffect, useState } from "react";
import axios from "axios";
import { Star, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function StarRow({ value, onChange, size = 5, interactive = true, testId }) {
  return (
    <div className="flex items-center gap-1" data-testid={testId}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => interactive && onChange && onChange(n)}
          disabled={!interactive}
          data-testid={interactive ? `star-${n}` : undefined}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          aria-label={`${n} stars`}
        >
          <Star
            className={`w-${size} h-${size}`}
            fill={n <= value ? "#f5c542" : "transparent"}
            stroke={n <= value ? "#f5c542" : "#6b6b6b"}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/reviews`);
      setReviews(data || []);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return toast.error("Please fill all fields");
    setSubmitting(true);
    try {
      await axios.post(`${API}/reviews`, {
        name: name.trim(), rating, text: text.trim(),
      });
      setSubmitted(true);
      setName(""); setText(""); setRating(5);
      toast.success("Thanks! Your review is pending approval.");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <section
      id="reviews"
      data-testid="reviews-section"
      className="px-6 md:px-10 py-24 max-w-7xl mx-auto"
    >
      <div className="mb-12 flex items-end justify-between flex-wrap gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-garuda-gold font-mono mb-3">Loved by editors</div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tighter max-w-2xl">
            What people say about Garuda MX.
          </h2>
          {reviews.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <StarRow value={Math.round(parseFloat(avgRating))} interactive={false} testId="avg-rating-stars" />
              <span className="text-sm text-garuda-textSecondary font-mono">
                <span className="text-white font-bold">{avgRating}</span> · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission form */}
        <form
          onSubmit={submit}
          data-testid="review-form"
          className="lg:col-span-1 bg-garuda-panel border border-garuda-border p-6 space-y-4 rounded-sm"
        >
          <h3 className="font-heading text-lg font-semibold">Write a review</h3>

          {submitted ? (
            <div
              data-testid="review-submitted-success"
              className="flex items-start gap-3 bg-garuda-goldMuted/30 border border-garuda-gold/40 p-4 rounded-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-garuda-gold shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-garuda-gold">Review submitted</div>
                <div className="text-xs text-garuda-textSecondary mt-1">
                  Pending admin approval. Once approved it will appear publicly.
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-3 text-xs underline text-garuda-textSecondary hover:text-white"
                >
                  Write another
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-garuda-textSecondary font-mono mb-1.5">
                  Your name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Akash Kumar"
                  data-testid="review-name-input"
                  className="w-full bg-garuda-surface border border-garuda-border rounded-sm px-3 py-2 text-sm outline-none focus:border-garuda-gold"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-garuda-textSecondary font-mono mb-1.5">
                  Rating
                </label>
                <StarRow value={rating} onChange={setRating} testId="review-rating-picker" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-garuda-textSecondary font-mono mb-1.5">
                  Your review
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={600}
                  rows={4}
                  placeholder="Tell others what you love about Garuda MX…"
                  data-testid="review-text-input"
                  className="w-full bg-garuda-surface border border-garuda-border rounded-sm px-3 py-2 text-sm outline-none focus:border-garuda-gold resize-none"
                />
                <div className="text-[10px] text-garuda-textTertiary font-mono text-right mt-1">{text.length}/600</div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                data-testid="review-submit-button"
                className="w-full bg-garuda-gold text-black py-2.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Review
              </button>
              <p className="text-[10px] text-garuda-textTertiary leading-relaxed">
                Reviews are moderated by the admin. Spam will be removed.
              </p>
            </>
          )}
        </form>

        {/* Public list */}
        <div className="lg:col-span-2" data-testid="reviews-list">
          {reviews.length === 0 ? (
            <div className="h-full min-h-[240px] flex items-center justify-center bg-garuda-panel border border-dashed border-garuda-border text-sm text-garuda-textTertiary p-6 text-center rounded-sm">
              No reviews yet — be the first to share your experience.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  data-testid={`review-${r.id}`}
                  className="bg-garuda-panel border border-garuda-border p-5 rounded-sm hover:border-garuda-gold/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-sm">{r.name}</div>
                    <StarRow value={r.rating} interactive={false} />
                  </div>
                  <p className="text-sm text-garuda-textSecondary leading-relaxed whitespace-pre-wrap break-words">
                    {r.text}
                  </p>
                  <div className="mt-3 text-[10px] text-garuda-textTertiary font-mono uppercase tracking-wider">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
