import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../utils';

interface CheckboxProps extends Omit<HTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, label, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          id={checkboxId}
          className={cn(
            'h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary',
            className
          )}
          ref={ref}
          checked={checked}
          {...props}
        />
        <label
          htmlFor={checkboxId}
          className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
        >
          {label}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };