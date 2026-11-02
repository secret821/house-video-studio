#!/usr/bin/env bash
# Run as root on the named host after uploading a prebuilt release. This does not change the public site's proxy.
set -euo pipefail
release_dir="${1:?Usage: stage-baota.sh /opt/house-video-studio/releases/RELEASE_ID}"
case "$release_dir" in /opt/house-video-studio/releases/[0-9]*) ;; *) echo 'Unexpected release directory' >&2; exit 1 ;; esac
test -f "$release_dir/.next/BUILD_ID"
test -f "$release_dir/package.json"
test -f "$release_dir/.video-bundles/real/source-manifest.json"
test -f "$release_dir/.video-bundles/photo/source-manifest.json"
test -f /opt/house-video-studio/private/auth.json
base_dir=/opt/house-video-studio
shared_dir="$base_dir/shared"
runtime_dir="$base_dir/runtime"
if ! id housevideo >/dev/null 2>&1; then useradd --system --home-dir "$shared_dir" --shell /sbin/nologin housevideo; fi
install -d -m 755 "$runtime_dir"
install -d -m 750 -o housevideo -g www "$shared_dir"
install -d -m 700 -o housevideo -g housevideo "$shared_dir/data"
install -d -m 700 -o housevideo -g housevideo "$base_dir/private/sessions"
if [ ! -x "$runtime_dir/node22/bin/node" ]; then
  archive="$runtime_dir/node-v22.23.4-linux-x64.tar.xz"
  curl --fail --location --retry 2 --connect-timeout 20 https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.xz -o "$archive"
  echo '1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce  '"$archive" | sha256sum --check --status
  tar -xJf "$archive" -C "$runtime_dir"
  ln -s node-v22.23.4-linux-x64 "$runtime_dir/node22"
fi
export PATH="$runtime_dir/node22/bin:$runtime_dir/pnpm/node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
if [ ! -x "$runtime_dir/pnpm/node_modules/.bin/pnpm" ]; then
  npm install --prefix "$runtime_dir/pnpm" --registry=https://registry.npmjs.org pnpm@10.14.0
fi
cd "$release_dir"
pnpm install --prod --frozen-lockfile --registry=https://registry.npmjs.org
pnpm exec remotion browser ensure
if [ -L data ] && [ "$(readlink data)" = "$shared_dir/data" ]; then :
elif [ -e data ] || [ -L data ]; then echo 'Release must not contain data' >&2; exit 1
else ln -s "$shared_dir/data" data; fi
if [ -f "$shared_dir/.env.cloud" ]; then
  chmod 600 "$shared_dir/.env.cloud"
  chown housevideo:housevideo "$shared_dir/.env.cloud"
  if [ ! -L .env.cloud ]; then ln -s "$shared_dir/.env.cloud" .env.cloud; fi
fi
chown -R housevideo:housevideo "$release_dir"
if [ -e "$base_dir/current" ] && [ ! -L "$base_dir/current" ]; then echo 'current must be a symlink' >&2; exit 1; fi
ln -sfn "$release_dir" "$base_dir/current"
install -m 644 -o root -g root "$release_dir/deploy/house-video-studio.service" /etc/systemd/system/house-video-studio.service
systemctl daemon-reload
systemctl enable --now house-video-studio
systemctl restart house-video-studio
echo 'Candidate started on loopback port 4340; public Nginx routing was not changed.'
