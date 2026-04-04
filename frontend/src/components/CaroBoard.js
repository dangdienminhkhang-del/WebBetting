import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import '../styles/CaroGame.css';
import '../styles/board.css';

const CaroBoard = forwardRef(function CaroBoard({ 
  board, 
  onCellClick, 
  disabled, 
  boardSize, 
  lastMove, 
  winningCells = [],
  mode = 'play',
  viewportRef,
  winner
}, ref) {
  const internalViewportRef = useRef(null);
  const actualViewportRef = viewportRef || internalViewportRef;
  
  const [highlightedCell, setHighlightedCell] = useState(null);
  const highlightTimerRef = useRef(null);

  // Drag-to-pan state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const hasDragged = useRef(false);
  
  // ⭐ Hàm tính style cho đường gạch
  const getWinLineStyle = () => {
    if (winningCells.length < 5) return null;
    
    const sortedCells = [...winningCells].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    const first = sortedCells[0];
    const last = sortedCells[sortedCells.length - 1];
    
    const firstCell = document.getElementById(`cell-${first.row}-${first.col}`);
    const lastCell = document.getElementById(`cell-${last.row}-${last.col}`);
    
    if (!firstCell || !lastCell || !actualViewportRef.current) return null;
    
    const viewport = actualViewportRef.current;
    const firstRect = firstCell.getBoundingClientRect();
    const lastRect = lastCell.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    
    const startX = firstRect.left - viewportRect.left + viewport.scrollLeft + firstRect.width / 2;
    const startY = firstRect.top - viewportRect.top + viewport.scrollTop + firstRect.height / 2;
    const endX = lastRect.left - viewportRect.left + viewport.scrollLeft + lastRect.width / 2;
    const endY = lastRect.top - viewportRect.top + viewport.scrollTop + lastRect.height / 2;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const length_vector = Math.sqrt(dx * dx + dy * dy);
    if (!Number.isFinite(length_vector) || length_vector <= 0) return null;
    const unitX = dx / length_vector;
    const unitY = dy / length_vector;
    const extension = 12;
    const newStartX = startX - unitX * extension;
    const newStartY = startY - unitY * extension;
    const newEndX = endX + unitX * extension;
    const newEndY = endY + unitY * extension;
    const newDx = newEndX - newStartX;
    const newDy = newEndY - newStartY;
    const newLength = Math.sqrt(newDx * newDx + newDy * newDy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return { left: newStartX, top: newStartY, width: newLength, height: 4, angle };
  };
  
  useEffect(() => {
    if (actualViewportRef.current) {
      const viewport = actualViewportRef.current;
      const boardElement = viewport.querySelector('.caro-board-large');
      
      const centerScrollLeft = (boardElement.scrollWidth - viewport.clientWidth) / 2;
      const centerScrollTop = (boardElement.scrollHeight - viewport.clientHeight) / 2;
      
      viewport.scrollLeft = centerScrollLeft;
      viewport.scrollTop = centerScrollTop;
    }
  }, [actualViewportRef]);

  useEffect(() => {
    if (winningCells.length > 0 && actualViewportRef.current && mode === 'replay') {
      const viewport = actualViewportRef.current;
      const firstWinningCell = winningCells[0];
      
      if (firstWinningCell) {
        const cell = document.getElementById(`cell-${firstWinningCell.row}-${firstWinningCell.col}`);
        if (cell) {
          const cellRect = cell.getBoundingClientRect();
          const viewportRect = viewport.getBoundingClientRect();
          
          const targetX = cellRect.left - viewportRect.left + viewport.scrollLeft - viewport.clientWidth / 2 + cellRect.width / 2;
          const targetY = cellRect.top - viewportRect.top + viewport.scrollTop - viewport.clientHeight / 2 + cellRect.height / 2;
          
          const maxScrollX = viewport.scrollWidth - viewport.clientWidth;
          const maxScrollY = viewport.scrollHeight - viewport.clientHeight;
          
          const clampedX = Math.max(0, Math.min(targetX, maxScrollX));
          const clampedY = Math.max(0, Math.min(targetY, maxScrollY));
          
          viewport.scrollTo({
            left: clampedX,
            top: clampedY,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [winningCells, mode, actualViewportRef]);

  const [showWinLine, setShowWinLine] = useState(false);
  const [showWinMessage, setShowWinMessage] = useState(false);

  useEffect(() => {
    if (winningCells.length >= 5 && winner) {
      setShowWinLine(false);
      setShowWinMessage(false);
      
      setTimeout(() => {
        setShowWinLine(true);
        setTimeout(() => {
          setShowWinMessage(true)
        
          setTimeout(() => {
            setShowWinMessage(false);
          }, 2000);
        }, 800);
      }, 100);
    } else {
      setShowWinLine(false);
      setShowWinMessage(false);
    }
  }, [winningCells, winner]);

  const handleScroll = () => {
    // no-op: không cần setState khi scroll để tránh re-render
  };

  // Drag-to-pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const viewport = actualViewportRef.current;
    if (!viewport) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    viewport.style.cursor = 'grabbing';
    viewport.style.userSelect = 'none';
    e.preventDefault();
  }, [actualViewportRef]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const viewport = actualViewportRef.current;
    if (!viewport) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    viewport.scrollLeft = dragStart.current.scrollLeft - dx;
    viewport.scrollTop = dragStart.current.scrollTop - dy;
  }, [actualViewportRef]);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const viewport = actualViewportRef.current;
    if (viewport) {
      viewport.style.cursor = 'grab';
      viewport.style.userSelect = '';
    }
  }, [actualViewportRef]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      const viewport = actualViewportRef.current;
      if (viewport) {
        viewport.style.cursor = 'grab';
        viewport.style.userSelect = '';
      }
    }
  }, [actualViewportRef]);

  // Intercept click sau drag để không đánh nhầm ô
  const handleCellClickWithDragCheck = useCallback((e, rowIndex, colIndex) => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    if (!disabled) onCellClick(rowIndex, colIndex);
  }, [disabled, onCellClick]);

  const scrollToCenter = () => {
    if (actualViewportRef.current) {
      const viewport = actualViewportRef.current;
      const boardElement = viewport.firstChild;
      
      const centerScrollLeft = (boardElement.scrollWidth - viewport.clientWidth) / 2;
      const centerScrollTop = (boardElement.scrollHeight - viewport.clientHeight) / 2;
      
      viewport.scrollTo({
        left: centerScrollLeft,
        top: centerScrollTop,
        behavior: 'smooth'
      });
    }
  };

  const scrollToLastMove = () => {
    if (actualViewportRef.current && lastMove.row !== -1 && lastMove.col !== -1) {
      const cell = document.getElementById(`cell-${lastMove.row}-${lastMove.col}`);
      if (cell) {
        const viewport = actualViewportRef.current;
        const cellRect = cell.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        
        const targetX = cellRect.left - viewportRect.left + viewport.scrollLeft - viewport.clientWidth / 2 + cellRect.width / 2;
        const targetY = cellRect.top - viewportRect.top + viewport.scrollTop - viewport.clientHeight / 2 + cellRect.height / 2;
        
        const maxScrollX = viewport.scrollWidth - viewport.clientWidth;
        const maxScrollY = viewport.scrollHeight - viewport.clientHeight;
        
        const clampedX = Math.max(0, Math.min(targetX, maxScrollX));
        const clampedY = Math.max(0, Math.min(targetY, maxScrollY));
        
        viewport.scrollTo({
          left: clampedX,
          top: clampedY,
          behavior: 'smooth'
        });
        setHighlightedCell({ row: lastMove.row, col: lastMove.col });
      }
    } else {
      scrollToCenter();
    }
  };

  useEffect(() => {
    if (mode !== 'play') return;
    if (lastMove?.row === -1 || lastMove?.col === -1) return;
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedCell({ row: lastMove.row, col: lastMove.col });
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedCell(null);
      highlightTimerRef.current = null;
    }, 1200);
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [lastMove?.row, lastMove?.col, mode]);

  const isWinningCell = (rowIndex, colIndex) => {
    return winningCells.some(cell => cell.row === rowIndex && cell.col === colIndex);
  };

  const winLineStyle = getWinLineStyle();

  // Expose scroll functions cho parent
  useImperativeHandle(ref, () => ({
    scrollToCenter,
    scrollToLastMove,
  }));

  return (
    <div className="caro-board-section">
      {/* Navigation Controls — chỉ hiện trong replay mode */}
      {mode === 'replay' && (
      <div className="viewport-controls">
        <button className="viewport-btn" onClick={scrollToCenter}>
          🎯 Về trung tâm
        </button>
        <button className="viewport-btn" onClick={scrollToLastMove}>
          🔍 Đến nước đi gần nhất
          {lastMove.type && (
            <span style={{marginLeft: '5px', fontSize: '0.7em'}}>
              ({lastMove.type === 'player' ? 'X' : 'O'})
            </span>
          )}
        </button>
        <div className="viewport-info">
          🖱️ Kéo để di chuyển bàn cờ
          {lastMove.row !== -1 && (
            <span style={{marginLeft: '10px'}}>
              📍 Nước gần nhất: ({lastMove.row + 1}, {lastMove.col + 1})
            </span>
          )}
          {winningCells.length > 0 && mode === 'replay' && (
            <span style={{marginLeft: '10px', color: '#FFD700', fontWeight: 'bold'}}>
              🏆 {winningCells.length >= 5 ? '5 con liên tiếp!' : 'Chiến thắng!'}
            </span>
          )}
        </div>
      </div>
      )}

      {/* Viewport Container */}
      <div 
        className={`caro-board-viewport ${mode}`}
        ref={actualViewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Large Fixed Board */}
        <div className="caro-board-large" style={{ position: 'relative' }}>
          {board.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {row.map((cell, colIndex) => {
                const isWinning = isWinningCell(rowIndex, colIndex);
                const isHighlighted = highlightedCell?.row === rowIndex && highlightedCell?.col === colIndex;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    id={`cell-${rowIndex}-${colIndex}`}
                    className={`caro-cell ${cell === 'X' ? 'x-cell' : cell === 'O' ? 'o-cell' : ''} ${
                      disabled ? 'disabled' : ''
                    } ${isWinning ? 'winning-cell' : ''} ${
                      mode === 'replay' ? 'replay-mode' : ''
                    } ${isHighlighted ? 'last-move-highlight' : ''}`}
                    onClick={(e) => handleCellClickWithDragCheck(e, rowIndex, colIndex)}
                    data-row={rowIndex}
                    data-col={colIndex}
                    title={isWinning ? `Ô chiến thắng ${rowIndex + 1},${colIndex + 1}` : ''}
                  >
                    {cell}
                  </div>
                );
              })}
              </React.Fragment>
            ))}
          

          {/* ⭐ Đường gạch animation */}
          {winLineStyle && showWinLine && mode === 'replay' && (
            <div 
              className="win-line-animated"
              style={{
                position: 'absolute',
                left: winLineStyle.left,
                top: winLineStyle.top,
                width: 0,
                height: winLineStyle.height,
                background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                transform: `rotate(${winLineStyle.angle}deg)`,
                transformOrigin: '0 0',
                boxShadow: '0 0 10px #FFD700',
                borderRadius: '2px',
                zIndex: 100,
                pointerEvents: 'none',
                animation: 'drawLine 0.8s ease-out forwards',
                '--target-width': `${winLineStyle.width}px`
              }}
            />
          )}
        </div>
      </div>
          {showWinMessage && mode === 'replay' && winner && (
      <div className="win-toast">
        <div className={`win-toast-content ${winner === 'X' ? 'victory' : 'defeat'}`}>
          <span className="win-toast-icon">
            {winner === 'X' ? '🏆' : '💀'}
          </span>
          <span className="win-toast-text">
            {winner === 'X' ? 'VICTORY! X thắng' : 'DEFEAT! O thắng'}
          </span>
        </div>
      </div>
    )}
    </div>
  );
});

export default CaroBoard;
