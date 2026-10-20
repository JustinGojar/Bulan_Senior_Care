import {
  CornerUpLeft,
  ImagePlus,
  Loader2,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/DesignKit";
import {
  fieldClass,
  iconButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  tileClass,
} from "@/components/design-kit";
import { announcementImageUrl, storageUrl } from "@/lib/announcements";
import {
  createAnnouncementComment,
  deleteAnnouncement,
  deleteAnnouncementComment,
  getStoredUser,
  updateAnnouncement,
  type Announcement,
  type AnnouncementComment,
} from "@/lib/api";

function isHeadUser() {
  const currentUser = getStoredUser();
  return (
    currentUser?.role?.toLowerCase() === "head" ||
    Boolean(currentUser?.roles?.some((role) => role.name.toLowerCase() === "head"))
  );
}

function CommentImage({ path }: { path?: string | null | undefined }) {
  if (!path) return null;
  const src = storageUrl(path);
  return (
    <a href={src} target="_blank" rel="noreferrer" className="mt-2 block w-fit">
      <img
        src={src}
        alt="Comment attachment"
        className="max-h-64 max-w-full rounded-lg border border-border object-contain"
      />
    </a>
  );
}

/**
 * An announcement opened in full, with its comments and replies. Changes are reported back
 * through `onChange` and `onDeleted` so the page's list stays in step.
 */
export function AnnouncementDialog({
  announcement,
  onClose,
  onChange,
  onDeleted,
}: {
  announcement: Announcement;
  onClose: () => void;
  onChange: (announcement: Announcement) => void;
  onDeleted: (announcement: Announcement) => void;
}) {
  const currentUser = getStoredUser();
  const isHead = isHeadUser();
  const [commentMessage, setCommentMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirmDialog();
  // The Head edits the title, details and poster in place.
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // A picked image belongs to the announcement it was picked for.
  useEffect(() => {
    setCommentImage(null);
    setEditing(false);
  }, [announcement.id]);

  function startEditing() {
    setEditTitle(announcement.title);
    setEditMessage(announcement.message);
    setEditImage(null);
    setRemoveImage(false);
    setEditing(true);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTitle.trim() || !editMessage.trim()) return;
    setEditSaving(true);
    try {
      const updated = await updateAnnouncement(
        announcement.id,
        editTitle.trim(),
        editMessage.trim(),
        editImage,
        removeImage,
      );
      onChange({
        ...announcement,
        ...updated,
        ...(announcement.comments && { comments: announcement.comments }),
      });
      setEditing(false);
      toast.success("Announcement updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update announcement.");
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    if (!commentImage) {
      setCommentImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(commentImage);
    setCommentImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [commentImage]);

  const canDeleteComment = (comment: AnnouncementComment) =>
    isHead || (currentUser != null && comment.user_id === currentUser.id);

  async function handleDeleteAnnouncement() {
    const ok = await confirm({
      title: "Delete this announcement?",
      description: `"${announcement.title}" and all of its comments will be removed for everyone.`,
      confirmLabel: "Delete announcement",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAnnouncement(announcement.id);
      onDeleted(announcement);
      toast.success("Announcement deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete announcement.");
    }
  }

  async function handleDeleteComment(comment: AnnouncementComment) {
    const ok = await confirm({
      title: "Delete this comment?",
      description: comment.replies?.length
        ? "The comment and its replies will be removed for everyone."
        : "The comment will be removed for everyone.",
      confirmLabel: "Delete comment",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAnnouncementComment(announcement.id, comment.id);
      const comments = (announcement.comments ?? [])
        .filter((item) => item.id !== comment.id)
        .map((item) => ({
          ...item,
          replies: item.replies?.filter((reply) => reply.id !== comment.id) ?? [],
        }));
      onChange({ ...announcement, comments });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete comment.");
    }
  }

  async function handleCreateComment(
    event: React.FormEvent<HTMLFormElement>,
    parentCommentId?: number,
  ) {
    event.preventDefault();
    const message = parentCommentId ? replyMessage : commentMessage;
    const image = parentCommentId ? null : commentImage;
    if (!message.trim() && !image) return;
    setCommentSaving(true);
    try {
      const comment = await createAnnouncementComment(
        announcement.id,
        message.trim(),
        parentCommentId,
        image,
      );
      const comments = parentCommentId
        ? (announcement.comments ?? []).map((item) =>
            item.id === parentCommentId
              ? { ...item, replies: [...(item.replies ?? []), comment] }
              : item,
          )
        : [...(announcement.comments ?? []), comment];
      onChange({ ...announcement, comments });
      if (parentCommentId) {
        setReplyMessage("");
        setReplyTo(null);
      } else {
        setCommentMessage("");
        setCommentImage(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send comment.");
    } finally {
      setCommentSaving(false);
    }
  }

  // The confirm dialog renders beside the overlay: its clicks would otherwise bubble through
  // the portal to the overlay and close the announcement.
  return (
    <>
      <div
        className="fixed inset-0 z-30 grid place-items-center bg-black/50 px-4 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <article
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-preview-title"
          onClick={(event) => event.stopPropagation()}
          className="surface-card max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-border/60 p-0 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Announcement
            </p>
            <div className="flex items-center gap-2">
              {isHead && !editing && (
                <button
                  type="button"
                  onClick={startEditing}
                  aria-label="Edit announcement"
                  title="Edit announcement"
                  className={iconButtonClass}
                >
                  <Pencil className="h-5 w-5" />
                </button>
              )}
              {isHead && (
                <button
                  type="button"
                  onClick={() => void handleDeleteAnnouncement()}
                  aria-label="Delete announcement"
                  title="Delete announcement"
                  className={`${iconButtonClass} text-destructive`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close announcement preview"
                className={iconButtonClass}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {(announcement.image_path || announcement.source_image_url) && (
            <img
              src={announcementImageUrl(announcement)}
              alt=""
              className="max-h-[65vh] w-full bg-muted object-contain"
            />
          )}
          <div className="p-6">
            {editing ? (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <h2 id="announcement-preview-title" className="text-lg font-bold">
                  Edit announcement
                </h2>
                <div>
                  <label
                    htmlFor="announcement-edit-title"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Title
                  </label>
                  <input
                    id="announcement-edit-title"
                    required
                    maxLength={180}
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className={`${fieldClass} h-11`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="announcement-edit-message"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Details
                  </label>
                  <textarea
                    id="announcement-edit-message"
                    required
                    maxLength={5000}
                    rows={6}
                    value={editMessage}
                    onChange={(event) => setEditMessage(event.target.value)}
                    className={`${fieldClass} py-2.5`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className={`${secondaryButtonClass} cursor-pointer`}>
                    <ImagePlus className="h-4 w-4" />
                    {editImage ? editImage.name : "Replace poster"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast.error("Image must be 5 MB or smaller.");
                          return;
                        }
                        setEditImage(file);
                        if (file) setRemoveImage(false);
                      }}
                    />
                  </label>
                  {announcement.image_path && !editImage && (
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={removeImage}
                        onChange={(event) => setRemoveImage(event.target.checked)}
                      />
                      Remove the current poster
                    </label>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={editSaving}
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className={primaryButtonClass}>
                    {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save changes
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 id="announcement-preview-title" className="text-2xl font-extrabold">
                  {announcement.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(announcement.published_at).toLocaleDateString()}
                </p>
                <p className="mt-4 text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {announcement.message}
                </p>
              </>
            )}
            {announcement.source_url && (
              <a
                href={announcement.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                View original Facebook post
              </a>
            )}
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-lg font-bold">Comments</h3>
              <div className="mt-3 space-y-3">
                {announcement.comments?.map((comment: AnnouncementComment) => (
                  <div key={comment.id} className={`${tileClass} p-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{comment.user.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{comment.user.role}</p>
                        {canDeleteComment(comment) && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteComment(comment)}
                            aria-label="Delete comment"
                            title="Delete comment"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {comment.message && (
                      <p className="mt-1 text-sm text-muted-foreground">{comment.message}</p>
                    )}
                    <CommentImage path={comment.image_path} />
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTo((current) => (current === comment.id ? null : comment.id))
                      }
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                    </button>
                    {comment.replies?.map((reply) => (
                      <div
                        key={reply.id}
                        className="mt-3 ml-5 rounded-lg border-l-2 border-gold/60 bg-card p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold">{reply.user.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[0.6875rem] text-muted-foreground">
                              {reply.user.role}
                            </p>
                            {canDeleteComment(reply) && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteComment(reply)}
                                aria-label="Delete reply"
                                title="Delete reply"
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {reply.message && (
                          <p className="mt-1 text-sm text-muted-foreground">{reply.message}</p>
                        )}
                        <CommentImage path={reply.image_path} />
                      </div>
                    ))}
                    {replyTo === comment.id && (
                      <form
                        onSubmit={(event) => handleCreateComment(event, comment.id)}
                        className="mt-3 ml-5 flex gap-2"
                      >
                        <input
                          required
                          maxLength={2000}
                          autoFocus
                          value={replyMessage}
                          onChange={(event) => setReplyMessage(event.target.value)}
                          placeholder={`Reply to ${comment.user.name}`}
                          className={`${fieldClass} h-10 min-w-0 flex-1`}
                        />
                        <button
                          type="submit"
                          disabled={commentSaving}
                          className="bg-navy h-10 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-70"
                        >
                          {commentSaving ? "Sending..." : "Reply"}
                        </button>
                      </form>
                    )}
                  </div>
                ))}
                {!announcement.comments?.length && (
                  <EmptyState
                    compact
                    icon={MessageCircle}
                    title="No comments yet"
                    description="Be the first to reply to this announcement."
                  />
                )}
              </div>
              {commentImagePreview && (
                <div className="relative mt-4 w-fit">
                  <img
                    src={commentImagePreview}
                    alt="Selected attachment"
                    className="max-h-40 rounded-lg border border-border object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setCommentImage(null)}
                    aria-label="Remove image"
                    className="absolute -top-2 -right-2 rounded-full bg-card p-1 shadow ring-1 ring-border"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleCreateComment} className="mt-4 flex gap-3">
                <label
                  className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
                  title="Attach an image"
                >
                  <ImagePlus className="h-5 w-5 text-gold-foreground dark:text-gold" />
                  <span className="sr-only">Attach an image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      if (file && file.size > 5 * 1024 * 1024) {
                        toast.error("Image must be 5 MB or smaller.");
                        return;
                      }
                      setCommentImage(file);
                    }}
                  />
                </label>
                <input
                  required={!commentImage}
                  maxLength={2000}
                  value={commentMessage}
                  onChange={(event) => setCommentMessage(event.target.value)}
                  placeholder="Write a comment..."
                  aria-label="Write a comment"
                  className={`${fieldClass} h-12 min-w-0 flex-1`}
                />
                <button
                  type="submit"
                  disabled={commentSaving}
                  className="bg-navy inline-flex h-12 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {commentSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </button>
              </form>
            </div>
          </div>
        </article>
      </div>
      {confirmDialog}
    </>
  );
}
