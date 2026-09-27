-- Mockup visual genuino de la propuesta (JSON estructurado para la demo)

alter table opportunities
  add column if not exists demo_mockup jsonb;
