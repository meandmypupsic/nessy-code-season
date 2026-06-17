import { useState, useEffect } from 'react'
import './PrTinderGame.css'

export type PrTinderGameResult = 'success' | 'fail'

export type PrTinderGameProps = {
  onFinish: (result: PrTinderGameResult) => void
}

type DiffCard = {
  id: number
  oldCode: string
  newCode: string
  correctAnswer: 'approve' | 'requestChanges' | 'securityRisk' | 'needTests' | 'unclearRequirement'
  explanation: string
}

type AnswerOption = {
  id: 'approve' | 'requestChanges' | 'securityRisk' | 'needTests' | 'unclearRequirement'
  label: string
  icon: string
  color: string
}

const DURATION_SECONDS = 60
const MIN_CARDS_FOR_SUCCESS = 12

const diffCards: DiffCard[] = [
  {
    id: 1,
    oldCode: 'if (user.role = "admin") {',
    newCode: 'if (user.role === "admin") {',
    correctAnswer: 'approve',
    explanation: 'Исправлено: = на === для строгого сравнения',
  },
  {
    id: 2,
    oldCode: 'var count = 0;',
    newCode: 'let count = 0;',
    correctAnswer: 'approve',
    explanation: 'Хорошо: var заменён на let с блочной областью видимости',
  },
  {
    id: 3,
    oldCode: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
    newCode: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
    correctAnswer: 'securityRisk',
    explanation: 'SQL-инъекция! Нужно использовать параметризованные запросы',
  },
  {
    id: 4,
    oldCode: 'array.push(item);',
    newCode: 'const newArray = [...array, item];',
    correctAnswer: 'approve',
    explanation: 'Хорошо: избегание мутаций, иммутабельный подход',
  },
  {
    id: 5,
    oldCode: 'function fetchData() {\n  return api.get();\n}',
    newCode: 'async function fetchData() {\n  const data = await api.get();\n  return data;\n}',
    correctAnswer: 'requestChanges',
    explanation: 'Лишний async/await, функция уже возвращает Promise',
  },
  {
    id: 6,
    oldCode: '<div dangerouslySetInnerHTML={{ __html: userContent }} />',
    newCode: '<div>{userContent}</div>',
    correctAnswer: 'approve',
    explanation: 'Исправлена XSS-уязвимость, контент экранируется',
  },
  {
    id: 7,
    oldCode: 'if (x == 5) {}',
    newCode: 'if (x === 5) {}',
    correctAnswer: 'approve',
    explanation: 'Правильно: строгое сравнение вместо нестрогого',
  },
  {
    id: 8,
    oldCode: 'for (var i = 0; i < 10; i++) { ... }',
    newCode: 'for (let i = 0; i < 10; i++) { ... }',
    correctAnswer: 'approve',
    explanation: 'Хорошо: let вместо var в цикле',
  },
  {
    id: 9,
    oldCode: 'const result = data.filter(x => x.active).map(x => x.name);',
    newCode: 'const result = data.map(x => x.name).filter(x => x.active);',
    correctAnswer: 'requestChanges',
    explanation: 'Сначала filter, потом map — производительнее',
  },
  {
    id: 10,
    oldCode: 'element.addEventListener("click", handler);',
    newCode: 'element.addEventListener("click", handler());',
    correctAnswer: 'requestChanges',
    explanation: 'Ошибка: handler() вызывается сразу, нужно просто handler',
  },
  {
    id: 11,
    oldCode: 'const token = localStorage.getItem("token");',
    newCode: 'const token = sessionStorage.getItem("token");',
    correctAnswer: 'securityRisk',
    explanation: 'sessionStorage уязвимее для XSS, лучше httpOnly cookie',
  },
  {
    id: 12,
    oldCode: 'function Component(props) { return <div>{props.value}</div>; }',
    newCode: 'const Component = ({ value }) => <div>{value}</div>;',
    correctAnswer: 'approve',
    explanation: 'Хорошо: деструктуризация и стрелочная функция',
  },
  {
    id: 13,
    oldCode: 'if (isValid === true) {',
    newCode: 'if (isValid) {',
    correctAnswer: 'approve',
    explanation: 'Упрощено: не нужно явное сравнение с true',
  },
  {
    id: 14,
    oldCode: 'new Promise((resolve, reject) => {\n  setTimeout(() => resolve(), 1000);\n});',
    newCode: 'new Promise((resolve, reject) => {\n  setTimeout(resolve, 1000);\n});',
    correctAnswer: 'approve',
    explanation: 'Упрощено: не нужна стрелочная функция для простого вызова',
  },
  {
    id: 15,
    oldCode: 'const x = y ? true : false;',
    newCode: 'const x = !!y;',
    correctAnswer: 'approve',
    explanation: 'Сокращено: !!y эквивалентно y ? true : false',
  },
  {
    id: 16,
    oldCode: 'fetch(url).then(res => res.json()).then(data => console.log(data));',
    newCode: 'fetch(url).then(data => console.log(data));',
    correctAnswer: 'requestChanges',
    explanation: 'Пропущен res.json(), данные не распарсятся',
  },
  {
    id: 17,
    oldCode: 'const arr = [1, 2, 3];\narr[10] = 5;',
    newCode: 'const arr = [1, 2, 3];\narr[10] = 5;',
    correctAnswer: 'requestChanges',
    explanation: 'Создаётся "дырявый" массив с empty slots',
  },
  {
    id: 18,
    oldCode: 'password: "123456"',
    newCode: 'password: process.env.DB_PASSWORD',
    correctAnswer: 'approve',
    explanation: 'Хорошо: пароль вынесен в переменную окружения',
  },
  {
    id: 19,
    oldCode: 'console.log("debug info");',
    newCode: '// console.log("debug info");',
    correctAnswer: 'needTests',
    explanation: 'Нужно удалить или заменить на logger перед коммитом',
  },
  {
    id: 20,
    oldCode: 'export default function() {}',
    newCode: 'export default function MyComponent() {}',
    correctAnswer: 'approve',
    explanation: 'Хорошо: именованная функция для лучшего stack trace',
  },
]

