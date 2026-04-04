package com.webbetting.backend.service;

import com.webbetting.backend.model.TopUpHistory;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.TopUpHistoryRepository;
import com.webbetting.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TopUpService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TopUpHistoryRepository historyRepository;

    @Transactional
    public void topUp(User user, long amount) {
        if (amount <= 0) {
            throw new RuntimeException("Amount must be positive");
        }

        if (!user.isActive()) {
            throw new RuntimeException("User is locked");
        }

        Long before = user.getBalance();
        Long after = before + amount;

        user.setBalance(after);
        userRepository.save(user);

        TopUpHistory h = new TopUpHistory();
        h.setUser(user);
        h.setAmount(amount);
        h.setBalanceBefore(before);
        h.setBalanceAfter(after);

        historyRepository.save(h);
    }
}
