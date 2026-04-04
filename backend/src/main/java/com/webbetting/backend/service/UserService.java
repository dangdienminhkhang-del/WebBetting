package com.webbetting.backend.service;

import com.webbetting.backend.dto.UserSummaryDto;
import com.webbetting.backend.model.TopUpHistory;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.TopUpHistoryRepository;
import com.webbetting.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TopUpHistoryRepository topUpHistoryRepository;

    public UserSummaryDto mapToDTO(User user) {
        return new UserSummaryDto(user);
    }

    @Transactional
    public User register(String username, String password, String nickname) {
        userRepository.findByUsername(username).ifPresent(u -> {
            throw new RuntimeException("Username already exists");
        });

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname == null || nickname.isBlank() ? username : nickname);
        user.setBalance(1000L);
        user.setRole("USER");
        user.setActive(true);
        user.setDeleted(false);

        return userRepository.save(user);
    }

    public User login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Incorrect password");
        }

        if (!user.isActive()) {
            throw new RuntimeException("User account is locked");
        }

        if (user.isDeleted()) {
            throw new RuntimeException("Tài khoản đã bị vô hiệu hoá");
        }

        return user;
    }

    public List<User> getTopUsers(int limit) {
        return userRepository.findAllByOrderByBalanceDesc(PageRequest.of(0, Math.max(1, limit)));
    }

    public User getById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User updateNickname(Long id, String newNickname) {
        User u = getById(id);
        u.setNickname(newNickname);
        return userRepository.save(u);
    }

    @Transactional
    public User updateAvatar(Long id, String avatarUrl) {
        User u = getById(id);
        u.setAvatarUrl(avatarUrl);
        return userRepository.save(u);
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Transactional
    public User setBalance(Long userId, Long newBalance) {
        if (newBalance < 0) throw new IllegalArgumentException("Balance cannot be negative");
        User user = getById(userId);
        user.setBalance(newBalance);
        return userRepository.save(user);
    }

    @Transactional
    public User userTopUp(Long userId, Long amount, String method) {
        if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
        User user = getById(userId);
        long before = user.getBalance();
        long after = before + amount;
        user.setBalance(after);
        userRepository.save(user);

        TopUpHistory history = new TopUpHistory();
        history.setUser(user);
        history.setAmount(amount);
        history.setBalanceBefore(before);
        history.setBalanceAfter(after);
        history.setMethod(method);
        history.setCreatedBy("USER");
        topUpHistoryRepository.save(history);

        return user;
    }
}
