FROM alpine:3.19 AS certs
RUN apk --no-cache add ca-certificates

FROM scratch

WORKDIR /app

# CA certs for Cloudflare TLS (fixes x509 unknown authority)
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

# Pre-built binary (run: CGO_ENABLED=0 go build -o flaretunnel .)
# Pre-built binary + static Basecoat panel (no build step; source: web-basecoat/)
COPY --chmod=755 flaretunnel .
COPY web-basecoat ./web-next/out
# Seed config so bare `docker run` boots with zero accounts (mounts/env override it)
COPY flaretunnel.empty.json ./flaretunnel.json

# Persistent data (config, endpoints, tunnel settings, CA certs) -> /data volume
VOLUME ["/data"]

EXPOSE 8080
EXPOSE 8081

ENTRYPOINT ["./flaretunnel"]
CMD ["--api", "8081"]
