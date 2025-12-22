import { useEffect, useState, useRef } from 'react'

export type TapGameResult = 'success' | 'fail'

export type TapGameProps = {
  durationSeconds: number
  onFinish: (result: TapGameResult) => void
}

const MIN_TAPS_FOR_SUCCESS = 30 - 4
const MAX_TAPS_FOR_SUCCESS = 30 + 4

function TapGame({ durationSeconds, onFinish }: TapGameProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [tapCount, setTapCount] = useState(0)
  const [status, setStatus] = useState<TapGameResult | null>(null)
  const tapCountRef = useRef(0)

  const formatTime = (totalSeconds: number) => {
    const clamped = Math.max(0, totalSeconds)
    const s = clamped % 60
    const m = Math.floor(clamped / 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!isStarted || status !== null) return

    if (secondsLeft <= 0) {
      const isSuccess =
        tapCountRef.current >= MIN_TAPS_FOR_SUCCESS && tapCountRef.current <= MAX_TAPS_FOR_SUCCESS
      const result: TapGameResult = isSuccess ? 'success' : 'fail'
      setStatus(result)
      setIsStarted(false)
      onFinish(result)
      return
    }

    const id = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(id)
  }, [isStarted, secondsLeft, status, onFinish])

  const handleStart = () => {
    setTapCount(0)
    tapCountRef.current = 0
    setSecondsLeft(durationSeconds)
    setStatus(null)
    setIsStarted(true)
  }

  const handleTap = () => {
    if (!isStarted || status !== null) return
    setTapCount((prev) => prev + 1)
    tapCountRef.current += 1
  }

  return (
    <div className="tap-root">
      <div className="tap-header">
        <p className="tap-rules">
          За ограниченное время кликай по большой кнопке ниже и&nbsp;набивай
          свой процент сгенерированного кода.
        </p>

        <div className="tap-header-row">
          <div className="tap-timer">
            Осталось времени:{' '}
            <span
              className={
                secondsLeft <= 3 && isStarted && status === null
                  ? 'tap-timer-danger'
                  : ''
              }
            >
              {formatTime(secondsLeft)}
            </span>
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

      <div className="tap-main">
        <button
          type="button"
          className="tap-button"
          onClick={handleTap}
          disabled={!isStarted || status !== null}
        >
          Тапай процент кода
        </button>

        <div className="tap-counter">
          Твоих тапов: <span className="tap-counter-value">{tapCount}</span>
        </div>
      </div>

      {status === null && (
        <p className="tap-helper">
          Сначала нажми «Начать», потом кликай по кнопке столько, сколько успеешь
          за отведённое время.
        </p>
      )}
      {status === 'success' && tapCount === 30 && (
        <p className="tap-helper tap-helper-success">
          Идеально! Ты натапал ровно 30% кода, как и <a href="https://my.tbank.ru/link/blog/3f611890-f14c-4a8a-a21f-1c82f738b603/post/3e30c400-a333-4519-a653-ba65239607b8/">Nestor в 2025</a>. Получается, что ты незаменим 😉
        </p>
      )}
      {status === 'success' && tapCount !== 30 && (
        <p className="tap-helper tap-helper-success">
          Отлично, ты натапал почти 30% кода! Может быть, ты и не <a href="https://my.tbank.ru/link/blog/3f611890-f14c-4a8a-a21f-1c82f738b603/post/3e30c400-a333-4519-a653-ba65239607b8/">Nestor в 2025</a>, но очень близко к нему 😉
        </p>
      )}
      {status === 'fail' && (
        <p className="tap-helper tap-helper-fail">
          Нелохо ты себе натапал 😉 Сравни себя с <a href="https://my.tbank.ru/link/blog/3f611890-f14c-4a8a-a21f-1c82f738b603/post/3e30c400-a333-4519-a653-ba65239607b8/">Nestor в 2025</a>.
        </p>
      )}
    </div>
  )
}

export default TapGame

