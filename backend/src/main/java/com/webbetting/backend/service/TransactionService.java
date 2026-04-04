package com.webbetting.backend.service;

import com.webbetting.backend.model.TransactionHistory;
import com.webbetting.backend.model.TransactionType;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {

    @Autowired
    private TransactionHistoryRepository transactionHistoryRepository;

    @Transactional
    public void createTransaction(User user, TransactionType type, Long amount, Long beforeBalance, Long afterBalance) {
        TransactionHistory transaction = new TransactionHistory(user, type, amount, beforeBalance, afterBalance);
        transactionHistoryRepository.save(transaction);
    }
}
