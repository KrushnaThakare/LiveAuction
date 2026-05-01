package com.cricketauction.service;

import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.dto.RegistrationResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.PlayerRegistration;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.PlayerRegistrationRepository;
import com.cricketauction.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@Transactional
public class PlayerRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(PlayerRegistrationService.class);

    private final PlayerRegistrationRepository regRepo;
    private final PlayerRepository playerRepo;
    private final TournamentService tournamentService;
    private final FileStorageService fileStorage;

    public PlayerRegistrationService(PlayerRegistrationRepository regRepo,
                                     PlayerRepository playerRepo,
                                     TournamentService tournamentService,
                                     FileStorageService fileStorage) {
        this.regRepo = regRepo;
        this.playerRepo = playerRepo;
        this.tournamentService = tournamentService;
        this.fileStorage = fileStorage;
    }

    public RegistrationResponse submit(Long tournamentId, String formData,
                                       String playerName, String mobile,
                                       MultipartFile photo) {
        Tournament t = tournamentService.findById(tournamentId);
        if (!Boolean.TRUE.equals(t.getRegistrationEnabled())) {
            throw new AuctionException("Registration is not open for this tournament");
        }
        if (mobile != null && !mobile.isBlank()
                && regRepo.existsByTournamentIdAndMobile(tournamentId, mobile)) {
            throw new AuctionException("A registration with this mobile number already exists");
        }

        String photoUrl = null;
        if (photo != null && !photo.isEmpty()) {
            try {
                photoUrl = fileStorage.savePlayerPhoto(tournamentId, photo);
            } catch (Exception e) {
                log.warn("Photo upload failed: {}", e.getMessage());
            }
        }

        PlayerRegistration reg = PlayerRegistration.builder()
                .tournament(t).formData(formData)
                .playerName(playerName).mobile(mobile)
                .photoUrl(photoUrl)
                .status(PlayerRegistration.RegistrationStatus.PENDING)
                .build();

        return mapToResponse(regRepo.save(reg));
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> getAll(Long tournamentId) {
        return regRepo.findByTournamentIdOrderBySubmittedAtDesc(tournamentId)
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public RegistrationResponse getById(Long id) {
        return mapToResponse(regRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", id)));
    }

    /** Edit a registration's details and optionally replace the photo */
    public RegistrationResponse editRegistration(Long registrationId, String formData,
                                                  String playerName, String mobile,
                                                  MultipartFile photo) {
        PlayerRegistration reg = regRepo.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", registrationId));

        if (formData   != null) reg.setFormData(formData);
        if (playerName != null) reg.setPlayerName(playerName);
        if (mobile     != null) reg.setMobile(mobile);

        if (photo != null && !photo.isEmpty()) {
            if (reg.getPhotoUrl() != null) fileStorage.deleteFile(reg.getPhotoUrl());
            try {
                reg.setPhotoUrl(fileStorage.savePlayerPhoto(reg.getTournament().getId(), photo));
            } catch (Exception e) {
                log.warn("Photo update failed: {}", e.getMessage());
            }
        }

        return mapToResponse(regRepo.save(reg));
    }

    /** Import a single registration as an auction player.
     *  Role is read from formData if a field mapped to 'role' exists; otherwise BATSMAN. */
    public PlayerResponse importToAuction(Long registrationId, String roleOverride, Double basePrice) {
        PlayerRegistration reg = regRepo.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", registrationId));

        // Try to read role from the submitted form data
        String roleStr = roleOverride;
        if ((roleStr == null || roleStr.isBlank()) && reg.getFormData() != null) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.Map<?,?> data = om.readValue(reg.getFormData(), java.util.Map.class);
                // Look for a field value that is a known role string
                for (Object v : data.values()) {
                    if (v instanceof String s) {
                        String up = s.toUpperCase().replace(" ", "_").replace("-", "_");
                        try { Player.PlayerRole.valueOf(up); roleStr = s; break; }
                        catch (Exception ignored) {}
                    }
                }
            } catch (Exception ignored) {}
        }

        Player.PlayerRole playerRole;
        try {
            playerRole = Player.PlayerRole.valueOf(
                    roleStr.toUpperCase().replace(" ", "_").replace("-", "_"));
        } catch (Exception e) {
            playerRole = Player.PlayerRole.BATSMAN;
        }

        Player player = Player.builder()
                .name(reg.getPlayerName() != null ? reg.getPlayerName() : "Unknown")
                .role(playerRole)
                .basePrice(basePrice != null && basePrice > 0 ? basePrice : 1000.0)
                .currentBid(0.0)
                .imageUrl(reg.getPhotoUrl())
                .status(Player.PlayerStatus.AVAILABLE)
                .tournament(reg.getTournament())
                .build();

        player = playerRepo.save(player);
        reg.setStatus(PlayerRegistration.RegistrationStatus.IMPORTED);
        reg.setImportedPlayerId(player.getId());
        regRepo.save(reg);

        return mapPlayer(player);
    }

    /** Bulk import all PENDING registrations */
    public int bulkImport(Long tournamentId, Double defaultBasePrice) {
        List<PlayerRegistration> pending = regRepo
                .findByTournamentIdOrderBySubmittedAtDesc(tournamentId)
                .stream()
                .filter(r -> r.getStatus() == PlayerRegistration.RegistrationStatus.PENDING)
                .toList();

        int count = 0;
        for (PlayerRegistration reg : pending) {
            try {
                importToAuction(reg.getId(), "BATSMAN", defaultBasePrice);
                count++;
            } catch (Exception e) {
                log.warn("Failed to import registration {}: {}", reg.getId(), e.getMessage());
            }
        }
        return count;
    }

    public void deleteRegistration(Long id) {
        PlayerRegistration reg = regRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", id));
        if (reg.getPhotoUrl() != null) fileStorage.deleteFile(reg.getPhotoUrl());
        regRepo.delete(reg);
    }

    private RegistrationResponse mapToResponse(PlayerRegistration r) {
        return RegistrationResponse.builder()
                .id(r.getId()).tournamentId(r.getTournament().getId())
                .playerName(r.getPlayerName()).mobile(r.getMobile())
                .photoUrl(r.getPhotoUrl()).formData(r.getFormData())
                .status(r.getStatus()).importedPlayerId(r.getImportedPlayerId())
                .submittedAt(r.getSubmittedAt())
                .build();
    }

    private PlayerResponse mapPlayer(Player p) {
        return PlayerResponse.builder()
                .id(p.getId()).name(p.getName()).role(p.getRole())
                .basePrice(p.getBasePrice()).currentBid(p.getCurrentBid())
                .imageUrl(p.getImageUrl()).status(p.getStatus())
                .tournamentId(p.getTournament().getId())
                .build();
    }
}
