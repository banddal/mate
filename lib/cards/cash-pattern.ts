// 현금성 패턴 판정 — 순수 로직(DB 비의존). Mate_Backend_Spec.md §7.
// title/description/host_offer/cost_info 전체 텍스트에 대해 금액 표현과 지급 의사 표현이
// 둘 다 매칭되면 현금성으로 간주한다("5만원 드립니다"처럼 키워드 없이 금액+지급의사만
// 표현한 문장을 잡기 위함).

const amountPattern = /\d+\s*(원|만원|천원)/;
const paymentIntentPattern = /(드립니다|드려요|드릴게요|지불|송금|입금|사례|페이|용돈|보상)/;

export function hasCashPaymentPattern(text: string): boolean {
  return amountPattern.test(text) && paymentIntentPattern.test(text);
}
