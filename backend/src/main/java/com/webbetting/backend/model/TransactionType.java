package com.webbetting.backend.model;

public enum TransactionType {
    TOPUP,  // Nạp tiền bởi admin
    BET,    // Đặt cược
    WIN,    // Thắng cược
    SET,    // Admin set số dư
    RESET   // Admin reset số dư
}
