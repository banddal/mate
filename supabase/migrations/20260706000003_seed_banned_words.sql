-- 초기 금지어 시드. 운영하며 계속 추가/조정 (Mate_Backend_Spec.md §7)
insert into banned_words (word, severity, category_hint) values
  ('실연', 'block', 'emotional_vulnerability'),
  ('우울', 'block', 'emotional_vulnerability'),
  ('외로움', 'block', 'emotional_vulnerability'),
  ('위로해줄 사람', 'block', 'emotional_vulnerability'),
  ('오늘 같이 있어줄 사람', 'block', 'emotional_vulnerability'),
  ('사례비', 'flag', 'cash_compensation'),
  ('페이', 'flag', 'cash_compensation'),
  ('용돈', 'flag', 'cash_compensation'),
  ('보상', 'flag', 'cash_compensation');
