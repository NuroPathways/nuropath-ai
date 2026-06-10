import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, ThumbsUp, ThumbsDown, Bot, Eye, ClipboardList } from "lucide-react";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function EngagementPanel({ childId, behaviorLogCount = 0 }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!childId) return;
    base44.entities.EngagementEvent.filter({ child_id: childId }, "-created_date", 500)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [childId]);

  const weekEvents = events.filter(e => e.created_date && Date.now() - new Date(e.created_date).getTime() < WEEK_MS);
  const count = (t) => weekEvents.filter(e => e.event_type === t).length;

  const topicCounts = {};
  weekEvents.filter(e => e.event_type === "behavior_viewed" && e.topic).forEach(e => {
    topicCounts[e.topic] = (topicCounts[e.topic] || 0) + 1;
  });
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const helpful = weekEvents.filter(e => e.event_type === "feedback" && e.helpful === true).length;
  const notHelpful = weekEvents.filter(e => e.event_type === "feedback" && e.helpful === false).length;

  const aiTopics = [...new Set(weekEvents.filter(e => e.event_type === "ai_question" && e.topic).map(e => e.topic))].slice(0, 4);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground text-sm">Client Engagement — This Week</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-background border border-border rounded-xl p-3 text-center">
          <Eye className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{count("help_opened")}</p>
          <p className="text-[11px] text-muted-foreground">Help Button Used</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-3 text-center">
          <Bot className="w-4 h-4 text-purple-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{count("ai_question")}</p>
          <p className="text-[11px] text-muted-foreground">AI Questions</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-3 text-center">
          <ClipboardList className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{behaviorLogCount}</p>
          <p className="text-[11px] text-muted-foreground">Behavior Logs</p>
        </div>
      </div>

      {topTopics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Most Viewed Topics</p>
          <div className="space-y-1.5">
            {topTopics.map(([topic, n]) => (
              <div key={topic} className="flex items-center justify-between">
                <p className="text-sm text-foreground truncate">{topic}</p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{n}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {aiTopics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent AI Topics</p>
          <div className="flex flex-wrap gap-1.5">
            {aiTopics.map((t, i) => (
              <span key={i} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full truncate max-w-[200px]">{t}</span>
            ))}
          </div>
        </div>
      )}

      {(helpful > 0 || notHelpful > 0) && (
        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guidance Feedback</p>
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><ThumbsUp className="w-3.5 h-3.5" /> {helpful}</span>
          <span className="flex items-center gap-1 text-sm text-red-500 font-medium"><ThumbsDown className="w-3.5 h-3.5" /> {notHelpful}</span>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-3">
        Engagement events are information views — they do not count as behavior occurrences.
      </p>
    </div>
  );
}