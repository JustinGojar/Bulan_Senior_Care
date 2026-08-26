import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, Image, MoreHorizontal, PenLine, Plus, Search, Send, Smile } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  getMessageRecipients,
  getMessages,
  getStoredUser,
  deleteConversation as deleteConversationApi,
  markMessageRead,
  sendMessage,
  type Message,
  type MessageRecipient,
} from "@/lib/api";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Inbox — Bulan SeniorCare" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const currentUser = getStoredUser();
  const isLeader = currentUser?.role === "leader";
  const canMessage = ["admin", "leader", "head"].includes(currentUser?.role ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [contextConversation, setContextConversation] = useState<Message | null>(null);

  useEffect(() => {
    getMessages().then(setMessages).catch(() => setMessages([]));
  }, []);

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
    if (item.recipient.id !== currentUser?.id || item.read_at) return;
    try {
      const updated = await markMessageRead(item.id);
      setMessages((current) => current.map((messageItem) => messageItem.id === updated.id ? updated : messageItem));
    } catch {
      toast.error("Unable to mark message as read.");
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation || !reply.trim()) return;
    const other = selectedConversation.sender.id === currentUser?.id
      ? selectedConversation.recipient
      : selectedConversation.sender;
    setSendingReply(true);
    try {
      const sent = await sendMessage(other.id, selectedConversation.subject, reply.trim());
      setMessages((current) => [sent, ...current]);
      setSelectedConversation(sent);
      setReply("");
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
      setMessages((current) => current.filter((messageItem) => {
        const participants = [messageItem.sender.id, messageItem.recipient.id];
        return !(participants.includes(other.id) && participants.includes(currentUser?.id ?? -1));
      }));
      if (selectedConversation && [selectedConversation.sender.id, selectedConversation.recipient.id].includes(other.id)) {
        setSelectedConversation(null);
      }
      setContextConversation(null);
      toast.success("Conversation deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete conversation.");
    }
  }

  const conversations = Array.from(
    messages.reduce((grouped, item) => {
      const other = item.sender.id === currentUser?.id ? item.recipient : item.sender;
      if (!grouped.has(other.id)) grouped.set(other.id, []);
      grouped.get(other.id)?.push(item);
      return grouped;
    }, new Map<number, Message[]>()),
  ).map(([, items]) => items);

  const visibleMessages = conversations.map((items) => items[0]!).filter((item) => {
    const other = item.sender.id === currentUser?.id ? item.recipient : item.sender;
    const matchesSearch = [other.name, item.subject, item.message].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );
    if (filter === "Unread") {
      const conversation = conversations.find((items) => items.includes(item)) ?? [];
      return matchesSearch && conversation.some((messageItem) => messageItem.recipient.id === currentUser?.id && !messageItem.read_at);
    }
    return matchesSearch;
  });

  function avatarLabel(name: string) {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <AppShell
      title="Chats"
      subtitle="Messages"
      breadcrumb={["Dashboard", "Inbox"]}
      actions={
        <div className="flex items-center gap-2">
          <button type="button" aria-label="More chat options" title="More options" className="grid h-10 w-10 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setComposerOpen((open) => !open)} aria-label="New message" title="New message" className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-soft)]">
            <PenLine className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {composerOpen && canMessage && (
        <form onSubmit={handleSend} className="surface-card mb-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">New message</h2>
              <p className="text-sm text-muted-foreground">Search leaders and heads by name or email.</p>
            </div>
            <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close new message" className="grid h-9 w-9 place-items-center rounded-full bg-secondary"><ChevronLeft className="h-4 w-4 rotate-90" /></button>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recipient ? `${recipient.name} · ${recipient.email}` : recipientSearch}
                onChange={(event) => {
                  setRecipient(null);
                  setRecipientSearch(event.target.value);
                }}
                placeholder="Search leader or head by name or email"
                className="h-12 w-full rounded-xl border border-border bg-transparent pr-4 pl-11 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              {!recipient && recipientSearch && recipients.length > 0 && (
                <div className="surface-card absolute top-14 right-0 left-0 z-10 max-h-56 overflow-y-auto p-2">
                  {recipients.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setRecipient(item);
                        setRecipientSearch("");
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-secondary"
                    >
                      <span><strong className="block text-sm">{item.name}</strong><small className="text-xs text-muted-foreground">{item.email}</small></span>
                      <small className="text-xs font-semibold capitalize text-muted-foreground">{item.role}</small>
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
            <input required maxLength={180} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            <textarea required maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your message..." rows={5} className="resize-none rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <button type="submit" disabled={saving || !recipient} className="bg-navy mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            <Send className="h-4 w-4" /> {saving ? "Sending..." : "Send message"}
          </button>
        </form>
      )}

      {selectedConversation ? (
        <ConversationDetail
          selected={selectedConversation}
          messages={messages}
          currentUserId={currentUser?.id}
          reply={reply}
          setReply={setReply}
          sending={sendingReply}
          onBack={() => setSelectedConversation(null)}
          onSubmit={sendReply}
        />
      ) : <section className="surface-card overflow-hidden p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Messenger" className="h-12 w-full rounded-full bg-secondary pr-4 pl-12 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30" />
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {(["All", "Unread"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setFilter(tab)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${filter === tab ? "bg-navy text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-3 divide-y divide-border">
          {visibleMessages.map((item) => {
            const received = item.recipient.id === currentUser?.id;
            const other = received ? item.sender : item.recipient;
            return (
              <article key={item.id} onClick={() => openMessage(item)} onContextMenu={(event) => { event.preventDefault(); setContextConversation(item); }} className="relative flex cursor-pointer items-center gap-3 px-1 py-4 transition-colors hover:bg-secondary/60 sm:gap-4 sm:px-2">
                <div className="bg-navy relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground sm:h-14 sm:w-14">
                  {avatarLabel(other.name)}
                  <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`truncate text-base ${received && !item.read_at ? "font-extrabold" : "font-semibold"}`}>{other.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className={`mt-1 truncate text-sm ${received && !item.read_at ? "font-semibold text-foreground" : "text-muted-foreground"}`}><span className="font-medium">{item.subject}: </span>{item.message}</p>
                </div>
                {received && !item.read_at && <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-navy" />}
                {contextConversation?.id === item.id && (
                  <div className="surface-card absolute right-2 bottom-2 z-10 w-44 p-1 shadow-[var(--shadow-card)]">
                    <button type="button" onClick={() => removeConversation(item)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10">Delete conversation</button>
                  </div>
                )}
              </article>
            );
          })}
          {!visibleMessages.length && <p className="px-2 py-12 text-center text-sm text-muted-foreground">No conversations found.</p>}
        </div>
      </section>}
    </AppShell>
  );
}

type ConversationDetailProps = {
  selected: Message;
  messages: Message[];
  currentUserId?: number;
  reply: string;
  setReply: (value: string) => void;
  sending: boolean;
  onBack: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function ConversationDetail({ selected, messages, currentUserId, reply, setReply, sending, onBack, onSubmit }: ConversationDetailProps) {
  const other = selected.sender.id === currentUserId ? selected.recipient : selected.sender;
  const conversation = messages
    .filter((item) => {
      const participants = [item.sender.id, item.recipient.id];
      return participants.includes(other.id) && participants.includes(currentUserId ?? -1);
    })
    .sort((first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime());

  return (
    <section className="surface-card flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <button type="button" onClick={onBack} aria-label="Back to conversations" title="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="bg-navy relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground">
          {other.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
          <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-extrabold">{other.name}</h2>
          <p className="text-xs text-muted-foreground">Active now</p>
        </div>
        <div className="flex items-center gap-1 text-foreground">
          <button type="button" aria-label="More options" title="More options" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"><MoreHorizontal className="h-5 w-5" /></button>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-card px-4 py-6 sm:px-8">
        <p className="pb-3 text-center text-xs text-muted-foreground">Today</p>
        {conversation.map((item) => {
          const mine = item.sender.id === currentUserId;
          return (
            <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[60%] ${mine ? "rounded-br-md bg-navy text-primary-foreground" : "rounded-bl-md bg-navy/10 text-foreground"}`}>
                {!mine && <p className="mb-1 text-xs font-bold text-muted-foreground">{item.sender.name}</p>}
                <p className="whitespace-pre-wrap">{item.message}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
        {!conversation.length && <p className="text-center text-sm text-muted-foreground">No messages in this conversation yet.</p>}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border bg-card px-3 py-3 sm:px-5">
        <button type="button" aria-label="Add attachment" title="Add attachment" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-secondary"><Plus className="h-5 w-5" /></button>
        <button type="button" aria-label="Add photo" title="Add photo" className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-secondary sm:grid"><Image className="h-5 w-5" /></button>
        <div className="flex min-w-0 flex-1 items-center rounded-full bg-secondary px-4">
          <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Aa" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <button type="button" aria-label="Add emoji" title="Add emoji" className="text-foreground"><Smile className="h-5 w-5" /></button>
        </div>
        <button type="submit" disabled={sending || !reply.trim()} aria-label="Send reply" title="Send reply" className="bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </section>
  );
}
