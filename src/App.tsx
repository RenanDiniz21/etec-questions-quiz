import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Question, QuestionBlock } from "./types";

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
  const [blocks, setBlocks] = useState<QuestionBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vestibularFilter, setVestibularFilter] = useState("Todos");
  const [subjectFilter, setSubjectFilter] = useState("Todas");
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);

  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}questions.json`
        );
        if (!response.ok) {
          throw new Error("Não foi possível carregar as questões.");
        }
        const payload = (await response.json()) as QuestionBlock[];
        if (isMounted) {
          setBlocks(payload);
          setLoadError(null);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Erro ao carregar as questões."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, []);

  const vestibulares = useMemo(() => {
    const v = Array.from(new Set(blocks.map((block) => block.vestibular)));
    return ["Todos", ...v];
  }, [blocks]);

  const filteredBlocks = useMemo(() => {
    return vestibularFilter === "Todos"
      ? blocks
      : blocks.filter((block) => block.vestibular === vestibularFilter);
  }, [blocks, vestibularFilter]);

  const subjects = useMemo(() => {
    const s = Array.from(new Set(filteredBlocks.map((block) => block.subject)));
    return ["Todas", ...s];
  }, [filteredBlocks]);

  const availableQuestions = useMemo(() => {
    const flat: Question[] = [];
    const scopedBlocks =
      subjectFilter === "Todas"
        ? filteredBlocks
        : filteredBlocks.filter((block) => block.subject === subjectFilter);

    for (const block of scopedBlocks) {
      for (const q of block.questions) {
        flat.push({
          ...q,
          __subject: block.subject,
          __sourceText: block.text,
        });
      }
    }

    return flat;
  }, [filteredBlocks, subjectFilter]);

  useEffect(() => {
    if (!availableQuestions.length) {
      setQuestionPool([]);
      setSelectedQuestions([]);
      return;
    }

    const pick = shuffle(availableQuestions).slice(0, 10);

    setQuestionPool(availableQuestions);
    setSelectedQuestions(pick);

    setAnswers({});
    setShowAnswers({});
    setScore(0);
  }, [availableQuestions]);

  useEffect(() => {
    if (subjectFilter !== "Todas" && !subjects.includes(subjectFilter)) {
      setSubjectFilter("Todas");
    }
  }, [subjectFilter, subjects]);

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

      {isLoading ? (
        <div className="loading">Carregando questões...</div>
      ) : loadError ? (
        <div className="loading">{loadError}</div>
      ) : (
        <>
          <div className="controls">
            <label>Vestibular:</label>
            <select
              value={vestibularFilter}
              onChange={(e) => setVestibularFilter(e.target.value)}
            >
              {vestibulares.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>

            <label>Matéria:</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <button onClick={nextDraw} disabled={!questionPool.length}>
              Novo Sorteio
            </button>
            <button onClick={revealAll} disabled={!selectedQuestions.length}>
              Revelar Todas
            </button>
          </div>

          {selectedQuestions.length === 0 ? (
            <div className="loading">
              Nenhuma questão encontrada para os filtros selecionados.
            </div>
          ) : (
            selectedQuestions.map((q, i) => {
              const selected = answers[q.id];
              const correctIdx = q.options.indexOf(q.answer);

              return (
                <div className="question-card" key={q.id}>
                  <div className="subject">
                    {q.__subject} · {q.__sourceText ? "Texto base" : "Questão"}
                  </div>

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
                        showAnswers[q.id] && isSelected && !isCorrect
                          ? "wrong"
                          : "",
                      ].join(" ");

                      return (
                        <div
                          key={idx}
                          className={cls}
                          onClick={() => selectOption(q.id, idx)}
                        >
                          <strong>{String.fromCharCode(65 + idx)}.</strong>{" "}
                          {opt}
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
            })
          )}
        </>
      )}
    </div>
  );
}
