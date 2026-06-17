"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Search,
  CheckCheck,
  User,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ChildStudent {
  id: string;
  name: string;
  className: string;
  section: string;
  photo: string | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  creatorName: string;
  creatorAvatar: string | null;
  targetRole: string;
  type: "class" | "school";
}

interface ParentAnnouncementsClientProps {
  childrenList: ChildStudent[];
}

type FilterType = "ALL" | "SCHOOL" | "CLASS";

export default function ParentAnnouncementsClient({
  childrenList,
}: ParentAnnouncementsClientProps) {
  const [selectedChildId, setSelectedChildId] = useState(childrenList[0].id);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  // Read state tracked via LocalStorage (since DB has no user-announcement read mapper)
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>([]);

  // 1. Fetch announcements for the selected child's school/class context
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/announcements/${selectedChildId}`);
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      setAnnouncements(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not fetch announcements feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // Load read announcement IDs from localStorage
    const saved = localStorage.getItem(`read_announcements_${selectedChildId}`);
    if (saved) {
      try {
        setReadAnnouncementIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setReadAnnouncementIds([]);
    }
  }, [selectedChildId]);

  // Handle child switcher selection
  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
  };

  // Expand card toggle and auto mark as read
  const handleToggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const newState = !prev[id];
      if (newState) {
        // Mark as read when expanded
        markAsRead(id);
      }
      return { ...prev, [id]: newState };
    });
  };

  // Mark single announcement as read
  const markAsRead = (id: string) => {
    if (readAnnouncementIds.includes(id)) return;
    const updated = [...readAnnouncementIds, id];
    setReadAnnouncementIds(updated);
    localStorage.setItem(`read_announcements_${selectedChildId}`, JSON.stringify(updated));
  };

  // Mark all as read button trigger
  const handleMarkAllRead = () => {
    const allIds = announcements.map((a) => a.id);
    setReadAnnouncementIds(allIds);
    localStorage.setItem(`read_announcements_${selectedChildId}`, JSON.stringify(allIds));
    toast.success("All announcements marked as read!");
  };

  // Filter logic
  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "ALL" ||
      (activeFilter === "SCHOOL" && ann.type === "school") ||
      (activeFilter === "CLASS" && ann.type === "class");

    return matchesSearch && matchesFilter;
  });

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Megaphone className="size-8 text-blue-400" />
            School Announcements
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Stay updated with notifications from school staff and class teachers.
          </p>
        </div>

        {/* Multi-Child Selector */}
        {childrenList.length > 1 && (
          <div className="flex bg-gray-900 border border-white/[0.06] p-1 rounded-xl shrink-0 gap-1 self-start sm:self-auto">
            {childrenList.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildChange(child.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedChildId === child.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <User className="size-3.5" />
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Toolbar: Search & Category Tabs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-gray-900 border border-white/[0.06] p-4 rounded-xl">
        {/* Search */}
        <div className="relative lg:col-span-4">
          <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 lg:col-span-6">
          {(["ALL", "SCHOOL", "CLASS"] as FilterType[]).map((filter) => {
            const label =
              filter === "ALL"
                ? "All Updates"
                : filter === "SCHOOL"
                ? "School Wide"
                : `Class (${activeChild.className}-${activeChild.section})`;
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-blue-600/15 border-blue-500/30 text-blue-400"
                    : "bg-transparent border-white/[0.06] text-gray-400 hover:text-white hover:border-white/[0.12]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Mark All Read Button */}
        <div className="lg:col-span-2 text-right">
          <button
            onClick={handleMarkAllRead}
            disabled={filteredAnnouncements.length === 0}
            className="w-full lg:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck className="size-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* ── Announcements Feed ── */}
      {loading ? (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-12 text-center text-gray-500 text-sm">
          Loading announcements feed...
        </Card>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-10 text-center rounded-xl">
          <AlertCircle className="size-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No announcements published under this category filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAnnouncements.map((ann) => {
            const isRead = readAnnouncementIds.includes(ann.id);
            const isExpanded = !!expandedCards[ann.id];
            
            // Check content length for truncation
            const isLong = ann.content.length > 150;
            const contentDisplay =
              isExpanded || !isLong
                ? ann.content
                : `${ann.content.substring(0, 150)}...`;

            return (
              <Card
                key={ann.id}
                className={`border bg-gray-900/60 backdrop-blur-xl rounded-xl hover:border-white/[0.1] transition-all p-5 relative overflow-hidden ${
                  isRead ? "border-white/[0.06]" : "border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]"
                }`}
              >
                {/* Visual Unread Indicator Dot */}
                {!isRead && (
                  <div className="absolute top-5 right-5 flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                )}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Type Badge */}
                    {ann.type === "class" ? (
                      <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[9px] uppercase px-2 py-0.5">
                        Class Update
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] uppercase px-2 py-0.5">
                        School Wide
                      </Badge>
                    )}

                    <Badge className="bg-gray-800 text-gray-400 rounded text-[9px] px-2 py-0.5">
                      Target: {ann.targetRole}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">
                    {ann.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {contentDisplay}
                  </p>

                  {/* Expansion controller */}
                  {isLong && (
                    <button
                      onClick={() => handleToggleExpand(ann.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors pt-1"
                    >
                      {isExpanded ? (
                        <>
                          Show Less
                          <ChevronUp className="size-3" />
                        </>
                      ) : (
                        <>
                          Read More
                          <ChevronDown className="size-3" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Card Footer Details */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-gray-500 pt-3 border-t border-white/[0.04] mt-2">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5 text-gray-600" />
                      Publisher: <strong>{ann.creatorName}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-gray-600" />
                      Date: {new Date(ann.createdAt).toLocaleDateString()} at {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
