import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Image,
  Instagram,
  Languages,
  Link2,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import PostSelector from "./PostSelector";
import api from "../../api/api";

const REPLY_SEPARATOR = "\n---\n";
const DEFAULT_KEYWORDS = [];
const DEFAULT_REPLIES = ["Sent check the DM"];
const DEFAULT_OPENING =
  "Hey {{first_name}} 👋\nThanks for commenting!\nPlease tap the button below to get the details.";
const DEFAULT_SUCCESS = "Here is the resource";
const DEFAULT_NOT_FOLLOWING =
  "Oops! It looks like you’re not following us yet 👀\n\nThis resource is available only to our followers.\n\nPlease visit our profile, follow us, and then tap ‘I’m Following’ below.";
const DEFAULT_STILL_NOT_FOLLOWING =
  "It still looks like you haven’t followed yet 😊\nPlease follow the profile first, then tap ‘I’m Following’ again.";
const TRIGGER_OPTIONS = [
  {
    value: "comment",
    title: "User comments on your post or reel",
    description: "Reply publicly, then send the DM flow.",
    icon: "instagram",
    available: true,
  },
  {
    value: "dm",
    title: "User DMs to you",
    description: "Start a flow from inbound Instagram DMs.",
    icon: "message",
    available: true,
  },
  {
    value: "live",
    title: "User comments on your LIVE",
    description: "Run automations during live sessions.",
    icon: "instagram",
    available: false,
  },
  {
    value: "story",
    title: "User replies to your stories",
    description: "Start flows from story replies.",
    icon: "instagram",
    available: false,
  },
];

