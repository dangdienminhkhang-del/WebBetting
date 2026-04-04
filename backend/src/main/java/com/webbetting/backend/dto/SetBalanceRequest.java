package com.webbetting.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SetBalanceRequest {

    @NotNull(message = "Balance cannot be null")
    @Min(value = 0, message = "Balance cannot be negative")
    private Long balance;
}
