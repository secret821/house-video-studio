#!/usr/bin/env bash
# Prepare new container-owned directories only. Database credentials stay administrator-owned.
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then echo 'Run as the administrator on the NEW Linux server.' >&2; exit 1; fi
root_dir="${1:-/opt/house-video-studio-docker}"
case "$root_dir" in /*) ;; *) echo 'Use an absolute storage directory.' >&2; exit 1 ;; esac
if [ -e "$root_dir" ] || [ -L "$root_dir" ]; then
  echo 'Storage directory already exists; inspect its permissions manually. Nothing was changed.' >&2
  exit 1
fi
install -d -m 0755 -o root -g root "$root_dir"
install -d -m 0700 -o 1000 -g 1000 "$root_dir/data"
install -d -m 0750 -o root -g 1000 "$root_dir/private"
install -d -m 0700 -o 1000 -g 1000 "$root_dir/private/sessions"
install -m 0640 -o root -g 1000 /dev/null "$root_dir/private/cloud.env"
echo 'Prepared empty storage. Install the private mysql.json as root:1000 mode 0640 before startup.'
