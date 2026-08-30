"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/Badge";

type CommentRecord = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    username: string;
    role: string;
  };
};

export function CommentsSection({ issueId }: { issueId: number }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadComments() {
      const response = await fetch(`/api/issues/${issueId}/comments`);
      const data = await response.json().catch(() => ({}));

      if (!isActive) {
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to load comments.");
        setIsLoading(false);
        return;
      }

      setComments(data.comments ?? []);
      setIsLoading(false);
    }

    void loadComments();

    return () => {
      isActive = false;
    };
  }, [issueId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Comment content is required.");
      return;
    }

    setIsPosting(true);

    const response = await fetch(`/api/issues/${issueId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to add this comment.");
      setIsPosting(false);
      return;
    }

    setComments((current) => [...current, data.comment]);
    setContent("");
    setIsPosting(false);
    window.dispatchEvent(new CustomEvent("issueflow:activity-updated", { detail: { issueId } }));
  }

  return (
    <section className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
      <div>
        <h2 className="font-display text-xl font-semibold text-ivory">Discussion</h2>
        <p className="mt-1 text-sm text-beige">Plain-language collaboration between QA, developers, and admins.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <textarea className="field min-h-28" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add reproduction context, verification notes, or developer updates." />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={isPosting} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber disabled:cursor-not-allowed disabled:opacity-65">
            {isPosting ? "Posting..." : "Add Comment"}
          </button>
          {error && <p className="text-sm font-semibold text-[#ff9aa2]">{error}</p>}
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-sm text-beige">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="rounded-lg border border-bronze bg-espresso/55 p-4 text-sm text-beige">No comments yet. Start the discussion with the latest QA or fix context.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-bronze bg-espresso/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-ivory">{comment.author.username}</p>
                  <Badge label={comment.author.role} />
                </div>
                <p className="text-xs text-beige">{new Date(comment.created_at).toLocaleString()}</p>
              </div>
              <p className="mt-3 whitespace-pre-line leading-7 text-beige">{comment.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
