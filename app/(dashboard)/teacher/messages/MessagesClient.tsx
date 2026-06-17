"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCheck,
  Plus,
  Search,
  Send,
  User,
  MessageSquare,
  Phone,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";

interface Conversation {
  parentId: string;
  parentName: string;
  parentAvatar: string | null;
  studentName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface ParentAutocomplete {
  parentUserId: string;
  parentName: string;
  parentPhone: string;
  studentName: string;
}

interface MessagesClientProps {
  initialConversations: Conversation[];
  teacherUserId: string;
  parentsAutocomplete: ParentAutocomplete[];
}

export default function MessagesClient({
  initialConversations,
  teacherUserId,
  parentsAutocomplete,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Send message states
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Dialog States
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when active parent changes
  useEffect(() => {
    if (!activeParentId) return;

    const loadThread = async () => {
      setIsHistoryLoading(true);
      try {
        const res = await fetch(`/api/teacher/messages/${activeParentId}`);
        if (!res.ok) throw new Error("Could not fetch messages");
        const data = await res.json();
        setMessages(data);

        // Update local conversation list to clear unread count
        setConversations((prev) =>
          prev.map((c) =>
            c.parentId === activeParentId ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load message history.");
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadThread();

    // Setup a poll reminder timer (every 10 seconds) to check for new messages in this thread
    const interval = setInterval(loadThread, 10000);
    return () => clearInterval(interval);
  }, [activeParentId]);

  // Send handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeParentId || isSending) return;

    setIsSending(true);
    const content = inputMessage.trim();
    setInputMessage("");

    try {
      const res = await fetch("/api/teacher/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeParentId,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      const newMsg = await res.json();

      // Add to thread
      setMessages((prev) => [...prev, newMsg]);

      // Update conversations list summary
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.parentId === activeParentId) {
            return {
              ...c,
              lastMessage: content,
              lastMessageTime: new Date().toISOString(),
            };
          }
          return c;
        });

        // Sort by time
        return [...updated].sort(
          (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message.");
      setInputMessage(content); // restore input
    } finally {
      setIsSending(false);
    }
  };

  // Start chat with a parent from search dialog
  const handleStartChat = (parent: ParentAutocomplete) => {
    setIsNewChatOpen(false);
    setParentSearch("");

    // Check if conversation already exists in list
    const exists = conversations.some((c) => c.parentId === parent.parentUserId);

    if (!exists) {
      // Add a placeholder conversation
      const newConversation: Conversation = {
        parentId: parent.parentUserId,
        parentName: parent.parentName,
        parentAvatar: null,
        studentName: parent.studentName,
        lastMessage: "Conversation started.",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };

      setConversations((prev) => [newConversation, ...prev]);
    }

    setActiveParentId(parent.parentUserId);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(
    (c) =>
      c.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter parents list for autocomplete dialog
  const filteredParents = parentsAutocomplete.filter(
    (p) =>
      p.parentName.toLowerCase().includes(parentSearch.toLowerCase()) ||
      p.studentName.toLowerCase().includes(parentSearch.toLowerCase())
  );

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-PK", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatConversationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-PK", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const activeConv = conversations.find((c) => c.parentId === activeParentId);
  const activeParentPhone = parentsAutocomplete.find(
    (p) => p.parentUserId === activeParentId
  )?.parentPhone;

  return (
    <div className="flex flex-col md:flex-row h-[78vh] border border-white/[0.06] bg-gray-950 rounded-2xl overflow-hidden">
      {/* LEFT PANEL: CONVERSATIONS LIST */}
      <div className="w-full md:w-80 border-r border-white/[0.06] flex flex-col justify-between bg-gray-900/20">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white tracking-tight">Messages</h1>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-purple-500 transition-colors"
            >
              <Plus className="size-3.5" />
              New Message
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {filteredConversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title="No Messages"
                description="Start a conversation with a parent"
                actionLabel="Send Message"
                onAction={() => setIsNewChatOpen(true)}
              />
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.parentId === activeParentId;
              return (
                <div
                  key={c.parentId}
                  onClick={() => setActiveParentId(c.parentId)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-white/[0.02] ${
                    isActive ? "bg-white/[0.04] border-l-2 border-purple-500" : ""
                  }`}
                >
                  {/* Avatar fallback */}
                  <div className="size-9 rounded-full overflow-hidden flex items-center justify-center text-gray-300 font-bold text-xs shrink-0 uppercase">
                    {c.parentAvatar ? (
                      <Image
                        src={c.parentAvatar}
                        alt={c.parentName}
                        width={36}
                        height={36}
                        className="size-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <InitialsAvatar name={c.parentName} size={36} className="size-full" />
                    )}
                  </div>

                  {/* Conv Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {c.parentName}
                      </h4>
                      <span className="text-[10px] text-gray-500 shrink-0 font-medium">
                        {formatConversationTime(c.lastMessageTime)}
                      </span>
                    </div>

                    <p className="text-[10px] text-purple-400 font-semibold truncate leading-none">
                      Student: {c.studentName}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p className="text-[11px] text-gray-400 truncate flex-1">
                        {c.lastMessage}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="size-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CHAT WINDOW */}
      <div className="flex-1 flex flex-col justify-between bg-black/10">
        {activeParentId ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] bg-gray-900/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                  <User className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white leading-tight">
                    {activeConv?.parentName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                    <span>Student: {activeConv?.studentName}</span>
                    {activeParentPhone && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Phone className="size-2.5" />
                          {activeParentPhone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isHistoryLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-6 text-purple-500 animate-spin" />
                </div>
              ) : (
                messages.map((msg) => {
                  const isTeacher = msg.senderId === teacherUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isTeacher ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[70%] space-y-1">
                        <div
                          className={`px-3.5 py-2 text-xs rounded-2xl leading-relaxed whitespace-pre-wrap ${
                            isTeacher
                              ? "bg-purple-600 text-white rounded-tr-none"
                              : "bg-gray-800 text-gray-100 rounded-tl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div
                          className={`flex items-center gap-1 text-[9px] text-gray-500 ${
                            isTeacher ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {isTeacher && (
                            <CheckCheck
                              className={`size-3 ${
                                msg.isRead ? "text-blue-400" : "text-gray-600"
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-white/[0.06] bg-gray-900/20 flex items-center gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </form>
          </>
        ) : (
          /* PLACEHOLDER */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
            <MessageSquare className="size-12 text-gray-600 mb-3 animate-bounce" />
            <h3 className="text-white font-bold text-sm">Conversation Board</h3>
            <p className="text-xs text-gray-500 max-w-xs mt-1">
              Select a conversation from the left panel or click "New Message" to chat with parent users.
            </p>
          </div>
        )}
      </div>

      {/* NEW CONVERSATION DIALOG */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="border border-white/[0.1] bg-gray-950 text-white rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b border-white/[0.06] pb-3">
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-1.5">
              <Plus className="size-4 text-purple-400" />
              New Message thread
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              <input
                type="text"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                placeholder="Search parent name or child name..."
                className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Results */}
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {filteredParents.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No parent records matching search query.
                </div>
              ) : (
                filteredParents.map((parent) => (
                  <div
                    key={parent.parentUserId}
                    onClick={() => handleStartChat(parent)}
                    className="p-3 border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.08] rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{parent.parentName}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Child: {parent.studentName}
                      </p>
                    </div>
                    <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      Start Chat
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
