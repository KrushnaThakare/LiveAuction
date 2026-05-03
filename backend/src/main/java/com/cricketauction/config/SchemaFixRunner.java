package com.cricketauction.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;

/**
 * Drops the UNIQUE constraint on auction_sessions.current_player_id
 * that was created when the column was mapped as @OneToOne.
 *
 * We know the exact constraint name from the error:
 *   UK_8avdtq2llamsjpyka1g2c9htj
 *
 * Strategy: try multiple approaches in order until one succeeds.
 * Uses autoCommit=true so no transaction wraps the DDL.
 */
@Component
@Order(1)   // run before anything else
public class SchemaFixRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaFixRunner.class);

    // The exact constraint name that appears in the error message
    private static final String KNOWN_CONSTRAINT = "UK_8avdtq2llamsjpyka1g2c9htj";

    private final DataSource dataSource;

    public SchemaFixRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase();
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return; // H2 / other — skip
            }

            // Step 1: null out FK values on closed sessions first
            // (needed even if the index is already gone, prevents future constraint hits)
            nullifyClosedSessions(conn);

            // Step 2: drop the unique constraint — try by known name first
            boolean dropped = tryDropIndexByName(conn, KNOWN_CONSTRAINT);

            // Step 3: if that didn't work (e.g. name differs), scan SHOW INDEX
            if (!dropped) {
                dropped = dropAllUniqueIndexesOnColumn(conn, "current_player_id");
            }

            if (dropped) {
                log.info("SchemaFixRunner: unique constraint removed — re-auction is now possible");
            } else {
                log.info("SchemaFixRunner: no unique constraint found on current_player_id (already clean)");
            }

        } catch (Exception e) {
            log.warn("SchemaFixRunner: {}", e.getMessage());
        }
    }

    /** Null out FK columns on closed sessions so existing data never triggers the constraint */
    private void nullifyClosedSessions(Connection conn) {
        try {
            boolean wasAuto = conn.getAutoCommit();
            conn.setAutoCommit(true);
            try (Statement st = conn.createStatement()) {
                int n = st.executeUpdate(
                    "UPDATE auction_sessions " +
                    "SET current_player_id = NULL, highest_bidder_team_id = NULL " +
                    "WHERE status IN ('SOLD','UNSOLD') " +
                    "  AND (current_player_id IS NOT NULL OR highest_bidder_team_id IS NOT NULL)"
                );
                if (n > 0) log.info("SchemaFixRunner: nulled FK columns on {} closed sessions", n);
            } finally {
                conn.setAutoCommit(wasAuto);
            }
        } catch (SQLException e) {
            log.debug("SchemaFixRunner nullify: {} (table may not exist yet)", e.getMessage());
        }
    }

    /** Try to drop a specific index by its exact name */
    private boolean tryDropIndexByName(Connection conn, String indexName) {
        try {
            boolean wasAuto = conn.getAutoCommit();
            conn.setAutoCommit(true);   // DDL must run outside a transaction in MySQL
            try (Statement st = conn.createStatement()) {
                st.execute("ALTER TABLE auction_sessions DROP INDEX `" + indexName + "`");
                log.info("SchemaFixRunner: dropped index '{}' by name", indexName);
                return true;
            } finally {
                conn.setAutoCommit(wasAuto);
            }
        } catch (SQLException e) {
            // 1091 = Can't DROP INDEX, check that index exists  → already gone, that's fine
            if (e.getErrorCode() == 1091) {
                log.debug("SchemaFixRunner: index '{}' already gone (1091)", indexName);
            } else {
                log.warn("SchemaFixRunner: DROP INDEX '{}' failed ({}): {}", indexName, e.getErrorCode(), e.getMessage());
            }
            return false;
        }
    }

    /** Scan SHOW INDEX and drop every unique index on the given column */
    private boolean dropAllUniqueIndexesOnColumn(Connection conn, String columnName) {
        boolean anyDropped = false;
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SHOW INDEX FROM auction_sessions")) {
            while (rs.next()) {
                String col     = rs.getString("Column_name");
                int    nonUniq = rs.getInt("Non_unique");
                String key     = rs.getString("Key_name");
                if (columnName.equals(col) && nonUniq == 0 && !"PRIMARY".equals(key)) {
                    if (tryDropIndexByName(conn, key)) anyDropped = true;
                }
            }
        } catch (SQLException e) {
            log.debug("SchemaFixRunner SHOW INDEX: {}", e.getMessage());
        }
        return anyDropped;
    }
}
