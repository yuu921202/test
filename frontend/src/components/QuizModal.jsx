import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { useGameification } from '../GameificationContext'
import './QuizModal.css'

export default function QuizModal({ attraction, onClose, onQuizComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const { completeQuiz, completedQuizzes } = useGameification()

  if (!attraction) return null

  useEffect(() => {
    // 动态生成问题
    const questions = generateQuestions(attraction)
    if (questions.length > 0) {
      setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)])
    }
  }, [attraction])

  const generateQuestions = (attr) => {
    const questions = []

    // 问题1：评分
    if (attr.rating) {
      const ratingValue = parseFloat(attr.rating).toFixed(1)
      const options = [
        ratingValue,
        (parseFloat(attr.rating) - 0.5).toFixed(1),
        (parseFloat(attr.rating) + 0.5).toFixed(1),
        (parseFloat(attr.rating) - 1).toFixed(1)
      ]
      questions.push({
        text: `這個景點的評分大約是多少？`,
        correct: ratingValue,
        options: shuffleArray([...new Set(options)])
      })
    }

    // 问题2：停留时间
    if (attr.duration_minutes) {
      const duration = attr.duration_minutes
      const options = [duration, duration - 15, duration + 20, duration - 30]
      questions.push({
        text: `建議在這個景點停留多久？`,
        correct: `${duration} 分鐘`,
        options: shuffleArray(options.map(d => `${d} 分鐘`))
      })
    }

    // 问题3：类别
    if (attr.type || attr.category) {
      const type = attr.category || attr.type
      questions.push({
        text: `這個景點屬於哪一類？`,
        correct: type,
        options: shuffleArray([type, '美食', '自然景觀', '購物中心'])
      })
    }

    // 问题4：通用知识问题
    questions.push({
      text: `「${attr.name}」是一個值得探訪的景點。`,
      correct: '是',
      options: shuffleArray(['是', '否'])
    })

    return questions
  }

  const shuffleArray = (arr) => {
    return [...arr].sort(() => Math.random() - 0.5)
  }

  const handleAnswerSelect = (answer) => {
    if (!answered) {
      setSelectedAnswer(answer)
      setAnswered(true)
      setShowFeedback(true)

      // 判断是否正确
      const isCorrect = answer === currentQuestion.correct

      if (isCorrect) {
        const success = completeQuiz(attraction.place_id)
        if (success) {
          // 显示反馈动画
          setTimeout(() => {
            onQuizComplete?.(true)
            setTimeout(() => {
              onClose()
            }, 600)
          }, 1200)
        } else {
          // 已经完成过此题
          setTimeout(() => {
            onClose()
          }, 2000)
        }
      } else {
        // 答错，延迟后关闭（允许重试或直接关闭）
        setTimeout(() => {
          setAnswered(false)
          setShowFeedback(false)
          setSelectedAnswer(null)
        }, 2000)
      }
    }
  }

  if (!currentQuestion) {
    return null
  }

  const isCorrect = selectedAnswer === currentQuestion.correct
  const isAlreadyCompleted = completedQuizzes.has(attraction.place_id)

  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button className="quiz-close" onClick={onClose} aria-label="關閉">
          <X size={24} />
        </button>

        {/* 标题 */}
        <div className="quiz-header">
          <h3>認識這個景點</h3>
          <p className="quiz-attraction-name">{attraction.name}</p>
        </div>

        {/* 问题内容 */}
        <div className="quiz-content">
          {isAlreadyCompleted && !showFeedback ? (
            <div className="quiz-completed">
              <Check size={48} className="completed-icon" />
              <p>你已經完成過這個景點的測驗</p>
              <p className="completed-tip">可以探索其他景點的知識問答</p>
            </div>
          ) : (
            <>
              <div className="quiz-question">
                <p>{currentQuestion.text}</p>
              </div>

              <div className="quiz-options">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`quiz-option ${selectedAnswer === option ? (isCorrect ? 'correct' : 'incorrect') : ''} ${
                      showFeedback && option === currentQuestion.correct ? 'show-correct' : ''
                    }`}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={answered}
                  >
                    <span className="option-text">{option}</span>
                    {showFeedback && option === currentQuestion.correct && (
                      <Check size={18} className="correct-icon" />
                    )}
                  </button>
                ))}
              </div>

              {/* 反馈信息 */}
              {showFeedback && (
                <div className={`quiz-feedback ${isCorrect ? 'success' : 'error'}`}>
                  {isCorrect ? (
                    <>
                      <div className="success-checkmark">
                        <Check size={32} />
                      </div>
                      <p className="feedback-text">答對了！+10 分</p>
                    </>
                  ) : (
                    <>
                      <p className="feedback-text">答錯了，正確答案是：</p>
                      <p className="correct-answer">{currentQuestion.correct}</p>
                      <p className="retry-tip">點擊其他選項重試</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
