import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

const normalizeOption = (option) =>
  typeof option === "string" ? { value: option, label: option } : option;

function Dropdown({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  name,
  disabled = false,
  loading = false,
  error = "",
  emptyMessage = "No options found",
  loadingMessage = "Loading options...",
  searchable = false,
  required = false,
  className = "",
  menuClassName = "",
}) {
  const id = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedOptions = useMemo(
    () => options.map(normalizeOption).filter(Boolean),
    [options]
  );
  const selectedOption = normalizedOptions.find(
    (option) => String(option.value) === String(value)
  );
  const filteredOptions = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    if (!searchText) return normalizedOptions;
    return normalizedOptions.filter((option) =>
      String(option.label).toLowerCase().includes(searchText)
    );
  }, [normalizedOptions, query]);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasError = Boolean(error);
  const isDisabled = disabled || loading;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  const selectOption = (option) => {
    if (!option || option.disabled) return;
    onChange?.(option.value, option);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event) => {
    if (isDisabled) return;

    if (!open && ["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setActiveIndex(0);
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      {name && (
        <input
          type='hidden'
          name={name}
          value={value ?? ""}
          required={required}
        />
      )}
      <button
        type='button'
        id={id}
        disabled={isDisabled}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-invalid={hasError}
        aria-required={required}
        onClick={() => {
          setActiveIndex(0);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left text-sm shadow-sm transition ${
          hasError
            ? "border-rose-300 text-rose-900 focus:ring-rose-100"
            : "border-slate-300 text-slate-900 hover:border-slate-400 focus:ring-sky-100"
        } focus:border-sky-600 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}>
        <span
          className={`min-w-0 truncate ${
            selectedOption ? "text-slate-950" : "text-slate-400"
          }`}>
          {loading
            ? loadingMessage
            : selectedOption?.label || placeholder}
        </span>
        {loading ? (
          <Loader2 size={17} className='shrink-0 animate-spin text-slate-400' />
        ) : (
          <ChevronDown
            size={17}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-sky-600" : ""
            }`}
          />
        )}
      </button>

      {open && !isDisabled && (
        <div
          className={`absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-950/5 transition ${menuClassName}`}>
          {searchable && (
            <div className='border-b border-slate-100 p-2'>
              <div className='relative'>
                <Search
                  size={15}
                  className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder='Search...'
                  className='h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100'
                />
              </div>
            </div>
          )}

          <div
            role='listbox'
            aria-labelledby={id}
            tabIndex={-1}
            className='max-h-64 overflow-y-auto py-1'>
            {filteredOptions.length === 0 ? (
              <div className='px-3 py-3 text-sm text-slate-500'>
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const selected = String(option.value) === String(value);
                const active = index === activeIndex;

                return (
                  <button
                    key={`${option.value}-${option.label}`}
                    type='button'
                    role='option'
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                    className={`flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-sky-50 font-semibold text-sky-800"
                        : active
                          ? "bg-slate-50 text-slate-950"
                          : "text-slate-700 hover:bg-slate-50"
                    } disabled:cursor-not-allowed disabled:text-slate-400`}>
                    <span className='min-w-0 truncate'>{option.label}</span>
                    {selected && <Check size={16} className='shrink-0 text-sky-600' />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className='mt-1.5 text-sm font-medium text-rose-600'>{error}</p>}
    </div>
  );
}

export default Dropdown;
