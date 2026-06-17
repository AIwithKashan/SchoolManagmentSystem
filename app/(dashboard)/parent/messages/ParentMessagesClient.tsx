"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Phone,
  Send,
  Search,
  Plus,
  User,
  Loader2,
  CheckCheck,
  Check,
  ArrowLeft,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";

interface TeacherInfo {
  teacherUserId: string;
  teacherName: string;
  teacherAvatar: string | null;
  subjectName: string;
  studentName: string;
  className: string;
}

interface Conversation {
  teacherUserId: string;
  teacherName: string;
  teacherAvatar: string | null;
  subjectName: string;
  studentName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface ParentMessagesClientProps {
  schoolPhone: string;
  schoolName: string;
}

export default function ParentMessagesClient({
  schoolPhone,
  schoolName,
}: ParentMessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // UI Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teachersList, setTeachersList] = useState<TeacherInfo[]>([]);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");

  // Loading states
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Responsive state (mobile conversation view override)
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations on mount and periodic interval
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const res = await fetch("/api/parent/messages");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      setConversations(data);
    } catch (err: any) {
      console.error(err);
      if (!silent) toast.error("Could not load message history.");
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Poll conversations list every 10 seconds for new incoming messages
    const interval = setInterval(() => fetchConversations(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Prefill active conversation and input when query parameters exist (e.g. from Profile page redirect)
  useEffect(() => {
    const recipientId = searchParams.get("recipientId");
    const text = searchParams.get("text");

    if (recipientId && conversations.length > 0) {
      const existing = conversations.find((c) => c.teacherUserId === recipientId);
      if (existing) {
        setActiveTeacherId(recipientId);
        setMobileShowChat(true);
        if (text) {
          setNewMessage(text);
        }
      } else {
        const resolveParams = async () => {
          try {
            const res = await fetch("/api/parent/profile");
            if (res.ok) {
              const data = await res.json();
              if (data.parent.principalId === recipientId) {
                const principalConv: Conversation = {
                  teacherUserId: recipientId,
                  teacherName: "School Principal",
                  teacherAvatar: null,
                  subjectName: "Administration",
                  studentName: data.children[0]?.name || "Student",
                  lastMessage: "No messages yet.",
                  lastMessageTime: new Date().toISOString(),
                  unreadCount: 0,
                };
                setConversations((prev) => {
                  if (!prev.some((c) => c.teacherUserId === recipientId)) {
                    return [principalConv, ...prev];
                  }
                  return prev;
                });
                setActiveTeacherId(recipientId);
                setMobileShowChat(true);
                if (text) {
                  setNewMessage(text);
                }
              }
            }
          } catch (e) {
            console.error("Error prefilling principal details", e);
          }
        };
        resolveParams();
      }
    }
  }, [searchParams, conversations]);

  // 2. Fetch messages when active conversation changes
  const fetchMessages = async (teacherId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/parent/messages/${teacherId}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setMessages(data);
      if (!silent) scrollChatToBottom();
    } catch (err: any) {
      console.error(err);
      if (!silent) toast.error("Could not retrieve chat history.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeTeacherId) {
      fetchMessages(activeTeacherId);
      // Poll current chat thread every 4 seconds for a dynamic live feel
      const interval = setInterval(() => fetchMessages(activeTeacherId, true), 4000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [activeTeacherId]);

  // Scroll chat to bottom helper
  const scrollChatToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 3. Fetch teachers parent can message
  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetch("/api/parent/messages?teachers=true");
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const data = await res.json();
      setTeachersList(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not retrieve teacher list.");
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleOpenNewChat = () => {
    setShowNewChatModal(true);
    fetchTeachers();
  };

  // Switch/Start conversation with teacher
  const handleSelectTeacher = (teacher: TeacherInfo) => {
    setShowNewChatModal(false);
    setSearchTeacherQuery("");
    
    // Check if conversation already exists in left list
    const existing = conversations.find((c) => c.teacherUserId === teacher.teacherUserId);
    if (!existing) {
      // Temporarily inject new conversation to list so it displays in left panel
      const tempConv: Conversation = {
        teacherUserId: teacher.teacherUserId,
        teacherName: teacher.teacherName,
        teacherAvatar: teacher.teacherAvatar,
        subjectName: teacher.subjectName,
        studentName: teacher.studentName,
        lastMessage: "No messages yet.",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
      setConversations((prev) => [tempConv, ...prev]);
    }

    setActiveTeacherId(teacher.teacherUserId);
    setMobileShowChat(true);
  };

  // 4. Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacherId || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch("/api/parent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeTeacherId,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const sentMsg = await res.json();
      // Instantly append to active messages
      setMessages((prev) => [...prev, sentMsg]);
      scrollChatToBottom();

      // Refresh left conversation previews
      fetchConversations(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Message could not be sent.");
      setNewMessage(content); // restore typed text
    } finally {
      setSendingMessage(false);
    }
  };

  // Initials generator
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Filter conversations in Left Panel
  const filteredConversations = conversations.filter((c) =>
    c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter teachers in Dialog Dropdown
  const filteredTeachers = teachersList.filter((t) =>
    t.teacherName.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
    t.subjectName.toLowerCase().includes(searchTeacherQuery.toLowerCase())
  );

  // Get selected conversation details
  const activeConversation = conversations.find((c) => c.teacherUserId === activeTeacherId);

  return (
    <div className="flex border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-2xl overflow-hidden h-[calc(100vh-120px)] min-h-[500px]">
      {/* ── LEFT PANEL: CONVERSATIONS LIST ── */}
      <div
        className={`w-full md:w-80 border-r border-white/[0.06] flex flex-col justify-between shrink-0 bg-gray-950/20 ${
          mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="size-5 text-blue-400" />
              Inbox Chat
            </h2>
            <button
              onClick={handleOpenNewChat}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/10 transition-colors"
              title="Message a Teacher"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* List of active chats */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
          {loadingConvs ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              Loading inbox...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title="No Messages"
                description="Start a conversation with a teacher"
                actionLabel="Send Message"
                onAction={handleOpenNewChat}
              />
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.teacherUserId === activeTeacherId;
              return (
                <button
                  key={conv.teacherUserId}
                  onClick={() => {
                    setActiveTeacherId(conv.teacherUserId);
                    setMobileShowChat(true);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all border text-left ${
                    isActive
                      ? "bg-blue-600/15 border-blue-500/30 shadow-inner"
                      : "border-transparent hover:bg-white/[0.02] text-gray-300 hover:text-white"
                  }`}
                >
                  <Avatar size="default" className="border border-white/[0.06] shrink-0">
                    {conv.teacherAvatar ? <AvatarImage src={conv.teacherAvatar} alt={conv.teacherName} /> : null}
                    <AvatarFallback className="bg-gray-800 text-gray-200 text-xs font-semibold">
                      {getInitials(conv.teacherName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate text-white">
                        {conv.teacherName}
                      </span>
                      <span className="text-[9px] text-gray-500 shrink-0">
                        {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-blue-400 font-semibold truncate leading-none">
                        {conv.subjectName}
                      </span>
                      <span className="text-[9px] text-gray-500 font-medium truncate leading-none">
                        For: {conv.studentName}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 truncate leading-snug">
                      {conv.lastMessage}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="size-2 rounded-full bg-blue-500 shrink-0 mt-1.5 animate-pulse" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: CONVERSATION TIMELINE ── */}
      <div
        className={`flex-1 flex flex-col justify-between bg-black/10 ${
          mobileShowChat ? "flex" : "hidden md:flex"
        }`}
      >
        {activeTeacherId && activeConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-gray-950/20">
              <div className="flex items-center gap-3">
                {/* Back button (Mobile view only) */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="size-4" />
                </button>

                <Avatar size="default" className="border border-white/[0.06]">
                  {activeConversation.teacherAvatar ? (
                    <AvatarImage src={activeConversation.teacherAvatar} alt={activeConversation.teacherName} />
                  ) : null}
                  <AvatarFallback className="bg-gray-800 text-gray-200 text-xs font-semibold">
                    {getInitials(activeConversation.teacherName)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-none">
                    {activeConversation.teacherName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 leading-none text-[10px]">
                    <span className="text-blue-400 font-semibold">{activeConversation.subjectName}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-500">Child: {activeConversation.studentName}</span>
                  </div>
                </div>
              </div>

              {/* Call School Trigger */}
              <a
                href={`tel:${schoolPhone}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                title={`Call ${schoolName}`}
              >
                <Phone className="size-3.5" />
                Call School
              </a>
            </div>

            {/* Scrolling chat timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="size-6 text-blue-500 animate-spin" />
                </div>
              ) : (
                messages.map((msg) => {
                  const isParentSender = msg.senderId === activeConversation.teacherUserId ? false : true;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isParentSender ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-3.5 text-xs shadow-md leading-relaxed ${
                          isParentSender
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-gray-800 border border-white/[0.06] text-gray-200 rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div
                          className={`flex items-center justify-end gap-1.5 text-[9px] mt-1.5 select-none ${
                            isParentSender ? "text-blue-200" : "text-gray-500"
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isParentSender && (
                            msg.isRead ? (
                              <CheckCheck className="size-3 text-emerald-400" />
                            ) : (
                              <Check className="size-3 text-blue-300" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input controls */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-white/[0.06] flex items-center gap-2 bg-gray-950/20 shrink-0"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message details here..."
                disabled={sendingMessage}
                className="flex-1 bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10 transition-colors shrink-0"
              >
                {sendingMessage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4 text-white" />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 text-xs leading-relaxed max-w-sm mx-auto">
            <MessageSquare className="size-10 text-gray-700 mb-3" />
            <h4 className="font-bold text-gray-400 text-sm">No Active Chat</h4>
            <p className="mt-1">
              Select a conversation from the list or click the plus button on the left panel to message one of your child&apos;s teachers.
            </p>
          </div>
        )}
      </div>

      {/* ── "MESSAGE A TEACHER" MODAL ── */}
      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="w-full sm:max-w-md border border-white/[0.08] bg-gray-950 text-white [color-scheme:dark] p-5 rounded-2xl select-none">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2 leading-none">
                <Plus className="size-4 text-blue-400" />
                Message a Teacher
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-xs mt-2 leading-relaxed">
                Start a message thread with one of your children&apos;s assigned instructors.
              </DialogDescription>
            </div>
            <button
              onClick={() => setShowNewChatModal(false)}
              className="p-1 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </DialogHeader>

          {/* Search bar inside Modal */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
            <input
              type="text"
              value={searchTeacherQuery}
              onChange={(e) => setSearchTeacherQuery(e.target.value)}
              placeholder="Search teachers by name or subject..."
              className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Teachers list inside Modal */}
          <div className="max-h-60 overflow-y-auto mt-4 space-y-1 scrollbar-none pr-1">
            {loadingTeachers ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                Loading teachers...
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                No teachers found.
              </div>
            ) : (
              filteredTeachers.map((teacher, index) => (
                <button
                  key={`${teacher.teacherUserId}-${index}`}
                  onClick={() => handleSelectTeacher(teacher)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:bg-white/[0.03] text-left transition-colors"
                >
                  <Avatar size="default" className="border border-white/[0.06] size-9">
                    {teacher.teacherAvatar ? <AvatarImage src={teacher.teacherAvatar} alt={teacher.teacherName} /> : null}
                    <AvatarFallback className="bg-gray-800 text-gray-200 text-xs font-semibold">
                      {getInitials(teacher.teacherName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate">{teacher.teacherName}</h5>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500 mt-0.5 truncate leading-none">
                      <span className="text-blue-400 font-semibold">{teacher.subjectName}</span>
                      <span>•</span>
                      <span>{teacher.className}</span>
                      <span>•</span>
                      <span>Child: {teacher.studentName}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
