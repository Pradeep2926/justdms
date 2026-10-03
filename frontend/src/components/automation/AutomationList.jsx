import {
  Edit3,
  Instagram,
  MessageSquareText,
  Power,
  Trash2,
  Zap,
} from "lucide-react";

export default function AutomationList({
  automations = [],
  posts = [],
  account,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  const postById = new Map(posts.map((post) => [post.id, post]));

  if (automations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50">
          <Zap className="h-7 w-7 text-brand-500" />
        </div>
        <p className="font-medium text-slate-800">No automations yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Create a comment trigger to start replying automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-0 lg:overflow-hidden lg:rounded-lg lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm">
      <div className="hidden grid-cols-[76px_minmax(210px,1.5fr)_120px_120px_130px_150px_112px] items-center border-b border-slate-100 bg-slate-50/80 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
        <span>Image</span>
        <span>Name</span>
        <span>Messages sent</span>
        <span>Total clicks</span>
        <span>Followers gained</span>
        <span>Last modified</span>
        <span className="text-right">Actions</span>
      </div>

      {automations.map((automation) => {
        const post = postById.get(automation.media_id);
        const title =
          automation.name ||
          (automation.trigger_value === "*" ? "Untitled automation" : automation.trigger_value) ||
          "Untitled automation";
        const active = automation.is_active !== false;
        const replies = String(automation.public_reply || "")
          .split("\n---\n")
          .map((reply) => reply.trim())
          .filter(Boolean);

        return (
          <AutomationRow
            key={automation.id}
            automation={automation}
            active={active}
            post={post}
            account={account}
            replies={replies}
            title={title}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        );
      })}
    </div>
  );
}

function AutomationRow({
  automation,
  active,
  post,
  account,
  replies,
  title,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  const image = <AutomationImage post={post} />;
  const status = <StatusPill active={active} />;

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
        <div className="flex gap-3">
          {image}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-base font-semibold text-slate-900">
                {title}
              </p>
              {status}
            </div>
            <p className="text-sm text-slate-500">
              <Instagram className="mr-1 inline h-4 w-4 text-pink-500" />
              @{account?.username || "Instagram"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
          <Metric label="Messages" value={automation.messages_sent || 0} />
          <Metric label="Clicks" value={automation.total_clicks || 0} />
          <Metric label="Followers" value={automation.followers_gained || 0} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Updated {formatRelativeDate(automation.updated_at || automation.created_at)}</span>
          <div className="flex items-center gap-1">
            <ActionButtons
              automation={automation}
              active={active}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
            />
          </div>
        </div>
      </div>

      <div className="hidden grid-cols-[76px_minmax(210px,1.5fr)_120px_120px_130px_150px_112px] items-center border-b border-slate-100 px-6 py-5 transition hover:bg-slate-50/60 last:border-b-0 lg:grid">
        {image}

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">
            {title}
          </p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
            <Instagram className="h-4 w-4 shrink-0 text-pink-500" />
            @{account?.username || "Instagram"}
            <span className="text-slate-300">|</span>
            {status}
          </p>
        </div>

        <MetricValue value={automation.messages_sent || 0} />
        <MetricValue value={automation.total_clicks || 0} />
        <MetricValue value={automation.followers_gained || 0} />
        <span className="text-sm font-medium text-slate-500">{formatRelativeDate(automation.updated_at || automation.created_at)}</span>

        <div className="flex items-center justify-end gap-1">
          <ActionButtons
            automation={automation}
            active={active}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }) {
  return <div><p className="text-base font-bold text-slate-900">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>;
}

function MetricValue({ value }) {
  return <span className="text-center text-base font-semibold text-slate-600">{value}</span>;
}

function AutomationImage({ post }) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {post?.thumbnail_url || post?.media_url ? (
        <img
          src={post.thumbnail_url || post.media_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MessageSquareText className="h-5 w-5 text-slate-400" />
        </div>
      )}
    </div>
  );
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Paused"}
    </span>
  );
}

function ActionButtons({ automation, active, onEdit, onDelete, onToggleStatus }) {
  return (
    <>
      <button
        type="button"
        onClick={() => onEdit?.(automation)}
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        title="Edit automation"
      >
        <Edit3 className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus?.(automation)}
        className={`rounded-lg p-2 ${
          active
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        }`}
        title={active ? "Pause automation" : "Activate automation"}
      >
        <Power className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(automation)}
        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Delete automation"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </>
  );
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatRelativeDate(value) {
  if (!value) return "-";
  const elapsed = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.floor(elapsed / 3600000));
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}
