import { useMemo, useState } from 'react'

export type MatchPairsGameResult = 'success' | 'fail'

export type MatchPairsGameProps = {
  onFinish: (result: MatchPairsGameResult) => void
}

type LeftItemId = 'nestor' | 'nestor-data' | 'nestor-search' | 'nestor-review'
type RightItemId = 'ide' | 'gitlab' | 'helicopter' | 'confluence'

type Pair = {
  leftId: LeftItemId
  leftLabel: string
  rightId: RightItemId
  rightLabel: string
}

const PAIRS: Pair[] = [
  {
    leftId: 'nestor',
    leftLabel: 'Nestor',
    rightId: 'ide',
    rightLabel: 'IDE',
  },
  {
    leftId: 'nestor-data',
    leftLabel: 'Nestor Data',
    rightId: 'helicopter',
    rightLabel: 'Helicopter',
  },
  {
    leftId: 'nestor-search',
    leftLabel: 'Nestor Search',
    rightId: 'confluence',
    rightLabel: 'Confluence',
  },
  {
    leftId: 'nestor-review',
    leftLabel: 'Nestor Review',
    rightId: 'gitlab',
    rightLabel: 'GitLab',
  },
]

type RightOption = {
  id: RightItemId
  label: string
  leftId: LeftItemId
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function MatchPairsGame({ onFinish }: MatchPairsGameProps) {
  const rightOptions = useMemo<RightOption[]>(
    () =>
      shuffle(
        PAIRS.map((pair) => ({
          id: pair.rightId,
          label: pair.rightLabel,
          leftId: pair.leftId,
        })),
      ),
    [],
  )

  const [selectedLeftId, setSelectedLeftId] = useState<LeftItemId | null>(null)
  const [selectedRightId, setSelectedRightId] = useState<RightItemId | null>(
    null,
  )
  const [selectedPairs, setSelectedPairs] = useState<
    Array<{ leftId: LeftItemId; rightId: RightItemId }>
  >([])
  const [isFinished, setIsFinished] = useState(false)

  const isAllSelected = selectedPairs.length === PAIRS.length

  // Получаем все выбранные leftId и rightId для блокировки
  const selectedLeftIds = selectedPairs.map((pair) => pair.leftId)
  const selectedRightIds = selectedPairs.map((pair) => pair.rightId)

  // Проверяем правильность пар после завершения
  const correctPairs = useMemo(() => {
    if (!isFinished) return []
    return selectedPairs.filter((pair) => {
      const correctPair = PAIRS.find((p) => p.leftId === pair.leftId)
      return correctPair?.rightId === pair.rightId
    })
  }, [selectedPairs, isFinished])

  const resetSelection = () => {
    setSelectedLeftId(null)
    setSelectedRightId(null)
  }

  const handleLeftClick = (leftId: LeftItemId) => {
    if (isFinished) return
    if (selectedLeftIds.includes(leftId)) return

    // повторный клик снимает выделение
    if (selectedLeftId === leftId) {
      resetSelection()
      return
    }
    setSelectedLeftId(leftId)
    // сбрасываем возможный ранее выбранный правый вариант
    setSelectedRightId(null)
  }

  const handleRightClick = (rightId: RightItemId) => {
    if (isFinished) return
    if (!selectedLeftId) return
    if (selectedRightIds.includes(rightId)) return

    // Фиксируем пару
    const newPair = { leftId: selectedLeftId, rightId }
    const nextPairs = [...selectedPairs, newPair]
    setSelectedPairs(nextPairs)
    resetSelection()

    // Если все пары выбраны, показываем результат
    if (nextPairs.length === PAIRS.length) {
      setIsFinished(true)
      const allCorrect = nextPairs.every((pair) => {
        const correctPair = PAIRS.find((p) => p.leftId === pair.leftId)
        return correctPair?.rightId === pair.rightId
      })
      onFinish(allCorrect ? 'success' : 'fail')
    }
  }

  return (
    <div className="match-pairs-root">
      <div className="match-pairs-layout">
        <div className="match-pairs-column">
          <p className="match-pairs-column-title">Вселенная Nestor</p>
          <div className="match-pairs-list">
            {PAIRS.map((pair) => {
              const isSelected = selectedLeftId === pair.leftId
              const isBlocked = selectedLeftIds.includes(pair.leftId)
              const selectedPair = selectedPairs.find(
                (p) => p.leftId === pair.leftId,
              )
              const isCorrect =
                isFinished &&
                selectedPair &&
                PAIRS.find((p) => p.leftId === pair.leftId)?.rightId ===
                  selectedPair.rightId

              return (
                <button
                  key={pair.leftId}
                  type="button"
                  className={[
                    'match-pairs-card',
                    'match-pairs-card-left',
                    isSelected ? 'match-pairs-card-selected' : '',
                    isBlocked && !isFinished ? 'match-pairs-card-pending' : '',
                    isFinished && isCorrect
                      ? 'match-pairs-card-matched'
                      : '',
                    isFinished && !isCorrect && selectedPair
                      ? 'match-pairs-card-wrong'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleLeftClick(pair.leftId)}
                  disabled={isBlocked || isFinished}
                >
                  <span className="match-pairs-card-label">{pair.leftLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="match-pairs-column">
          <p className="match-pairs-column-title">Продукты и площадки</p>
          <div className="match-pairs-list">
            {rightOptions.map((option) => {
              const isSelectedRight = selectedRightId === option.id
              const isBlocked = selectedRightIds.includes(option.id)
              const selectedPair = selectedPairs.find(
                (p) => p.rightId === option.id,
              )
              const isCorrect =
                isFinished &&
                selectedPair &&
                PAIRS.find((p) => p.leftId === selectedPair.leftId)?.rightId ===
                  option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    'match-pairs-card',
                    'match-pairs-card-right',
                    isSelectedRight ? 'match-pairs-card-selected' : '',
                    isBlocked && !isFinished ? 'match-pairs-card-pending' : '',
                    isFinished && isCorrect
                      ? 'match-pairs-card-matched'
                      : '',
                    isFinished && !isCorrect && selectedPair
                      ? 'match-pairs-card-wrong'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleRightClick(option.id)}
                  disabled={isBlocked || isFinished}
                >
                  <span className="match-pairs-card-label">
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {!isAllSelected && (
        <p className="match-pairs-helper">
          Сначала выбери элемент из колонки слева, затем кликни по его паре
          справа. Нужно сопоставить все четыре пары. Результат будет показан после выбора всех пар.
        </p>
      )}
      {isFinished && correctPairs.length === PAIRS.length && (
        <p className="match-pairs-helper success">
          Все верно -- ты отлично ориентируесь во вселенной
          Nestor 😉
        </p>
      )}
      {isFinished && correctPairs.length < PAIRS.length && (
        <p className="match-pairs-helper fail">
          Упс, ты тоже запустался во вселенной Nestor? Могу тебя понять 😉
        </p>
      )}
    </div>
  )
}

export default MatchPairsGame

