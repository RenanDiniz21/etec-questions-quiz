import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Question, QuestionBlock } from "./types";
import questionsData from "./data/questions.json";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateExplanation(q: Question): string {
  const base = `A alternativa correta é "${q.answer}".`;
  const subject = q.__subject?.toLowerCase() ?? "";

  if (subject.includes("biologia"))
    return `${base} Essa opção corresponde ao funcionamento biológico descrito.`;

  if (subject.includes("química"))
    return `${base} A resposta está alinhada com as propriedades químicas citadas.`;

  if (subject.includes("português") || subject.includes("literatura"))
    return `${base} A alternativa corresponde à interpretação adequada do texto.`;

  if (subject.includes("geografia") || subject.includes("história"))
    return `${base} A resposta reflete os fatos geográficos ou históricos do enunciado.`;

  return base;
}

export default function App() {
  // Processa os dados direto do import (síncrono)
  const data = useMemo(() => {
    const flat: Question[] = [];

    for (const block of questionsData as QuestionBlock[]) {
      for (const q of block.questions) {
        flat.push({
          ...q,
          __subject: block.subject,
          __sourceText: block.text,
        });
      }
    }

    return flat;
  }, []);

  const [subjectFilter, setSubjectFilter] = useState("Todas");
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);

  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState(0);

  const subjects = useMemo(() => {
    const s = Array.from(new Set(data.map((q) => q.__subject)));
    return ["Todas", ...s];
  }, [data]);

  useEffect(() => {
    const pool =
      subjectFilter === "Todas"
        ? data
        : data.filter((q) => q.__subject === subjectFilter);

    const pick = shuffle(pool).slice(0, 10);

    setQuestionPool(pool);
    setSelectedQuestions(pick);

    setAnswers({});
    setShowAnswers({});
    setScore(0);
  }, [subjectFilter, data]);

  function selectOption(qid: string, index: number) {
    if (showAnswers[qid]) return;
    setAnswers((prev) => ({ ...prev, [qid]: index }));
  }

  function reveal(q: Question) {
    const chosen = answers[q.id];
    const correctIdx = q.options.indexOf(q.answer);

    if (!showAnswers[q.id] && chosen === correctIdx)
      setScore((s) => s + 1);

    setShowAnswers((prev) => ({ ...prev, [q.id]: true }));
  }

  function revealAll() {
    let total = 0;
    const newShow: Record<string, boolean> = {};

    for (const q of selectedQuestions) {
      const chosen = answers[q.id];
      const correctIdx = q.options.indexOf(q.answer);

      if (chosen === correctIdx) total++;

      newShow[q.id] = true;
    }

    setScore(total);
    setShowAnswers(newShow);
  }

  function nextDraw() {
    const pick = shuffle(questionPool).slice(0, 10);
    setSelectedQuestions(pick);
    setAnswers({});
    setShowAnswers({});
    setScore(0);
  }

  return (
    <div className="container">
      <header className="header">
        <h1>ETEC Quiz</h1>
        <div className="score">
          Pontuação: <strong>{score}</strong> / {selectedQuestions.length}
        </div>
      </header>

      <div className="controls">
        <label>Matéria:</label>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <button onClick={nextDraw}>Novo Sorteio</button>
        <button onClick={revealAll}>Revelar Todas</button>
      </div>

      {selectedQuestions.map((q, i) => {
        const selected = answers[q.id];
        const correctIdx = q.options.indexOf(q.answer);

        return (
          <div className="question-card" key={q.id}>
            <div className="subject">{q.__subject}</div>

            {q.__sourceText && (
              <div className="source-text">{q.__sourceText}</div>
            )}

            <div className="question">
              {i + 1}. {q.question}
            </div>

            <div className="options">
              {q.options.map((opt, idx) => {
                const isSelected = selected === idx;
                const isCorrect = correctIdx === idx;

                const cls = [
                  "option",
                  isSelected ? "selected" : "",
                  showAnswers[q.id] && isCorrect ? "correct" : "",
                  showAnswers[q.id] && isSelected && !isCorrect ? "wrong" : "",
                ].join(" ");

                return (
                  <div
                    key={idx}
                    className={cls}
                    onClick={() => selectOption(q.id, idx)}
                  >
                    <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                  </div>
                );
              })}
            </div>

            <div className="buttons">
              <button onClick={() => reveal(q)}>Mostrar Resposta</button>
              <button
                onClick={() => {
                  setAnswers((a) => ({ ...a, [q.id]: undefined }));
                  setShowAnswers((s) => ({ ...s, [q.id]: false }));
                }}
              >
                Limpar
              </button>
            </div>

            {showAnswers[q.id] && (
              <div className="explanation">
                <strong>Resposta correta:</strong> {q.answer}
                <p>{q.explanation || generateExplanation(q)}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
