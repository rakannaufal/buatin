FROM node:24-trixie-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates clamav clamav-freshclam postgresql-client-17 tini \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/lib/clamav /app \
    && chown node:node /var/lib/clamav /app \
    && printf 'DatabaseDirectory /var/lib/clamav\nDatabaseOwner node\nChecks 12\n' > /etc/clamav/freshclam.conf
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --include=dev --no-audit
COPY --chown=node:node . .
RUN npm run db:generate && npm run build:worker \
    && npm prune --omit=dev --ignore-scripts --no-audit
ENV NODE_ENV=production \
    REFERENCE_SCANNER_PATH=/app/scripts/reference-scanner.mjs \
    REFERENCE_SCANNER_HEALTH_PATH=/app/scripts/reference-scanner.mjs \
    CLAMAV_DATABASE_DIR=/var/lib/clamav
ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["/app/deploy/start-worker.sh"]
