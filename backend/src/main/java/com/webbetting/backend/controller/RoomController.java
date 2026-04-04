package com.webbetting.backend.controller;

import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.UserRepository;
import com.webbetting.backend.service.RoomService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/room")
public class RoomController {

    @Autowired private RoomService roomService;
    @Autowired private UserRepository userRepository;

    @Data
    static class CreateRoomRequest {
        private String gameType;
        private int betAmount;
        private int timeControlMs;
        private int incrementMs;
    }

    @Data
    static class JoinRoomRequest {
        private String roomId;
    }

    /** Tạo phòng */
    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@RequestBody CreateRoomRequest req, Authentication auth) {
        User user = getUser(auth);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        RoomService.Room room = roomService.createRoom(
                String.valueOf(user.getId()), user.getNickname(),
                req.getGameType(), req.getBetAmount(),
                req.getTimeControlMs(), req.getIncrementMs()
        );
        return ResponseEntity.ok(Map.of(
                "roomId", room.getRoomId(),
                "status", room.getStatus(),
                "gameType", room.getGameType(),
                "betAmount", room.getBetAmount(),
                "members", room.getMembers()
        ));
    }

    /** Tham gia phòng */
    @PostMapping("/join")
    public ResponseEntity<?> joinRoom(@RequestBody JoinRoomRequest req, Authentication auth) {
        User user = getUser(auth);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        RoomService.JoinResult result = roomService.joinRoom(
                req.getRoomId().toUpperCase().trim(),
                String.valueOf(user.getId()), user.getNickname()
        );
        if (!result.isSuccess()) return ResponseEntity.badRequest().body(Map.of("error", result.getError()));

        RoomService.Room room = result.getRoom();
        return ResponseEntity.ok(Map.of(
                "roomId", room.getRoomId(),
                "status", room.getStatus(),
                "gameType", room.getGameType(),
                "betAmount", room.getBetAmount(),
                "hostNickname", room.getHostNickname(),
                "members", room.getMembers()
        ));
    }

    /** Bắt đầu trận (chỉ host) */
    @PostMapping("/start")
    public ResponseEntity<?> startGame(@RequestBody Map<String, String> body, Authentication auth) {
        User user = getUser(auth);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String roomId = body.get("roomId");
        RoomService.StartResult result = roomService.startGame(roomId, String.valueOf(user.getId()));
        if (!result.isSuccess()) return ResponseEntity.badRequest().body(Map.of("error", result.getError()));

        return ResponseEntity.ok(Map.of("gameId", result.getGameId()));
    }

    /** Rời phòng */
    @PostMapping("/leave")
    public ResponseEntity<?> leaveRoom(@RequestBody Map<String, String> body, Authentication auth) {
        User user = getUser(auth);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String roomId = body.get("roomId");
        roomService.leaveRoom(roomId, String.valueOf(user.getId()));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /** Lấy thông tin phòng */
    @GetMapping("/{roomId}")
    public ResponseEntity<?> getRoom(@PathVariable String roomId) {
        RoomService.Room room = roomService.getRoom(roomId.toUpperCase().trim());
        if (room == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of(
                "roomId", room.getRoomId(),
                "status", room.getStatus(),
                "gameType", room.getGameType(),
                "betAmount", room.getBetAmount(),
                "members", room.getMembers()
        ));
    }

    /** Lấy phòng hiện tại của user */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentRoom(Authentication auth) {
        User user = getUser(auth);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        RoomService.Room room = roomService.getRoomByUser(String.valueOf(user.getId()));
        if (room == null) return ResponseEntity.ok(Map.of("hasRoom", false));

        return ResponseEntity.ok(Map.of(
                "hasRoom", true,
                "roomId", room.getRoomId(),
                "status", room.getStatus(),
                "gameType", room.getGameType(),
                "betAmount", room.getBetAmount(),
                "members", room.getMembers(),
                "isHost", room.getHostId().equals(String.valueOf(user.getId()))
        ));
    }

    private User getUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }
}
