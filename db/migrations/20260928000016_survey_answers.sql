-- migrate:up

CREATE TABLE survey_answers (
  survey_response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  section text NOT NULL,
  question_no integer,
  question text NOT NULL,
  value text NOT NULL,
  kind text NOT NULL,
  PRIMARY KEY (survey_response_id, section, question),
  CONSTRAINT survey_answers_kind_check CHECK (kind IN ('yes', 'no', 'na', 'text'))
);

CREATE INDEX idx_survey_answers_section_kind ON survey_answers (section, kind);

-- migrate:down

DROP TABLE IF EXISTS survey_answers;
