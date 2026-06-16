import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './OddOneOutGame.css'

export type OddOneOutGameResult = 'success' | 'fail'

export type OddOneOutGameProps = {
  durationSeconds?: number
  onFinish: (result: OddOneOutGameResult) => void
}

type WordItem = {
  id: string
  label: string
  isOk: boolean
}

type WordSet = {
  id: string
  title: string
  hint: string
  items: WordItem[]
}

const WORD_SETS: WordSet[] = [
  {
    id: 'fim-context-parts',
    title: 'Контекст для FIM-completion',
    hint: 'Что напрямую помогает модели дописать код в середине файла?',
    items: [
      { id: 'prefix', label: 'Prefix до курсора', isOk: true },
      { id: 'suffix', label: 'Suffix после курсора', isOk: true },
      { id: 'neighbor-symbols', label: 'Соседние символы файла', isOk: true },
      { id: 'full-git-history', label: 'Вся история Git за год', isOk: false },
    ],
  },
  {
    id: 'code-review-agent-inputs',
    title: 'Входы для AI code review',
    hint: 'Что стоит дать агенту, чтобы он ревьюил MR осмысленно?',
    items: [
      { id: 'mr-diff', label: 'Diff merge request-а', isOk: true },
      { id: 'changed-tests', label: 'Изменённые тесты', isOk: true },
      { id: 'ci-status', label: 'Статус CI-пайплайна', isOk: true },
      { id: 'repository-stars', label: 'Количество звёзд репозитория', isOk: false },
    ],
  },
  {
    id: 'useful-rag-signals',
    title: 'Сигналы для поиска контекста',
    hint: 'Что помогает найти релевантные куски кода для задачи?',
    items: [
      { id: 'bm25-score', label: 'BM25-score', isOk: true },
      { id: 'embedding-similarity', label: 'Embedding similarity', isOk: true },
      { id: 'recently-edited-files', label: 'Недавно редактируемые файлы', isOk: true },
      { id: 'alphabetical-order', label: 'Алфавитный порядок файлов', isOk: false },
    ],
  },
  {
    id: 'agent-tool-permissions',
    title: 'Права инструментов агента',
    hint: 'Что обычно стоит явно контролировать в агентной системе?',
    items: [
      { id: 'write-access', label: 'Право изменять файлы', isOk: true },
      { id: 'shell-access', label: 'Право запускать shell-команды', isOk: true },
      { id: 'network-access', label: 'Право ходить в сеть', isOk: true },
      { id: 'theme-access', label: 'Право менять тему IDE', isOk: false },
    ],
  },
  {
    id: 'agent-run-state',
    title: 'Состояние выполнения агентной задачи',
    hint: 'Что относится к состоянию agent run?',
    items: [
      { id: 'current-plan', label: 'Текущий план', isOk: true },
      { id: 'tool-call-log', label: 'Лог tool calls', isOk: true },
      { id: 'intermediate-patch', label: 'Промежуточный patch', isOk: true },
      { id: 'model-logo', label: 'Логотип модели', isOk: false },
    ],
  },
  {
    id: 'multi-agent-handoff',
    title: 'Передача задачи между агентами',
    hint: 'Что важно передать следующему агенту?',
    items: [
      { id: 'goal', label: 'Цель задачи', isOk: true },
      { id: 'constraints', label: 'Ограничения', isOk: true },
      { id: 'evidence', label: 'Найденные факты и ссылки', isOk: true },
      { id: 'temperature', label: 'Temperature прошлого запроса', isOk: false },
    ],
  },
  {
    id: 'safe-auto-fix',
    title: 'Безопасный auto-fix агентом',
    hint: 'Что снижает риск сломать прод?',
    items: [
      { id: 'small-diff', label: 'Маленький diff', isOk: true },
      { id: 'regression-test', label: 'Регрессионный тест', isOk: true },
      { id: 'ci-green', label: 'Зелёный CI', isOk: true },
      { id: 'longer-answer', label: 'Более длинный ответ модели', isOk: false },
    ],
  },
  {
    id: 'inline-edit-context',
    title: 'Контекст для inline edit',
    hint: 'Что реально влияет на качество точечной правки?',
    items: [
      { id: 'selected-code', label: 'Выделенный код', isOk: true },
      { id: 'user-instruction', label: 'Инструкция пользователя', isOk: true },
      { id: 'surrounding-code', label: 'Окружающий код', isOk: true },
      { id: 'file-created-date', label: 'Дата создания файла', isOk: false },
    ],
  },
  {
    id: 'requirements-agent-context',
    title: 'Контекст для агента-аналитика',
    hint: 'Что поможет агенту уточнить требования?',
    items: [
      { id: 'user-story', label: 'User story', isOk: true },
      { id: 'acceptance-criteria', label: 'Acceptance criteria', isOk: true },
      { id: 'figma-flow', label: 'Figma-flow', isOk: true },
      { id: 'branch-name-style', label: 'Стиль названий веток', isOk: false },
    ],
  },
  {
    id: 'test-generation-context',
    title: 'Контекст для генерации тестов',
    hint: 'Что помогает сгенерировать не просто мок, а полезный тест?',
    items: [
      { id: 'function-contract', label: 'Контракт функции', isOk: true },
      { id: 'edge-cases', label: 'Edge cases', isOk: true },
      { id: 'existing-test-style', label: 'Стиль существующих тестов', isOk: true },
      { id: 'commit-author', label: 'Автор последнего коммита', isOk: false },
    ],
  },
  {
    id: 'production-incident-agent',
    title: 'Агент расследует incident',
    hint: 'Что полезно для root cause analysis?',
    items: [
      { id: 'error-logs', label: 'Error logs', isOk: true },
      { id: 'recent-deploys', label: 'Недавние деплои', isOk: true },
      { id: 'metrics-spike', label: 'Всплеск метрик', isOk: true },
      { id: 'readme-badges', label: 'Бейджи в README', isOk: false },
    ],
  },
  {
    id: 'agent-observability',
    title: 'Наблюдаемость агентной системы',
    hint: 'Что помогает понять, почему агент так ответил?',
    items: [
      { id: 'prompt-trace', label: 'Prompt trace', isOk: true },
      { id: 'retrieved-context', label: 'Retrieved context', isOk: true },
      { id: 'tool-results', label: 'Tool results', isOk: true },
      { id: 'button-color', label: 'Цвет кнопки Send', isOk: false },
    ],
  },
  {
    id: 'mcp-server-contract',
    title: 'Контракт MCP-сервера',
    hint: 'Что относится к тому, как агент понимает внешний tool?',
    items: [
      { id: 'tool-name', label: 'Tool name', isOk: true },
      { id: 'input-schema', label: 'Input schema', isOk: true },
      { id: 'tool-description', label: 'Tool description', isOk: true },
      { id: 'server-avatar', label: 'Аватарка сервера', isOk: false },
    ],
  },
  {
    id: 'agent-planning-failure',
    title: 'Признаки плохого планирования агента',
    hint: 'Что скорее указывает на проблему с планом?',
    items: [
      { id: 'skips-reproduction', label: 'Не воспроизводит баг', isOk: true },
      { id: 'edits-random-files', label: 'Правит случайные файлы', isOk: true },
      { id: 'ignores-constraints', label: 'Игнорирует ограничения', isOk: true },
      { id: 'uses-checklist', label: 'Использует checklist', isOk: false },
    ],
  },
  {
    id: 'enterprise-ai-coding',
    title: 'Enterprise AI coding',
    hint: 'Что особенно важно в корпоративном AI coding?',
    items: [
      { id: 'access-control', label: 'Access control', isOk: true },
      { id: 'audit-log', label: 'Audit log', isOk: true },
      { id: 'private-context', label: 'Приватный контекст компании', isOk: true },
      { id: 'public-leaderboard', label: 'Публичный leaderboard', isOk: false },
    ],
  },
];

