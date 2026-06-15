import { useState, useEffect, useCallback } from 'react'
import './BlastRadiusGame.css'

export type BlastRadiusResult = 'success' | 'fail'

export type BlastRadiusProps = {
  onFinish: (result: BlastRadiusResult) => void
}

type Flag = {
  id: string
  name: string
  description: string
  defaultOn: boolean
}

type Segment = {
  id: string
  name: string
  size: number
}

// Сегмент "all" означает все пользователи
const ALL_SEGMENTS = ['beta-users', 'internal-users', 'high-value-customers', 'mobile-ios', 'mobile-android', 'web-desktop', 'first-time-buyers'] as const

function BlastRadiusGame({ onFinish }: BlastRadiusProps) {
  const [timeLeft, setTimeLeft] = useState(90)
  const [isFinished, setIsFinished] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [scores, setScores] = useState<{
    incidentDamage: number
    businessImpact: number
    safety: number
    debuggability: number
    total: number
  } | null>(null)

  // Состояние: Map<flagId, Map<segmentId, boolean>>
  const [flagStates, setFlagStates] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {}
    
    // Инициализируем все флаги как ON для всех сегментов (текущее состояние в инциденте)
    FLAGS.forEach(flag => {
      initial[flag.id] = {}
      ALL_SEGMENTS.forEach(segment => {
        initial[flag.id][segment] = flag.defaultOn
      })
    })
    
    return initial
  })

  const handleToggleCell = (flagId: string, segmentId: string) => {
    if (isFinished) return
    
    setFlagStates(prev => ({
      ...prev,
      [flagId]: {
        ...prev[flagId],
        [segmentId]: !prev[flagId][segmentId]
      }
    }))
  }

  const calculateScores = useCallback(() => {
    // 1. Incident Damage: % заказов с багом после фикса
    // Баг в new-discount-engine + legacy-promo-codes для не-target сегментов
    let ordersWithBug = 0
    const totalOrders = 100

    ALL_SEGMENTS.forEach(segment => {
      const segmentSize = SEGMENTS.find(s => s.id === segment)?.size || 10
      const hasNewDiscount = flagStates['new-discount-engine'][segment]
      const hasLegacyPromo = flagStates['legacy-promo-codes'][segment]
      
      // Баг проявляется когда оба флага включены для сегмента (кроме beta)
      if (hasNewDiscount && hasLegacyPromo && segment !== 'beta-users') {
        ordersWithBug += segmentSize
      }
    })

    const incidentDamage = Math.round((ordersWithBug / totalOrders) * 100)

    // 2. Business Impact: % пользователей с работающим checkout
    let usersWithCheckout = 0
    ALL_SEGMENTS.forEach(segment => {
      const segmentSize = SEGMENTS.find(s => s.id === segment)?.size || 10
      const hasExpressCheckout = flagStates['express-checkout'][segment]
      const hasBankRetry = flagStates['bank-webhook-retry'][segment]
      
      // Checkout работает если есть express-checkout И bank-webhook-retry
      if (hasExpressCheckout && hasBankRetry) {
        usersWithCheckout += segmentSize
      }
    })

    const businessImpact = Math.round((usersWithCheckout / totalOrders) * 100)

    // 3. Safety: есть ли сегменты для отката (beta + internal должны иметь new-discount-engine)
    const hasBetaAccess = flagStates['new-discount-engine']['beta-users']
    const hasInternalAccess = flagStates['legacy-promo-codes']['internal-users']
    const safety = (hasBetaAccess && hasInternalAccess) ? 100 : 0

    // 4. Debuggability: есть ли beta-users для сбора логов
    const debuggability = hasBetaAccess ? 100 : 0

    // Итоговый счёт
    const total = Math.round(
      100 - (incidentDamage * 0.4) - ((100 - businessImpact) * 0.3) - ((100 - safety) * 0.2) - ((100 - debuggability) * 0.1)
    )

    return {
      incidentDamage,
      businessImpact,
      safety,
      debuggability,
      total: Math.max(0, Math.min(100, total))
    }
  }, [flagStates])

  const handleFinish = useCallback(() => {
    if (isFinished) return
    setIsFinished(true)
    const calculatedScores = calculateScores()
    setScores(calculatedScores)
    setShowResults(true)
    
    // Результат зависит от total score
    const result: BlastRadiusResult = calculatedScores.total >= 70 ? 'success' : 'fail'
    onFinish(result)
  }, [calculateScores, onFinish, isFinished])

  // Таймер
  useEffect(() => {
    if (isFinished) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1
        if (newTime <= 0) {
          handleFinish()
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isFinished, handleFinish])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="blast-radius-root">
      <div className="blast-radius-header">
        <div className="blast-radius-timer">
          <span className={`timer-value ${timeLeft <= 30 ? 'timer-warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="blast-radius-incident">
          <span className="incident-label">🚨 Инцидент:</span>
          <span className="incident-text">Скидка 90% вместо 9%</span>
        </div>
      </div>

      <div className="blast-radius-instructions">
        <p>Останови убытки: настрой флаги для каждого сегмента. Клик на ячейку переключает состояние.</p>
      </div>

      <div className="blast-radius-table-container">
        <table className="blast-radius-table">
          <thead>
            <tr>
              <th className="flag-column">Флаг / Сегмент</th>
              {SEGMENTS.map(segment => (
                <th key={segment.id} className="segment-column">
                  <div className="segment-header">
                    <span className="segment-name">{segment.name}</span>
                    <span className="segment-size">{segment.size}%</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FLAGS.map(flag => (
              <tr key={flag.id}>
                <td className="flag-cell">
                  <div className="flag-name">{flag.name}</div>
                  <div className="flag-description">{flag.description}</div>
                </td>
                {SEGMENTS.map(segment => (
                  <td key={`${flag.id}-${segment.id}`} className="toggle-cell">
                    <button
                      className={`toggle-button ${flagStates[flag.id][segment.id] ? 'toggle-on' : 'toggle-off'}`}
                      onClick={() => handleToggleCell(flag.id, segment.id)}
                      disabled={isFinished}
                      aria-label={`${flag.name} для ${segment.name}: ${flagStates[flag.id][segment.id] ? 'включен' : 'выключен'}`}
                    >
                      {flagStates[flag.id][segment.id] ? 'ON' : 'OFF'}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isFinished && (
        <div className="blast-radius-actions">
          <button className="btn-finish" onClick={handleFinish}>
            Завершить и проверить
          </button>
        </div>
      )}

      {showResults && scores && (
        <div className="blast-radius-results">
          <h3 className="results-title">Результаты</h3>
          
          <div className="scores-grid">
            <div className="score-card">
              <div className="score-label">Incident Damage</div>
              <div className={`score-value ${scores.incidentDamage <= 10 ? 'score-good' : 'score-bad'}`}>
                {scores.incidentDamage}%
              </div>
              <div className="score-target">цель: &lt;10%</div>
            </div>
            
            <div className="score-card">
              <div className="score-label">Business Impact</div>
              <div className={`score-value ${scores.businessImpact >= 90 ? 'score-good' : 'score-bad'}`}>
                {scores.businessImpact}%
              </div>
              <div className="score-target">цель: &gt;90%</div>
            </div>
            
            <div className="score-card">
              <div className="score-label">Safety</div>
              <div className={`score-value ${scores.safety === 100 ? 'score-good' : 'score-bad'}`}>
                {scores.safety}%
              </div>
              <div className="score-target">цель: 100%</div>
            </div>
            
            <div className="score-card">
              <div className="score-label">Debuggability</div>
              <div className={`score-value ${scores.debuggability === 100 ? 'score-good' : 'score-bad'}`}>
                {scores.debuggability}%
              </div>
              <div className="score-target">цель: 100%</div>
            </div>
          </div>

          <div className="total-score">
            <span className="total-label">Итоговый счёт:</span>
            <span className={`total-value ${scores.total >= 70 ? 'score-good' : 'score-bad'}`}>
              {scores.total}/100
            </span>
          </div>

          <div className="results-explanation">
            <h4>Чему учит этот уровень:</h4>
            <ul>
              <li>🎯 <strong>Blast radius matters</strong> — выключай баг точечно, а не «всё подряд»</li>
              <li>🔍 <strong>Сохраняй debug-сегмент</strong> — beta/internal пользователи помогут понять корень проблемы</li>
              <li>💰 <strong>Считай бизнес-ущерб</strong> — простой checkout может стоить дороже, чем сам баг</li>
              <li>📊 <strong>Читай метрики правильно</strong> — рост конверсии ≠ хорошо, если это аномалия</li>
            </ul>
          </div>

          <div className="correct-solution-hint">
            <h4>Правильная конфигурация:</h4>
            <ul>
              <li><code>new-discount-engine</code>: ON только для <code>beta-users</code> (5%)</li>
              <li><code>legacy-promo-codes</code>: ON только для <code>internal-users</code> (2%)</li>
              <li><code>bank-webhook-retry</code>: ON для всех</li>
              <li><code>mobile-app-v3</code>: OFF для <code>mobile-ios</code> (до фикса краша)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

const FLAGS: Flag[] = [
  { id: 'new-discount-engine', name: 'new-discount-engine', description: 'Новая логика скидок', defaultOn: true },
  { id: 'legacy-promo-codes', name: 'legacy-promo-codes', description: 'Старые промокоды', defaultOn: true },
  { id: 'dynamic-pricing-v2', name: 'dynamic-pricing-v2', description: 'Динамическое ценообразование', defaultOn: false },
  { id: 'express-checkout', name: 'express-checkout', description: 'Быстрая оплата', defaultOn: true },
  { id: 'mobile-app-v3', name: 'mobile-app-v3', description: 'Новое мобильное приложение', defaultOn: true },
  { id: 'bank-webhook-retry', name: 'bank-webhook-retry', description: 'Повторы к банку', defaultOn: false },
  { id: 'internal-employee-discount', name: 'internal-employee-discount', description: 'Скидка сотрудникам', defaultOn: true },
]

const SEGMENTS: Segment[] = [
  { id: 'beta-users', name: 'Beta', size: 5 },
  { id: 'internal-users', name: 'Internal', size: 2 },
  { id: 'high-value-customers', name: 'High-Value', size: 12 },
  { id: 'mobile-ios', name: 'iOS', size: 35 },
  { id: 'mobile-android', name: 'Android', size: 40 },
  { id: 'web-desktop', name: 'Web', size: 25 },
  { id: 'first-time-buyers', name: 'First-Time', size: 18 },
]

export default BlastRadiusGame
