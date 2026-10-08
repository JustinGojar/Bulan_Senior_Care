import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessagesSquare,
  Image,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { authSubmitClass } from "@/components/AuthLayout";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, RowSkeletons, SectionHeader } from "@/components/DesignKit";
import {
  fieldClass,
  iconButtonClass,
  panelClass,
  secondaryButtonClass,
} from "@/components/design-kit";
import { IconActionButton } from "@/components/IconActionButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  API_URL,
  getMessageRecipients,
  getMessagePresence,
  getMessages,
  getSessionId,
  getStoredUser,
  deleteConversation as deleteConversationApi,
  markConversationRead,
  sendMessage,
  type Message,
  type MessageRecipient,
} from "@/lib/api";

const PRESENCE_REFRESH_INTERVAL = 30_000;

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Inbox — Bulan SeniorCare" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const [confirm, confirmDialog] = useConfirmDialog();
  const currentUser = getStoredUser();
  const currentUserId = currentUser?.id;
  const isLeader = currentUser?.role === "leader";
  const canMessage = ["admin", "leader", "head"].includes(currentUser?.role ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [recipients, setRecipients] = useState<MessageRecipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientSearching, setRecipientSearching] = useState(false);
  const [recipient, setRecipient] = useState<MessageRecipient | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Message | null>(null);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [contextConversation, setContextConversation] = useState<Message | null>(null);
  // Conversation partners signed in and active right now; drives the green dot.
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());
  const partnerIds = useMemo(
    () =>
      [
        ...new Set(
          messages.map((item) =>
            item.sender.id === currentUserId ? item.recipient.id : item.sender.id,
          ),
        ),
      ].sort((first, second) => first - second),
    [currentUserId, messages],
  );
  const partnerKey = partnerIds.join(",");

  // Keep the dots current while the inbox is open and visible.
  useEffect(() => {
    if (partnerIds.length === 0) return;
    const refresh = () => {
      if (document.hidden) return;
      getMessagePresence(partnerIds)
        .then((result) => setOnlineIds(new Set(result.online_user_ids)))
        .catch(() => undefined);
    };
    const timer = window.setInterval(refresh, PRESENCE_REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
    // partnerKey stands in for partnerIds, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerKey]);

  useEffect(() => {
    if (!currentUserId || !getSessionId()) {
      window.location.href = "/login";
      return;
    }
    setMessagesLoading(true);
    getMessages(currentPage)
      .then((result) => {
        setMessages(result.data.filter((item) => item.sender?.id && item.recipient?.id));
        setLastPage(result.last_page);
        setOnlineIds(new Set(result.online_user_ids ?? []));
      })
      .catch(() => {
        setMessages([]);
        if (!getSessionId()) window.location.href = "/login";
      })
      .finally(() => setMessagesLoading(false));
  }, [currentPage, currentUserId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecipientSearching(true);
      getMessageRecipients(recipientSearch)
        .then(setRecipients)
        .catch(() => setRecipients([]))
        .finally(() => setRecipientSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [recipientSearch]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (!recipient) return;
      const sent = await sendMessage(recipient.id, subject, message);
      setMessages((current) => [sent, ...current]);
      setSubject("");
      setMessage("");
      setRecipient(null);
      setRecipientSearch("");
      toast.success(`Message sent to ${sent.recipient.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSaving(false);
    }
  }

  async function openMessage(item: Message) {
    setSelectedConversation(item);
    const other = item.sender.id === currentUser?.id ? item.recipient : item.sender;
    const isUnreadFromOther = (messageItem: Message) =>
      messageItem.sender.id === other.id &&
      messageItem.recipient.id === currentUser?.id &&
      !messageItem.read_at;
    if (!messages.some(isUnreadFromOther)) return;
    // Show the conversation as read right away; the badge refreshes once the server confirms.
    const readAt = new Date().toISOString();
    setMessages((current) =>
      current.map((messageItem) =>
        isUnreadFromOther(messageItem) ? { ...messageItem, read_at: readAt } : messageItem,
      ),
    );
    try {
      await markConversationRead(other.id);
      window.dispatchEvent(new Event("bulan-unread-updated"));
    } catch {
      toast.error("Unable to mark conversation as read.");
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation || (!reply.trim() && !replyFile)) return;
    const other =
      selectedConversation.sender.id === currentUser?.id
        ? selectedConversation.recipient
        : selectedConversation.sender;
    setSendingReply(true);
    try {
      const sent = await sendMessage(
        other.id,
        selectedConversation.subject,
        reply.trim(),
        replyFile,
      );
      setMessages((current) => [sent, ...current]);
      setSelectedConversation(sent);
      setReply("");
      setReplyFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  async function removeConversation(item: Message) {
    const other = item.sender.id === currentUser?.id ? item.recipient : item.sender;
    try {
      await deleteConversationApi(other.id);
      setMessages((current) =>
        current.filter((messageItem) => {
          const participants = [messageItem.sender.id, messageItem.recipient.id];
          return !(participants.includes(other.id) && participants.includes(currentUser?.id ?? -1));
        }),
      );
      if (
        selectedConversation &&
        [selectedConversation.sender.id, selectedConversation.recipient.id].includes(other.id)
      ) {
        setSelectedConversation(null);
      }
      setContextConversation(null);
      toast.success("Conversation deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete conversation.");
    }
  }

  const conversations = useMemo(() => {
    const grouped = messages.reduce((itemsByRecipient, item) => {
      const other = item.sender.id === currentUserId ? item.recipient : item.sender;
      const items = itemsByRecipient.get(other.id) ?? [];
      items.push(item);
      itemsByRecipient.set(other.id, items);
      return itemsByRecipient;
    }, new Map<number, Message[]>());

    return [...grouped.values()];
  }, [currentUserId, messages]);

  const visibleMessages = useMemo(() => {
    const searchTerm = search.toLowerCase();

    return conversations
      .filter((items) => {
        const item = items[0]!;
        const other = item.sender.id === currentUserId ? item.recipient : item.sender;
        const matchesSearch = [other.name, item.subject, item.message].some((value) =>
          value.toLowerCase().includes(searchTerm),
        );
        const hasUnread = items.some(
          (messageItem) => messageItem.recipient.id === currentUserId && !messageItem.read_at,
        );

        return matchesSearch && (filter !== "Unread" || hasUnread);
      })
      .map((items) => items[0]!);
  }, [conversations, currentUserId, filter, search]);

  function avatarLabel(name: string) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <AppShell
      title="Chats"
      subtitle="Messages"
      breadcrumb={["Dashboard", "Inbox"]}
      actions={
        <div className="flex items-center gap-2">
          <IconActionButton
            label="More options"
            iconOnly
            icon={<MoreHorizontal className="h-5 w-5" />}
            className="h-10 w-10 sm:h-11 sm:w-11"
          />
          <IconActionButton
            label="New message"
            iconOnly
            variant="primary"
            icon={<PenLine className="h-4 w-4" />}
            className="h-10 w-10 sm:h-11 sm:w-11"
            onClick={() => setComposerOpen((open) => !open)}
          />
        </div>
      }
    >
      {confirmDialog}
      {composerOpen && canMessage && (
        <form onSubmit={handleSend} className={`${panelClass} mb-5 p-5 sm:p-6`}>
          <SectionHeader
            icon={PenLine}
            title="New message"
            subtitle="Search BSCA and OSCA Head accounts by name or email."
            badge={
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close new message"
                className={iconButtonClass}
              >
                <X className="h-5 w-5" />
              </button>
            }
          />
          <div className="mt-6 grid gap-4">
            <div className="relative">
              <label htmlFor="message-recipient" className="mb-2 block text-sm font-semibold">
                To
              </label>
              <Search className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                id="message-recipient"
                value={recipient ? `${recipient.name} · ${recipient.email}` : recipientSearch}
                onChange={(event) => {
                  setRecipient(null);
                  setRecipientSearch(event.target.value);
                }}
                placeholder="Search BSCA or OSCA Head by name or email"
                className={`${fieldClass} h-11 pl-10`}
              />
              {!recipient && recipientSearch && recipients.length > 0 && (
                <div className="surface-card absolute top-full right-0 left-0 z-10 mt-1 max-h-56 overflow-y-auto border border-border/60 p-2">
                  {recipients.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setRecipient(item);
                        setRecipientSearch("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-muted"
                    >
                      <span>
                        <strong className="block text-sm">{item.name}</strong>
                        <small className="text-xs text-muted-foreground">{item.email}</small>
                      </span>
                      <small className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {item.role === "head" ? "OSCA Head" : "BSCA President"}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {!recipient && recipientSearch && recipientSearching && (
                <p className="mt-2 text-xs text-muted-foreground">Searching accounts...</p>
              )}
              {!recipient && recipientSearch && !recipientSearching && recipients.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">No matching accounts.</p>
              )}
            </div>
            <div>
              <label htmlFor="message-subject" className="mb-2 block text-sm font-semibold">
                Subject
              </label>
              <input
                id="message-subject"
                required
                maxLength={180}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="What is this about?"
                className={`${fieldClass} h-11`}
              />
            </div>
            <div>
              <label htmlFor="message-body" className="mb-2 block text-sm font-semibold">
                Message
              </label>
              <textarea
                id="message-body"
                required
                maxLength={5000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message..."
                rows={5}
                className={`${fieldClass} resize-none py-3`}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !recipient}
            className={`${authSubmitClass} mt-5 sm:w-auto sm:px-6`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? "Sending..." : "Send message"}
          </button>
        </form>
      )}

      {selectedConversation ? (
        <ConversationDetail
          selected={selectedConversation}
          messages={messages}
          currentUserId={currentUser?.id}
          onlineIds={onlineIds}
          reply={reply}
          setReply={setReply}
          file={replyFile}
          setFile={setReplyFile}
          sending={sendingReply}
          onBack={() => {
            setSelectedConversation(null);
            setReplyFile(null);
          }}
          onDelete={async () => {
            const other =
              selectedConversation.sender.id === currentUser?.id
                ? selectedConversation.recipient
                : selectedConversation.sender;
            const ok = await confirm({
              title: "Delete this conversation?",
              description: `The conversation with ${other.name} will be removed from your inbox. ${other.name} will still see it.`,
              confirmLabel: "Delete conversation",
              destructive: true,
            });
            if (ok) await removeConversation(selectedConversation);
          }}
          onSubmit={sendReply}
        />
      ) : (
        <section className={`${panelClass} overflow-hidden p-4 sm:p-6`}>
          <SectionHeader
            icon={MessagesSquare}
            title="Conversations"
            subtitle="Messages between OSCA Head and BSCA accounts."
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search conversations</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                className={`${fieldClass} h-11 pl-10`}
              />
            </label>
            <div className="inline-flex shrink-0 rounded-lg border border-border/60 bg-muted/60 p-1">
              {(["All", "Unread"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  aria-pressed={filter === tab}
                  className={`h-9 shrink-0 rounded-md px-4 text-sm font-bold transition-colors ${filter === tab ? "bg-navy text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60">
            {messagesLoading && <RowSkeletons count={5} label="Loading conversations" />}
            {visibleMessages.map((item) => {
              const received = item.recipient.id === currentUser?.id;
              const other = received ? item.sender : item.recipient;
              return (
                <article
                  key={item.id}
                  onClick={() => openMessage(item)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextConversation(item);
                  }}
                  className="relative flex cursor-pointer items-center gap-3 px-3 py-3.5 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-4"
                >
                  <div className="bg-navy relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-2 ring-gold/40 sm:h-12 sm:w-12">
                    {avatarLabel(other.name)}
                    {onlineIds.has(other.id) && (
                      <span
                        className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success"
                        aria-label="Online"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className={`truncate text-base ${received && !item.read_at ? "font-extrabold" : "font-semibold"}`}
                      >
                        {other.name}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p
                      className={`mt-1 truncate text-sm ${received && !item.read_at ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                    >
                      <span className="font-medium">{item.subject}: </span>
                      {item.message || (item.attachment_name ? `📎 ${item.attachment_name}` : "")}
                    </p>
                  </div>
                  {received && !item.read_at && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-gold"
                      aria-label="Unread"
                    />
                  )}
                  {contextConversation?.id === item.id && (
                    <div className="surface-card absolute right-2 bottom-2 z-10 w-44 border border-border/60 p-1 shadow-[var(--shadow-card)]">
                      <button
                        type="button"
                        onClick={() => removeConversation(item)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                      >
                        Delete conversation
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {!messagesLoading && !visibleMessages.length && (
              <EmptyState
                bare
                icon={MessagesSquare}
                title="No conversations found"
                description="Start one with the New message button."
                className="py-12"
              />
            )}
          </div>
          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                <span className="font-semibold text-foreground">{lastPage}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1 || messagesLoading}
                  onClick={() => setCurrentPage((page) => page - 1)}
                  className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === lastPage || messagesLoading}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}

type ConversationDetailProps = {
  selected: Message;
  messages: Message[];
  currentUserId?: number | undefined;
  onlineIds: Set<number>;
  reply: string;
  setReply: (value: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  sending: boolean;
  onBack: () => void;
  onDelete: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function ConversationDetail({
  selected,
  messages,
  currentUserId,
  onlineIds,
  reply,
  setReply,
  file,
  setFile,
  sending,
  onBack,
  onDelete,
  onSubmit,
}: ConversationDetailProps) {
  const attachmentInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (picked && picked.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Attachments must be 5 MB or smaller.");
      return;
    }
    setFile(picked);
  }

  const other = selected.sender.id === currentUserId ? selected.recipient : selected.sender;
  const online = onlineIds.has(other.id);
  const conversation = messages
    .filter((item) => {
      const participants = [item.sender.id, item.recipient.id];
      return participants.includes(other.id) && participants.includes(currentUserId ?? -1);
    })
    .sort(
      (first, second) =>
        new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
    );

  return (
    <section
      className={`${panelClass} flex h-[calc(100dvh-13.5rem)] min-h-[420px] flex-col overflow-hidden lg:h-[calc(100dvh-12.75rem)]`}
    >
      <header className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          title="Back"
          className={iconButtonClass}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="bg-navy relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-2 ring-gold/40">
          {other.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
          {online && (
            <span
              className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success"
              aria-label="Online"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-extrabold">{other.name}</h2>
          <p
            className={`text-xs ${online ? "font-semibold text-success" : "text-muted-foreground"}`}
          >
            {online ? "Active now" : "Offline"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                title="More options"
                className={iconButtonClass}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={onDelete}
                className="font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-card px-4 py-6 sm:px-8">
        <p className="pb-3 text-center">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Today
          </span>
        </p>
        {conversation.map((item) => {
          const mine = item.sender.id === currentUserId;
          return (
            <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[60%] ${mine ? "rounded-br-md bg-navy text-white" : "rounded-bl-md border border-border/60 bg-muted text-foreground"}`}
              >
                {!mine && (
                  <p className="mb-1 text-xs font-bold text-muted-foreground">{item.sender.name}</p>
                )}
                {item.attachment_path && <MessageAttachment item={item} mine={mine} />}
                {item.message && <p className="whitespace-pre-wrap">{item.message}</p>}
                <p
                  className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}
                >
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        {!conversation.length && (
          <EmptyState
            bare
            compact
            icon={MessagesSquare}
            title="No messages yet"
            description="Send the first message below."
          />
        )}
      </div>
      <form onSubmit={onSubmit} className="border-t border-border/60 bg-card px-3 py-3 sm:px-5">
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/60 px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Remove attachment"
              title="Remove attachment"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={attachmentInput}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={pickFile}
          />
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={pickFile}
          />
          <button
            type="button"
            onClick={() => attachmentInput.current?.click()}
            aria-label="Add attachment"
            title="Add attachment"
            className={`${iconButtonClass} shrink-0`}
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            aria-label="Add photo"
            title="Add photo"
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground sm:grid"
          >
            <Image className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center rounded-lg border border-input bg-background/60 px-4 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Aa"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Add emoji"
                  title="Add emoji"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="grid w-64 grid-cols-8 gap-1 p-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setReply(reply + emoji);
                      setEmojiOpen(false);
                    }}
                    className="grid h-7 w-7 place-items-center rounded text-lg hover:bg-muted"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <button
            type="submit"
            disabled={sending || (!reply.trim() && !file)}
            aria-label="Send reply"
            title="Send reply"
            className="bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";
const EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🙂",
  "😉",
  "😢",
  "😮",
  "👍",
  "👏",
  "🙏",
  "👋",
  "💪",
  "🤝",
  "✅",
  "❌",
  "❤️",
  "🎉",
  "📌",
  "📎",
  "📅",
  "⏰",
  "💰",
  "🏥",
];

function MessageAttachment({ item, mine }: { item: Message; mine: boolean }) {
  const url = `${API_URL.replace(/\/api$/, "")}/storage/${item.attachment_path}`;
  const name = item.attachment_name ?? "Attachment";
  if (item.attachment_mime?.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mb-1.5 block">
        <img
          src={url}
          alt={name}
          loading="lazy"
          className="max-h-60 w-full rounded-lg object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`mb-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold underline-offset-2 hover:underline ${mine ? "bg-white/15" : "bg-card"}`}
    >
      <Paperclip className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{name}</span>
    </a>
  );
}
