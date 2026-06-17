'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useChat } from 'ai/react';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Mic,
  Trash2,
  Plus,
  RotateCcw,
  CheckCircle,
  XCircle,
  Heart,
  Calendar,
  DollarSign,
  FileText,
  UserCheck,
  Compass,
  ArrowRight,
  Loader2,
  Sparkles,
  Phone,
  BookOpen,
} from 'lucide-react';

interface ChatThread {
  id: string;
  title: string;
  messages: any[];
  updatedAt: number;
}

interface ParentContext {
  parentName: string;
  childId: string;
  childName: string;
  className: string;
  attendanceRate: number;
}

export default function ParentAIPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId || 'school-id';
  const userId = session?.user?.id || 'parent-id';

  // 1. Context states
  const [context, setContext] = useState<ParentContext | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);

  // 2. Thread states
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');

  // 3. Time based greetings
  const [timeGreeting, setTimeGreeting] = useState<string>('');

  // 4. Interactive confirmations
  const [pendingConfirmations, setPendingConfirmations] = useState<Record<string, {
    status: 'pending' | 'executing' | 'success' | 'cancelled';
    actionId?: string;
    draftBody?: string;
  }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 5. Vercel AI SDK useChat
  const {
    messages,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: '/api/ai/parent/chat',
    body: { schoolId },
    onResponse(response: Response) {
      if (!response.ok) {
        toast.error('Failed to connect to Care AI server.');
      }
    },
    onFinish(message: any) {
      saveCurrentThread(messages.concat(message));
    },
    onError(err: any) {
      console.error(err);
      toast.error('An error occurred during AI chat stream generation.');
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    fetchContext();
    loadThreadsFromStorage();
    determineTimeGreeting();
  }, [schoolId]);

  const fetchContext = async () => {
    setIsContextLoading(true);
    try {
      const res = await fetch(`/api/ai/parent/chat?schoolId=${schoolId}`);
      const data = await res.json();
      if (data.success) {
        setContext(data.context);
      }
    } catch (err) {
      console.error('Failed to fetch parent child context details:', err);
    } finally {
      setIsContextLoading(false);
    }
  };

  const determineTimeGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      setTimeGreeting('Good morning! ☀️');
    } else if (hours >= 12 && hours < 17) {
      setTimeGreeting('Good afternoon! 🌤️');
    } else {
      setTimeGreeting('Good evening! 🌙');
    }
  };

  const loadThreadsFromStorage = () => {
    try {
      const stored = localStorage.getItem(`edumind_parent_threads_${schoolId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatThread[];
        setThreads(parsed);
        if (parsed.length > 0) {
          setCurrentThreadId(parsed[0].id);
          setMessages(parsed[0].messages);
        } else {
          startNewChat();
        }
      } else {
        startNewChat();
      }
    } catch (e) {
      startNewChat();
    }
  };

  const saveCurrentThread = (updatedMessages: any[]) => {
    if (!schoolId) return;
    const threadId = currentThreadId || `thread_${Date.now()}`;
    if (!currentThreadId) {
      setCurrentThreadId(threadId);
    }

    const firstUserMsg = updatedMessages.find((m) => m.role === 'user')?.content || 'New Care Chat';
    const title = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');

    const updatedThreads = [...threads];
    const index = updatedThreads.findIndex((t) => t.id === threadId);

    const threadObj: ChatThread = {
      id: threadId,
      title: index !== -1 ? updatedThreads[index].title : title,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    if (index !== -1) {
      updatedThreads[index] = threadObj;
    } else {
      updatedThreads.unshift(threadObj);
    }

    const cappedThreads = updatedThreads.slice(0, 5);
    setThreads(cappedThreads);
    localStorage.setItem(`edumind_parent_threads_${schoolId}`, JSON.stringify(cappedThreads));
  };

  const startNewChat = () => {
    setCurrentThreadId('');
    setMessages([]);
    setInput('');
  };

  const selectThread = (thread: ChatThread) => {
    setCurrentThreadId(thread.id);
    setMessages(thread.messages);
  };

  const handleExecuteAction = async (actionType: string, parameters: any, toolCallId: string) => {
    const currentState = pendingConfirmations[toolCallId] || {};
    let finalParams = { ...parameters };
    if (actionType === 'SEND_TEACHER_MESSAGE' && currentState.draftBody) {
      finalParams.messageContent = currentState.draftBody;
    }

    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { ...prev[toolCallId], status: 'executing' },
    }));

    try {
      const res = await fetch('/api/ai/parent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          parameters: finalParams,
          schoolId,
          userId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Message sent to teacher successfully!`);
        setPendingConfirmations((prev) => ({
          ...prev,
          [toolCallId]: { ...prev[toolCallId], status: 'success', actionId: data.actionId },
        }));

        const confirmMsg = {
          id: `sys_${Date.now()}`,
          role: 'system' as const,
          content: `[System Notification] The Parent has CONFIRMED and SENT the message. Summary: Message delivered to teacher. Reference Action ID: ${data.actionId}.`,
        };

        const newMessages = [...messages, confirmMsg as any];
        setMessages(newMessages);
        saveCurrentThread(newMessages);
      } else {
        throw new Error(data.error || 'Server rejected request');
      }
    } catch (err) {
      toast.error(`Send failed: ${(err as Error).message}`);
      setPendingConfirmations((prev) => ({
        ...prev,
        [toolCallId]: { ...prev[toolCallId], status: 'pending' },
      }));
    }
  };

  const handleCancelAction = (toolCallId: string) => {
    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { ...prev[toolCallId], status: 'cancelled' },
    }));
    toast.info('Message cancelled.');
  };

  const handleQuickCommandClick = (text: string) => {
    setInput(text);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const childName = context?.childName || 'your child';
  const attendanceRate = context?.attendanceRate !== undefined ? context.attendanceRate : 100;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      {/* ─── SIDEBAR (Left) ─── */}
      <div className="w-80 bg-slate-900/40 backdrop-blur-xl border-r border-slate-900 flex flex-col z-10 rounded-r-3xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-md text-slate-100">
              CA
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">EduMind AI</h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Parent Portal</span>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-200 transition-colors"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Child Metrics Card */}
          {context && (
            <div className="bg-gradient-to-br from-purple-950/40 to-indigo-950/40 p-4 rounded-3xl border border-purple-500/20 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-purple-900/40 border border-purple-500/20 flex items-center justify-center mx-auto shadow-md">
                <Heart className="w-5 h-5 text-purple-400 fill-purple-400/20 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-200 leading-tight">{context.childName}</h4>
                <p className="text-[10px] text-slate-400 font-medium">{context.className}</p>
              </div>
              <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-900 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Monthly Attendance</span>
                <span className={`font-bold ${attendanceRate >= 85 ? 'text-emerald-400' : attendanceRate >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                  {attendanceRate}%
                </span>
              </div>
            </div>
          )}

          {/* Threads History */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">History</h3>
            {threads.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2">No past conversations</p>
            ) : (
              <div className="space-y-1">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectThread(t)}
                    className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center gap-2 border transition-all ${
                      t.id === currentThreadId
                        ? 'bg-purple-600/10 border-purple-500/30 text-purple-300 font-semibold'
                        : 'border-transparent hover:bg-slate-800/40 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Questions</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { label: `📊 How is ${childName} doing?`, text: `How is ${childName} doing in school?` },
                { label: '📅 Attendance this month', text: `Show me the monthly attendance breakdown for ${childName}.` },
                { label: '📝 Pending homework', text: `Does ${childName} have any pending homework assignments?` },
                { label: '💰 Fee status', text: `When is the tuition fee due this month and what is the status?` },
                { label: '📆 Upcoming exams', text: `Are there any upcoming exams scheduled for ${childName}?` },
                { label: '💬 Message teacher', text: `Write a friendly check-in message to ${childName}'s teacher.` },
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickCommandClick(cmd.text)}
                  className="w-full text-left px-3 py-2 rounded-2xl text-[11px] bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/50 hover:border-purple-900/50 text-slate-300 hover:text-slate-100 transition-all flex items-center justify-between group"
                >
                  <span>{cmd.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Caveats limitation info box */}
        <div className="p-4 border-t border-slate-900 bg-purple-950/10 text-[10px] text-slate-500 space-y-1 rounded-br-3xl">
          <p className="flex items-start gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
            <span>Care can only show stats for {childName}.</span>
          </p>
          <p className="flex items-start gap-1">
            <Phone className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Urgent concerns? Call: 042-35761234.</span>
          </p>
        </div>
      </div>

      {/* ─── CHAT MAIN AREA ─── */}
      <div className="flex-1 flex flex-col bg-slate-950/20 z-10">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-900/60 bg-slate-900/10 backdrop-blur flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base flex items-center gap-1.5 text-purple-200">
              🤖 Care — Your Child's AI Guardian
            </h2>
            <p className="text-xs text-slate-400">
              Caring updates in simple language. Focused strictly on {childName}'s development.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Guardian AI
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg border border-purple-400/20">
                <Heart className="w-7 h-7 text-slate-100 fill-slate-100/10" />
              </div>
              <h3 className="font-bold text-lg text-slate-200">
                {timeGreeting} How was {childName}'s day?
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                I can explain fee balances, list upcoming homework timelines, translate school notices, or draft messages to teachers.
              </p>
              <div className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded-2xl border border-slate-900/50">
                ⚠️ <strong className="text-slate-400 font-semibold font-medium">Care Reminder:</strong> School data reports are advisory. For formal decisions, please speak directly with the class teacher.
              </div>
            </div>
          )}

          {messages.map((message: any) => {
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';

            if (isSystem) return null;

            return (
              <div key={message.id} className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : ''}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-slate-100 shadow flex-shrink-0">
                    C
                  </div>
                )}

                <div className="max-w-[75%] space-y-2 flex flex-col">
                  {/* Text bubble */}
                  <div
                    className={`p-4 rounded-3xl border text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-purple-700 to-indigo-800 border-purple-700 text-slate-100 shadow-md rounded-tr-none self-end'
                        : 'bg-slate-900/50 backdrop-blur border-slate-800/80 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {message.content}
                  </div>

                  {/* Message confirmation draft card */}
                  {!isUser && message.toolInvocations?.map((toolInvocation: any) => {
                    const { toolCallId, state } = toolInvocation;

                    if (state === 'result') {
                      const { result } = toolInvocation;
                      if (!result) return null;

                      if (result.actionType === 'SEND_TEACHER_MESSAGE' && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending', draftBody: result.messageContent };

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 backdrop-blur shadow-xl space-y-4 max-w-xl self-start"
                          >
                            <h4 className="font-bold text-purple-400 flex items-center gap-1.5 text-xs uppercase tracking-wide border-b border-slate-800 pb-2">
                              <MailIcon className="w-4 h-4" /> Teacher Message Draft Proposal
                            </h4>

                            <div className="space-y-1.5 text-xs">
                              <label className="text-slate-400">Recipient: <strong className="text-slate-200">{result.teacherName}</strong> (Class Teacher)</label>
                              <textarea
                                value={confirmState.draftBody}
                                onChange={(e) => setPendingConfirmations((prev) => ({
                                  ...prev,
                                  [toolCallId]: { ...prev[toolCallId], draftBody: e.target.value },
                                }))}
                                rows={4}
                                className="w-full bg-slate-950 border border-slate-900 p-3 rounded-2xl text-xs text-slate-200 leading-relaxed outline-none focus:border-purple-600/40 resize-none"
                              />
                            </div>

                            {confirmState.status === 'pending' && (
                              <button
                                onClick={() => handleExecuteAction('SEND_TEACHER_MESSAGE', result.parameters, toolCallId)}
                                className="w-full py-2 px-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" /> Send to Teacher
                              </button>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-2xl bg-slate-850 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Sending message...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> Message successfully sent to teacher.
                              </div>
                            )}
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-slate-100 shadow flex-shrink-0">
                C
              </div>
              <div className="bg-slate-900/50 backdrop-blur border border-slate-800/80 p-4 rounded-3xl rounded-tl-none max-w-[85%] text-slate-300 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-slate-900/10 border-t border-slate-900/60">
          <form onSubmit={handleSubmit} className="relative bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800 p-2 flex items-end gap-2 focus-within:border-purple-500/40 transition-all shadow-md">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              rows={2}
              placeholder={`Ask Care anything about ${childName} or school routines...`}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-200 placeholder-slate-500 resize-none px-3 py-2 leading-relaxed"
            />
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                className="p-2 rounded-2xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                title="Voice Input (Mic)"
                onClick={() => toast.info('Voice features are simulated.')}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Clear Current Chat"
                onClick={startNewChat}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-slate-100 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed transition-all shadow shadow-purple-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Icon wrapper to prevent compile resolution conflicts
function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
