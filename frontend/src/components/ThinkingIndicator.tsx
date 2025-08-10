export default function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-stone-500 px-2">
      <span>Thinking</span>
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1 h-1 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1 h-1 bg-stone-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
}
