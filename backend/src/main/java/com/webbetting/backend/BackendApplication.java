package com.webbetting.backend;

import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	CommandLineRunner initAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			if (userRepository.findByUsername("adminK").isEmpty()) {
				User admin = new User();
				admin.setUsername("adminK");
				admin.setPassword(passwordEncoder.encode("admin123"));
				admin.setNickname("Admin");
				admin.setRole("ADMIN");
				admin.setActive(true);
				userRepository.save(admin);
				System.out.println("Created admin account: adminK");
			}
		};
	}
}
