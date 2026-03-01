type Props = {
  className?: string;
};

export default function Skeleton({ className = "h-4 w-full" }: Props) {
  return (
    <div
      className={`animate-shimmer rounded ${className}`}
      aria-hidden="true"
    />
  );
}
