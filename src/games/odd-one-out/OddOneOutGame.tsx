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
    id: 'bug-fix-inputs',
    title: 'Агент чинит баг',
    hint: 'Что реально поможет понять проблему?',
    items: [
      { id: 'error-text', label: 'Текст ошибки', isOk: true },
      { id: 'broken-code', label: 'Кусок кода с багом', isOk: true },
      { id: 'steps', label: 'Шаги, как повторить баг', isOk: true },
      { id: 'avatar-color', label: 'Цвет аватарки автора', isOk: false },
    ],
  },
  {
    id: 'safe-ai-fix',
    title: 'Безопасная AI-правка',
    hint: 'Что снижает шанс сломать прод?',
    items: [
      { id: 'small-change', label: 'Маленькое изменение', isOk: true },
      { id: 'test', label: 'Тест на исправленный случай', isOk: true },
      { id: 'review', label: 'Проверка человеком', isOk: true },
      { id: 'just-believe', label: 'Просто поверить агенту', isOk: false },
    ],
  },
  {
    id: 'before-deploy',
    title: 'Перед деплоем',
    hint: 'Что стоит проверить до выката?',
    items: [
      { id: 'tests-green', label: 'Тесты зелёные', isOk: true },
      { id: 'rollback', label: 'Есть план отката', isOk: true },
      { id: 'metrics', label: 'Понятно, что мониторить', isOk: true },
      { id: 'lucky-shirt', label: 'Надета счастливая футболка', isOk: false },
    ],
  },
  {
    id: 'code-review',
    title: 'AI помогает в ревью',
    hint: 'Что похоже на полезный результат ревью?',
    items: [
      { id: 'permission-risk', label: 'Нашёл удалённую проверку прав', isOk: true },
      { id: 'secret-risk', label: 'Заметил секрет в логах', isOk: true },
      { id: 'test-risk', label: 'Подсказал, где не хватает теста', isOk: true },
      { id: 'nice-emoji', label: 'Похвалил красивые эмодзи', isOk: false },
    ],
  },
  {
    id: 'agent-context',
    title: 'Что дать агенту в задачу',
    hint: 'Что поможет агенту не гадать?',
    items: [
      { id: 'goal', label: 'Чёткая цель', isOk: true },
      { id: 'files', label: 'Нужные файлы', isOk: true },
      { id: 'limits', label: 'Ограничения и запреты', isOk: true },
      { id: 'weather', label: 'Прогноз погоды', isOk: false },
    ],
  },
  {
    id: 'bad-agent-signs',
    title: 'Плохой план агента',
    hint: 'Что должно насторожить?',
    items: [
      { id: 'random-files', label: 'Правит случайные файлы', isOk: true },
      { id: 'no-repro', label: 'Не пытается повторить баг', isOk: true },
      { id: 'ignores-request', label: 'Игнорирует просьбу пользователя', isOk: true },
      { id: 'shows-plan', label: 'Показывает понятный план', isOk: false },
    ],
  },
  {
    id: 'tests-help',
    title: 'Агент пишет тесты',
    hint: 'Что делает тест полезным?',
    items: [
      { id: 'edge-case', label: 'Проверяет крайний случай', isOk: true },
      { id: 'real-bug', label: 'Повторяет найденный баг', isOk: true },
      { id: 'clear-name', label: 'Понятно называется', isOk: true },
      { id: 'always-green', label: 'Всегда проходит без проверок', isOk: false },
    ],
  },
  {
    id: 'logs',
    title: 'Агент разбирает логи',
    hint: 'Что полезно для поиска причины?',
    items: [
      { id: 'error-log', label: 'Ошибка из логов', isOk: true },
      { id: 'time', label: 'Время инцидента', isOk: true },
      { id: 'recent-release', label: 'Недавний релиз', isOk: true },
      { id: 'office-address', label: 'Адрес офиса команды', isOk: false },
    ],
  },
  {
    id: 'secrets',
    title: 'Что нельзя светить',
    hint: 'Что опасно отдавать наружу без защиты?',
    items: [
      { id: 'token', label: 'API-токен', isOk: true },
      { id: 'password', label: 'Пароль', isOk: true },
      { id: 'personal-data', label: 'Персональные данные', isOk: true },
      { id: 'button-text', label: 'Текст кнопки', isOk: false },
    ],
  },
  {
    id: 'docs',
    title: 'Агент обновляет документацию',
    hint: 'Что стоит сверить с кодом?',
    items: [
      { id: 'api-path', label: 'Адрес API', isOk: true },
      { id: 'request-example', label: 'Пример запроса', isOk: true },
      { id: 'response-example', label: 'Пример ответа', isOk: true },
      { id: 'old-joke', label: 'Старая шутка в README', isOk: false },
    ],
  },
  {
    id: 'payments',
    title: 'AI-фикс в платежах',
    hint: 'Что особенно важно проверить?',
    items: [
      { id: 'double-charge', label: 'Нет двойного списания', isOk: true },
      { id: 'amount', label: 'Сумма считается верно', isOk: true },
      { id: 'retry', label: 'Повтор запроса безопасен', isOk: true },
      { id: 'button-shade', label: 'Оттенок кнопки красивый', isOk: false },
    ],
  },
  {
    id: 'legacy',
    title: 'Агент объясняет legacy-код',
    hint: 'Что помогает разобраться быстрее?',
    items: [
      { id: 'entry-point', label: 'Где начинается сценарий', isOk: true },
      { id: 'data-flow', label: 'Куда текут данные', isOk: true },
      { id: 'risky-place', label: 'Где опасно менять', isOk: true },
      { id: 'commit-mood', label: 'Настроение автора коммита', isOk: false },
    ],
  },
]

const MIN_CORRECT_FOR_SUCCESS = 3

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
  durationSeconds = 45,
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
    (finalCorrectCount: number, _finalWrongCount: number) => {
      if (isFinishedRef.current) return

      isFinishedRef.current = true
      const result: OddOneOutGameResult =
        finalCorrectCount >= MIN_CORRECT_FOR_SUCCESS
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
        nextCorrectCount >= MIN_CORRECT_FOR_SUCCESS
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
            минимум {MIN_CORRECT_FOR_SUCCESS} правильных ответа.
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
