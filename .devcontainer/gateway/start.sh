#!/bin/sh
set -eu

proxy_uid=$(id -u proxy)
proxy_gid=$(id -g proxy)

iptables -P OUTPUT DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP
ip6tables -P OUTPUT DROP
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
iptables -F OUTPUT
iptables -F INPUT
ip6tables -F OUTPUT
ip6tables -F INPUT

iptables -t raw -F OUTPUT
iptables -t raw -A OUTPUT -p udp --dport 53 -m owner ! --uid-owner "$proxy_uid" -j DROP
iptables -t raw -A OUTPUT -p tcp --dport 53 -m owner ! --uid-owner "$proxy_uid" -j DROP
iptables -A OUTPUT -m owner --uid-owner "$proxy_uid" -d 127.0.0.11 -p udp -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner "$proxy_uid" -d 127.0.0.11 -p tcp -j ACCEPT
iptables -A OUTPUT -d 127.0.0.1 -o lo -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

for network in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 198.18.0.0/15 224.0.0.0/4 240.0.0.0/4; do
    iptables -A OUTPUT -d "$network" -j REJECT
done
iptables -A OUTPUT -m owner --uid-owner "$proxy_uid" -p tcp --dport 443 -j ACCEPT
iptables -A OUTPUT -j REJECT
ip6tables -A OUTPUT -o lo -d ::1 -j ACCEPT
ip6tables -A INPUT -i lo -j ACCEPT
ip6tables -A OUTPUT -j REJECT

exec setpriv --reuid="$proxy_uid" --regid="$proxy_gid" --init-groups \
    --bounding-set=-all --no-new-privs squid -N -f /etc/squid/squid.conf