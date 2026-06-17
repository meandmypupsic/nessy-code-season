import { useState } from 'react'
import nessyImage from '../assets/nessy.png'
import jetbrainsLogo from '../assets/jetbrains-logo.png'
import nestorLogo from '../assets/nestor-logo.jpg'

export type ReactionGameResult = 'success' | 'fail'

export type ReactionOption = {
  id: string
  emoji?: string
  image?: string
  response: string
  isCorrect: boolean
}

export type ReactionGameProps = {
  onFinish: (result: ReactionGameResult) => void
}

function ReactionGame({ onFinish }: ReactionGameProps) {
  const reactionOptions: ReactionOption[] = [
    {
      id: 'thinking',
      emoji: '🤔',
      response:
        'Ммм, 🤔 — это для тех, кто в замешательстве. Давай, выбирай реакцию посерьезнее — а то так можно и до 🤡 докатиться!',
      isCorrect: false,
    },
    {
      id: 'nestor',
      image: nestorLogo,
      response:
        'Ой, какой милый выбор реакции! 😊 А Cursor пусть остаётся в тени — он и так знает, что его любят 🙃',
      isCorrect: false,
    },
    {
      id: 'fire',
      emoji: '🔥',
      response:
        'Ты сегодня в ударе! 🔥 Но, может, чуть-чуть поаккуратнее с эмоциями? 😉',
      isCorrect: false,
    },
    {
      id: 'jetbrains',
      image: jetbrainsLogo,
      response:
        'Попался! Это ты ставишь реакцию JetBrains? И правильно делаешь, она тут к месту 🎉',
      isCorrect: true,
    },
    {
      id: 'rocket',
      emoji: '🚀',
      response:
        'Ой, ой, ой... 🚀 — это круто, но не для этого поста! 😜',
      isCorrect: false,
    },
    {
      id: 'nessy',
      image: nessyImage,
      response:
        'Попробуй что-то более остроумное и с характером — ты же знаешь, я люблю, когда код чист, а реакции — точные. 😉',
      isCorrect: false,
    },
  ]

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickedReactionId, setPickedReactionId] = useState<string | null>(null)
  const [status, setStatus] = useState<ReactionGameResult | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleTogglePicker = () => {
    if (status !== null) return
    setIsPickerOpen((prev) => !prev)
  }

  const handlePickReaction = (reactionId: string) => {
    if (status !== null) return
    const option = reactionOptions.find((item) => item.id === reactionId)
    if (!option) return

    setPickedReactionId(reactionId)
    setFeedback(option.response)
    const result: ReactionGameResult = option.isCorrect ? 'success' : 'fail'
    setStatus(result)
    setIsPickerOpen(false)
    onFinish(result)
  }

  const pickedOption = reactionOptions.find((item) => item.id === pickedReactionId)

  return (
    <div className="reaction-root">
      <article className="reaction-post">
        <header className="reaction-post-header">
          <div
            className="reaction-avatar"
            aria-hidden="true"
            style={{ backgroundImage: `url(${nessyImage})` }}
          />
          <div>
            <div className="reaction-name">Nessy</div>
            <div className="reaction-meta">4:96 PM</div>
          </div>
        </header>

        <div className="reaction-body">
            <h2>Opus 4.5 и GPT 5.2 теперь в чате Nestor :nestor:</h2>
            <p>Добавили в чат с Nestor в VS Code две внешних модели</p>

            <ul>
              <li>claude-opus-4-5-20251101: Флагманская модель для задач, требующих глубокого анализа, сложных рассуждений и максимального качества результата.</li>
              <li>gpt-5.2: Флагманская модель OpenAI GPT-5.2. Занимает лидирующие позиции в публичны кодовых бэнчмарках.</li>
            </ul>
            <p>Напоминаем, что tool-calling для кода на внешних моделях отключен, т.е. не получится воспользоваться MCP. Так же во внешние модели не стоит отправлять чувствительные данные.</p>
            <p>Все вопросы как обычно в ~nestor-ask </p>
        </div>
      </article>

      <div className="reaction-actions">
        <div className="reaction-picker-anchor">
          <button
            type="button"
            className="chip-button"
            onClick={handleTogglePicker}
            disabled={status !== null}
          >
            {pickedOption ? (
              pickedOption.emoji ? (
                <span className="reaction-emoji">{pickedOption.emoji}</span>
              ) : pickedOption.image ? (
                <img src={pickedOption.image} alt="" className="reaction-image" />
              ) : (
                '😶'
              )
            ) : (
              '😶'
            )}
          </button>

          {isPickerOpen && (
            <div className="reaction-picker" role="dialog" aria-label="Выбор реакции">
              <p className="picker-title">RECENTLY USED</p>
              <div className="reaction-grid">
                {reactionOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="reaction-item"
                    onClick={() => handlePickReaction(option.id)}
                  >
                    {option.emoji ? (
                      <span className="reaction-emoji">{option.emoji}</span>
                    ) : option.image ? (
                      <img src={option.image} alt="" className="reaction-image" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {pickedOption && feedback && status !== null && (
        <div
          className={`reaction-result ${
            status === 'success' ? 'reaction-result-success' : 'reaction-result-fail'
          }`}
        >
          <div className="reaction-result-header">
            {pickedOption.emoji ? (
              <span className="reaction-emoji">{pickedOption.emoji}</span>
            ) : pickedOption.image ? (
              <img src={pickedOption.image} alt="" className="reaction-image" />
            ) : null}
            <div className="reaction-result-title">
              {status === 'success' ? '(верный выбор!)' : '(не то, увы)'}
            </div>
          </div>
          <p className="reaction-result-text">{feedback}</p>
        </div>
      )}
    </div>
  )
}

export default ReactionGame
