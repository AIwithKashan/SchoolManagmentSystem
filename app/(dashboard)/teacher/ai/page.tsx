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
  FileText,
  User,
  Users,
  Compass,
  ArrowRight,
  Loader2,
  Sparkles,
  Award,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Mail,
  Download,
} from 'lucide-react';

interface ChatThread {
  id: string;
  title: string;
  messages: any[];
  updatedAt: number;
}

export default function TeacherAIPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId || 'school-id';
  const userId = session?.user?.id || 'teacher-id';

  // 1. Thread state (localStorage)
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');

  // 2. Interactive state for confirmations
  const [pendingConfirmations, setPendingConfirmations] = useState<Record<string, {
    status: 'pending' | 'executing' | 'success' | 'cancelled';
    actionId?: string;
    overrideGrades?: any[];
    draftBody?: string;
  }>>({});

  // 3. Tab views inside worksheets and analytics
  const [worksheetTabs, setWorksheetTabs] = useState<Record<string, 'questions' | 'answers'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 4. Set up Vercel AI SDK useChat
  const {
    messages,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: '/api/ai/teacher/chat',
    body: { schoolId },
    onResponse(response: Response) {
      if (!response.ok) {
        toast.error('Failed to connect to Nova AI server.');
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
    loadThreadsFromStorage();
  }, [schoolId]);

  const loadThreadsFromStorage = () => {
    try {
      const stored = localStorage.getItem(`edumind_teacher_threads_${schoolId}`);
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

    const firstUserMsg = updatedMessages.find((m) => m.role === 'user')?.content || 'New Assessment';
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
    localStorage.setItem(`edumind_teacher_threads_${schoolId}`, JSON.stringify(cappedThreads));
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

  // 5. Database commits handler
  const handleExecuteAction = async (actionType: string, parameters: any, toolCallId: string) => {
    const currentState = pendingConfirmations[toolCallId] || {};
    
    // Override params for customized fields (like modified drafts or marks)
    let finalParams = { ...parameters };
    if (actionType === 'COMMIT_GRADING' && currentState.overrideGrades) {
      finalParams.grades = currentState.overrideGrades;
    }
    if (actionType === 'SEND_PARENT_MESSAGE' && currentState.draftBody) {
      finalParams.messageContent = currentState.draftBody;
    }

    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { ...prev[toolCallId], status: 'executing' },
    }));

    try {
      const res = await fetch('/api/ai/teacher/execute', {
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
        toast.success(`Action successfully executed: ${data.message || ''}`);
        setPendingConfirmations((prev) => ({
          ...prev,
          [toolCallId]: { ...prev[toolCallId], status: 'success', actionId: data.actionId },
        }));

        const confirmMsg = {
          id: `sys_${Date.now()}`,
          role: 'system' as const,
          content: `[System Notification] The Teacher has CONFIRMED and EXECUTED the action: ${actionType}. Summary: ${data.message}. Reference Action ID: ${data.actionId}.`,
        };

        const newMessages = [...messages, confirmMsg as any];
        setMessages(newMessages);
        saveCurrentThread(newMessages);
      } else {
        throw new Error(data.error || 'Server rejected transaction');
      }
    } catch (err) {
      toast.error(`Execution failed: ${(err as Error).message}`);
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
    toast.info('Action cancelled.');
  };

  const handleQuickCommandClick = (text: string) => {
    setInput(text);
  };

  // Grade adjustment functions
  const handleScoreChange = (toolCallId: string, submissionId: string, val: number, list: any[]) => {
    const current = pendingConfirmations[toolCallId]?.overrideGrades || list;
    const updated = current.map((item) => (item.submissionId === submissionId ? { ...item, score: val } : item));
    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { ...prev[toolCallId], overrideGrades: updated },
    }));
  };

  const handleFeedbackChange = (toolCallId: string, submissionId: string, text: string, list: any[]) => {
    const current = pendingConfirmations[toolCallId]?.overrideGrades || list;
    const updated = current.map((item) => (item.submissionId === submissionId ? { ...item, feedback: text } : item));
    setPendingConfirmations((prev) => ({
      ...prev,
      [toolCallId]: { ...prev[toolCallId], overrideGrades: updated },
    }));
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-900/10 blur-[120px] pointer-events-none" />

      {/* ─── SIDEBAR (Left) ─── */}
      <div className="w-80 bg-slate-900/40 backdrop-blur-xl border-r border-slate-900 flex flex-col z-10">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-sm shadow-md text-slate-100">
              NO
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">EduMind AI</h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Teacher Portal</span>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-200 transition-colors"
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
                        ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300 font-semibold'
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
                { label: '📖 Create Lesson Plan', text: 'Create a lesson plan for Grade 5 on Fractions.' },
                { label: '📝 Grade Submissions', text: 'Grade all submissions for assignment ID assign-math5.' },
                { label: '📊 Class Performance', text: 'Analyze our Science grades and performance statistics.' },
                { label: '📋 Generate Worksheet', text: 'Create a Math worksheet on fractions for Grade 5, medium difficulty, 5 questions.' },
                { label: '❓ Create Quiz', text: 'Make 5 quiz questions on algebra topic basics.' },
                { label: '💬 Message Parent', text: 'Write a message to student-ali\'s parents about his low attendance.' },
                { label: '📅 Mark Attendance', text: 'Mark everyone present in Grade 5 except Ali and Sara who are absent.' },
                { label: '📈 Student Progress', text: 'Show me the weak performing students.' },
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickCommandClick(cmd.text)}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/50 hover:border-emerald-900/50 text-slate-300 hover:text-slate-100 transition-all flex items-center justify-between group"
                >
                  <span>{cmd.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── CHAT MAIN AREA ─── */}
      <div className="flex-1 flex flex-col bg-slate-950/20 z-10">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-900/60 bg-slate-900/10 backdrop-blur flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base flex items-center gap-1.5">
              🤖 Nova — Your Teaching Assistant
            </h2>
            <p className="text-xs text-slate-400">
              I can help with grading, planning lessons, worksheets, parent emails, quizzes, and attendance.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg border border-emerald-400/20">
                <Sparkles className="w-7 h-7 text-slate-100" />
              </div>
              <h3 className="font-bold text-lg text-slate-200">Meet Nova, Your Classroom AI</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Nova makes lesson creation, assignment evaluation, parent messages, quiz structures, and class reports fast and elegant.
              </p>
              <div className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-900/50">
                💡 Select one of the <strong className="text-slate-400 font-semibold">Quick Commands</strong> on the left to start!
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-sm text-slate-100 shadow flex-shrink-0">
                    N
                  </div>
                )}

                <div className="max-w-[80%] space-y-2 flex flex-col">
                  {/* Text bubble */}
                  <div
                    className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-emerald-700 to-teal-800 border-emerald-700 text-slate-100 shadow-md rounded-tr-none self-end'
                        : 'bg-slate-900/50 backdrop-blur border-slate-800/80 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {message.content}
                  </div>

                  {/* Render Confirmation and Output Cards */}
                  {!isUser && message.toolInvocations?.map((toolInvocation: any) => {
                    const { toolCallId, state } = toolInvocation;

                    if (state === 'result') {
                      const { result } = toolInvocation;
                      if (!result) return null;

                      // 1. LESSON PLAN CARD (requires confirmation)
                      if (result.actionType === 'SAVE_LESSON_PLAN' && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending' };
                        const plan = result.plan;

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide">
                                <FileText className="w-4 h-4" /> Lesson Plan Proposal
                              </h4>
                              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-medium">
                                {result.parameters.grade} • {result.parameters.duration} min
                              </span>
                            </div>

                            <div className="space-y-3 text-xs">
                              <div>
                                <h5 className="font-semibold text-slate-300">🎯 Learning Objectives:</h5>
                                <ul className="list-disc pl-4 space-y-0.5 mt-1 text-slate-400">
                                  {plan?.objectives?.map((obj: string, i: number) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h5 className="font-semibold text-slate-300">⏱️ Lesson Breakdown:</h5>
                                <div className="space-y-1.5 mt-1">
                                  {plan?.breakdown?.map((b: any, i: number) => (
                                    <div key={i} className="bg-slate-950/40 p-2 rounded border border-slate-900 flex justify-between gap-4">
                                      <span className="text-slate-300 font-medium">{b.title}</span>
                                      <span className="text-emerald-400 font-bold">{b.duration}m</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h5 className="font-semibold text-slate-300">📦 Required Resources:</h5>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {plan?.resources?.map((res: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-900 text-[10px]">
                                      {res}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {confirmState.status === 'pending' && (
                              <div className="flex gap-2 pt-2 border-t border-slate-800">
                                <button
                                  onClick={() => handleExecuteAction('SAVE_LESSON_PLAN', result.parameters, toolCallId)}
                                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs shadow flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Save to My Lessons
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toast.info('Exporting Lesson Plan PDF (mock)...')}
                                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </button>
                                <button
                                  onClick={() => handleCancelAction(toolCallId)}
                                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-855 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Storing Lesson Plan details...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> Lesson Plan saved in school database.
                              </div>
                            )}

                            {confirmState.status === 'cancelled' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-850 text-slate-500 text-xs flex items-center gap-1.5 font-semibold">
                                <XCircle className="w-4 h-4" /> Save action cancelled.
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 2. GRADING CARD (requires confirmation)
                      if (result.actionType === 'COMMIT_GRADING' && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending' };
                        const list = confirmState.overrideGrades || result.gradedItems || [];

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-xl"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide">
                                <Award className="w-4 h-4" /> AI Grading Review
                              </h4>
                              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                Pending Submissions: {list.length}
                              </span>
                            </div>

                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                              {list.map((item: any, idx: number) => (
                                <div key={item.submissionId} className="bg-slate-950/50 p-3 rounded-xl border border-slate-900 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-200">{item.studentName}</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={item.score}
                                        max={result.totalMarks}
                                        onChange={(e) => handleScoreChange(toolCallId, item.submissionId, Number(e.target.value), list)}
                                        className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-emerald-400 font-semibold"
                                      />
                                      <span className="text-slate-500">/ {result.totalMarks}</span>
                                    </div>
                                  </div>
                                  <textarea
                                    value={item.feedback}
                                    onChange={(e) => handleFeedbackChange(toolCallId, item.submissionId, e.target.value, list)}
                                    rows={2}
                                    className="w-full bg-slate-900/80 border border-slate-850 p-2 rounded text-[11px] text-slate-300 resize-none outline-none focus:border-emerald-600/40"
                                  />
                                </div>
                              ))}
                            </div>

                            {confirmState.status === 'pending' && (
                              <div className="flex gap-2 pt-2 border-t border-slate-800">
                                <button
                                  onClick={() => handleExecuteAction('COMMIT_GRADING', result.parameters, toolCallId)}
                                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs shadow flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve & Publish Grades
                                </button>
                                <button
                                  onClick={() => handleCancelAction(toolCallId)}
                                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold text-xs border border-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-850 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Committing scores and alerting parents...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> All grades published successfully. Parents notified.
                              </div>
                            )}

                            {confirmState.status === 'cancelled' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-850 text-slate-500 text-xs flex items-center gap-1.5 font-semibold">
                                <XCircle className="w-4 h-4" /> Grading publish cancelled.
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 3. WORKSHEET CARD (no confirmation, immediately displayed)
                      if (result.worksheet) {
                        const sheet = result.worksheet;
                        const activeTab = worksheetTabs[toolCallId] || 'questions';

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide">
                                <FileText className="w-4 h-4" /> Student Worksheet Generator
                              </h4>
                              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-900">
                                <button
                                  onClick={() => setWorksheetTabs((prev) => ({ ...prev, [toolCallId]: 'questions' }))}
                                  className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${
                                    activeTab === 'questions' ? 'bg-emerald-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Worksheet Questions
                                </button>
                                <button
                                  onClick={() => setWorksheetTabs((prev) => ({ ...prev, [toolCallId]: 'answers' }))}
                                  className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${
                                    activeTab === 'answers' ? 'bg-emerald-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Answer Key
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-900 max-h-72 overflow-y-auto">
                              <div className="border-b border-slate-900 pb-2 mb-2">
                                <h5 className="font-bold text-slate-200 text-sm">{sheet.title}</h5>
                                <p className="text-[11px] text-slate-400 mt-1 italic">{sheet.instructions}</p>
                              </div>

                              {activeTab === 'questions' ? (
                                <div className="space-y-3">
                                  {sheet.questions?.map((q: any) => (
                                    <div key={q.id} className="space-y-1">
                                      <p className="text-slate-200 font-semibold">{q.id}. {q.question}</p>
                                      {q.options && (
                                        <div className="grid grid-cols-2 gap-1.5 pl-3">
                                          {q.options.map((opt: string, i: number) => (
                                            <span key={i} className="text-slate-400 text-[11px]">{opt}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {sheet.answers?.map((ans: any) => (
                                    <div key={ans.questionId} className="space-y-0.5">
                                      <p className="text-slate-300 font-semibold">Question {ans.questionId} Resolution:</p>
                                      <p className="text-emerald-400 pl-2 leading-relaxed">{ans.answer}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toast.info('Downloading worksheet package PDF (mock)...')}
                              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" /> Export Worksheet & Key as PDF
                            </button>
                          </div>
                        );
                      }

                      // 4. CLASS ANALYTICS CARD (no confirmation, immediate stats)
                      if (result.averageScore !== undefined && result.attendanceRate !== undefined) {
                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-2xl"
                          >
                            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide border-b border-slate-800 pb-2">
                              <TrendingUp className="w-4 h-4" /> Class Performance Insights
                            </h4>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-center">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Class Average</span>
                                <strong className="text-emerald-400 font-extrabold text-2xl">{result.averageScore}%</strong>
                              </div>
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-center">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Attendance Rate</span>
                                <strong className="text-teal-400 font-extrabold text-2xl">{result.attendanceRate}%</strong>
                              </div>
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-center">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Subject Taught</span>
                                <strong className="text-slate-200 font-extrabold text-sm truncate block mt-1">{result.subjectName}</strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <h5 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">🏆 Top 3 Students</h5>
                                <div className="space-y-1">
                                  {result.top3?.map((st: any, i: number) => (
                                    <div key={i} className="flex justify-between bg-slate-950/30 p-1.5 rounded border border-slate-900">
                                      <span className="text-slate-300 truncate">{st.name}</span>
                                      <span className="text-emerald-400 font-bold">{st.score}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h5 className="font-semibold text-red-400 mb-1 flex items-center gap-1">⚠️ Need Attention</h5>
                                <div className="space-y-1">
                                  {result.bottom3?.map((st: any, i: number) => (
                                    <div key={i} className="flex justify-between bg-slate-950/30 p-1.5 rounded border border-slate-900">
                                      <span className="text-slate-300 truncate">{st.name}</span>
                                      <span className="text-red-400 font-bold">{st.score}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900">
                              <div>
                                <strong className="text-slate-300">💡 Suggested Focus Approach:</strong>
                                <p className="text-slate-400 mt-0.5 leading-relaxed">{result.suggestedApproach}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 5. QUIZ CARD (requires confirmation)
                      if (result.actionType === 'CREATE_QUIZ' && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending' };

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-2xl"
                          >
                            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide border-b border-slate-800 pb-2">
                              <GraduationCap className="w-4 h-4" /> Proposed MCQ Quiz Preview
                            </h4>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-xs">
                              {result.questions?.map((q: any, idx: number) => (
                                <div key={idx} className="bg-slate-950/50 p-3 rounded-xl border border-slate-900 space-y-1">
                                  <p className="font-bold text-slate-200">{idx + 1}. {q.question}</p>
                                  <div className="grid grid-cols-2 gap-1.5 pl-3 mt-1.5 text-slate-400">
                                    {q.options?.map((opt: string, i: number) => (
                                      <span key={i} className={opt.startsWith(q.answer) || opt.includes(q.answer) ? 'text-emerald-400 font-semibold' : ''}>
                                        {opt}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {confirmState.status === 'pending' && (
                              <button
                                onClick={() => handleExecuteAction('CREATE_QUIZ', result.parameters, toolCallId)}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Confirm & Add Quiz to Schedule
                              </button>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-850 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Committing quiz data...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> Quiz scheduled successfully.
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 6. PARENT MESSAGE CARD (requires confirmation)
                      if (result.actionType === 'SEND_PARENT_MESSAGE' && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending', draftBody: result.draftBody };

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-xl"
                          >
                            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide border-b border-slate-800 pb-2">
                              <Mail className="w-4 h-4" /> Empathetic Parent Message Draft
                            </h4>

                            <div className="space-y-1.5 text-xs">
                              <label className="text-slate-400">Recipient: Parents of <strong className="text-slate-200">{result.studentName}</strong></label>
                              <textarea
                                value={confirmState.draftBody}
                                onChange={(e) => setPendingConfirmations((prev) => ({
                                  ...prev,
                                  [toolCallId]: { ...prev[toolCallId], draftBody: e.target.value },
                                }))}
                                rows={6}
                                className="w-full bg-slate-950 border border-slate-900 p-3 rounded-xl text-xs text-slate-200 leading-relaxed outline-none focus:border-emerald-600/40 resize-none"
                              />
                            </div>

                            {confirmState.status === 'pending' && (
                              <button
                                onClick={() => handleExecuteAction('SEND_PARENT_MESSAGE', result.parameters, toolCallId)}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" /> Send Message to Parents
                              </button>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-850 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Sending communication...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> Message delivered successfully.
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 7. ATTENDANCE MARKING CARD (requires confirmation)
                      if (result.actionType === 'MARK_ATTENDANCE' && result.requiresConfirmation) {
                        const confirmState = pendingConfirmations[toolCallId] || { status: 'pending' };

                        return (
                          <div
                            key={toolCallId}
                            className="mt-3 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur shadow-xl space-y-4 max-w-md"
                          >
                            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm uppercase tracking-wide border-b border-slate-800 pb-2">
                              <Calendar className="w-4 h-4" /> Roster Attendance Preview
                            </h4>

                            <div className="flex gap-4 text-xs font-semibold text-center">
                              <div className="flex-1 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                                <span className="text-slate-500 text-[10px] block">PRESENT COUNT</span>
                                <strong className="text-emerald-400 text-xl">{result.presents}</strong>
                              </div>
                              <div className="flex-1 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                                <span className="text-slate-500 text-[10px] block">ABSENT COUNT</span>
                                <strong className="text-red-400 text-xl">{result.absents}</strong>
                              </div>
                            </div>

                            <div className="max-h-40 overflow-y-auto pr-1 text-xs space-y-1">
                              {result.records?.map((rec: any, i: number) => (
                                <div key={i} className="flex justify-between bg-slate-950/30 p-1.5 rounded border border-slate-900">
                                  <span className="text-slate-300">{rec.studentName}</span>
                                  <span className={rec.status === 'PRESENT' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                    {rec.status}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {confirmState.status === 'pending' && (
                              <button
                                onClick={() => handleExecuteAction('MARK_ATTENDANCE', result.parameters, toolCallId)}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Confirm & Mark Roster
                              </button>
                            )}

                            {confirmState.status === 'executing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-850 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Submitting daily attendance...
                              </div>
                            )}

                            {confirmState.status === 'success' && (
                              <div className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 font-semibold">
                                <CheckCircle className="w-4 h-4" /> Attendance marked successfully. Absent notifications sent.
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-sm text-slate-100 shadow flex-shrink-0">
                N
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

        {/* Chat Input Area */}
        <div className="p-6 bg-slate-900/10 border-t border-slate-900/60">
          <form onSubmit={handleSubmit} className="relative bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-2 flex items-end gap-2 focus-within:border-emerald-500/40 transition-all shadow-md">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              rows={2}
              placeholder="Ask Nova anything or give her a task..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-200 placeholder-slate-500 resize-none px-3 py-2 leading-relaxed"
            />
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                title="Voice Input (Mic)"
                onClick={() => toast.info('Voice inputs are currently simulated.')}
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
                className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-650 text-slate-100 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed transition-all shadow shadow-emerald-500/20"
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
