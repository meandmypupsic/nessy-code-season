import { useEffect, useState } from 'react'
import puzzleImage from '../../assets/puzzle.png'

export type PuzzleGameResult = 'success' | 'fail'

export type PuzzleGameProps = {
  durationSeconds: number
  onFinish: (result: PuzzleGameResult) => void
}

function PuzzleGame({ durationSeconds, onFinish }: PuzzleGameProps) {
  const [tiles, setTiles] = useState<number[]>(
    () => Array.from({ length: 9 }, (_, i) => i),
  )
  const [isStarted, setIsStarted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<PuzzleGameResult | null>(null)

  const formatTime = (totalSeconds: number) => {
    const clamped = Math.max(0, totalSeconds)
    const s = clamped % 60
    const m = Math.floor(clamped / 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const isSolved = (arr: number[]) => arr.every((value, index) => value === index)

  const resetGameState = () => {
    const base = Array.from({ length: 9 }, (_, i) => i)
    const shuffled = [...base]

    // Перемешиваем до состояния, отличного от собранного
    do {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
    } while (isSolved(shuffled))

    setTiles(shuffled)
    setSecondsLeft(durationSeconds)
    setSelectedIndex(null)
    setStatus(null)
    setIsStarted(true)
  }

  useEffect(() => {
    if (!isStarted || status !== null) return

    const id = window.setTimeout(() => {
      if (secondsLeft <= 0) {
        setStatus('fail')
        onFinish('fail')
        setIsStarted(false)
        return
      }

      setSecondsLeft((prev) => prev - 1)
    }, secondsLeft <= 0 ? 0 : 1000)

    return () => clearTimeout(id)
  }, [isStarted, secondsLeft, status, onFinish])

  const handleTileClick = (index: number) => {
    if (!isStarted || status !== null) return

    if (selectedIndex === null) {
      setSelectedIndex(index)
      return
    }

    if (selectedIndex === index) {
      setSelectedIndex(null)
      return
    }

    const newTiles = [...tiles]
    ;[newTiles[selectedIndex], newTiles[index]] = [
      newTiles[index],
      newTiles[selectedIndex],
    ]

    setTiles(newTiles)
    setSelectedIndex(null)

    if (isSolved(newTiles)) {
      setStatus('success')
      setIsStarted(false)
      onFinish('success')
    }
  }

  const getBackgroundPosition = (tileIndex: number) => {
    const row = Math.floor(tileIndex / 3)
    const col = tileIndex % 3
    const x = (col / 2) * 100
    const y = (row / 2) * 100
    return `${x}% ${y}%`
  }

  return (
    <div className="puzzle-root">
      <div className="puzzle-header">
        <div className="puzzle-timer">
          Осталось времени:{' '}
          <span
            className={
              secondsLeft <= 5 && isStarted && status === null ? 'danger' : ''
            }
          >
            {formatTime(secondsLeft)}
          </span>
        </div>
        {!isStarted && status === null && (
          <div className="buttons-row">
            <button className="btn secondary" onClick={resetGameState}>
              Начать
            </button>
          </div>
        )}
      </div>

      {!isStarted && status === null && (
        <div className="puzzle-intro">
          <img src={puzzleImage} alt="Пример картинки для пазла" />
          <p>
            Запомни картинку, нажми "Начать", а потом выбирай две плитки,
            чтобы поменять их местами.
          </p>
        </div>
      )}

      {isStarted && status === null && (
        <p className="puzzle-helper">
          Нажми одну плитку, потом вторую — они поменяются местами.
        </p>
      )}

      <div className="puzzle-grid">
        {tiles.map((tileValue, index) => (
          <button
            key={tileValue}
            type="button"
            className={`puzzle-tile ${
              index === selectedIndex ? 'puzzle-tile-selected' : ''
            } ${!isStarted || status !== null ? 'puzzle-tile-disabled' : ''}`}
            onClick={() => handleTileClick(index)}
            disabled={!isStarted || status !== null}
            style={{
              backgroundImage:
                isStarted || status !== null ? `url(${puzzleImage})` : 'none',
              backgroundSize:
                isStarted || status !== null ? '300% 300%' : undefined,
              backgroundPosition:
                isStarted || status !== null
                  ? getBackgroundPosition(tileValue)
                  : 'center',
            }}
          >
            <span className="puzzle-tile-index" aria-hidden="true">
              {tileValue + 1}
            </span>
          </button>
        ))}
      </div>

      {status === 'success' && (
        <p className="puzzle-helper success">
          Картинка собрана. В разработке так же: когда куски контекста на своих местах, агент помогает заметно лучше.
        </p>
      )}
      {status === 'fail' && (
        <p className="puzzle-helper fail">
          Время вышло. Ничего страшного: нажми "Попробовать еще раз" или переходи дальше.
        </p>
      )}
    </div>
  )
}

export default PuzzleGame
