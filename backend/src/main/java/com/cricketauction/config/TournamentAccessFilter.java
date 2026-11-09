package com.cricketauction.config;

import com.cricketauction.entity.AppUser;
import com.cricketauction.service.AppUserService;
import com.cricketauction.util.TournamentAccessUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Restricts OPERATOR/VIEWER API calls to tournaments listed on their account.
 * Unauthenticated requests are unchanged (public broadcast routes).
 */
@Component
public class TournamentAccessFilter extends OncePerRequestFilter {

    private static final Pattern TOURNAMENT_PATH =
            Pattern.compile("^/api/tournaments/(\\d+)(?:/.*)?$");

    private final AppUserService userService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TournamentAccessFilter(AppUserService userService) {
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        Matcher m = TOURNAMENT_PATH.matcher(path);
        if (!m.matches()) {
            chain.doFilter(request, response);
            return;
        }

        Long tournamentId;
        try {
            tournamentId = Long.parseLong(m.group(1));
        } catch (NumberFormatException e) {
            chain.doFilter(request, response);
            return;
        }

        AppUser user;
        try {
            user = userService.findByUsername(auth.getName());
        } catch (RuntimeException e) {
            chain.doFilter(request, response);
            return;
        }

        if (!TournamentAccessUtil.canAccessTournament(user, tournamentId)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(),
                    Map.of("success", false, "message", "You do not have access to this tournament"));
            return;
        }

        chain.doFilter(request, response);
    }
}
