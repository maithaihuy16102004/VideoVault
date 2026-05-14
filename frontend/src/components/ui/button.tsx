import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'secondary';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'default',
    className,
    children,
    ...props
}) => {
    const baseStyles = 'px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const variantStyles = {
        default: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    }[variant];
    return (
        <button className={cn(baseStyles, variantStyles, className)} {...props}>
            {children}
        </button>
    );
};
