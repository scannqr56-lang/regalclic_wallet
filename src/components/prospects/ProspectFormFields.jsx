import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { touchSelectClassName, touchTextareaClassName } from '@/components/ui/form-layout';
import { cn } from '@/lib/utils';

export function FormField({ label, htmlFor, required, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-rc-orange"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function FormSelect({ id, value, onChange, options, placeholder = 'Sélectionner…' }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={touchSelectClassName}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function FormTextarea({ id, value, onChange, rows = 4, placeholder }) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={touchTextareaClassName}
    />
  );
}

export function FormInput({ id, type = 'text', value, onChange, placeholder }) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 text-base sm:text-sm"
    />
  );
}

export function FormGrid({ children, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {children}
    </div>
  );
}

export function ObjectionCheckboxes({ options, selected, onChange }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="h-4 w-4 rounded border-slate-300 text-rc-teal focus:ring-rc-teal"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
