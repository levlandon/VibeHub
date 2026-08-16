import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { IconCheck, IconChevronDown } from "../../icons";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
  description?: string;
}

export interface SingleSelectProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  renderOption?: (option: SelectOption, isSelected: boolean) => ReactNode;
}

export interface MultiSelectProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
  options: (SelectOption | string)[];
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  renderOption?: (option: SelectOption, isSelected: boolean) => ReactNode;
}

export type SelectProps = SingleSelectProps | MultiSelectProps;

export function Select(props: SelectProps) {
  const {
    options: rawOptions,
    value,
    onChange,
    label,
    placeholder = "Выберите...",
    searchable = false,
    searchPlaceholder = "Поиск...",
    disabled = false,
    className,
    id,
    "aria-label": ariaLabel,
    renderOption,
    multiple = false,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normalize options array
  const options: SelectOption[] = useMemo(() => {
    return rawOptions.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt,
    );
  }, [rawOptions]);

  // Selected values (multi vs single)
  const selectedValues = useMemo<string[]>(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }
    return typeof value === "string" && value ? [value] : [];
  }, [multiple, value]);

  // Display text in trigger button
  const triggerDisplayValue = useMemo(() => {
    if (multiple) {
      if (selectedValues.length === 0) {
        return placeholder || "Все";
      }
      if (selectedValues.length === 1) {
        const found = options.find((opt) => opt.value === selectedValues[0]);
        return found ? found.label : selectedValues[0];
      }
      return `${selectedValues.length}`;
    }

    const found = options.find((opt) => opt.value === value);
    return found ? found.label : placeholder;
  }, [multiple, selectedValues, options, value, placeholder]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  // Reset focus index and search query on open / close
  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery("");
    const firstSelectedVal = selectedValues[0];
    const selectedIdx = options.findIndex((opt) => opt.value === firstSelectedVal);
    setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [disabled, options, selectedValues]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [isOpen, closeDropdown, openDropdown]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, closeDropdown]);

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      const activeItem = items[focusedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, focusedIndex]);

  const handleSelectOption = useCallback(
    (optValue: string) => {
      if (multiple) {
        const next = selectedValues.includes(optValue)
          ? selectedValues.filter((v) => v !== optValue)
          : [...selectedValues, optValue];
        (onChange as (val: string[]) => void)(next);
      } else {
        (onChange as (val: string) => void)(optValue);
        closeDropdown();
      }
    },
    [multiple, selectedValues, onChange, closeDropdown],
  );

  // Keyboard navigation on Trigger button
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDropdown();
    }
  };

  // Keyboard navigation inside Dropdown / Options
  const handleDropdownKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1,
      );
    } else if (e.key === "Enter" || (multiple && e.key === " ")) {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[focusedIndex].value);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIndex(filteredOptions.length - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.selectWrapper} ${className || ""}`}
      onKeyDown={isOpen ? handleDropdownKeyDown : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} ${
          disabled ? styles.triggerDisabled : ""
        }`}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
      >
        {label ? <span className={styles.triggerLabel}>{label}:</span> : null}
        <span className={styles.triggerValue}>{triggerDisplayValue}</span>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
          aria-hidden
        >
          <IconChevronDown width={14} height={14} />
        </span>
      </button>

      {isOpen ? (
        <div className={styles.dropdown} role="presentation">
          {searchable ? (
            <div className={styles.searchHeader}>
              <input
                ref={searchInputRef}
                type="search"
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={searchPlaceholder}
              />
            </div>
          ) : null}

          <ul
            ref={listRef}
            className={styles.optionsList}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              focusedIndex >= 0 && filteredOptions[focusedIndex]
                ? `select-opt-${filteredOptions[focusedIndex].value}`
                : undefined
            }
          >
            {filteredOptions.length === 0 ? (
              <li className={styles.emptyState}>Ничего не найдено</li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = multiple
                  ? selectedValues.includes(opt.value)
                  : opt.value === value;
                const isFocused = idx === focusedIndex;

                return (
                  <li
                    key={opt.value}
                    id={`select-opt-${opt.value}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${
                      isSelected ? styles.optionSelected : ""
                    } ${isFocused ? styles.optionFocused : ""}`}
                    onClick={() => handleSelectOption(opt.value)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    {multiple ? (
                      <span
                        className={`${styles.checkbox} ${
                          isSelected ? styles.checkboxChecked : ""
                        }`}
                        aria-hidden
                      >
                        {isSelected ? <IconCheck width={11} height={11} /> : null}
                      </span>
                    ) : null}

                    <span className={styles.optionText}>
                      {renderOption
                        ? renderOption(opt, isSelected)
                        : opt.label}
                    </span>

                    {!multiple && isSelected ? (
                      <span className={styles.optionCheck} aria-hidden>
                        <IconCheck width={14} height={14} />
                      </span>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

