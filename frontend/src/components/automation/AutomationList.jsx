import {
  Edit3,
  MessageSquareText,
  Power,
  Trash2,
  Zap,
} from "lucide-react";

export default function AutomationList({
  automations = [],
  posts = [],
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
    <div className="space-y-4 md:space-y-0 md:overflow-hidden md:rounded-lg md:border md:border-slate-200 md:bg-white">
      <div className="hidden grid-cols-[96px_1.4fr_120px_150px_150px_180px] items-center border-b border-slate-100 bg-slate-50 px-8 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
        <span>Image</span>
        <span>Name</span>
        <span>Status</span>
        <span>Created</span>
        <span>Last modified</span>
        <span className="text-right">Actions</span>
      </div>

      {automations.map((automation) => {
        const post = postById.get(automation.media_id);
        const title = automation.name || automation.trigger_value || "Untitled";
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
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:hidden">
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
              Replies: {replies.length ? replies.join(" / ") : "Sent check the DM"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Resource locked until follower check
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
          <span>Created: {formatDate(automation.created_at)}</span>
          <span>Updated: {formatDate(automation.updated_at || automation.created_at)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
            title="View leads data"
          >
            Leads Data
          </button>
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

      <div className="hidden grid-cols-[96px_1.4fr_120px_150px_150px_180px] items-center border-b border-slate-100 px-8 py-4 last:border-b-0 md:grid">
        {image}

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">
            {title}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500">
            Replies: {replies.length ? replies.join(" / ") : "Sent check the DM"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            Resource locked until follower check
          </p>
        </div>

        {status}

        <span className="text-sm font-medium text-slate-500">
          {formatDate(automation.created_at)}
        </span>
        <span className="text-sm font-medium text-slate-500">
          {formatDate(automation.updated_at || automation.created_at)}
        </span>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
            title="View leads data"
          >
            Leads Data
          </button>
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
