package com.webbetting.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TopUpRequest {

    @NotNull(message = "Amount cannot be null")
    @Min(value = 1, message = "Amount must be positive")
    private Long amount;
}
