import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
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
import RetriggerStatus from "./RetriggerStatus";
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
  const nameInputRef = useRef(null);
  const retriggerInFlight = useRef(false);
  const [automationName, setAutomationName] = useState(
    initialAutomation?.name || "Untitled automation"
  );
  const [triggerType, setTriggerType] = useState(
    initialAutomation
      ? initialAutomation.trigger_type === "dm_keyword" ? "dm" : "comment"
      : null
  );
  const [triggerMatchType, setTriggerMatchType] = useState(
    initialAutomation?.trigger_match_type === "contains" ? "contains" : "exact"
  );
  const [retriggering, setRetriggering] = useState(false);
  const [retriggerResult, setRetriggerResult] = useState(null);
  const [retriggerNoticeKey, setRetriggerNoticeKey] = useState(0);
  const isActive = initialAutomation?.is_active !== false;
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
    triggerType &&
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
    is_active: editing ? isActive : true,
  };

  const saveAutomation = async () => {
    if (!canSave) {
      alert(
        !successMessage.trim()
          ? "Add response message text."
          : !linkButtonsComplete
            ? "Add a label and URL for every link button."
            : !triggerType
              ? "Choose a trigger type."
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
    setRetriggerNoticeKey(current => current + 1);
    if (retriggerInFlight.current) {
      setRetriggerResult({ tone: "info", message: "Previous re-trigger is in progress." });
      return;
    }
    if (!editing) {
      setRetriggerResult({
        tone: "info",
        message: "Create the automation first, then use Re-Trigger to check missed comments.",
      });
      return;
    }

    try {
      retriggerInFlight.current = true;
      setRetriggering(true);
      setRetriggerResult(null);
      const { data } = await api.post(
        `/webhook/retrigger/${initialAutomation.id}`,
        { userEmail: user?.email }
      );
      setRetriggerResult({
        tone: data.failed ? "warning" : "success",
        message: data.failed
          ? "Re-trigger completed. Some comments need a retry."
          : "Automation re-triggered successfully.",
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
      retriggerInFlight.current = false;
      setRetriggering(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            title="Back to automations"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex max-w-xl items-center gap-1 rounded-md transition focus-within:bg-brand-50/50">
            <input
              ref={nameInputRef}
              style={{ width: `${Math.max(12, automationName.length + 1)}ch` }}
              value={automationName}
              onChange={(event) => setAutomationName(event.target.value)}
              aria-label="Automation name"
              maxLength={80}
              className="min-w-0 border-0 bg-transparent p-0 text-lg font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:ring-0 sm:text-xl"
              placeholder="Untitled automation"
            />
            <button type="button" aria-label="Edit automation name" title="Edit automation name"
              onClick={() => { nameInputRef.current?.focus(); nameInputRef.current?.select(); }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Set a trigger, then choose what JustDMs should send.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {triggerType === "comment" && <button
            type="button"
            onClick={retriggerMissedComments}
            aria-busy={retriggering}
            title="Check the selected post for comments this automation missed"
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
          >
            <RotateCcw className={`h-4 w-4 ${retriggering ? "animate-spin" : ""}`} />
            {retriggering ? "Checking..." : "Re-Trigger"}
          </button>}
          <button
            type="button"
            onClick={saveAutomation}
            disabled={saving || !canSave}
            className="btn-primary min-h-10 flex-1 justify-center px-4 sm:flex-none"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <RetriggerStatus loading={retriggering} result={retriggerResult} noticeKey={retriggerNoticeKey} />

      <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        <BuilderSection step="1" title={triggerType ? "Trigger" : "Select a trigger type"} complete={Boolean(triggerType)}>
          <TriggerDropdown
            value={triggerType}
            onChange={(value) => {
              setTriggerType(value);
              if (value === "dm") setOpeningEnabled(false);
            }}
            onClear={() => setTriggerType(null)}
          />
        </BuilderSection>

        {triggerType === "comment" && <BuilderSection step="2" title="Choose a post or reel" complete={Boolean(selectedPost)}>
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

        {triggerType && <BuilderSection step={triggerType === "dm" ? "2" : "3"} title="Choose a keyword" complete={Boolean(triggerValue)}>
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
        </BuilderSection>}

        {triggerType === "comment" && <BuilderSection step="4" title="Public reply" complete={Boolean(publicReply.trim())}>
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

        {triggerType && <FlowPreview
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
        />}

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

function BuilderSection({ step, title, complete = false, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${complete ? "bg-emerald-500" : "bg-slate-950"}`}>
          {complete ? <Check className="h-4 w-4" /> : step}
        </div>
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TriggerDropdown({ value, onChange, onClear }) {
  const selectedOption = TRIGGER_OPTIONS.find((option) => option.value === value);

  if (selectedOption) {
    const SelectedIcon = selectedOption.icon === "message" ? MessageCircle : Instagram;
    return (
      <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3 sm:p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <SelectedIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-950 sm:text-base">{selectedOption.title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500 sm:text-sm">{selectedOption.description}</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          aria-label="Change trigger type"
          title="Change trigger type"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {TRIGGER_OPTIONS.map((option) => {
        const selected = option.value === value;
        const TriggerIcon = option.icon === "message" ? MessageCircle : Instagram;
        return (
          <button
            key={option.value}
            type="button"
            disabled={!option.available}
            onClick={() => option.available && onChange(option.value)}
            aria-pressed={selected}
            className={`group relative flex min-h-[90px] items-start gap-3 rounded-lg border p-4 text-left transition ${
              !option.available
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                : selected
                  ? "border-brand-500 bg-brand-50/60 shadow-[0_0_0_2px_rgba(63,81,181,0.08)]"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-brand-600 text-white" : "bg-slate-50 text-brand-600"}`}>
              <TriggerIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block pr-6 text-sm font-bold leading-5 text-slate-950">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
            </span>
            {selected && option.available && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            {!option.available && (
              <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">Soon</span>
            )}
          </button>
        );
      })}
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
      className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/30 sm:p-4"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-slate-500 sm:h-14 sm:w-14">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          icon
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-sm font-bold text-slate-950 sm:text-base">
            {title}
          </span>
          {complete && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              Done
            </span>
          )}
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">
          {description}
        </span>
      </span>
      <span className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-brand-700 transition group-hover:border-brand-200 group-hover:bg-white sm:text-sm">
        {actionLabel}
      </span>
    </button>
  );
}

function PostModal({ posts, selectedPost, setSelectedPost, onClose }) {
  return (
    <Modal
      title="Select Post or Reel"
      onClose={onClose}
      action={
        <button
          type="button"
          onClick={onClose}
          disabled={!selectedPost}
          className="btn-primary min-h-10 justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Confirm
        </button>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Choose one post or reel</p>
          <p className="mt-0.5 text-xs text-slate-500">The automation will listen for matching comments on this media.</p>
        </div>
        {selectedPost && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Selected
          </span>
        )}
      </div>
      <PostSelector posts={posts} selectedPost={selectedPost} onSelect={setSelectedPost} />
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
    <Modal
      title="Setup Keywords"
      onClose={onClose}
      action={
        <button
          type="button"
          onClick={onClose}
          disabled={!anyKeyword && keywords.length === 0}
          className="btn-primary min-h-10 justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Confirm
        </button>
      }
    >
      <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3">
        <p className="text-sm font-bold text-slate-900">Choose what starts this automation</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Keywords are not case-sensitive. For example, Link and link are treated the same.
        </p>
      </div>

      {subject === "DM" && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-bold text-slate-700">How should it match?</p>
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {[{ value: "exact", label: "Exact match" }, { value: "contains", label: "Contains word" }].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMatchType(option.value)}
                className={`rounded-md px-3 py-2.5 text-sm font-bold transition ${
                  matchType === option.value
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-sm font-bold text-slate-700">Add keywords</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input text-base"
            placeholder="Type a keyword, e.g. link"
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
            className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:w-28"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="mt-4 min-h-12 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => setKeywords(keywords.filter((item) => item !== keyword))}
                disabled={anyKeyword}
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                {keyword}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
            {!anyKeyword && keywords.length === 0 && (
              <span className="text-sm font-medium text-slate-400">No keywords added yet</span>
            )}
            {anyKeyword && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Every {subject} will trigger
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <span className="text-sm font-bold text-slate-950">Trigger for any {subject}</span>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Ignore keywords and run for every incoming {subject}.</p>
        </div>
        <Toggle enabled={anyKeyword} onChange={() => setAnyKeyword(!anyKeyword)} />
      </div>
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
    <Modal
      title="Setup Comment Replies"
      onClose={onClose}
      action={
        <button type="button" onClick={onClose} className="btn-primary min-h-10 justify-center px-4">
          <Check className="h-4 w-4" />
          Confirm
        </button>
      }
    >
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold text-slate-900">Random public replies</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          JustDMs rotates these replies to keep comment responses natural. Add at least one.
        </p>
      </div>
      <div className="space-y-3">
        {currentReplies.map((reply, index) => (
          <div key={index} className="group rounded-lg border border-slate-200 bg-white p-3 transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[11px] text-white">{index + 1}</span>
                Reply {index + 1}
              </span>
            <button
              type="button"
              onClick={() => removeReply(index)}
                disabled={currentReplies.length === 1}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
              title="Delete reply"
            >
                <Trash2 className="h-4 w-4" />
            </button>
            </div>
            <textarea
              className="min-h-[72px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
              value={reply}
              onChange={(event) => updateReply(index, event.target.value)}
              placeholder="Example: Sent! Check your DM."
              maxLength={300}
            />
            <p className="mt-1 text-right text-[11px] font-medium text-slate-400">{reply.length}/300</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setReplies([...currentReplies, "Check your DM"])}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/30 px-5 py-3 text-sm font-bold text-brand-700 transition hover:border-brand-500 hover:bg-brand-50"
      >
        <Plus className="h-4 w-4" />
        Add another reply
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

      {triggerType === "comment" && (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Crown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-950">Ask for follow</h3>
              {followRequired && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">ON</span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">
              {openingEnabled
                ? "Verify that the user follows your account before sending the resource."
                : "Turn on the opening message to use follow verification."}
            </p>
          </div>
          <Toggle
            enabled={followRequired}
            disabled={!openingEnabled}
            onChange={() => setFollowRequired(!followRequired)}
          />
        </div>
      )}

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
  onAddText,
  onAddLink,
  onClose,
}) {
  return (
    <Modal title="Add Response" onClose={onClose}>
      <div>
        <p className="mb-5 text-sm leading-6 text-slate-500">
          Choose how the final response should be delivered. You can change it later.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
        <ResponseOption
          title="Text Message"
          description="Send a clean text-only reply"
          icon={<MessageCircle className="h-5 w-5" />}
          onClick={onAddText}
        />
        <ResponseOption
          title="Send Link"
          description="Send text with up to three URL buttons"
          icon={<Link2 className="h-5 w-5" />}
          highlighted
          onClick={onAddLink}
        />
        </div>
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
      className={`group relative flex min-h-[132px] w-full flex-col items-start gap-3 rounded-lg border p-4 text-left transition ${
        highlighted
          ? "border-brand-200 bg-brand-50/40 hover:border-brand-400 hover:bg-brand-50"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
      } ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          highlighted ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {icon || <MessageCircle className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <ChevronUp className="absolute right-4 top-4 h-4 w-4 rotate-90 text-slate-400 transition group-hover:text-brand-600" />
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

function Modal({ title, onClose, children, action = null }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-t-xl border border-slate-200 bg-white shadow-2xl sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Configure this step for your automation</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative h-10 w-20 rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${
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
