package com.webbetting.backend.util;

import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.util.Base64;

public class JwtKeyGenerator {
    public static void main(String[] args) {
        SecretKey key = Keys.secretKeyFor(SignatureAlgorithm.HS512);
        String base64Key = Base64.getEncoder().encodeToString(key.getEncoded());
        
        System.out.println("==========================================");
        System.out.println("COPY KEY NÀY VÀO application.properties:");
        System.out.println("jwt.secret=" + base64Key);
        System.out.println("==========================================");
    }
}