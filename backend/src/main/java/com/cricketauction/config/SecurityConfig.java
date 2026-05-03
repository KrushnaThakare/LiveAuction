package com.cricketauction.config;

import com.cricketauction.service.AppUserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter      jwtFilter;
    private final AppUserService userService;
    private final PasswordEncoder passwordEncoder;

    public SecurityConfig(JwtFilter jwtFilter, AppUserService userService, PasswordEncoder passwordEncoder) {
        this.jwtFilter      = jwtFilter;
        this.userService    = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        var provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ── Fully public — no token needed ───────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                // Public registration form
                .requestMatchers("/api/registration/*/form").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/registration/*").permitAll()
                // File serving
                .requestMatchers("/api/uploads/**", "/api/images/**").permitAll()
                // Public view mode: read-only tournament data (for broadcast links)
                .requestMatchers(HttpMethod.GET, "/api/tournaments").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tournaments/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tournaments/*/auction/state").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tournaments/*/teams").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tournaments/*/players").permitAll()

                // ── READ-ONLY for authenticated users ─────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/tournaments/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/registration/**").authenticated()

                // ── VIEWER: read-only auction + sold/unsold/teams ─────────────
                // (authenticated = viewer can GET anything above, nothing else)

                // ── OPERATOR: can run auction, manage teams/players ───────────
                .requestMatchers("/api/tournaments/*/auction/**")
                    .hasAnyRole("OPERATOR","SUPER_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/tournaments/*/teams/**")
                    .hasAnyRole("OPERATOR","SUPER_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/tournaments/*/teams/**")
                    .hasAnyRole("OPERATOR","SUPER_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/tournaments/*/teams/**")
                    .hasAnyRole("OPERATOR","SUPER_ADMIN")
                .requestMatchers("/api/tournaments/*/players/**")
                    .hasAnyRole("OPERATOR","SUPER_ADMIN")
                .requestMatchers("/api/registration/*/import**")
                    .hasAnyRole("OPERATOR","SUPER_ADMIN")

                // ── SUPER_ADMIN only ──────────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/tournaments").hasRole("SUPER_ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/tournaments/*").hasRole("SUPER_ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/tournaments/*").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/tournaments/*/registration/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/users/**").hasRole("SUPER_ADMIN")

                // Everything else requires at least login
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
