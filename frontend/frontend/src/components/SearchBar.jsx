import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ onSearch, isLoading, defaultValue = '' }) {
  const [query, setQuery] = useState(defaultValue);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch(trimmed);
    navigate(`/?q=${encodeURIComponent(trimmed)}`, { replace: true });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 w-full"
      role="search"
    >
      {/* Input wrapper */}
      <div className="search-container flex-1">
        {/* Search icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="search-icon w-[18px] h-[18px]"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, algorithms, concepts…"
          className="search-input"
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear button */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
            title="Clear"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Submit button */}
      <button
        id="search-btn"
        type="submit"
        disabled={isLoading || !query.trim()}
        className="btn-primary h-[48px] shrink-0"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Searching
          </>
        ) : (
          'Search'
        )}
      </button>
    </form>
  );
}
