"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";

type ActivityRecord = {
  id: number;
  action_type: string;
  message: string;
  created_at: string;
  actor: {
    username: string;
    role: string;
  } | null;
};

export function ActivityTimeline({ issueId }: { issueId: number }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadActivity() {
      const response = await fetch(`/api/issues/${issueId}/activity`);
      const data = await response.json().catch(() => ({}));

      if (!isActive) {
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to load activity.");
        setIsLoading(false);
        return;
      }

      setActivity(data.activity ?? []);
      setIsLoading(false);
    }

    function handleRefresh(event: Event) {
      const customEvent = event as CustomEvent<{ issueId: number }>;

      if (customEvent.detail?.issueId === issueId) {
        void loadActivity();
      }
    }

    void loadActivity();
    window.addEventListener("issueflow:activity-updated", handleRefresh);

    return () => {
      isActive = false;
      window.removeEventListener("issueflow:activity-updated", handleRefresh);
    };
  }, [issueId]);

  return (
    <section className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
      <div>
        <h2 className="font-display text-xl font-semibold text-ivory">Activity</h2>
        <p className="mt-1 text-sm text-beige">A reliable history of status, assignment, evidence, and collaboration changes.</p>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-sm text-beige">Loading activity...</p>
        ) : error ? (
          <p role="alert" className="text-sm font-semibold text-[#ff9aa2]">{error}</p>
        ) : activity.length === 0 ? (
          <p className="rounded-lg border border-bronze bg-espresso/55 p-4 text-sm text-beige">No activity has been recorded yet.</p>
        ) : (
          activity.map((item) => (
            <article key={item.id} className="rounded-lg border border-bronze bg-espresso/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge label={item.action_type} />
                  <p className="text-sm text-beige">{item.actor ? `${item.actor.username} (${item.actor.role})` : "System"}</p>
                </div>
                <p className="text-xs text-beige">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-ivory">{item.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
