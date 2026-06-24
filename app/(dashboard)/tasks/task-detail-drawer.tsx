"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  MessageSquare,
  History,
  Calendar,
  User,
  Loader2,
  Send,
} from "lucide-react";
import { addTaskComment, updateTask, updateTaskPriority, updateTaskStatus } from "@/app/actions/tasks";
import { formatError } from "@/lib/format-error";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const statusTone: Record<string, "slate" | "blue" | "amber" | "green" | "red"> = {
  todo: "slate",
  in_progress: "blue",
  review: "amber",
  done: "green",
  blocked: "red",
};

const priorityTone: Record<string, "slate" | "blue" | "amber" | "red"> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  urgent: "red",
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeEmployeeId: string | null;
  employeeName: string | null;
  clientId: string | null;
  clientName: string | null;
  createdAt: string;
};

type TaskComment = {
  id: string;
  body: string;
  userName: string | null;
  createdAt: string;
};

type TaskAuditLog = {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: string;
};

export function TaskDetailDrawer({
  task,
  comments,
  auditLogs,
  employees,
}: {
  task: TaskDetail | null;
  comments: TaskComment[];
  auditLogs: TaskAuditLog[];
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(task?.title || "");
  const [descValue, setDescValue] = useState(task?.description || "");
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");

  const isOpen = !!task;

  function closeDrawer() {
    const params = new URLSearchParams(searchParams);
    params.delete("taskId");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription && descRef.current) descRef.current.focus();
  }, [editingDescription]);

  useEffect(() => {
    setTitleValue(task?.title || "");
    setDescValue(task?.description || "");
  }, [task?.title, task?.description]);

  async function handleSaveTitle() {
    if (!task || titleValue === task.title) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("title", titleValue);
    formData.set("priority", task.priority);
    formData.set("assigneeEmployeeId", task.assigneeEmployeeId || "");
    formData.set("clientId", task.clientId || "");
    formData.set("dueDate", task.dueDate || "");
    formData.set("description", task.description || "");
    try {
      await updateTask(formData);
      toast.success("Title updated.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
      setTitleValue(task.title);
    } finally {
      setSaving(false);
      setEditingTitle(false);
    }
  }

  async function handleSaveDescription() {
    if (!task || descValue === (task.description || "")) {
      setEditingDescription(false);
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("title", task.title);
    formData.set("priority", task.priority);
    formData.set("assigneeEmployeeId", task.assigneeEmployeeId || "");
    formData.set("clientId", task.clientId || "");
    formData.set("dueDate", task.dueDate || "");
    formData.set("description", descValue);
    try {
      await updateTask(formData);
      toast.success("Description updated.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
      setDescValue(task.description || "");
    } finally {
      setSaving(false);
      setEditingDescription(false);
    }
  }

  async function handleStatusChange(value: string | null) {
    if (!task || !value) return;
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("status", value);
    try {
      await updateTaskStatus(formData);
      toast.success("Status updated.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    }
  }

  async function handlePriorityChange(value: string | null) {
    if (!task || !value) return;
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("priority", value);
    try {
      await updateTaskPriority(formData);
      toast.success("Priority updated.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    }
  }

  async function handleAddComment() {
    if (!task || !commentText.trim()) return;
    setCommentSaving(true);
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("body", commentText.trim());
    try {
      await addTaskComment(formData);
      setCommentText("");
      toast.success("Comment added.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    } finally {
      setCommentSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={closeDrawer}
      />
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl border-l border-border animate-slide-in-from-right"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Task Details</h3>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">
            {/* Title */}
            <div>
              {editingTitle ? (
                <div className="flex gap-2">
                  <input
                    ref={titleRef}
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") {
                        setTitleValue(task.title);
                        setEditingTitle(false);
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-base font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              ) : (
                <h2
                  className="cursor-pointer text-base font-semibold text-foreground transition hover:text-primary"
                  onClick={() => setEditingTitle(true)}
                  title="Click to edit"
                >
                  {task.title}
                </h2>
              )}
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap gap-4 text-xs">
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger size="sm" className="gap-1 border-0 bg-transparent p-0 text-xs font-medium text-muted-foreground ring-0 focus-visible:ring-0">
                  <SelectValue>
                    {(value) => <Badge tone={priorityTone[value as string]}>{priorityLabels[value as string]}</Badge>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger size="sm" className="gap-1 border-0 bg-transparent p-0 text-xs font-medium text-muted-foreground ring-0 focus-visible:ring-0">
                  <SelectValue>
                    {(value) => <Badge tone={statusTone[value as string]}>{statusLabels[value as string]}</Badge>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {task.dueDate ? (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{task.dueDate}</span>
                </div>
              ) : null}

              {task.employeeName ? (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{task.employeeName}</span>
                </div>
              ) : null}
            </div>

            {/* Description */}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              {editingDescription ? (
                <textarea
                  ref={descRef}
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  onBlur={handleSaveDescription}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDescValue(task.description || "");
                      setEditingDescription(false);
                    }
                  }}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              ) : (
                <p
                  className="mt-1 cursor-pointer text-sm text-muted-foreground transition hover:text-foreground"
                  onClick={() => setEditingDescription(true)}
                  title="Click to edit"
                >
                  {task.description || (
                    <span className="italic text-muted-foreground/50">Add a description...</span>
                  )}
                </p>
              )}
            </div>

            {/* Tabs: Comments / Activity */}
            <div className="border-t border-border pt-4">
              <div className="flex gap-4 border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-xs font-medium transition ${
                    activeTab === "comments"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comments ({comments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-xs font-medium transition ${
                    activeTab === "activity"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  Activity
                </button>
              </div>

              <div className="mt-4 max-h-80 overflow-y-auto">
                {activeTab === "comments" ? (
                  <div className="space-y-4">
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">
                              {comment.userName || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{comment.body}</p>
                        </div>
                      ))
                    )}

                    <div className="flex gap-2">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="Add a comment..."
                        className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={commentSaving || !commentText.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
                      >
                        {commentSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity yet.</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs">
                          <div className="h-1.5 w-1.5 mt-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                          <div>
                            <span className="text-foreground">{log.actorName || "System"}</span>{" "}
                            <span className="text-muted-foreground">
                              {log.action.replace(/^task\./, "")}
                            </span>
                            <span className="ml-2 text-muted-foreground/50">
                              {new Date(log.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