export default function AutomationBuilder({
  user,
  posts = [],
  initialAutomation = null,
  onSaved,
  onCancel,
}) {
  const editing = Boolean(initialAutomation?.id);
  const [automationName, setAutomationName] = useState(
    initialAutomation?.name || ""
  );
  const [triggerType, setTriggerType] = useState(
    initialAutomation?.trigger_type === "dm_keyword" ? "dm" : "comment"
  );
  const [triggerMatchType, setTriggerMatchType] = useState(
    initialAutomation?.trigger_match_type === "contains" ? "contains" : "exact"
  );
  const [retriggering, setRetriggering] = useState(false);
  const [retriggerResult, setRetriggerResult] = useState(null);
  const [isActive, setIsActive] = useState(
    initialAutomation?.is_active !== false
  );
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
  const [openingEnabled, setOpeningEnabled] = useState(
    initialAutomation?.opening_dm_enabled !== false
  );
  const toggleOpeningEnabled = () => {
    setOpeningEnabled((current) => {
      const next = !current;
      if (!next) {
        setFollowRequired(false);
      }
      return next;
    });
  };
  const [openingMessage, setOpeningMessage] = useState(
    initialAutomation?.opening_dm_message || DEFAULT_OPENING
  );
  const [openingButtonText, setOpeningButtonText] = useState(
    initialAutomation?.opening_dm_button_text || "Get Details"
  );
  const [successMessage, setSuccessMessage] = useState(
    initialAutomation?.success_message || DEFAULT_SUCCESS
  );
  const initialResourceButtons = Array.isArray(initialAutomation?.resource_buttons)
    ? initialAutomation.resource_buttons
    : initialAutomation?.resource_url
      ? [{
          label: initialAutomation.resource_button_label || "Open Details",
          url: initialAutomation.resource_url,
        }]
      : [{ label: "Open Details", url: "" }];
  const [resourceType, setResourceType] = useState(
    initialAutomation?.resource_type === "text" ? "text" : "link"
  );
  const [resourceButtons, setResourceButtons] = useState(initialResourceButtons);
  const [followRequired, setFollowRequired] = useState(
    initialAutomation?.opening_dm_enabled === false
      ? false
      : initialAutomation?.follow_required ?? true
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
  const validCommentReplies = commentReplies.filter((reply) => reply.trim());
  const publicReply = validCommentReplies.join(REPLY_SEPARATOR);
  const linkButtonsComplete =
    resourceType === "text" ||
    (resourceButtons.length > 0 &&
      resourceButtons.every(
        (button) => button.label.trim() && button.url.trim()
      ));
  const canSave =
    automationName.trim() &&
    triggerValue &&
    successMessage.trim() &&
    linkButtonsComplete &&
    (triggerType === "dm" || (selectedPost && publicReply.trim()));
  const payload = {
    name: automationName.trim(),
    user_id: user?.id,
    user_email: user?.email,
    media_id: triggerType === "comment" ? selectedPost : null,
    trigger_type: triggerType === "dm" ? "dm_keyword" : "comment",
    trigger_match_type: triggerMatchType,
    trigger_value: triggerValue,
    retrigger_enabled: false,
    message: [
      triggerType === "comment" && openingEnabled ? openingMessage : "",
      successMessage,
      ...(resourceType === "link"
        ? resourceButtons.map((button) => button.url)
        : []),
    ].filter(Boolean).join("\n\n"),
    public_reply: triggerType === "comment" ? publicReply : "",
    opening_dm_enabled: triggerType === "comment" && openingEnabled,
    opening_dm_message:
      triggerType === "comment" && openingEnabled ? openingMessage : "",
    opening_dm_button_text: openingButtonText,
    follow_required: triggerType === "comment" && followRequired,
    not_following_message: notFollowingMessage,
    visit_profile_button_text: visitProfileButtonText,
    confirm_follow_button_text: confirmFollowButtonText,
    still_not_following_message: stillNotFollowingMessage,
    success_message: successMessage,
    resource_type: resourceType,
    resource_url: resourceType === "link" ? resourceButtons[0]?.url || "" : "",
    resource_button_label:
      resourceType === "link" ? resourceButtons[0]?.label || "Open Details" : "",
    resource_buttons: resourceType === "link" ? resourceButtons : [],
    is_active: isActive,
  };

  const saveAutomation = async () => {
    if (!canSave) {
      alert(
        !successMessage.trim()
          ? "Add response message text."
          : !linkButtonsComplete
            ? "Add a label and URL for every link button."
            : triggerType === "dm"
              ? "Add a name and at least one DM keyword."
              : "Add a name, select a post, add a keyword, and add at least one comment reply."
      );
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

  const retriggerMissedComments = async () => {
    if (!editing) {
      setRetriggerResult({
        tone: "info",
        message: "Create the automation first, then use Re-Trigger to check missed comments.",
      });
      return;
    }

    try {
      setRetriggering(true);
      setRetriggerResult(null);
      const { data } = await api.post(
        `/webhook/retrigger/${initialAutomation.id}`,
        { userEmail: user?.email }
      );
      setRetriggerResult({
        tone: data.failed ? "warning" : "success",
        message: `Checked ${data.checked} comments. ${data.eligible} matched this automation. Responded to ${data.processed} missed comments, skipped ${data.already_handled} already handled comments${data.not_matching ? `, ignored ${data.not_matching} comments that did not match the keyword` : ""}${data.failed ? `, and ${data.failed} could not be processed` : ""}.`,
      });
    } catch (err) {
      setRetriggerResult({
        tone: "error",
        message:
          err.response?.data?.error ||
          err.message ||
          "Failed to check missed comments.",
      });
    } finally {
      setRetriggering(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <ChevronUp className="h-5 w-5 -rotate-90" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <span className="hidden h-7 w-px bg-slate-200 sm:block" />
          <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">
            Instagram
          </span>
          <h2 className="truncate text-lg font-bold text-slate-950 sm:text-xl">
            {automationName.trim() || (editing ? "Edit Automation" : "Create Automation")}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {triggerType === "comment" && <button
            type="button"
            onClick={retriggerMissedComments}
            disabled={retriggering}
            title="Check the selected post for comments this automation missed"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-700 transition hover:border-brand-400 hover:bg-brand-100 disabled:cursor-wait disabled:opacity-60"
          >
            <RotateCcw className={`h-4 w-4 ${retriggering ? "animate-spin" : ""}`} />
            {retriggering ? "Checking..." : "Re-Trigger"}
          </button>}
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4">
            <span className="text-sm font-bold text-slate-700">Status</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label="Automation status"
              onClick={() => setIsActive((current) => !current)}
              className={`relative h-7 w-12 rounded-full transition ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${isActive ? "left-6" : "left-1"}`} />
            </button>
          </div>
          <button
            type="button"
            onClick={saveAutomation}
            disabled={saving || !canSave}
            className="btn-primary col-span-2 min-h-11 justify-center sm:col-span-1"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Automation"}
          </button>
        </div>
      </div>

      {retriggerResult && (
        <div
          role="status"
          className={`mx-5 mt-5 rounded-lg border px-4 py-3 text-sm font-medium sm:mx-8 ${
            retriggerResult.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : retriggerResult.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : retriggerResult.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          {retriggerResult.message}
        </div>
      )}

      <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8">
        <BuilderSection step="1" title="Name your automation">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Name
            </span>
            <input
              className="input text-lg"
              value={automationName}
              onChange={(event) => setAutomationName(event.target.value)}
              placeholder="Example: Accenture referral link"
            />
          </label>
        </BuilderSection>

        <BuilderSection step="2" title="Select trigger">
          <TriggerDropdown
            value={triggerType}
            onChange={(value) => {
              setTriggerType(value);
              if (value === "dm") setOpeningEnabled(false);
            }}
          />
        </BuilderSection>

        {triggerType === "comment" && <BuilderSection step="3" title="Select post">
          <SetupActionCard
            icon={<Image className="h-7 w-7" />}
            title={selectedPost ? "Post or Reel selected" : "Select Post or Reel"}
            description={
              selectedPostData?.caption ||
              "Pick the Instagram media that should listen for comments."
            }
            actionLabel={selectedPost ? "Change" : "Select"}
            imageUrl={selectedPostData?.thumbnail_url || selectedPostData?.media_url}
            complete={Boolean(selectedPost)}
            onClick={() => setModal("post")}
          />
        </BuilderSection>}

        <BuilderSection step={triggerType === "dm" ? "3" : "4"} title="Select keyword">
          <SetupActionCard
            icon={<Languages className="h-7 w-7" />}
            title={anyKeyword ? "Any keyword" : keywords.length ? keywords.join(", ") : "Setup Keywords"}
            description={
              triggerType === "dm"
                ? `Inbound DMs that ${triggerMatchType === "contains" ? "contain" : "exactly match"} these words will start the automation.`
                : "Comments matching these words will start the automation."
            }
            actionLabel="Edit"
            complete={Boolean(triggerValue)}
            onClick={() => setModal("keywords")}
          />
        </BuilderSection>

        {triggerType === "comment" && <BuilderSection step="5" title="Reply to the comment">
          <SetupActionCard
            icon={<MessageCircle className="h-7 w-7" />}
            title={
              commentReplies.length
                ? `${commentReplies.length} public ${commentReplies.length === 1 ? "reply" : "replies"}`
                : "Setup Comment Replies"
            }
            description={commentReplies[0] || "Keep this short, like: Sent, check your DM."}
            actionLabel="Edit"
            complete={Boolean(publicReply.trim())}
            onClick={() => setModal("replies")}
          />
        </BuilderSection>}

        <FlowPreview
          openingEnabled={openingEnabled}
          toggleOpeningEnabled={toggleOpeningEnabled}
          openingMessage={openingMessage}
          setOpeningMessage={setOpeningMessage}
          openingButtonText={openingButtonText}
          setOpeningButtonText={setOpeningButtonText}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          resourceType={resourceType}
          setResourceType={setResourceType}
          resourceButtons={resourceButtons}
          setResourceButtons={setResourceButtons}
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
          triggerType={triggerType}
        />

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
          matchType={triggerMatchType}
          setMatchType={setTriggerMatchType}
          subject={triggerType === "dm" ? "DM" : "comment"}
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

function BuilderSection({ step, title, children }) {
  return (
    <section className="relative border-l-2 border-slate-100 pl-6 sm:pl-8">
      <div className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white ring-4 ring-white">
        {step}
      </div>
      <h3 className="mb-4 text-lg font-bold text-slate-800 sm:text-xl">{title}</h3>
      {children}
    </section>
  );
}

function TriggerDropdown({ value, onChange }) {
  const selected =
    TRIGGER_OPTIONS.find((option) => option.value === value) ||
    TRIGGER_OPTIONS[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Trigger type
        </span>
        <div className="relative">
          <select
            className="input appearance-none pr-12 text-lg font-bold"
            value={selected.value}
            onChange={(event) => onChange(event.target.value)}
          >
            {TRIGGER_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={!option.available}
              >
                {option.title}
                {option.available ? "" : " - Coming soon"}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>
      </label>
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Zap className="h-4 w-4 text-brand-600" />
        {selected.description}
      </div>
    </div>
  );
}

function SetupActionCard({
  icon,
  title,
  description,
  actionLabel,
  imageUrl,
  complete,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md sm:p-5"
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-slate-400">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          icon
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-lg font-bold text-slate-950">
            {title}
          </span>
          {complete && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              Done
            </span>
          )}
        </span>
        <span className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">
          {description}
        </span>
      </span>
      <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-brand-700 transition group-hover:border-brand-200 group-hover:bg-brand-50">
        {actionLabel}
      </span>
    </button>
  );
}

function PostModal({ posts, selectedPost, setSelectedPost, onClose }) {
  return (
    <Modal title="Select Post or Reel" onClose={onClose}>
      <PostSelector posts={posts} selectedPost={selectedPost} onSelect={setSelectedPost} />
      <button
        type="button"
        onClick={onClose}
        disabled={!selectedPost}
        className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
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
  matchType,
  setMatchType,
  subject = "comment",
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
      {subject === "DM" && (
        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Match type</span>
          <select
            className="input text-lg font-semibold"
            value={matchType}
            onChange={(event) => setMatchType(event.target.value)}
          >
            <option value="exact">Exact match</option>
            <option value="contains">Contains</option>
          </select>
        </label>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input text-lg"
          placeholder="Type keyword, e.g. link"
          value={draft}
          disabled={anyKeyword}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addKeyword();
            }
          }}
        />
        <button
          type="button"
          onClick={addKeyword}
          disabled={anyKeyword || !draft.trim()}
          className="btn-secondary justify-center sm:w-32"
        >
          Add
        </button>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <span className="text-lg font-semibold text-slate-950">Any keyword</span>
          <p className="text-sm font-medium text-slate-500">
            Use this when every {subject} should trigger the flow.
          </p>
        </div>
        <Toggle enabled={anyKeyword} onChange={() => setAnyKeyword(!anyKeyword)} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {keywords.map((keyword) => (
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
        {!anyKeyword && keywords.length === 0 && (
          <span className="rounded-lg border border-dashed border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
            Add at least one keyword
          </span>
        )}
        {anyKeyword && (
          <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            Every {subject} will trigger
          </span>
        )}
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
    setReplies(next);
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
          <div key={index} className="flex items-center gap-4 border-b border-slate-100 pb-4">
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
  toggleOpeningEnabled,
  openingMessage,
  setOpeningMessage,
  openingButtonText,
  setOpeningButtonText,
  successMessage,
  setSuccessMessage,
  resourceType,
  setResourceType,
  resourceButtons,
  setResourceButtons,
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
  triggerType,
}) {
  const [addResponseOpen, setAddResponseOpen] = useState(false);
  const [followEditorOpen, setFollowEditorOpen] = useState(false);
  const responseEditorRef = useRef(null);

  const addResponseText = () => {
    setSuccessMessage((current) => current.trim() || DEFAULT_SUCCESS);
    setAddResponseOpen(false);
    requestAnimationFrame(() => {
      responseEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      responseEditorRef.current?.focus();
      responseEditorRef.current?.select();
    });
  };

  const clearResponse = () => {
    setSuccessMessage("");
    setResourceType("text");
    setResourceButtons([{ label: "Open Details", url: "" }]);
  };

  const addTextResponse = () => {
    setResourceType("text");
    addResponseText();
  };

  const addLinkResponse = () => {
    setResourceType("link");
    setResourceButtons((current) =>
      current.length ? current : [{ label: "Open Details", url: "" }]
    );
    addResponseText();
  };

  const updateResourceButton = (index, field, value) => {
    setResourceButtons((current) =>
      current.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, [field]: value } : button
      )
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-950">Response Flow</h3>
          <p className="text-sm font-medium text-slate-500">
            {triggerType === "dm"
              ? "This response is sent when an incoming DM matches the trigger."
              : "This is what happens after the public comment reply."}
          </p>
        </div>
      </div>

      {triggerType === "comment" && <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
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
          <div className="flex items-center gap-3">
            <Toggle enabled={openingEnabled} onChange={toggleOpeningEnabled} />
            <button type="button" className="rounded-lg border border-slate-200 bg-white p-3 text-slate-500">
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-5 py-8 sm:px-6 sm:py-10">
          {openingEnabled ? (
            <MessageCard
              message={openingMessage}
              buttonLabel={openingButtonText}
              onMessageChange={setOpeningMessage}
              onButtonChange={setOpeningButtonText}
            />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
              Opening message is off. The response message will be sent immediately after the public comment reply.
            </div>
          )}
        </div>
      </div>}

      {openingEnabled && followRequired && (
        <FollowGateCard
          notFollowingMessage={notFollowingMessage}
          visitProfileButtonText={visitProfileButtonText}
          confirmFollowButtonText={confirmFollowButtonText}
          stillNotFollowingMessage={stillNotFollowingMessage}
          onEdit={() => setFollowEditorOpen(true)}
          onRemove={() => setFollowRequired(false)}
        />
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-100 p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl font-bold text-white">
            1
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-slate-950">Resource Message</h3>
            <p className="text-sm font-semibold text-slate-500">
              {triggerType === "dm"
                ? "Sent immediately when an incoming DM matches the trigger."
                : "Sent after Get Details, or after follow gate passes."}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
        <div className="rounded-lg bg-white p-5">
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Message
          </label>
          <textarea
            ref={responseEditorRef}
            className="input min-h-[90px] resize-none border-dashed text-lg"
            value={successMessage}
            onChange={(event) => setSuccessMessage(event.target.value)}
            maxLength={1000}
          />
          <p className="mt-2 text-right text-sm font-semibold text-slate-400">
            {successMessage.length}/1000
          </p>
          {resourceType === "link" && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Link2 className="h-4 w-4" />
                  Link buttons
                </span>
                {resourceButtons.length < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setResourceButtons((current) => [
                        ...current,
                        { label: `Open Link ${current.length + 1}`, url: "" },
                      ])
                    }
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add button
                  </button>
                )}
              </div>
              {resourceButtons.map((button, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                      Button {index + 1} label
                    </span>
                    <input
                      className="input"
                      value={button.label}
                      onChange={(event) => updateResourceButton(index, "label", event.target.value)}
                      placeholder="Open Details"
                      maxLength={20}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                      URL
                    </span>
                    <input
                      className="input"
                      value={button.url}
                      onChange={(event) => updateResourceButton(index, "url", event.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </label>
                  {resourceButtons.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setResourceButtons((current) =>
                          current.filter((_, buttonIndex) => buttonIndex !== index)
                        )
                      }
                      className="self-end rounded-lg p-3 text-red-500 hover:bg-red-50"
                      title={`Remove button ${index + 1}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <p className="text-xs font-semibold text-slate-400">
                Add up to three link buttons.
              </p>
            </div>
          )}
          {triggerType === "comment" && followRequired && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <span>This resource is protected by the follow gate.</span>
            </div>
          )}
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
          openingEnabled={openingEnabled}
          followRequired={followRequired}
          onAddFollowGate={() => {
            setFollowRequired(true);
            setAddResponseOpen(false);
            setFollowEditorOpen(true);
          }}
          onAddText={addTextResponse}
          onAddLink={addLinkResponse}
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

function AddResponseModal({
  openingEnabled,
  followRequired,
  onAddFollowGate,
  onAddText,
  onAddLink,
  onClose,
}) {
  const followDisabled = followRequired || !openingEnabled;

  return (
    <Modal title="Add Response" onClose={onClose}>
      <div className="space-y-4">
        {!openingEnabled && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-base font-semibold text-amber-900">
            Opening message is turned off, so follow gate is unavailable. Turn opening message on to use Get Details and follow check.
          </div>
        )}
        <ResponseOption
          title="Ask For Follow"
          description={
            !openingEnabled
              ? "Requires Opening Message"
              : followRequired
              ? "Follow gate is already in this flow"
              : "Request users to follow your account"
          }
          icon={<Crown className="h-6 w-6" />}
          highlighted
          disabled={followDisabled}
          onClick={onAddFollowGate}
        />
        <ResponseOption
          title="Card Message"
          description="Coming soon"
          disabled
        />
        <ResponseOption
          title="Text Message"
          description="Send a simple text-only response"
          onClick={onAddText}
        />
        <ResponseOption
          title="Send Link"
          description="Send text with up to three URL buttons"
          icon={<Link2 className="h-6 w-6" />}
          onClick={onAddLink}
        />
        <ResponseOption
          title="Image Message"
          description="Coming soon"
          disabled
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
