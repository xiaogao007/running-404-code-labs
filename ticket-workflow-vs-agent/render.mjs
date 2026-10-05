// Display only verified structured decisions. A handoff decision is not an executed transfer.
import { validateFinal } from './lab.mjs';
export function renderDecision(f) {
  if (!validateFinal(f)) throw new Error('invalid-final');
  if (f.status === 'ask') return '请提供订单号后继续查询。';
  if (f.status === 'handoff') return '此问题需要人工处理；尚未提交转交请求。';
  const text = {WAIT_TRANSIT:'订单仍在配送途中，建议等待配送。',RETRY_PAYMENT:'订单支付失败，建议重新尝试支付。'};
  if (!f.adviceCodes.length || f.adviceCodes.some(c => !text[c])) throw new Error('unsupported-advice');
  return f.adviceCodes.map(c => text[c]).join(' ');
}
