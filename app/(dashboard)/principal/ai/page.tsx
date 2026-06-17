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
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Calendar,
  Megaphone,
  UserCheck,
  Compass,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface AIActionLog {
  id: string;
  command: string;
  status: string;
  createdAt: string;
  canUndo: boolean;
}

interface ChatThread {
  id: string;
  title: string;
  messages: any[];
  updatedAt: number;
}

export default function PrincipalAIPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId || 'school-id';
  const userId = session?.user?.id || 'principal-id';

  // 1. Chat Threads State (localStorage)
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');

  // 2. AI Actions Log State
  const [actionsLog, setActionsLog] = useState<AIActionLog[]>([]);
  const [isActionsLoading, setIsActionsLoading] = useState(false);
  const [isUndoing, setIsUndoing] = useState<string | null>(null);

  // 3. Current active confirmation state to prevent double clicks
  const [pendingConfirmations, setPendingConfirmations] = useState<Record<string, {
    status: 'pending' | 'executing' | 'success' | 'cancelled';
    actionId?: string;
  }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 4. Initialize Vercel AI SDK useChat
  const {
    messages,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: '/api/ai/principal/chat',
    body: { schoolId },
    onResponse(response: Response) {
      if (!response.ok) {
        toast.error('Failed to connect to Afia AI server.');
      }
    },
    onFinish(message: any) {
      // Save updated messages thread to history
      saveCurrentThread(messages.concat(message));
    },
    onError(err: any) {
      console.error(err);
      toast.error('An error occurred during AI chat stream generation.');
    },
  });

  // 5. Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 6. Load History & Actions Log on mount
  useEffect(() => {
    loadThreadsFromStorage();
    fetchRecentActions();
  }, [schoolId]);

  const loadThreadsFromStorage = () => {
    try {
      const stored = localStorage.getItem(`edumind_threads_${schoolId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatThread[];
        setThreads(parsed);
        if (parsed.length > 0) {
          // Load most recent thread
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

  const fetchRecentActions = async () => {
    setIsActionsLoading(true);
    try {
      const res = await fetch(`/api/ai/principal/actions?schoolId=${schoolId}`);
      const data = await res.json();
      if (data.success) {
        setActionsLog(data.actions);
      }
    } catch (err) {
      console.error('Failed to load actions logs:', err);
    } finally {
      setIsActionsLoading(false);
    }
  };

  const saveCurrentThread = (updatedMessages: any[]) => {
    if (!schoolId) return;
    const threadId = currentThreadId || `thread_${Date.now()}`;
    if (!currentThreadId) {
      setCurrentThreadId(threadId);
    }

    const firstUserMsg = updatedMessages.find((m) => m.role === 'user')?.content || 'New Conversation';
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

    // Cap history threads at 5
    const cappedThreads = updatedThreads.slice(0, 5);
    setThreads(cappedThreads);
    localStorage.setItem(`edumind_threads_${schoolId}`, JSON.stringify(cappedThreads));
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

  // 7. DB Write Actions Execution handler (Confirmation screen confirm trigger)
  const handleExecuteAction = async (actionType: string, parameters: any, toolCallId: string) => {
    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { status: 'executing' },
    }));

    try {
      const res = await fetch('/api/ai/principal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          parameters,
          schoolId,
          userId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Action successfully executed: ${data.message || ''}`);
        setPendingConfirmations((prev) => ({
          ...prev,
          [toolCallId]: { status: 'success', actionId: data.actionId },
        }));
        
        // Append confirmation text to the chat so AI reads the completion state
        const confirmMsg = {
          id: `sys_${Date.now()}`,
          role: 'system' as const,
          content: `[System Notification] The Principal has CONFIRMED and EXECUTED the action: ${actionType}. Summary result: ${data.message}. Reference Action ID: ${data.actionId}.`,
        };
        
        const newMessages = [...messages, confirmMsg as any];
        setMessages(newMessages);
        saveCurrentThread(newMessages);
        fetchRecentActions();
      } else {
        throw new Error(data.error || 'Server rejected request');
      }
    } catch (err) {
      toast.error(`Execution failed: ${(err as Error).message}`);
      setPendingConfirmations((prev) => ({
        ...prev,
        [toolCallId]: { status: 'pending' },
      }));
    }
  };

  const handleCancelAction = (toolCallId: string) => {
    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { status: 'cancelled' },
    }));
    toast.info('Action cancelled.');
  };

  // 8. Undo database action handler
  const handleUndoAction = async (actionId: string) => {
    const isConfirm = window.confirm('Are you sure you want to revert this action? This will delete the generated records from the school records database.');
    if (!isConfirm) return;

    setIsUndoing(actionId);
    try {
      const res = await fetch('/api/ai/principal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'UNDO',
          actionId,
          schoolId,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Action successfully reverted.');
        fetchRecentActions();
      } else {
        throw new Error(data.error || 'Server failed to revert action');
      }
    } catch (err) {
      toast.error(`Revert failed: ${(err as Error).message}`);
    } finally {
      setIsUndoing(null);
    }
  };

  // 9. Quick commands handler
  const handleQuickCommandClick = (text: string) => {
    setInput(text);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Trigger submission
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* ─── SIDEBAR (Left) ─── */}
      <div className="w-80 bg-slate-900/40 backdrop-blur-xl border-r border-slate-900 flex flex-col z-10">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md">
              EM
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">EduMind AI</h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Principal Portal</span>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-200 transition-colors tooltip"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation History */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
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
                    className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center gap-2 border transition-all ${
                      t.id === currentThreadId
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-300 font-semibold'
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

          {/* Quick Commands */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Commands</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { label: '📊 School Overview', text: 'Give me a school overview report.' },
                { label: '🚨 At-Risk Students', text: 'Find all at-risk students.' },
                { label: '💰 Fee Summary', text: 'Show me the tuition fee collection report.' },
                { label: '📅 Today\'s Attendance', text: 'What is today\'s student attendance percentage?' },
                { label: '📢 Send Announcement', text: 'Broadcast an announcement.' },
                { label: '📋 Generate Report Cards', text: 'Generate report cards for the Grade 5 class.' },
                { label: '🏫 Setup School', text: 'Help me set up classes and sections for Grade 5 and 6.' },
                { label: '📈 Performance Analysis', text: 'Provide a performance analysis report.' },
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickCommandClick(cmd.text)}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/50 hover:border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all flex items-center justify-between group"
                >
                  <span>{cmd.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Action Logs (Sidebar Footer) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/20 max-h-56 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Actions</h3>
            <button
              onClick={fetchRecentActions}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Refresh
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {isActionsLoading ? (
              <div className="flex items-center justify-center py-4 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Loading actions...
              </div>
            ) : actionsLog.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-1">No logged actions.</p>
            ) : (
              actionsLog.map((act) => (
                <div
                  key={act.id}
                  className="p-2 rounded bg-slate-950/60 border border-slate-900 flex items-start justify-between gap-1.5 text-[11px]"
                >
                  <div className="flex-1">
                    <p className="text-slate-300 leading-tight font-medium">{act.command}</p>
                    <span className="text-[9px] text-slate-500">{new Date(act.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {act.canUndo && act.status !== 'UNDONE' && (
                    <button
                      onClick={() => handleUndoAction(act.id)}
                      disabled={isUndoing === act.id}
                      className="p-1 rounded text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex-shrink-0 flex items-center justify-center"
                      title="Undo Action"
                    >
                      {isUndoing === act.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {act.status === 'UNDONE' && (
                    <span className="text-[9px] font-semibold text-slate-500 px-1 py-0.5 rounded bg-slate-900 border border-slate-800">
                      Reverted
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── CHAT MAIN AREA ─── */}
      <div className="flex-1 flex flex-col bg-slate-950/20 z-10">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-900/60 bg-slate-900/10 backdrop-blur flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base flex items-center gap-1.5">
              🤖 Afia — Principal AI Assistant
            </h2>
            <p className="text-xs text-slate-400">
              I can manage your entire school. Just tell me what you need.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg border border-purple-400/20">
                <Sparkles className="w-7 h-7 text-slate-100" />
              </div>
              <h3 className="font-bold text-lg text-slate-200">Meet Afia, Your School Administrator AI</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Afia is fully integrated with your school database. She can create classes, set student tuition fees, query attendance rates, find at-risk students, generate academic report cards with AI feedback comments, and dispatch announcements.
              </p>
              <div className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-900/50">
                💡 Try clicking one of the <strong className="text-slate-400">Quick Commands</strong> in the sidebar to get started!
              </div>
            </div>
          )}

          {messages.map((message: any) => {
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';

            if (isSystem) return null; // Hide system execution logs from chat bubbles

            return (
              <div key={message.id} className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : ''}`}>
                {/* Avatar Left (AI) */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-slate-100 shadow flex-shrink-0">
                    A
                  </div>
                )}

                {/* Message Bubble */}
                <div className="max-w-[75%] space-y-2">
                  <div
                    className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-700 to-indigo-800 border-indigo-700 text-slate-100 shadow-md rounded-tr-none'
                        : 'bg-slate-900/50 backdrop-blur border-slate-800/80 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {message.content}
                  </div>

                  {/* Render Confirmation Card (from ToolInvocation) */}
                  {!isUser && message.toolInvocations?.map((toolInvocation: any) => {
                    const { toolCallId, state } = toolInvocation;
                    
                    if (state === 'result') {
                      const { result } = toolInvocation;
                      
                      if (result && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending' };

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md shadow-lg space-y-3.5 max-w-md"
                          >
                            <div className="flex items-start gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                              <Compass className="w-4 h-4" /> Action Proposal Preview
                            </div>
                            
                            <p className="text-xs text-slate-300 font-medium bg-slate-950/50 p-2.5 rounded border border-slate-800">
                              {result.explanation}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Target Count: <strong className="text-slate-200">{result.affectedCount}</strong>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Undo Available: <strong className="text-emerald-400">Yes</strong>
                              </div>
                            </div>

                            {confirmState.status === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleExecuteAction(result.actionType, result.parameters, toolCallId)}
                                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs shadow flex items-center justify-center gap-1 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Confirm Execution
                                </button>
                                <button
                                  onClick={() => handleCancelAction(toolCallId)}
                                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Cancel
                                </button>
                              </div>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Executing database transactions...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> Action confirmed and written to DB.
                              </div>
                            )}

                            {confirmState.status === 'cancelled' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-850 text-slate-500 text-xs flex items-center gap-1.5 font-semibold">
                                <XCircle className="w-4 h-4" /> Action cancelled.
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
                A
              </div>
              <div className="bg-slate-900/50 backdrop-blur border border-slate-800/80 p-4 rounded-2xl rounded-tl-none max-w-[85%] text-slate-300 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-6 bg-slate-900/10 border-t border-slate-900/60">
          <form onSubmit={handleSubmit} className="relative bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-2 flex items-end gap-2 focus-within:border-blue-500/40 transition-all shadow-md">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              rows={2}
              placeholder="Ask Afia anything or give her a task..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-200 placeholder-slate-500 resize-none px-3 py-2 leading-relaxed"
            />
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                title="Voice Input (Mic)"
                onClick={() => toast.info('Voice input is under development.')}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Clear Current Chat"
                onClick={startNewChat}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-slate-100 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed transition-all shadow shadow-blue-500/20"
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
