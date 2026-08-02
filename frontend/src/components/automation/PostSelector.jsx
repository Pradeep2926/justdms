import { Check } from "lucide-react";

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
            className={`group relative rounded-xl overflow-hidden border-2 transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              selected
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-transparent hover:border-slate-200"
            }`}
          >
            <img
              src={post.media_url || post.thumbnail_url}
              alt=""
              className="w-full aspect-square object-cover"
            />
            {selected && (
              <div className="absolute inset-0 bg-brand-600/20 flex items-center justify-center">
                <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
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