const answerOptions: AnswerOption[] = [
  { id: 'approve', label: 'Approve', icon: '✅', color: '#4caf50' },
  { id: 'requestChanges', label: 'Request Changes', icon: '❌', color: '#f44336' },
  { id: 'securityRisk', label: 'Security Risk', icon: '⚠️', color: '#ff9800' },
  { id: 'needTests', label: 'Need Tests', icon: '🧪', color: '#9c27b0' },
  { id: 'unclearRequirement', label: 'Unclear', icon: '❓', color: '#607d8b' },
]

function PrTinderGame({ onFinish }: PrTinderGameProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [status, setStatus] = useState<PrTinderGameResult | null>(null)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [shuffledCards, setShuffledCards] = useState<DiffCard[]>([])

  const formatTime = (totalSeconds: number) => {
    const clamped = Math.max(0, totalSeconds)
    const s = clamped % 60
    const m = Math.floor(clamped / 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!isStarted || status !== null) return

    const id = window.setTimeout(() => {
      if (secondsLeft <= 0) {
        const result: PrTinderGameResult =
          reviewedCount >= MIN_CARDS_FOR_SUCCESS ? 'success' : 'fail'
        setStatus(result)
        setIsStarted(false)
        onFinish(result)
        return
      }

      setSecondsLeft((prev) => prev - 1)
    }, secondsLeft <= 0 ? 0 : 1000)

    return () => window.clearTimeout(id)
  }, [isStarted, secondsLeft, status, reviewedCount, onFinish])

  const handleStart = () => {
    setReviewedCount(0)
    setCurrentCardIndex(0)
    setSecondsLeft(DURATION_SECONDS)
    setStatus(null)
    setLastFeedback(null)
    setShuffledCards([...diffCards].sort(() => Math.random() - 0.5))
    setIsStarted(true)
  }

  const handleAnswer = (answerId: AnswerOption['id']) => {
    if (!isStarted || status !== null || shuffledCards.length === 0) return

    const currentCard = shuffledCards[currentCardIndex]
    const isCorrect = answerId === currentCard.correctAnswer
    const option = answerOptions.find((opt) => opt.id === answerId)

    setLastFeedback(
      `${option?.icon} ${option?.label}: ${
        isCorrect ? 'Верно! ' : 'Не совсем. '
      }${currentCard.explanation}`
    )

    setReviewedCount((prev) => prev + 1)

    if (currentCardIndex + 1 >= shuffledCards.length) {
      setCurrentCardIndex(0)
      setShuffledCards([...diffCards].sort(() => Math.random() - 0.5))
    } else {
      setCurrentCardIndex((prev) => prev + 1)
    }

    setTimeout(() => {
      setLastFeedback(null)
    }, 1500)
  }

  const currentCard = shuffledCards[currentCardIndex]

  return (
    <div className="pr-tinder-root">
      <div className="pr-tinder-header">
        <p className="pr-tinder-rules">
          Оценивай diff-карточки как на code review. Нужно успеть разобрать
          минимум {MIN_CARDS_FOR_SUCCESS} карточек за минуту.
        </p>
        <div className="pr-tinder-header-row">
          <div className="pr-tinder-timer">
            Осталось времени:{' '}
            <span
              className={
                secondsLeft <= 10 && isStarted && status === null
                  ? 'pr-tinder-timer-danger'
                  : ''
              }
            >
              {formatTime(secondsLeft)}
            </span>
          </div>
          <div className="pr-tinder-counter">
            Оценено: <span className="pr-tinder-counter-value">{reviewedCount}</span>
          </div>
          {!isStarted && status === null && (
            <button
              type="button"
              className="btn secondary"
              onClick={handleStart}
            >
              Начать
            </button>
          )}
        </div>
      </div>

      <div className="pr-tinder-main">
        {(!isStarted || status !== null) && status === null && (
          <div className="pr-tinder-placeholder">
            Нажми «Начать», чтобы получить первый diff.
          </div>
        )}

        {isStarted && status === null && currentCard && (
          <div className="pr-tinder-card">
            <div className="pr-tinder-diff">
              <div className="pr-tinder-diff-old">
                <div className="pr-tinder-diff-label">− Старый код</div>
                <pre>{currentCard.oldCode}</pre>
              </div>
              <div className="pr-tinder-diff-new">
                <div className="pr-tinder-diff-label">+ Новый код</div>
                <pre>{currentCard.newCode}</pre>
              </div>
            </div>
          </div>
        )}

        {lastFeedback && (
          <div className="pr-tinder-feedback">{lastFeedback}</div>
        )}

        {isStarted && status === null && (
          <div className="pr-tinder-actions">
            {answerOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="pr-tinder-action-btn"
                style={{ borderColor: option.color, color: option.color }}
                onClick={() => handleAnswer(option.id)}
              >
                <span className="pr-tinder-action-icon">{option.icon}</span>
                <span className="pr-tinder-action-label">{option.label}</span>
              </button>
            ))}
          </div>
        )}

        {status !== null && (
          <div
            className={`pr-tinder-result ${
              status === 'success'
                ? 'pr-tinder-result-success'
                : 'pr-tinder-result-fail'
            }`}
          >
            <h3>
              {status === 'success'
                ? 'Code review принят!'
                : 'Ревью не успело в прод'}
            </h3>
            <p>
              Ты оценил(а) <strong>{reviewedCount}</strong> карточек за минуту.
            </p>
            <p>
              Для успеха нужно было разобрать минимум{' '}
              <strong>{MIN_CARDS_FOR_SUCCESS}</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PrTinderGame
