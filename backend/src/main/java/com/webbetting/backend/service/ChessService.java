package com.webbetting.backend.service;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Piece;
import com.github.bhlangonijr.chesslib.Side;
import com.github.bhlangonijr.chesslib.Square;
import com.github.bhlangonijr.chesslib.move.Move;
import com.webbetting.backend.model.ChessGame;
import com.webbetting.backend.model.TransactionType;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.ChessGameRepository;
import com.webbetting.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ChessService {

    @Autowired
    private ChessGameRepository chessGameRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionService transactionService;

    private static final String START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    public List<ChessGame> getHistory(User user) {
        return chessGameRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    private void validateNoActiveGame(User user) {
        int activeGames = chessGameRepository.countActiveGamesByUserId(user.getId());
        if (activeGames > 0) {
            throw new RuntimeException("Bạn đang có một ván cờ đang diễn ra. Vui lòng kết thúc hoặc rời phòng trước khi bắt đầu ván mới.");
        }
    }
    public int getActiveGameCount(User user) {
        return chessGameRepository.countActiveGamesByUserId(user.getId());
    }

    public Optional<ChessGame> getActiveGame(User user) {
        ChessGame game = chessGameRepository.findTopByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), "IN_PROGRESS");
        return Optional.ofNullable(game);
    }

    @Transactional
    public ChessGame startGame(User user, long stakeAmount, String difficulty, String playerColor) {
        validateNoActiveGame(user);
        
        if (stakeAmount <= 0) throw new RuntimeException("Stake amount must be positive");
        if (difficulty == null || difficulty.trim().isEmpty()) throw new RuntimeException("Difficulty is required");
        if (playerColor == null || playerColor.trim().isEmpty()) throw new RuntimeException("Player color is required");

        String diff = difficulty.trim().toUpperCase();
        if (!diff.equals("EASY") && !diff.equals("MEDIUM") && !diff.equals("HARD")) {
            throw new RuntimeException("Invalid difficulty");
        }

        String color = playerColor.trim().toUpperCase();
        if (!color.equals("WHITE") && !color.equals("BLACK")) {
            throw new RuntimeException("Invalid color");
        }

        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        long before = dbUser.getBalance() != null ? dbUser.getBalance() : 0L;
        if (before < stakeAmount) throw new RuntimeException("Insufficient balance");

        // Trừ tiền cược
        long after = before - stakeAmount;
        dbUser.setBalance(after);
        userRepository.save(dbUser);

        transactionService.createTransaction(dbUser, TransactionType.BET, stakeAmount, before, after);

        // Tạo game mới
        ChessGame game = new ChessGame();
        game.setUser(dbUser);
        game.setDifficulty(diff);
        game.setPlayerColor(color);
        game.setStakeAmount(stakeAmount);
        game.setBalanceBefore(before);
        game.setBalanceAfter(dbUser.getBalance());
        game.setFen(START_FEN);
        game.setMovesUci("");
        game.setMoveCount(0);
        game.setPlayerMoveCount(0);
        game.setStatus("IN_PROGRESS");
        game.setCreatedAt(LocalDateTime.now());
        game.setFinishedAt(null);
        game.setGameResult(null);
        game.setWinAmount(0L);

        // Lưu game vào database
        ChessGame saved = chessGameRepository.save(game);
        
        // Nếu người chơi chọn ĐEN (BLACK), AI sẽ đi trước
        if (color.equals("BLACK")) {
            try {
                Board board = new Board();
                board.loadFromFen(saved.getFen());
                
                // Tìm nước đi cho AI (quân trắng đi trước)
                Move aiMove = findAiMove(board, diff, Side.WHITE);
                if (aiMove != null && aiMove.toString() != null) {
                    board.doMove(aiMove);
                    // Append move vào lịch sử
                    String currentMoves = saved.getMovesUci();
                    if (currentMoves == null || currentMoves.isEmpty()) {
                        saved.setMovesUci(aiMove.toString());
                    } else {
                        saved.setMovesUci(currentMoves + " " + aiMove.toString());
                    }
                    saved.setMoveCount(1);
                    saved.setFen(board.getFen());
                    saved = chessGameRepository.save(saved);
                }
            } catch (Exception e) {
                // Nếu AI có lỗi, vẫn cho phép game bắt đầu
                System.err.println("AI move error: " + e.getMessage());
                e.printStackTrace();
                // Không throw exception, chỉ log lỗi
            }
        }
        
        // Đảm bảo trả về game với đầy đủ thông tin
        return chessGameRepository.findById(saved.getId())
                .orElseThrow(() -> new RuntimeException("Game not found after save"));
    }

    @Transactional
    public ChessGame cancelBeforeFirstMove(User user, long gameId) {
        ChessGame game = getOwnedGame(user, gameId);
        if (!"IN_PROGRESS".equals(game.getStatus())) throw new RuntimeException("Game is not active");
        
        // Nếu người chơi chưa đi nước nào, ta xóa hẳn game khỏi database thay vì chuyển trạng thái CANCELLED
        if (game.getPlayerMoveCount() != null && game.getPlayerMoveCount() > 0) {
            throw new RuntimeException("Cannot change config after game started");
        }

        User dbUser = userRepository.findById(user.getId()).orElseThrow(() -> new RuntimeException("User not found"));
        long current = dbUser.getBalance() != null ? dbUser.getBalance() : 0L;
        long refund = game.getStakeAmount() != null ? game.getStakeAmount() : 0L;
        long after = current + refund;
        dbUser.setBalance(after);
        userRepository.save(dbUser);

        transactionService.createTransaction(dbUser, TransactionType.WIN, refund, current, after);

        // Xóa game để không hiện trong lịch sử
        chessGameRepository.delete(game);
        
        // Tạo một object tạm để trả về frontend với trạng thái CANCELLED
        ChessGame cancelledProxy = new ChessGame();
        cancelledProxy.setStatus("CANCELLED");
        cancelledProxy.setGameResult("CANCELLED");
        cancelledProxy.setStakeAmount(refund);
        return cancelledProxy;
    }

    @Transactional
    public ChessGame leaveGame(User user, long gameId) {
        ChessGame game = getOwnedGame(user, gameId);
        if (!"IN_PROGRESS".equals(game.getStatus())) return game;
        
        game.setStatus("RESIGNED");
        game.setGameResult("LOSE");
        game.setWinAmount(0L);
        game.setFinishedAt(LocalDateTime.now());
        Long balanceBefore = game.getBalanceBefore();
        Long stakeAmount = game.getStakeAmount();
        if (balanceBefore != null && stakeAmount != null) {
            game.setBalanceAfter(balanceBefore - stakeAmount);
        }
        
        return chessGameRepository.save(game);
    }

    @Transactional
    public ChessGame makeMove(User user, long gameId, String from, String to, String promotion) {
        ChessGame game = getOwnedGame(user, gameId);
        if (!"IN_PROGRESS".equals(game.getStatus())) throw new RuntimeException("Game is not active");

        Board board = new Board();
        board.loadFromFen(game.getFen());

        Side playerSide = "WHITE".equals(game.getPlayerColor()) ? Side.WHITE : Side.BLACK;
        if (board.getSideToMove() != playerSide) throw new RuntimeException("Not your turn");

        Move playerMove = toMove(board.getSideToMove(), from, to, promotion);
        String moveStr = playerMove.toString();
        Move legalPlayerMove = board.legalMoves().stream()
                .filter(m -> m.toString().equalsIgnoreCase(moveStr))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Illegal move"));

        board.doMove(legalPlayerMove);
        appendMove(game, legalPlayerMove.toString());
        game.setPlayerMoveCount((game.getPlayerMoveCount() == null ? 0 : game.getPlayerMoveCount()) + 1);
        game.setFen(board.getFen());

        if (isGameOver(board)) {
            settleGame(user, game, board);
            return chessGameRepository.save(game);
        }

        Side aiSide = playerSide.flip();
        Move aiMove = findAiMove(board, game.getDifficulty(), aiSide);
        if (aiMove != null) {
            board.doMove(aiMove);
            appendMove(game, aiMove.toString());
            game.setFen(board.getFen());
        }

        if (isGameOver(board)) {
            settleGame(user, game, board);
        }

        return chessGameRepository.save(game);
    }

    private ChessGame getOwnedGame(User user, long gameId) {
        ChessGame game = chessGameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        if (game.getUser() == null || game.getUser().getId() == null) {
            throw new RuntimeException("Game data is corrupted");
        }
        if (!game.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only access your own game");
        }
        return game;
    }

    private Move toMove(Side side, String from, String to, String promotion) {
        if (from == null || to == null) throw new RuntimeException("Invalid move");
        String uci = from.toLowerCase() + to.toLowerCase();
        if (promotion != null && !promotion.trim().isEmpty()) {
            String p = promotion.trim().toLowerCase();
            char c = p.charAt(0);
            if (c != 'q' && c != 'r' && c != 'b' && c != 'n') {
                throw new RuntimeException("Invalid promotion piece");
            }
            uci += c;
        }
        return new Move(uci, side);
    }

    private void appendMove(ChessGame game, String uci) {
        if (uci == null || uci.isEmpty()) return;
        
        String current = game.getMovesUci();
        if (current == null || current.isBlank()) {
            game.setMovesUci(uci);
        } else {
            game.setMovesUci(current + " " + uci);
        }
        
        int currentCount = game.getMoveCount() != null ? game.getMoveCount() : 0;
        game.setMoveCount(currentCount + 1);
    }

    private boolean isGameOver(Board board) {
        return board.isMated() || board.isStaleMate() || board.isDraw();
    }

    private void settleGame(User user, ChessGame game, Board board) {
        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        long currentBalance = dbUser.getBalance() != null ? dbUser.getBalance() : 0L;
        long stake = game.getStakeAmount() != null ? game.getStakeAmount() : 0L;
        Side playerSide = "WHITE".equals(game.getPlayerColor()) ? Side.WHITE : Side.BLACK;

        game.setStatus("FINISHED");
        game.setFinishedAt(LocalDateTime.now());

        if (board.isDraw() || board.isStaleMate()) {
            // HÒA: Hoàn lại tiền cược
            long newBalance = currentBalance + stake;
            dbUser.setBalance(newBalance);
            transactionService.createTransaction(dbUser, TransactionType.WIN, stake, currentBalance, newBalance);
            game.setGameResult("DRAW");
            game.setWinAmount(0L);
        } else if (board.isMated()) {
            Side sideToMove = board.getSideToMove();
            Side winner = sideToMove.flip();
            if (winner == playerSide) {
                // THẮNG: Nhận lại tiền cược + thưởng thêm stake
                long newBalance = currentBalance + (stake * 2);
                dbUser.setBalance(newBalance);
                transactionService.createTransaction(dbUser, TransactionType.WIN, stake * 2, currentBalance, newBalance);
                game.setGameResult("WIN");
                game.setWinAmount(stake);
            } else {
                // THUA: Mất tiền cược (giữ nguyên balance vì đã trừ lúc start)
                dbUser.setBalance(currentBalance);
                game.setGameResult("LOSE");
                game.setWinAmount(0L);
            }
        }
        
        // Lưu lại thay đổi
        userRepository.save(dbUser);
        game.setBalanceAfter(dbUser.getBalance());
    }

    private int depthForDifficulty(String difficulty) {
        if (difficulty == null) return 3;
        String d = difficulty.toUpperCase();
        if (d.equals("EASY")) return 2;
        if (d.equals("HARD")) return 4;
        return 3;
    }

    private Move findAiMove(Board board, String difficulty, Side aiSide) {
        if (board == null) return null;
        if (isGameOver(board)) return null;
        if (board.getSideToMove() != aiSide) return null;

        int depth = depthForDifficulty(difficulty);
        List<Move> moves = board.legalMoves();
        if (moves == null || moves.isEmpty()) return null;

        Move bestMove = null;
        int bestScore = Integer.MIN_VALUE;
        int alpha = Integer.MIN_VALUE;
        int beta = Integer.MAX_VALUE;

        try {
            for (Move move : moves) {
                board.doMove(move);
                int score = minimax(board, depth - 1, alpha, beta, false, aiSide);
                board.undoMove();
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, bestScore);
                if (beta <= alpha) break;
            }
        } catch (Exception e) {
            System.err.println("Error in findAiMove: " + e.getMessage());
            e.printStackTrace();
            return null;
        }

        return bestMove;
    }

    private int minimax(Board board, int depth, int alpha, int beta, boolean maximizing, Side aiSide) {
        if (board == null) return 0;
        if (depth == 0 || isGameOver(board)) {
            return evaluate(board, aiSide, depth);
        }

        List<Move> moves = board.legalMoves();
        if (moves == null || moves.isEmpty()) {
            return evaluate(board, aiSide, depth);
        }

        if (maximizing) {
            int best = Integer.MIN_VALUE;
            for (Move move : moves) {
                try {
                    board.doMove(move);
                    best = Math.max(best, minimax(board, depth - 1, alpha, beta, false, aiSide));
                    board.undoMove();
                    alpha = Math.max(alpha, best);
                    if (beta <= alpha) break;
                } catch (Exception e) {
                    board.undoMove();
                    continue;
                }
            }
            return best;
        } else {
            int best = Integer.MAX_VALUE;
            for (Move move : moves) {
                try {
                    board.doMove(move);
                    best = Math.min(best, minimax(board, depth - 1, alpha, beta, true, aiSide));
                    board.undoMove();
                    beta = Math.min(beta, best);
                    if (beta <= alpha) break;
                } catch (Exception e) {
                    board.undoMove();
                    continue;
                }
            }
            return best;
        }
    }

    private int evaluate(Board board, Side aiSide, int depth) {
        if (board.isMated()) {
            Side winner = board.getSideToMove().flip();
            return winner == aiSide ? 100000 + depth : -100000 - depth;
        }
        if (board.isDraw() || board.isStaleMate()) return 0;

        int score = 0;
        for (Square square : Square.values()) {
            Piece piece = board.getPiece(square);
            if (piece == null || piece == Piece.NONE) continue;
            int v = pieceValue(piece);
            if (piece.getPieceSide() == aiSide) score += v;
            else score -= v;
        }
        return score;
    }

    private int pieceValue(Piece piece) {
        switch (piece.getPieceType()) {
            case PAWN: return 100;
            case KNIGHT: return 320;
            case BISHOP: return 330;
            case ROOK: return 500;
            case QUEEN: return 900;
            case KING: return 20000;
            default: return 0;
        }
    }
}
