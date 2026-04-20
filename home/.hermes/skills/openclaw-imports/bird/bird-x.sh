#!/bin/bash
# Bird X/Twitter CLI Wrapper with Embedded Authentication
# This script provides automatic authentication for Twitter/X access
# Cookies extracted and embedded - do not commit to public repos

# Twitter/X Authentication Cookies
# Domain: .x.com
# Expiration: ~2027 (varies by cookie)
export AUTH_TOKEN="1d2b59d98db5f5a4142528e2469641473761a7db"
export CT0="ff6d648cfd31e6f6e976f728e8cfc29755b56baccaba76d86fa3bbd5b831d77d747f2fc81bb346b381562b3a1e65fbd8f5ef880d0280a7947aded3095f5d7a33f5ad2263b1dac82b005bcf3a066c6425"

# Use the locally installed bird binary
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/node_modules/.bin/bird" "$@"
