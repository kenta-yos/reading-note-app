/**
 * Anthropic API エラー判定ヘルパー
 */

/**
 * クレジット不足・レート制限エラーかどうかを判定
 */
export function isCreditOrRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("credit") ||
    msg.includes("billing") ||
    msg.includes("insufficient") ||
    msg.includes("quota") ||
    msg.includes("rate_limit") ||
    msg.includes("429") ||
    msg.includes("402")
  );
}

/**
 * ユーザー向けのエラーメッセージを生成
 */
export function getAnthropicErrorMessage(error: unknown): string {
  if (isCreditOrRateLimitError(error)) {
    return "Claude APIのクレジットが不足しているか、レート制限に達しています。Anthropicコンソールでクレジット残高を確認してください。";
  }
  return error instanceof Error ? error.message : "不明なエラーが発生しました";
}
