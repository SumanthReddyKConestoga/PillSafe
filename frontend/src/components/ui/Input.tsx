import { forwardRef, type InputHTMLAttributes, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = Boolean(props.value || props.defaultValue);

    return (
      <div className="w-full">
        <div className="floating-label-group">
          <input
            ref={ref}
            id={inputId}
            aria-describedby={[error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
            aria-invalid={Boolean(error)}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            placeholder=" "
            className={[
              'peer block w-full rounded-lg border px-3.5 pt-5 pb-2.5 text-sm',
              'text-neutral-900 bg-white',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              error
                ? 'border-danger focus:ring-danger'
                : 'border-neutral-200 hover:border-neutral-500',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={[
              'absolute left-3.5 top-4 text-sm pointer-events-none transition-all duration-150 origin-left',
              isFocused || hasValue
                ? 'translate-y-[-0.8rem] scale-[0.82] bg-white px-1'
                : '',
              isFocused ? 'text-primary' : error ? 'text-danger' : 'text-neutral-500',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
          </label>
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger flex items-center gap-1">
            <span aria-hidden="true">&#9679;</span>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-neutral-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
