type HapticPattern = "light" | "medium" | "success" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [10, 30, 10],
  error: [20, 50, 20, 50, 20],
};

export function haptic(pattern: HapticPattern = "light") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  } catch {
    // Safari/iOS does not support vibrate — no-op
  }
}
