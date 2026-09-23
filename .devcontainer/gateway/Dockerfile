FROM debian:trixie-slim

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends squid iptables curl util-linux ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY squid.conf allowed-domains.txt /etc/squid/
COPY start.sh /usr/local/bin/start-gateway
RUN chmod 755 /usr/local/bin/start-gateway \
    && squid -k parse -f /etc/squid/squid.conf
ENTRYPOINT ["/usr/local/bin/start-gateway"]
