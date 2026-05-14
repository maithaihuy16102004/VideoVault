/**
 * Simple classNames utility – concatenates truthy values.
 * Works like the popular `clsx` library but without extra deps.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}
