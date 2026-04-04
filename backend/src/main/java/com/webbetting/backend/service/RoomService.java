package com.webbetting.backend.service;

import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MatchmakingService matchmakingService;

    @Autowired
    private MatchInfoStore matchInfoStore;

    @Autowired
    private PvpGameService pvpGameService;

    @Autowired
    private com.webbetting.backend.repository.UserRepository userRepository;

    // roomId → Room
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    // userId → roomId (để tìm nhanh)
    private final Map<String, String> userRoomIndex = new ConcurrentHashMap<>();

    @Data
    public static class Room {
        private String roomId;
        private String gameType;   // "CARO" | "CHESS"
        private int betAmount;
        private int timeControlMs; // Chess only
        private int incrementMs;   // Chess only
        private String hostId;
        private String hostNickname;
        private String guestId;
        private String guestNickname;
        private String status;     // "WAITING" | "READY" | "STARTED"
        private long createdAt;

        public List<Map<String, String>> getMembers() {
            List<Map<String, String>> list = new ArrayList<>();
            if (hostId != null) {
                Map<String, String> m = new HashMap<>();
                m.put("id", hostId);
                m.put("nickname", hostNickname);
                m.put("role", "HOST");
                list.add(m);
            }
            if (guestId != null) {
                Map<String, String> m = new HashMap<>();
                m.put("id", guestId);
                m.put("nickname", guestNickname);
                m.put("role", "GUEST");
                list.add(m);
            }
            return list;
        }

        public boolean isFull() {
            return guestId != null;
        }
    }

    /** Tạo phòng mới, trả về roomId */
    public Room createRoom(String hostId, String hostNickname, String gameType,
                           int betAmount, int timeControlMs, int incrementMs) {
        // Nếu host đang trong phòng khác → xóa
        leaveCurrentRoom(hostId);

        String roomId = generateRoomId();
        Room room = new Room();
        room.setRoomId(roomId);
        room.setGameType(gameType.toUpperCase());
        room.setBetAmount(betAmount);
        room.setTimeControlMs(timeControlMs);
        room.setIncrementMs(incrementMs);
        room.setHostId(hostId);
        room.setHostNickname(hostNickname);
        room.setStatus("WAITING");
        room.setCreatedAt(System.currentTimeMillis());

        rooms.put(roomId, room);
        userRoomIndex.put(hostId, roomId);
        return room;
    }

    /** Guest tham gia phòng */
    public JoinResult joinRoom(String roomId, String guestId, String guestNickname) {
        Room room = rooms.get(roomId);
        if (room == null) return JoinResult.error("Phòng không tồn tại.");
        if (room.isFull()) return JoinResult.error("Phòng đã đầy.");
        if (room.getHostId().equals(guestId)) return JoinResult.error("Bạn là chủ phòng này.");
        if (!"WAITING".equals(room.getStatus())) return JoinResult.error("Phòng không còn chờ người chơi.");

        leaveCurrentRoom(guestId);

        room.setGuestId(guestId);
        room.setGuestNickname(guestNickname);
        room.setStatus("READY");
        userRoomIndex.put(guestId, roomId);

        // Thông báo cho host: có người vào
        broadcastRoomState(room);
        notifyHost(room, guestNickname);

        return JoinResult.ok(room);
    }

    /** Host bắt đầu trận */
    public StartResult startGame(String roomId, String hostId) {
        Room room = rooms.get(roomId);
        if (room == null) return StartResult.error("Phòng không tồn tại.");
        if (!room.getHostId().equals(hostId)) return StartResult.error("Chỉ chủ phòng mới có thể bắt đầu.");
        if (!room.isFull()) return StartResult.error("Chưa đủ 2 người chơi.");
        if ("STARTED".equals(room.getStatus())) return StartResult.error("Trận đã bắt đầu.");

        // Kiểm tra và trừ tiền cả 2
        Long p1Id = parseLong(room.getHostId());
        Long p2Id = parseLong(room.getGuestId());
        if (p1Id == null || p2Id == null) return StartResult.error("Lỗi người dùng.");

        com.webbetting.backend.model.User u1 = userRepository.findById(p1Id).orElse(null);
        com.webbetting.backend.model.User u2 = userRepository.findById(p2Id).orElse(null);
        if (u1 == null || u2 == null) return StartResult.error("Không tìm thấy người dùng.");

        long b1 = u1.getBalance() != null ? u1.getBalance() : 0L;
        long b2 = u2.getBalance() != null ? u2.getBalance() : 0L;
        if (b1 < room.getBetAmount()) return StartResult.error("Chủ phòng không đủ số dư.");
        if (b2 < room.getBetAmount()) return StartResult.error("Khách không đủ số dư.");

        u1.setBalance(b1 - room.getBetAmount());
        u2.setBalance(b2 - room.getBetAmount());
        userRepository.save(u1);
        userRepository.save(u2);

        // Tạo game session
        String gameId = UUID.randomUUID().toString();
        room.setStatus("STARTED");

        // Lưu match info
        MatchInfoStore.MatchInfo info = new MatchInfoStore.MatchInfo(
                gameId, room.getGameType(),
                room.getBetAmount(), room.getTimeControlMs(), room.getIncrementMs(),
                room.getHostId(), room.getGuestId(),
                room.getHostNickname(), room.getGuestNickname()
        );
        matchInfoStore.put(gameId, info);

        // Tạo PvP session
        pvpGameService.createSession(
                gameId, room.getGameType(),
                room.getHostId(), room.getHostNickname(),
                room.getGuestId(), room.getGuestNickname(),
                room.getBetAmount(), room.getTimeControlMs(), room.getIncrementMs()
        );

        // Broadcast match event cho cả 2
        sendMatchEvent(room, gameId, u1.getBalance(), u2.getBalance());

        // Dọn phòng
        rooms.remove(roomId);
        userRoomIndex.remove(room.getHostId());
        userRoomIndex.remove(room.getGuestId());

        return StartResult.ok(gameId);
    }

    /** Rời phòng */
    public void leaveRoom(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room == null) return;

        if (room.getHostId().equals(userId)) {
            // Host rời → đóng phòng, kick guest
            if (room.getGuestId() != null) {
                messagingTemplate.convertAndSend("/topic/room/" + room.getGuestId(),
                        Map.of("type", "ROOM_CLOSED", "message", "Chủ phòng đã rời."));
                userRoomIndex.remove(room.getGuestId());
            }
            rooms.remove(roomId);
            userRoomIndex.remove(userId);
        } else if (userId.equals(room.getGuestId())) {
            // Guest rời
            room.setGuestId(null);
            room.setGuestNickname(null);
            room.setStatus("WAITING");
            userRoomIndex.remove(userId);
            broadcastRoomState(room);
        }
    }

    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public Room getRoomByUser(String userId) {
        String roomId = userRoomIndex.get(userId);
        return roomId != null ? rooms.get(roomId) : null;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void leaveCurrentRoom(String userId) {
        String existingRoomId = userRoomIndex.get(userId);
        if (existingRoomId != null) leaveRoom(existingRoomId, userId);
    }

    private void broadcastRoomState(Room room) {
        Map<String, Object> payload = buildRoomPayload(room);
        messagingTemplate.convertAndSend("/topic/room/" + room.getHostId(), payload);
        if (room.getGuestId() != null) {
            messagingTemplate.convertAndSend("/topic/room/" + room.getGuestId(), payload);
        }
    }

    private void notifyHost(Room room, String guestNickname) {
        messagingTemplate.convertAndSend("/topic/room/" + room.getHostId(),
                Map.of("type", "GUEST_JOINED",
                        "guestNickname", guestNickname,
                        "roomId", room.getRoomId(),
                        "members", room.getMembers()));
    }

    private void sendMatchEvent(Room room, String gameId, long balance1, long balance2) {
        // Host = PLAYER_1 (X), Guest = PLAYER_2 (O)
        Map<String, Object> p1Event = new HashMap<>();
        p1Event.put("gameId", gameId);
        p1Event.put("opponentId", room.getGuestId());
        p1Event.put("opponentNickname", room.getGuestNickname());
        p1Event.put("role", "PLAYER_1");
        p1Event.put("gameType", room.getGameType());
        p1Event.put("betAmount", room.getBetAmount());
        p1Event.put("timeControlMs", room.getTimeControlMs());
        p1Event.put("incrementMs", room.getIncrementMs());
        p1Event.put("balance", balance1);

        Map<String, Object> p2Event = new HashMap<>();
        p2Event.put("gameId", gameId);
        p2Event.put("opponentId", room.getHostId());
        p2Event.put("opponentNickname", room.getHostNickname());
        p2Event.put("role", "PLAYER_2");
        p2Event.put("gameType", room.getGameType());
        p2Event.put("betAmount", room.getBetAmount());
        p2Event.put("timeControlMs", room.getTimeControlMs());
        p2Event.put("incrementMs", room.getIncrementMs());
        p2Event.put("balance", balance2);

        messagingTemplate.convertAndSend("/topic/match/" + room.getHostId(), p1Event);
        messagingTemplate.convertAndSend("/topic/match/" + room.getGuestId(), p2Event);
    }

    private Map<String, Object> buildRoomPayload(Room room) {
        Map<String, Object> m = new HashMap<>();
        m.put("type", "ROOM_STATE");
        m.put("roomId", room.getRoomId());
        m.put("status", room.getStatus());
        m.put("gameType", room.getGameType());
        m.put("betAmount", room.getBetAmount());
        m.put("members", room.getMembers());
        return m;
    }

    private String generateRoomId() {
        // 6 ký tự uppercase alphanumeric
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        String id = sb.toString();
        return rooms.containsKey(id) ? generateRoomId() : id;
    }

    private Long parseLong(String v) {
        try { return v == null ? null : Long.parseLong(v); } catch (Exception e) { return null; }
    }

    // ── Result types ─────────────────────────────────────────────────────────

    @Data
    public static class JoinResult {
        private boolean success;
        private String error;
        private Room room;
        static JoinResult ok(Room r) { JoinResult j = new JoinResult(); j.success = true; j.room = r; return j; }
        static JoinResult error(String e) { JoinResult j = new JoinResult(); j.success = false; j.error = e; return j; }
    }

    @Data
    public static class StartResult {
        private boolean success;
        private String error;
        private String gameId;
        static StartResult ok(String id) { StartResult s = new StartResult(); s.success = true; s.gameId = id; return s; }
        static StartResult error(String e) { StartResult s = new StartResult(); s.success = false; s.error = e; return s; }
    }
}
