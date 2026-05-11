interface DuaHandsIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function DuaHandsIcon({ className, style }: DuaHandsIconProps) {
  return (
    <span
      role="img"
      aria-hidden="true"
      className={className}
      style={{ fontSize: "1.25em", ...style }}
    >
      {"\u{1F932}"}
    </span>
  );
}
