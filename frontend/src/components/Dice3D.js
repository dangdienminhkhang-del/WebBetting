import React, { useState, useEffect, useRef } from 'react';
import '../styles/Dice3D.css';

const Dice3D = ({ dice1, dice2, isRolling, onRollComplete }) => {
  const [currentDice1, setCurrentDice1] = useState(1);
  const [currentDice2, setCurrentDice2] = useState(1);
  const [rollingStage, setRollingStage] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    if (isRolling) {
      setShowResult(false);
      startRollingAnimation();
    } else {
      // Smooth transition to final values
      setTimeout(() => {
        setCurrentDice1(dice1);
        setCurrentDice2(dice2);
        setShowResult(true);
      }, 100);
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isRolling, dice1, dice2]);

  const startRollingAnimation = () => {
    setRollingStage(0);
    let currentStage = 0;
    const totalStages = 5; // Increased for smoother animation
    const stageInterval = 350; // Faster intervals

    const animateStage = () => {
      if (currentStage < totalStages) {
        setRollingStage(currentStage);
        
        // Random values during rolling for visual effect
        setCurrentDice1(Math.floor(Math.random() * 6) + 1);
        setCurrentDice2(Math.floor(Math.random() * 6) + 1);
        
        currentStage++;
        animationRef.current = setTimeout(animateStage, stageInterval);
      } else {
        // Final stage - show actual result
        animationRef.current = setTimeout(() => {
          setCurrentDice1(dice1);
          setCurrentDice2(dice2);
          setRollingStage(0);
          if (onRollComplete) {
            onRollComplete();
          }
        }, 300);
      }
    };

    animateStage();
  };

  const renderDiceFace = (value) => {
    const dots = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };

    return (
      <div className="dice-face">
        {dots[value]?.map((position, index) => (
          <div key={index} className={`dice-dot ${position}`}></div>
        ))}
      </div>
    );
  };

  // Get rotation for final dice position
  const getDiceRotation = (value) => {
    const rotations = {
      1: 'rotateX(0deg) rotateY(0deg)',
      2: 'rotateX(0deg) rotateY(180deg)',
      3: 'rotateX(0deg) rotateY(-90deg)',
      4: 'rotateX(0deg) rotateY(90deg)',
      5: 'rotateX(-90deg) rotateY(0deg)',
      6: 'rotateX(90deg) rotateY(0deg)'
    };
    return rotations[value] || rotations[1];
  };

  return (
    <div className="dice-container">
      <div className="dice-pair">
        {/* Dice 1 */}
        <div 
          className={`dice dice-1 ${isRolling ? 'rolling' : 'settled'} rolling-stage-${rollingStage}`}
          style={{
            '--final-rotation': isRolling ? 'none' : getDiceRotation(currentDice1)
          }}
        >
          <div className="dice-3d">
            <div className="dice-side front">{renderDiceFace(1)}</div>
            <div className="dice-side back">{renderDiceFace(2)}</div>
            <div className="dice-side right">{renderDiceFace(4)}</div>
            <div className="dice-side left">{renderDiceFace(3)}</div>
            <div className="dice-side top">{renderDiceFace(5)}</div>
            <div className="dice-side bottom">{renderDiceFace(6)}</div>
          </div>
        </div>

        {/* Dice 2 */}
        <div 
          className={`dice dice-2 ${isRolling ? 'rolling' : 'settled'} rolling-stage-${rollingStage}`}
          style={{
            '--final-rotation': isRolling ? 'none' : getDiceRotation(currentDice2)
          }}
        >
          <div className="dice-3d">
            <div className="dice-side front">{renderDiceFace(1)}</div>
            <div className="dice-side back">{renderDiceFace(2)}</div>
            <div className="dice-side right">{renderDiceFace(4)}</div>
            <div className="dice-side left">{renderDiceFace(3)}</div>
            <div className="dice-side top">{renderDiceFace(5)}</div>
            <div className="dice-side bottom">{renderDiceFace(6)}</div>
          </div>
        </div>
      </div>

      {/* Result Display - Only show when not rolling */}
      {!isRolling && showResult && (
        <div className="dice-result">
          <div className="result-text">
            ⚀⚁ Kết quả: <span className="result-value">{dice1} + {dice2} = {dice1 + dice2}</span>
          </div>
          <div className={`result-type ${dice1 + dice2 >= 8 ? 'tai' : 'xiu'}`}>
            {dice1 + dice2 >= 8 ? '🎉 TÀI' : '🎯 XỈU'}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dice3D;