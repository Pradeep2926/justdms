import { useMemo, useState } from "react";
import {
  ChevronUp,
  Crown,
  Image,
  Instagram,
  Languages,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import PostSelector from "./PostSelector";
import api from "../../api/api";

const REPLY_SEPARATOR = "\n---\n";
const DEFAULT_KEYWORDS = ["test"];
const DEFAULT_REPLIES = ["Sent check the DM"];
const DEFAULT_OPENING =
  "Hey {{first_name}} 👋\nThanks for commenting!\nPlease tap the button below to get the details.";
const DEFAULT_SUCCESS = "Here is the resource";
const DEFAULT_NOT_FOLLOWING =
  "Oops! It looks like you’re not following us yet 👀\n\nThis resource is available only to our followers.\n\nPlease visit our profile, follow us, and then tap ‘I’m Following’ below.";
const DEFAULT_STILL_NOT_FOLLOWING =
  "It still looks like you haven’t followed yet 😊\nPlease follow the profile first, then tap ‘I’m Following’ again.";

export default function AutomationBuilder({
  user,
  posts = [],
  initialAutomation = null,
  onSaved,
  onCancel,
}) {
  const editing = Boolean(initialAutomation?.id);
  const [selectedPost, setSelectedPost] = useState(
    initialAutomation?.media_id || ""
  );
  const [keywords, setKeywords] = useState(() =>
    splitKeywords(initialAutomation?.trigger_value)
  );
  const [anyKeyword, setAnyKeyword] = useState(
    initialAutomation?.trigger_value === "*"
  );
  const [commentReplies, setCommentReplies] = useState(() =>
    splitReplies(initialAutomation?.public_reply)
  );
  const [openingEnabled, setOpeningEnabled] = useState(true);
  const [openingMessage, setOpeningMessage] = useState(
    initialAutomation?.opening_dm_message || DEFAULT_OPENING
  );
  const [openingButtonText, setOpeningButtonText] = useState(
    initialAutomation?.opening_dm_button_text || "Get Details"
  );
  const [successMessage, setSuccessMessage] = useState(
    initialAutomation?.success_message || DEFAULT_SUCCESS
  );
  const [resourceUrl, setResourceUrl] = useState(
    initialAutomation?.resource_url || ""
  );
  const [resourceButtonLabel, setResourceButtonLabel] = useState(
    initialAutomation?.resource_button_label || "Open Details"
  );
  const [followRequired, setFollowRequired] = useState(
    initialAutomation?.follow_required ?? true
  );
  const [notFollowingMessage, setNotFollowingMessage] = useState(
    initialAutomation?.not_following_message || DEFAULT_NOT_FOLLOWING
  );
  const [visitProfileButtonText, setVisitProfileButtonText] = useState(
    initialAutomation?.visit_profile_button_text || "Visit Profile"
  );
  const [confirmFollowButtonText, setConfirmFollowButtonText] = useState(
    initialAutomation?.confirm_follow_button_text || "I’m Following ✓"
  );
  const [stillNotFollowingMessage, setStillNotFollowingMessage] = useState(
    initialAutomation?.still_not_following_message ||
      DEFAULT_STILL_NOT_FOLLOWING
  );
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const selectedPostData = useMemo(
    () => posts.find((post) => post.id === selectedPost),
    [posts, selectedPost]
  );

  const triggerValue = anyKeyword ? "*" : keywords.join(",");
  const publicReply = commentReplies.join(REPLY_SEPARATOR);
  const canSave = selectedPost && triggerValue && publicReply.trim();

  const payload = {
    user_id: user?.id,
    user_email: user?.email,
    media_id: selectedPost,
    trigger_value: triggerValue,
    message: [openingMessage, successMessage, resourceUrl].filter(Boolean).join("\n\n"),
    public_reply: publicReply,
    opening_dm_message: openingEnabled ? openingMessage : "",
    opening_dm_button_text: openingButtonText,
    follow_required: followRequired,
    not_following_message: notFollowingMessage,
    visit_profile_button_text: visitProfileButtonText,
    confirm_follow_button_text: confirmFollowButtonText,
    still_not_following_message: stillNotFollowingMessage,
    success_message: successMessage,
    resource_type: "link",
    resource_url: resourceUrl,
    resource_button_label: resourceButtonLabel,
  };

  const saveAutomation = async () => {
    if (!canSave) {
      alert("Select a post, add a keyword, and add at least one comment reply.");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await api.patch(`/automation/${initialAutomation.id}`, payload);
      } else {
        await api.post("/automation", payload);
      }
      onSaved?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Failed to save automation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-4 border-b border-slate-100 px-8 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-amber-400 to-purple-600 text-white">
          <Instagram className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-950">
            User Comments on your post or reel
          </h2>
          <p className="text-sm text-slate-500">
            {editing ? "Edit this comment-to-DM automation." : "Create a new comment-to-DM automation."}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          title="Close builder"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-9 px-8 py-8">
        <BuilderSection title="Which Post or Reel do you want to use?">
          <button
            type="button"
            onClick={() => setModal("post")}
            className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            {selectedPostData?.media_url || selectedPostData?.thumbnail_url ? (
              <img
                src={selectedPostData.thumbnail_url || selectedPostData.media_url}
                alt=""
                className="mb-4 h-20 w-20 rounded-lg object-cover"
              />
            ) : (
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <Image className="h-8 w-8" />
              </span>
            )}
            <span className="text-lg font-semibold text-slate-500">
              {selectedPost ? "Post or Reel Selected" : "Select Post or Reel"}
            </span>
          </button>
        </BuilderSection>

        <BuilderSection title="What keywords will start your automation?">
          <button
            type="button"
            onClick={() => setModal("keywords")}
            className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Languages className="h-8 w-8" />
            </span>
            <span className="text-lg font-semibold text-slate-500">
              {anyKeyword
                ? "Any keyword"
                : keywords.length
                  ? keywords.join(", ")
                  : "Setup Keywords"}
            </span>
          </button>
        </BuilderSection>

        <BuilderSection title="What do you want to reply to those comments?">
          <button
            type="button"
            onClick={() => setModal("replies")}
            className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <MessageCircle className="h-8 w-8" />
            </span>
            <span className="text-lg font-semibold text-slate-500">
              {commentReplies.length
                ? `${commentReplies.length} comment ${commentReplies.length === 1 ? "reply" : "replies"}`
                : "Setup Comment Replies"}
            </span>
          </button>
        </BuilderSection>

        <FlowPreview
          openingEnabled={openingEnabled}
          setOpeningEnabled={setOpeningEnabled}
          openingMessage={openingMessage}
          setOpeningMessage={setOpeningMessage}
          openingButtonText={openingButtonText}
          setOpeningButtonText={setOpeningButtonText}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          resourceUrl={resourceUrl}
          setResourceUrl={setResourceUrl}
          resourceButtonLabel={resourceButtonLabel}
          setResourceButtonLabel={setResourceButtonLabel}
          followRequired={followRequired}
          setFollowRequired={setFollowRequired}
          notFollowingMessage={notFollowingMessage}
          setNotFollowingMessage={setNotFollowingMessage}
          visitProfileButtonText={visitProfileButtonText}
          setVisitProfileButtonText={setVisitProfileButtonText}
          confirmFollowButtonText={confirmFollowButtonText}
          setConfirmFollowButtonText={setConfirmFollowButtonText}
          stillNotFollowingMessage={stillNotFollowingMessage}
          setStillNotFollowingMessage={setStillNotFollowingMessage}
        />

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={saveAutomation}
            disabled={saving || !canSave}
            className="btn-primary"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Automation"}
          </button>
        </div>
      </div>

      {modal === "post" && (
        <PostModal
          posts={posts}
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "keywords" && (
        <KeywordsModal
          keywords={keywords}
          setKeywords={setKeywords}
          anyKeyword={anyKeyword}
          setAnyKeyword={setAnyKeyword}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "replies" && (
        <RepliesModal
          replies={commentReplies}
          setReplies={setCommentReplies}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function BuilderSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-4 text-xl font-bold text-slate-700">{title}</h3>
      {children}
    </section>
  );
}

function PostModal({ posts, selectedPost, setSelectedPost, onClose }) {
  return (
    <Modal title="Select Post or Reel" onClose={onClose}>
      <PostSelector posts={posts} selectedPost={selectedPost} onSelect={setSelectedPost} />
      <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
        Confirm
      </button>
    </Modal>
  );
}

function KeywordsModal({
  keywords,
  setKeywords,
  anyKeyword,
  setAnyKeyword,
  onClose,
}) {
  const [draft, setDraft] = useState("");

  const addKeyword = () => {
    const value = draft.trim().toLowerCase();
    if (!value || keywords.includes(value)) return;
    setKeywords([...keywords, value]);
    setDraft("");
  };

  return (
    <Modal title="Setup Keywords" onClose={onClose}>
      <p className="mb-6 text-lg font-medium leading-relaxed text-slate-500">
        Keywords are not case-sensitive, e.g. "Link" and "link" are recognized as the same.
      </p>
      <input
        className="input text-lg"
        placeholder="Type & Hit Enter to add Keyword"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addKeyword();
          }
        }}
      />
      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-lg font-semibold text-slate-950">Any keyword</span>
        <Toggle enabled={anyKeyword} onChange={() => setAnyKeyword(!anyKeyword)} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {(keywords.length ? keywords : DEFAULT_KEYWORDS).map((keyword) => (
          <button
            key={keyword}
            type="button"
            onClick={() => setKeywords(keywords.filter((item) => item !== keyword))}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-base font-semibold text-white"
          >
            {keyword}
            <X className="h-4 w-4" />
          </button>
        ))}
      </div>
      <button type="button" onClick={onClose} className="btn-primary mt-7 w-full justify-center py-4 text-lg">
        Confirm
      </button>
    </Modal>
  );
}

function RepliesModal({ replies, setReplies, onClose }) {
  const currentReplies = replies.length ? replies : DEFAULT_REPLIES;

  const updateReply = (index, value) => {
    const next = [...currentReplies];
    next[index] = value;
    setReplies(next.filter((reply) => reply.trim()));
  };

  const removeReply = (index) => {
    setReplies(currentReplies.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <Modal title="Setup Comment Replies" onClose={onClose}>
      <p className="mb-6 text-lg font-medium text-slate-500">
        Add Random Comment Replies
      </p>
      <div className="space-y-4">
        {currentReplies.map((reply, index) => (
          <div key={`${reply}-${index}`} className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <input
              className="input text-lg"
              value={reply}
              onChange={(event) => updateReply(index, event.target.value)}
            />
            <button
              type="button"
              onClick={() => removeReply(index)}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              title="Delete reply"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setReplies([...currentReplies, "Check your DM"])}
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 px-5 py-4 text-lg font-semibold text-slate-950 hover:bg-slate-50"
      >
        <Plus className="h-6 w-6" />
        Add New Reply
      </button>
      <button type="button" onClick={onClose} className="btn-primary mt-6 w-full justify-center py-4 text-lg">
        Confirm
      </button>
    </Modal>
  );
}

function FlowPreview({
  openingEnabled,
  setOpeningEnabled,
  openingMessage,
  setOpeningMessage,
  openingButtonText,
  setOpeningButtonText,
  successMessage,
  setSuccessMessage,
  resourceUrl,
  setResourceUrl,
  resourceButtonLabel,
  setResourceButtonLabel,
  followRequired,
  setFollowRequired,
  notFollowingMessage,
  setNotFollowingMessage,
  visitProfileButtonText,
  setVisitProfileButtonText,
  confirmFollowButtonText,
  setConfirmFollowButtonText,
  stillNotFollowingMessage,
  setStillNotFollowingMessage,
}) {
  const [addResponseOpen, setAddResponseOpen] = useState(false);
  const [followEditorOpen, setFollowEditorOpen] = useState(false);

  const addResponseText = () => {
    setSuccessMessage((current) =>
      current.trim()
        ? `${current.trim()}\n\nAdd another detail here`
        : DEFAULT_SUCCESS
    );
  };

  const clearResponse = () => {
    setSuccessMessage("");
    setResourceUrl("");
    setResourceButtonLabel("Open Details");
  };

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-950 text-white">
            <MessageCircle className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-slate-950">Opening Message</h3>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                {openingEnabled ? "ON" : "OFF"}
              </span>
            </div>
            <p className="text-lg font-medium text-slate-500">
              First DM before the response flow.
            </p>
          </div>
          <Toggle enabled={openingEnabled} onChange={() => setOpeningEnabled(!openingEnabled)} />
          <button type="button" className="rounded-lg border border-slate-200 bg-white p-3 text-slate-500">
            <ChevronUp className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-10">
          <MessageCard
            message={openingMessage}
            buttonLabel={openingButtonText}
            onMessageChange={setOpeningMessage}
            onButtonChange={setOpeningButtonText}
          />
        </div>
      </div>

      {followRequired && (
        <FollowGateCard
          notFollowingMessage={notFollowingMessage}
          visitProfileButtonText={visitProfileButtonText}
          confirmFollowButtonText={confirmFollowButtonText}
          stillNotFollowingMessage={stillNotFollowingMessage}
          onEdit={() => setFollowEditorOpen(true)}
          onRemove={() => setFollowRequired(false)}
        />
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-100 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl font-bold text-white">
            1
          </div>
          <h3 className="flex-1 text-xl font-bold text-slate-950">Text Message</h3>
          <button
            type="button"
            onClick={clearResponse}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
            title="Clear response"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <ChevronUp className="h-5 w-5 text-slate-950" />
        </div>
        <div className="rounded-lg bg-white p-5">
          <textarea
            className="input min-h-[90px] resize-none border-dashed text-lg"
            value={successMessage}
            onChange={(event) => setSuccessMessage(event.target.value)}
            maxLength={1000}
          />
          <p className="mt-2 text-right text-sm font-semibold text-slate-400">
            {successMessage.length}/1000
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input border-dashed"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              placeholder="Resource URL"
            />
            <input
              className="input border-dashed"
              value={resourceButtonLabel}
              onChange={(event) => setResourceButtonLabel(event.target.value)}
              placeholder="Button label"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAddResponseOpen(true)}
        className="btn-primary w-full justify-center py-4 text-lg"
      >
        <Plus className="h-6 w-6" />
        Add Response
      </button>

      {addResponseOpen && (
        <AddResponseModal
          followRequired={followRequired}
          onAddFollowGate={() => {
            setFollowRequired(true);
            setAddResponseOpen(false);
            setFollowEditorOpen(true);
          }}
          onAddText={() => {
            addResponseText();
            setAddResponseOpen(false);
          }}
          onClose={() => setAddResponseOpen(false)}
        />
      )}

      {followEditorOpen && (
        <FollowGateModal
          notFollowingMessage={notFollowingMessage}
          setNotFollowingMessage={setNotFollowingMessage}
          visitProfileButtonText={visitProfileButtonText}
          setVisitProfileButtonText={setVisitProfileButtonText}
          confirmFollowButtonText={confirmFollowButtonText}
          setConfirmFollowButtonText={setConfirmFollowButtonText}
          stillNotFollowingMessage={stillNotFollowingMessage}
          setStillNotFollowingMessage={setStillNotFollowingMessage}
          onClose={() => setFollowEditorOpen(false)}
        />
      )}
    </section>
  );
}

function FollowGateCard({
  notFollowingMessage,
  visitProfileButtonText,
  confirmFollowButtonText,
  stillNotFollowingMessage,
  onEdit,
  onRemove,
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/70">
      <div className="flex items-center gap-4 border-b border-amber-100 px-6 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-slate-950">
          <Crown className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-slate-950">Ask For Follow</h3>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
              GATE
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            After Get Details, verify follow status before sending the resource.
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
          title="Remove follow gate"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-amber-100"
        >
          Edit
        </button>
      </div>
      <div className="grid gap-5 p-6 lg:grid-cols-2">
        <div className="rounded-lg border border-amber-100 bg-white p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">
            Not following
          </p>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
            {notFollowingMessage}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-brand-600">
              {visitProfileButtonText}
            </span>
            <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-brand-600">
              {confirmFollowButtonText}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">
            Still not following
          </p>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
            {stillNotFollowingMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

function AddResponseModal({ followRequired, onAddFollowGate, onAddText, onClose }) {
  return (
    <Modal title="Add Response" onClose={onClose}>
      <div className="space-y-4">
        <ResponseOption
          title="Ask For Follow"
          description={
            followRequired
              ? "Follow gate is already in this flow"
              : "Request users to follow your account"
          }
          icon={<Crown className="h-6 w-6" />}
          highlighted
          disabled={followRequired}
          onClick={onAddFollowGate}
        />
        <ResponseOption
          title="Card Message"
          description="Send a rich card with image, text and button"
          onClick={onAddText}
        />
        <ResponseOption
          title="Text Message"
          description="Send a simple text or button response"
          onClick={onAddText}
        />
        <ResponseOption
          title="Image Message"
          description="Send an uploaded image response"
          onClick={onAddText}
        />
      </div>
    </Modal>
  );
}

function ResponseOption({
  title,
  description,
  icon,
  highlighted = false,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-lg border border-slate-200 p-5 text-left transition ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-brand-300 hover:bg-brand-50/40"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
          highlighted ? "bg-amber-300 text-amber-900" : "bg-slate-50 text-slate-500"
        }`}
      >
        {icon || <MessageCircle className="h-6 w-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-bold text-slate-950">{title}</span>
        <span className="mt-1 block text-base font-medium text-slate-500">
          {description}
        </span>
      </span>
      <ChevronUp className="h-5 w-5 rotate-90 text-slate-400" />
    </button>
  );
}

function FollowGateModal({
  notFollowingMessage,
  setNotFollowingMessage,
  visitProfileButtonText,
  setVisitProfileButtonText,
  confirmFollowButtonText,
  setConfirmFollowButtonText,
  stillNotFollowingMessage,
  setStillNotFollowingMessage,
  onClose,
}) {
  return (
    <Modal title="Ask For Follow" onClose={onClose}>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Not-following message
          </span>
          <textarea
            className="input min-h-[150px] resize-none"
            value={notFollowingMessage}
            onChange={(event) => setNotFollowingMessage(event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Visit profile button
            </span>
            <input
              className="input"
              value={visitProfileButtonText}
              onChange={(event) => setVisitProfileButtonText(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Confirm follow button
            </span>
            <input
              className="input"
              value={confirmFollowButtonText}
              onChange={(event) => setConfirmFollowButtonText(event.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Still-not-following message
          </span>
          <textarea
            className="input min-h-[110px] resize-none"
            value={stillNotFollowingMessage}
            onChange={(event) => setStillNotFollowingMessage(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary w-full justify-center py-4 text-lg"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function MessageCard({ message, buttonLabel, onMessageChange, onButtonChange }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="inline-flex items-center gap-2 text-lg font-semibold text-slate-400"
        >
          Edit <Pencil className="h-5 w-5" />
        </button>
      </div>
      {editing ? (
        <div className="space-y-3">
          <textarea
            className="input min-h-[150px] resize-none"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
          />
          <input
            className="input"
            value={buttonLabel}
            onChange={(event) => onButtonChange(event.target.value)}
          />
        </div>
      ) : (
        <>
          <p className="whitespace-pre-line text-lg leading-relaxed text-slate-600">
            {message}
          </p>
          <div className="mt-5 rounded-lg border border-slate-200 px-5 py-3 text-center text-lg font-bold text-brand-600">
            {buttonLabel}
          </div>
        </>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-950 hover:bg-slate-50"
          >
            <X className="h-7 w-7" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-10 w-20 rounded-full transition ${
        enabled ? "bg-slate-950" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 h-8 w-8 rounded-full bg-white transition ${
          enabled ? "left-11" : "left-1"
        }`}
      />
    </button>
  );
}

function splitKeywords(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "*") return DEFAULT_KEYWORDS;
  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitReplies(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return DEFAULT_REPLIES;
  return normalized
    .split(REPLY_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}
