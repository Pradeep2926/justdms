import { useState } from "react";
import { Check, Film } from "lucide-react";

export default function PostSelector({ posts, selectedPost, onSelect }) {
  if (posts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ImageIcon />
        </div>
        <p className="font-medium text-slate-700">No posts found</p>
        <p className="text-sm text-slate-500 mt-1">
          Connect Instagram and publish posts to set up automations.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {posts.map((post) => {
        const selected = selectedPost === post.id;
        return (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelect(post.id)}
            aria-label={`Select ${post.media_type === "VIDEO" ? "reel" : "post"}${
              post.caption ? `: ${post.caption}` : ""
            }`}
            aria-pressed={selected}
            className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              selected
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-transparent hover:border-slate-200"
            }`}
          >
            <PostPreview post={post} />
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-2 py-1 text-xs font-bold text-white">
              {post.media_type === "VIDEO" && <Film className="h-3.5 w-3.5" />}
              {post.media_type === "VIDEO" ? "Reel" : "Post"}
            </span>
            {selected && (
              <div className="absolute inset-0 flex items-center justify-center bg-brand-600/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 shadow-lg">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PostPreview({ post }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = post.thumbnail_url || post.media_url;

  if (!imageUrl || failed) {
    return <MissingPreview />;
  }

  return (
    <img
      src={imageUrl}
      alt={post.caption || (post.media_type === "VIDEO" ? "Instagram reel" : "Instagram post")}
      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
      onError={() => setFailed(true)}
    />
  );
}

function MissingPreview() {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
      <ImageIcon />
      <span className="text-xs font-semibold">Preview unavailable</span>
    </span>
  );
}

function ImageIcon() {
  return (
    <svg
      className="w-8 h-8 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
