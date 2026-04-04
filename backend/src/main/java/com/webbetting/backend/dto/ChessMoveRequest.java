package com.webbetting.backend.dto;

public class ChessMoveRequest {
    private String from;
    private String to;
    private String promotion;

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }

    public String getPromotion() { return promotion; }
    public void setPromotion(String promotion) { this.promotion = promotion; }
}

