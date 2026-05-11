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
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        fontSize: "1.25em",
        ...style,
      }}
    >
      🤲
    </span>
  );
}