const MIN_CORRECT_FOR_SUCCESS = 5

function shuffle<T>(items: T[]) {
  const copy = [...items]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

function getRandomWordSet(previousSetId?: string | null) {
  const availableSets =
    WORD_SETS.length > 1 && previousSetId
      ? WORD_SETS.filter((set) => set.id !== previousSetId)
      : WORD_SETS
  const set = availableSets[Math.floor(Math.random() * availableSets.length)]

  return {
    ...set,
    items: shuffle(set.items),
  }
}

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds)
  const s = clamped % 60
  const m = Math.floor(clamped / 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function OddOneOutGame({
  durationSeconds = 30,
  onFinish,
}: OddOneOutGameProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [currentSet, setCurrentSet] = useState<WordSet | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [status, setStatus] = useState<OddOneOutGameResult | null>(null)
  const isFinishedRef = useRef(false)

  const selectedItem = useMemo(
    () =>
      currentSet?.items.find((item) => item.id === selectedItemId) ?? null,
    [currentSet, selectedItemId],
  )

  const finishGame = useCallback(
    (finalCorrectCount: number, finalWrongCount: number) => {
      if (isFinishedRef.current) return

      isFinishedRef.current = true
      const result: OddOneOutGameResult =
        finalCorrectCount >= MIN_CORRECT_FOR_SUCCESS && finalWrongCount === 0
          ? 'success'
          : 'fail'
      setStatus(result)
      onFinish(result)
    },
    [onFinish],
  )

  useEffect(() => {
    if (!isStarted || status !== null) return

    const timerId = window.setTimeout(() => {
      if (secondsLeft <= 0) {
        finishGame(correctCount, wrongCount)
        return
      }

      setSecondsLeft((prev) => prev - 1)
    }, secondsLeft <= 0 ? 0 : 1000)

    return () => window.clearTimeout(timerId)
  }, [correctCount, finishGame, isStarted, secondsLeft, status, wrongCount])

  const handleStart = () => {
    setCurrentSet(getRandomWordSet())
    setSecondsLeft(durationSeconds)
    setSelectedItemId(null)
    setCorrectCount(0)
    setAnsweredCount(0)
    setWrongCount(0)
    setFeedback(null)
    setStatus(null)
    isFinishedRef.current = false
    setIsStarted(true)
  }

  const handleSelect = (itemId: string) => {
    if (!isStarted || status !== null || feedback !== null) return
    setSelectedItemId(itemId)
  }

  const handleCheck = () => {
    if (!currentSet || !selectedItem || feedback !== null || status !== null) {
      return
    }

    const isCorrect = !selectedItem.isOk
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0)
    const nextWrongCount = wrongCount + (isCorrect ? 0 : 1)

    setCorrectCount(nextCorrectCount)
    setAnsweredCount((prev) => prev + 1)
    setWrongCount(nextWrongCount)
    setFeedback(isCorrect ? 'correct' : 'wrong')

    window.setTimeout(() => {
      if (
        nextCorrectCount >= MIN_CORRECT_FOR_SUCCESS &&
        nextWrongCount === 0
      ) {
        finishGame(nextCorrectCount, nextWrongCount)
        return
      }

      setCurrentSet(getRandomWordSet(currentSet.id))
      setSelectedItemId(null)
      setFeedback(null)
    }, 850)
  }

  return (
    <div className="odd-root">
      <div className="odd-topbar">
        <div className="odd-meter">
          <span>Ответов</span>
          <strong>{answeredCount}</strong>
        </div>
        <div className="odd-timer">
          <span>Осталось</span>
          <strong className={secondsLeft <= 5 ? 'odd-timer-danger' : ''}>
            {formatTime(secondsLeft)}
          </strong>
        </div>
        <div className="odd-meter">
          <span>Верно</span>
          <strong>
            {correctCount} / {MIN_CORRECT_FOR_SUCCESS}
          </strong>
        </div>
      </div>

      {!isStarted && (
        <div className="odd-start">
          <h3>Найди лишний пункт</h3>
          <p>
            В каждом раунде выбери ровно одну карточку, которую
            считаешь лишней. Для успеха нужно дать
            минимум {MIN_CORRECT_FOR_SUCCESS} правильных ответов без ошибок.
          </p>
          <button type="button" className="btn primary" onClick={handleStart}>
            Начать
          </button>
        </div>
      )}

      {isStarted && currentSet && (
        <>
          <div className="odd-set-header">
            <p>{currentSet.title}</p>
            <span>{currentSet.hint}</span>
          </div>

          <div className="odd-card-list">
            {currentSet.items.map((item) => {
              const isSelected = selectedItemId === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`odd-word-card ${
                    isSelected ? 'odd-word-card-selected' : ''
                  }`}
                  onClick={() => handleSelect(item.id)}
                >
                  <span className="odd-choice-dot" aria-hidden="true" />
                  <span>
                    <span className="odd-word-label">{item.label}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="odd-actions">
            <button
              type="button"
              className="btn primary"
              onClick={handleCheck}
              disabled={!selectedItem || feedback !== null || status !== null}
            >
              Ответить
            </button>
            {feedback === 'correct' && (
              <span className="odd-feedback odd-feedback-correct">Верно</span>
            )}
            {feedback === 'wrong' && (
              <span className="odd-feedback odd-feedback-wrong">Есть ошибка</span>
            )}
          </div>
        </>
      )}

      {status !== null && (
        <div
          className={`odd-result ${
            status === 'success' ? 'odd-result-success' : 'odd-result-fail'
          }`}
        >
          <h3>{status === 'success' ? 'Успешно' : 'Неуспешно'}</h3>
          <p>
            Верных ответов: <strong>{correctCount}</strong>. Ошибок:{' '}
            <strong>{wrongCount}</strong>.
          </p>
        </div>
      )}
    </div>
  )
}

export default OddOneOutGame
