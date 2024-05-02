#!/bin/bash

# Usage: ./deploy.sh <config> <repo_name>
# Example: ./deploy.sh ah DiscountScraper 

# Validate arguments
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <config> <repo_name>"
    exit 1
fi

# Read command-line arguments
CONFIG="$1"
REPO_NAME="$2"
SERVICE_NAME="$REPO_NAME-$CONFIG"

# Path for the systemd service file
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME.service"

# Create the systemd service configuration
echo "[Unit]
Description=${REPO_NAME}
After=network.target

[Service]
ExecStart=/usr/bin/npm run $CONFIG
WorkingDirectory=/home/admin/service/$REPO_NAME
Restart=always
User=admin
Group=admin
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target" | sudo tee $SERVICE_PATH

# Reload systemd configuration, enable, and start the service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME
