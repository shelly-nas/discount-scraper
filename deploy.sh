#!/bin/bash

# Usage: ./deploy.sh <config> 
# Example: ./deploy.sh ah DiscountScraper 

# Validate arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <config> <workspace>
    configs=[ah, dirk or plus]
    workspace=[\"Full/directory/path\"]"
    exit 1
fi

# Read command-line arguments
CONFIG="$1"
REPO_NAME="discount-scraper"
WORKSPACE=$2
SERVICE_NAME="$REPO_NAME-$CONFIG"

# Path for the systemd service file
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME.service"

# Disable and remove system service file
sudo systemctl stop $SERVICE_NAME
sudo systemctl disable $SERVICE_NAME
sudo rm $SERVICE_PATH

# Create the systemd service configuration
echo "[Unit]
Description=Discount Scraper ($CONFIG)
Documentation=https://github.com/GRJX/DiscountScraper
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/home/pi/.nvm/versions/node/v20.11.1/bin/node dist/src/index.js --config config/supermarkets/$CONFIG.json
WorkingDirectory=$WORKSPACE
Restart=always
RestartSec=1w

[Install]
WantedBy=multi-user.target" | sudo tee $SERVICE_PATH

# Reload systemd configuration, enable, and start the service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME
